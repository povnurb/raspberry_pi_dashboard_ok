const { json } = require('d3-fetch'); //este no esta
const express = require('express');
const router = express.Router();
const {checkAuth}= require('../middlewares/authentication');
const axios = require("axios");

import Device from '../models/device';
import SaverRule from '../models/emqx_saver_rule';
import Template from '../models/template';
import AlarmRule from '../models/emqx_alarm_rule';
import EmqxAuthRule from "../models/emqx_auth";


/**
    ___     ____   ____
   /   |   / __ \ /  _/
  / /| |  / /_/ / / /  
 / ___ | / ____/_/ /   
/_/  |_|/_/    /___/
 */

const auth = {
    auth: {
        username: 'admin',
        password: process.env.EMQX_DEFAULT_APPLICATION_SECRET
    }
};

//get llega por query
//localhost:3001/api/device para un mismo endpoint solo cambia el metodo
//ruta para obtener los dispositivos
router.get("/device", checkAuth, async (req,res)=>{
    try {
        const userId = req.userData._id;

        //get devices
        var devices = await Device.find({ userId: userId });


        devices = JSON.parse(JSON.stringify(devices));

        //traemos las saver rules
        const saverRules = await getSaverRules(userId);

        //traemos los templates
        const templates = await getTemplates(userId);

        //get alarm rules- obtener las alarmas
        const alarmRules = await getAlarmRules(userId);

        //saver rules to -> devices
        devices.forEach((device, index) => {
            devices[index].saverRule = saverRules.filter(saverRule => saverRule.dId == device.dId)[0];
            devices[index].template = templates.filter(template => template._id == device.templateId)[0];
            devices[index].alarmRules = alarmRules.filter(alarmRule => alarmRule.dId == device.dId);
        });
     
        const toSend = {
            status:"Exito",  //antes Exito o escribir success jalaba con Exito
            data: devices
        };
     
        res.json(toSend);
    } catch (error) {

        console.log("ERROR EN TRAER LOS DISPOSITIVOS");
        console.log(error);

        const toSend = {
            status: "error",  //antes Error o error
            data: error
        };
     
        return res.status(500).json(toSend);
    }
});

//ruta para agregar dispositivos (crear)
router.post("/device", checkAuth, async (req, res) => {
    try {
        const userId = req.userData._id;

        var newDevice = req.body.newDevice;

        newDevice.userId = userId;

        newDevice.createdTime = Date.now();

        newDevice.password = makeid(10);

        await createSaverRule(userId, newDevice.dId, true);

        const device = await Device.create(newDevice);

        await selectDevice(userId, newDevice.dId);

        const toSend = {
            status:"Exito"
        }

        return res.json(toSend);
    } catch (error) {
        console.log("ERROR EN LA CREACION DE UN NUEVO DISPOSITIVO");
        console.log(error);

        const toSend = {
            status: "error",
            error: error
        };

        return res.status(500).json(toSend);
    } 
});

//ruta para borrar dispositivos
router.delete("/device", checkAuth, async (req, res) => {
    try {
        const userId = req.userData._id;
        const dId = req.query.dId;

        await deleteSaverRule(dId);

        await deleteAllAlarmRules(userId, dId);

    //deleting all posible mqtt device credentials
    await deleteMqttDeviceCredentials(dId);

    //borrar el dispositivo
    const result = await Device.deleteOne({ userId: userId, dId: dId });

    //devices after deletion
    const devices = await Device.find({ userId: userId });

    if (devices.length >= 1) {
      //any selected?
      var found = false;
      devices.forEach(devices => {
        if (devices.selected == true) {
          found = true;
        }
      });

      //if no selected...
      //we need to selet the first
      if (!found) {
        await Device.updateMany({ userId: userId }, { selected: false });
        await Device.updateOne(
          { userId: userId, dId: devices[0].dId },
          { selected: true }
        );
      }
    }

        const toSend = {
            status:"Exito",
            data: result
        };
        return res.json(toSend);
    } catch (error) {
        console.log("ERROR AL BORRAR EL DISPOSITIVO");
        console.log(error);
        
        const toSend = {
            status: "error",
            error: error
        };

        return res.status(500).json(toSend);
    }
});

//ruta para actualizar(selector)
router.put("/device", checkAuth, async (req, res) => {
try {
    const dId = req.body.dId;
    const userId = req.userData._id;

    if (await selectDevice(userId, dId)) {
        const toSend = {
            status: "Exito"
        };
        return res.json(toSend);
    } else {
        const toSend = {
            status: "error"
        };

        return res.json(toSend);
    }
} catch (error) {
    console.log(error);
}
});

//saver-rule status updater
router.put('/saver-rule', checkAuth, async(req,res) => {
    try {
        const rule = req.body.rule;

        console.log(rule);

        await updateSaverRuleStatus(rule.emqxRuleId, rule.status);

        const toSend = {
            status: "Exito"
        };
        
        res.json(toSend);
    } catch (error) {
        console.log(error);
    }
});
/**
    ____                           _                              
   / __/  __  __   ____   _____   (_)  ____    ____   ___    _____
  / /_   / / / /  / __ \ / ___/  / /  / __ \  / __ \ / _ \  / ___/
 / __/  / /_/ /  / / / // /__   / /  / /_/ / / / / //  __/ (__  ) 
/_/     \__,_/  /_/ /_/ \___/  /_/   \____/ /_/ /_/ \___/ /____/  
 */
async function getAlarmRules(userId) {
    try {
        const rules = await AlarmRule.find({ userId: userId });
        return rules;
    } catch (error) {
        return "error";
    }
}

async function selectDevice(userId, dId) {
    try {
        const result = await Device.updateMany({ userId: userId },{ selected: false });
        const result2 = await Device.updateOne({ dId: dId, userId: userId },{ selected: true }); 
    
        return true;
    } catch (error) {
        console.log("ERROR EN FUNCION 'selectDevice'");
        console.log(error);
        return false;
    }
}

/**
 * Funciones de las reglas para salvar
 */

//get templates
async function getTemplates(userId) {
    try {
        const templates = await Template.find({ userId: userId });
        return templates;
    } catch (error) {
        return false;
    }
}

//get saver rules consulta a moongose
async function getSaverRules(userId) {
    try {
        const rules = await SaverRule.find({ userId: userId });
        return rules;
    } catch (error) {
        return false;
    }
}

//create saver rule
async function createSaverRule(userId, dId, status) {


    try {
        const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/rules";

        const topic = userId + "/" + dId + "/+/sdata";

        const rawsql = "SELECT topic, payload FROM \"" + topic + "\" WHERE payload.save = 1";
        
        var newRule = {
            rawsql: rawsql,
            actions: [
                {
                    name: "data_to_webserver",
                    params: {
                        $resource: global.saverResource.id,
                        payload_tmpl:'{"userId":"' + userId +'","payload":${payload},"topic":"${topic}"}'
                    }
                }
            ],
            description: "SAVER-RULE",
            enabled: status
        };

        //save rule in emqx - grabamos la regla en emqx
        const res = await axios.post(url, newRule, auth);


        if (res.status === 200 && res.data.data) {
            await SaverRule.create({
                userId: userId,
                dId: dId,
                emqxRuleId: res.data.data.id,
                status: status
            });

            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.log("Error en crear y salvar la rega en mongoose");
        console.log(error);
        return false;
    }
}

//update saver rule
async function updateSaverRuleStatus(emqxRuleId, status) {
    try {
        const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/rules/" + emqxRuleId;
    
        const newRule = {
            enabled: status
        };

        const res = await axios.put(url, newRule, auth);

        if (res.status === 200 && res.data.data) {
            await SaverRule.updateOne({ emqxRuleId: emqxRuleId }, { status: status });
            console.log("El estado de la regla se a actualizado...".green);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        return false;
    }
}

//delete saver rule
async function deleteSaverRule(dId) {
    try {
        const mongoRule = await SaverRule.findOne({ dId: dId });
        
        const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/rules/" + mongoRule.emqxRuleId;

        const emqxRule = await axios.delete(url, auth);
        
        const deleted = await SaverRule.deleteOne({ dId: dId });

    return true;
  } catch (error) {
    console.log("Error deleting saver rule");
    console.log(error);
    return false;
  }
}

//delete ALL alarm Rules...
async function deleteAllAlarmRules(userId, dId) {
  try {
    const rules = await AlarmRule.find({ userId: userId, dId: dId });

    if (rules.length > 0) {
      asyncForEach(rules, async rule => {
        const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/rules/" + rule.emqxRuleId;
        const res = await axios.delete(url, auth);
      });

      await AlarmRule.deleteMany({ userId: userId, dId: dId });
    }
        
        return true;
    } catch (error) {
        console.log(error);
        return "error";
    }
}

// We can solve this by creating our own asyncForEach() method:
// thanks to Sebastien Chopin - Nuxt Creator :)
// https://codeburst.io/javascript-async-await-with-foreach-b6ba62bbf404
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

//delete ALL emqx device  auth rules
async function deleteMqttDeviceCredentials(dId) {
  try {
    await EmqxAuthRule.deleteMany({ dId: dId, type: "device" });

    return true;
  } catch (error) {
    console.log(error);
        return false;
    }
}

function makeid(length) {

    try {
    var result = "";
    var characters ="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
} catch (error) {
    console.log(error);
}

}

module.exports = router; 