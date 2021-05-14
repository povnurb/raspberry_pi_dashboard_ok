const express = require('express');
const router = express.Router();
const { checkAuth } = require("../middlewares/authentication") ;
var mqtt = require('mqtt');
const axios = require('axios');
const colors = require('colors');

import Data from "../models/data";
import Device from "../models/device";
import EmqxAuthRule from "../models/emqx_auth.js";
import Notification from "../models/notifications";
import AlarmRule from "../models/emqx_alarm_rule";
import Template from "../models/template.js";

var client;

/* 
  ___  ______ _____ 
 / _ \ | ___ \_   _|
/ /_\ \| |_/ / | |  
|  _  ||  __/  | |  
| | | || |    _| |_  
\_| |_/\_|    \___/                                 
*/
router.post("/getdevicecredentials", async (req, res) => {
  try {
  
    const dId = req.body.dId;

    const password = req.body.password;
  
    const device = await Device.findOne({ dId: dId });

    if (password != device.password) {
        return res.status(401).json();
    }
  
    const userId = device.userId;
  
    var credentials = await getDeviceMqttCredentials(dId, userId);
  
    var template = await Template.findOne({ _id: device.templateId });
  
  
    var variables = [];
  
    template.widgets.forEach(widget => {
      
      var v = (({variable, variableFullName, variableType, variableSendFreq }) => ({
        variable,
        variableFullName,
        variableType,
        variableSendFreq
      }))(widget);
  
      variables.push(v);
    });
  
    const toSend = {  //se cambiaron todos los toSend a response
      username: credentials.username,
      password: credentials.password,
      topic: userId + "/" + dId + "/",
      variables: variables
    };
  
  
    res.json(toSend);
  
    setTimeout(() => {
      getDeviceMqttCredentials(dId, userId);
      console.log("Device Credentials Updated");
    }, 10000);
  }catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
  });

router.post('/saver-webhook', async (req,res)=>{
try {
    if (req.headers.token != process.env.EMQX_API_TOKEN) {
        req.sendStatus(401); //401 indica que esta mal la contraseña 
        return; //y 404 que no es correcto el punto de entrada
    }

    const data = req.body;

    const splittedTopic = data.topic.split("/");
    const dId = splittedTopic[1];
    const variable = splittedTopic[2];

    var result = await Device.find({ dId: dId, userId: data.userId });

    if (result.length == 1) {
        Data.create({
            userId:data.userId,
            dId:dId,
            variable:variable,
            value:data.payload.value,
            time:Date.now()
        });
        console.log ("Dato creado");
    }

    res.sendStatus(200); //todo ok
} catch (error) {
    console.log(error);
    res.sendStatus(200);
}
});

//cuando una alarma es rota
router.post("/alarm-webhook", async (req, res) => {
    try {
        if (req.headers.token != process.env.EMQX_API_TOKEN) {
            res.sendStatus(404);
            return;
          }

          res.sendStatus(200);   
        
          const incomingAlarm = req.body;

          updateAlarmCounter(incomingAlarm.emqxRuleId);

          const lastNotif = await Notification.find({dId: incomingAlarm.dId, emqxRuleId: incomingAlarm.emqxRuleId }).sort({time: -1}).limit(1);

          if (lastNotif == 0) {
            console.log("Primera Alarma")
            saveNotifToMongo(incomingAlarm);
            sendMqttNotif(incomingAlarm);
          } else {
            const lastNotifToNowMins = (Date.now() - lastNotif[0].time)/1000/60;

            if (lastNotifToNowMins > incomingAlarm.triggerTime){
                console.log("Reincidencia despues del tiempo");
                saveNotifToMongo(incomingAlarm);
                sendMqttNotif(incomingAlarm);
            }
          }        
    } catch (error) {
        console.log(error);
        res.sendStatus(200);
    }
});

//get notifications
router.get("/notifications", checkAuth, async(req,res)=>{
    try {
        const userId = req.userData._id;

        const notifications = await getNotifications(userId);

        const toSend = {
            status: "success",
            data: notifications
        };

        res.json(toSend);
    } catch (error) {
        console.log("Error en adquirir las notificaciones");
        console.log(error);

        const toSend={
            status: "error",
            error: error
        };
        return res.status(500).json(toSend);
    }
});

//update Notification(readed status)
router.put("/notifications", checkAuth, async(req,res)=>{
    try {
        const userId = req.userData._id;

        const notificationId = req.body.notifId;

        await Notification.updateOne({userId: userId, _id: notificationId},{readed: true});
        const toSend = {
            status: "success",
        };

        res.json(toSend);
    } catch (error) {
        console.log("ERROR EN ACTUALIZAR EL ESTADO DE LA NOTIFICACION");
        console.log(error);

        const toSend = {
            status: "error",
            error: error
        };

        return res.status(500).json(toSend);
    }
});
/* 
______ _   _ _   _ _____ _____ _____ _____ _   _  _____ 
|  ___| | | | \ | /  __ \_   _|_   _|  _  | \ | |/  ___|
| |_  | | | |  \| | /  \/ | |   | | | | | |  \| |\ `--. 
|  _| | | | | . ` | |     | |   | | | | | | . ` | `--. \
| |   | |_| | |\  | \__/\ | |  _| |_\ \_/ / |\  |/\__/ /
\_|    \___/\_| \_/\____/ \_/  \___/ \___/\_| \_/\____/  
*/

async function getDeviceMqttCredentials(dId, userId) {
    try {
      var rule = await EmqxAuthRule.find({
        type: "device",
        userId: userId,
        dId: dId
      });
  
      if (rule.length == 0) {
        const newRule = {
          userId: userId,
          dId: dId,
          username: makeid(10),
          password: makeid(10),
          publish: [userId + "/" + dId + "/+/sdata"],
          subscribe: [userId + "/" + dId + "/+/actdata"],
          type: "device",
          time: Date.now(),
          updatedTime: Date.now()
        };
  
        const result = await EmqxAuthRule.create(newRule);
  
        const toReturn = {
          username: result.username,
          password: result.password
        };
  
        return toReturn;
      }
  
      const newUserName = makeid(10);
      const newPassword = makeid(10);
  
      const result = await EmqxAuthRule.updateOne(
        { type: "device", dId: dId },
        {
          $set: {
            username: newUserName,
            password: newPassword,
            updatedTime: Date.now()
          }
        }
      );
  
      // update response example
      //{ n: 1, nModified: 1, ok: 1 }
  
      if (result.n == 1 && result.ok == 1) {
        return {
          username: newUserName,
          password: newPassword
        };
      } else {
        return false;
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

function startMqttClient(){

    const options ={
        port:1883,
        host:process.env.EMQX_NODE_HOST,
        clientId:'webhook_superuser' + Math.round(Math.random()*(0-10000)*-1),
        username: process.env.EMQX_NODE_SUPERUSER_USER,
        password: process.env.EMQX_NODE_SUPERUSER_PASSWORD,
        keepalive: 60,
        reconnectPeriod: 5000,
        protocolId: 'MQIsdp',
        protocolVersion: 3,
        clean: true,
        encoding:'utf8'
    }

    client = mqtt.connect('mqtt://' + process.env.EMQX_NODE_HOST, options);

    client.on('connect', function(){
        console.log("MQTT CONEXION -> OK".green);
        console.log("\n");
    });

    client.on('reconnect',(error)=>{
        console.log("MQTT RECONEXION".bgYellow);
        console.log(error);
    });

    client.on('error',(error)=>{
        console.log("RECONEXIÓN MQTT FALLÓ".bgRed);
        console.log(error);
    });

}

function sendMqttNotif(notif) {
    const topic = notif.userId + '/dummy-did/dummy-var/notif';
    const msg = 'La regla: Cuando la ' + notif.variableFullName + ' es ' + notif.condition + notif.value;
    client.publish(topic, msg);
}

//GET ALL READED NOTIFICATIONS
async function getNotifications(userId) {
    try {
        const res = await Notification.find({ userId: userId, readed: false });
        return res;
    } catch (error) {
        console.log(error);
        return false;
    }
}

function saveNotifToMongo(incomingAlarm) {
try {
    var newNotif = incomingAlarm;
    newNotif.time = Date.now();
    newNotif.readed = false;
    Notification.create(newNotif);
}catch(error){
    console.log(error);
    return false;
}
}

async function updateAlarmCounter(emqxRuleId) {
    try {
        await AlarmRule.updateOne({emqxRuleId: emqxRuleId},{$inc:{counter:1}});
    } catch (error) {
        console.log(error);
        return false;
    }
}

function makeid(length) {
    var result = "";
    var characters =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

setTimeout(() => {startMqttClient();}, 3000);

module.exports = router;



