//require
const express = require('express');//servidor
const morgan = require("morgan"); //permite ver quien esta golpeando a los endpoint existan o no
const cors = require("cors");
const mongoose = require("mongoose");//libreria que permite interactuar con mongo
const colors = require("colors");//console log coloridos

require('dotenv').config();

//instancias
const app = express();

//configuracion de express
app.use(morgan("tiny")); //midlewar version tiny
app.use(express.json()); //permite trabajar con archivos json
app.use(cors());//politicas de acceso
app.use(express.urlencoded({
    extended: true //para abilitar el pase de parametros
}));

app.use(cors());

//rutas express
app.use('/api', require('./routes/devices'));
app.use('/api', require('./routes/users'));
app.use('/api', require('./routes/templates'));
app.use('/api', require('./routes/webhooks'));
app.use('/api', require('./routes/emqxapi'));
app.use('/api', require('./routes/alarms'));
app.use('/api', require('./routes/dataprovider'));

module.exports = app;

//listener (escuchando cualquier peticion)
app.listen(process.env.API_PORT,()=>{
    console.log("API server en desarrollo escuchando por el puerto " + process.env.API_PORT);
});





//Conexion con Mongo setiados cuando setiados cuando nace el contenedor
const mongoUserName = process.env.MONGO_USERNAME;
const mongoPassword = process.env.MONGO_PASSWORD;
const mongoHost = process.env.MONGO_HOST;
const mongoPort = process.env.MONGO_PORT;
const mongoDatabase = process.env.MONGO_DATABASE; //la base de datos

//uri de conexion
var uri = "mongodb://" + mongoUserName + ":" + mongoPassword + "@" + mongoHost + ":" + mongoPort + "/" + mongoDatabase;

const options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    authSource:"admin"
};


mongoose.connect(uri, options).then(()=>{
    console.log("\n");
    console.log("**********************************".green);
    console.log("✔ Conectado a Mongo Correctamente".yellow);
    console.log("**********************************".green);
    console.log("\n");
    global.check_mqtt_superuser();
},(err)=>{
    console.log("\n");
    console.log("**********************************".red);
    console.log("  x falla al conectar al Mongo".red);
    console.log("**********************************".red);
    console.log("\n");
    console.log(err);
});


