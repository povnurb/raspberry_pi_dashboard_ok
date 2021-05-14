const express = require('express');
const router = express.Router();
const axios = require('axios');
const colors = require('colors');


import EmqxAuthRule from "../models/emqx_auth.js";

const auth = {
    auth: {
        username: 'admin',
        password: process.env.EMQX_DEFAULT_APPLICATION_SECRET
    }
};

global.saverResource = null;
global.alarmResource = null;

// ****************************************
// ******** EMQX RESOURCES MANAGER ********
// ****************************************

//https://docs.emqx.io/en/broker/v4.1/advanced/http-api.html#response-code

//lista de recursos
async function listResources() {

try {
    const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/resources/";

    const res = await axios.get(url, auth);

    const size = res.data.data.length;

    if (res.status === 200) {

        if (size == 0) {
            console.log('*****  CREATING EMQX WEBHOOK RESOURCES *****'.green);

            createResources();
        } else if (size == 2) {
            res.data.data.forEach(resource => {
                if (resource.description == "alarm-webhook") {
                    global.alarmResource = resource;
    
                    console.log("ALARM RESOURCE OK".bgMagenta);
                    console.log(global.alarmResource);
                    console.log("ALARM RESOURCE OK".bgMagenta);
                    console.log("\n");
                    console.log("\n");
                }

                if (resource.description == "saver-webhook") {
                    global.saverResource = resource;
    
                    console.log("SAVER RESOURCE OK".bgMagenta);
                    console.log(global.saverResource);
                    console.log("SAVER RESOURCE OK".bgMagenta);
                    console.log("\n");
                    console.log("\n");
                }
            });
        } else {
            function printWarning() {
                console.log("ERROR BORRA TODO LOS RECURSOS A MANO Y REINICIA NODE - youremqxdomain:8085/#/resources".red);
                setTimeout(() => {
                    printWarning();
                }, 1000);
            }
    
            printWarning();
        }
    }else{
        console.log("Error en emqx api");
    }
} catch (error) {
    console.log("Error listing emqx recursos");
    console.log(error);
}

    


}

//crear recursos
async function createResources(){

    try {
        const url = "http://"+process.env.EMQX_NODE_HOST+":8085/api/v4/resources";

        const data1 = {
            "type": "web_hook",
            "config": {
                url: "http://"+process.env.EMQX_NODE_HOST+":3001/api/saver-webhook",
                headers: {
                    token: process.env.EMQX_API_TOKEN
                },
                method: "POST"
            },
            description: "saver-webhook"
        }

        const data2 = {
            "type": "web_hook",
            "config": {
                url: "http://"+process.env.EMQX_NODE_HOST+":3001/api/alarm-webhook",
                headers: {
                    token: process.env.EMQX_API_TOKEN
                },
                method: "POST"
            },
            description: "alarm-webhook"
        }

        const res1 = await axios.post(url, data1, auth);

        if (res1.status === 200){
            console.log("Recurso Grabador creado".green);
        }

        const res2 = await axios.post(url, data2, auth);

        if (res2.status === 200){
            console.log("Recurso Alarmas creado".green);
        }

        setTimeout(() => {
            console.log("***** EMQX WH recursos creados!! *****".green);
            listResources();
        }, 1000);    
    } catch (error) {
        console.log("Error al crear los recursos EMQX");
        console.log(error);
    }
    


}




//check super user
global.check_mqtt_superuser = async function checkMqttSuperUser(){

    try {
        const superusers = await EmqxAuthRule.find({type:"superuser"});

        if (superusers.length > 0 ) {

            return;

        }else if ( superusers.length == 0 ) {

            await EmqxAuthRule.create(
                {
                    publish: ["#"],
                    subscribe: ["#"],
                    userId: "LALOSANCHEZCORONA",
                    username: "superuser",
                    password: "superuser",
                    type: "superuser",
                    time: Date.now(),
                    updatedTime: Date.now()
                }
            );

            console.log("Mqtt super user creado");

        }
    } catch (error) {
        console.log("error creating mqtt superuser");
        console.log(error);
    }
}



setTimeout(() => {
    listResources();
}, process.env.EMQX_RESOURCES_DELAY);

module.exports = router;
