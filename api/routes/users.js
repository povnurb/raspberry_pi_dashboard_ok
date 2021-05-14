const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const {checkAuth} = require('../middlewares/authentication');

import EmqxAuthRule from '../models/emqx_auth';
//importando modelos
import User from '../models/user';

//post -> req.body
//get -> req.query 

//login
//ruta para login de usuario, viene por body
router.post("/login",async(req,res)=>{

    const email = req.body.email; //en el body esta el email
    const password = req.body.password; //en el body esta el password sin encriptar

    var user = await User.findOne({
        email: email
    });

    if(!user){
        const toSend = {
            status:"error", //Error
            error:"Credenciales invalidas"
        }
        
        return res.status(401).json(toSend); //401 error con las credenciales
    }
    // a Continuacion cuando si existe un usuario 
    //comparacion de contraseñas
    if(bcrypt.compareSync(password, user.password)){

        user.set('password', undefined,{strict: false});

        const token =jwt.sign({userData:user},'securePasswordHere',{expiresIn: 60*60*24*1}); //espira en 24 hrs
        
        const toSend = {
            status:"Exito", //success este podria ser ya que puse Exito para el login
            token:token,
            userData:user
        }

        return res.json(toSend);

    }else{
        const toSend = {
            status:"error", //Error
            error:"Credenciales validas"
        }
        
        return res.status(401).json(toSend); //401 credenciales invalidas
    }
   

});
//register
//ruta para registrar usuario viene por body
router.post("/register",async(req,res)=>{

    try {

        const password = req.body.password;
        const name = req.body.name;
        const email= req.body.email;
        const encryptedPassword = bcrypt.hashSync(password, 10);

        const newUser = {
            name: name,
            email: email,
            password: encryptedPassword
        };

        var user = await User.create(newUser);

        console.log(user);

        const toSend = {
            status: "success"
        };
        res.status(200).json(toSend);
    } catch (error) {
        console.log("Error en el register endpoint que se encuentra en api/routers/users.js ");
        console.log(error);
        const toSend = {
            status: "error",
            error: error
        };
        console.log(toSend);
        return res.status(500).json(toSend);
    }

    
});

//GET MQTT WEB CREDENTIALS
router.post("/getmqttcredentials", checkAuth, async(req,res)=>{

    try {
        const userId = req.userData._id;

        const credentials = await getWebUserMqttCredentials(userId);
        
        const toSend = {
            status: "success",
            username: credentials.username,
            password: credentials.password
        };

        res.json(toSend);

        //esta funcion engaña si alguien quiere robar las credenciales para conectarse al mqtt
        setTimeout(() => {
            getWebUserMqttCredentials(userId);
          }, 5000);

          return;
    } catch (error) {
        console.log(error);
        const toSend = {
            status:"error"
        };
        return res.status(500).json(toSend);
    }
});

//Get mqtt credentials for reconnection
router.post("/getmqttcredentialsforreconnection", checkAuth, async(req,res)=>{

    try {
        const userId = req.userData._id;
        const credentials = await getWebUserMqttCredentialsForReconnection(userId); ///---------------
        
        const toSend = {
            status: "success",
            username: credentials.username,
            password: credentials.password
        }

        res.json(toSend);

        //esta funcion engaña si alguien quiere robar las credenciales para conectarse al mqtt
        setTimeout(() => {
            getWebUserMqttCredentials(userId);
          }, 10000);

          //return //este return no lo puso pero si va


    } catch (error) {
        console.log(error);
        const toSend = {
            status:"error"
        };
        return res.status(500).json(toSend);
    }

    
});

/**
 * Funciones
 */

//mqtt credential type: "user", "device", "superuser"
async function getWebUserMqttCredentials(userId){

    try {
        var rule = await EmqxAuthRule.find({type:"user", userId: userId});
    if (rule.length == 0){
        const newRule = {
            userId:userId,
            username: makeid(10),
            password: makeid(10),
            publish: [userId + "/#"], //video 181
            subscribe: [userId + "/#"], //talvez hay que quitar el userId cambiar a +/#
            type: "user",
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

    const result = await EmqxAuthRule.updateOne({type:"user", userId: userId},{$set:{username: newUserName, password: newPassword, updatedTime: Date.now()}});

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

async function getWebUserMqttCredentialsForReconnection(userId){

    try{
        const rule = await EmqxAuthRule.find({type: "user", userId: userId});

    if (rule.length == 1){
        const toReturn = {
            username: rule[0].username,
            password: rule[0].password
        }
        return toReturn;
    }
    } catch (error) {
        console.log(error);
        return false;
    }
    
}

function makeid(length) {
    var result= '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i=0; i< length; i++){
        result += characters.charAt(Math.floor(Math.random()*charactersLength));
    }
    return result;
}

module.exports = router;