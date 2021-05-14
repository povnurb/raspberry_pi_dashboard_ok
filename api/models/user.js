import mongoose from 'mongoose';
const uniqueValidator = require('mongoose-unique-validator');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required:[true]},
    email:{ type: String, required:[true], unique: true},
    password: {type: String, required:[true]}
});

//validacion
userSchema.plugin(uniqueValidator,{message:'Error, email ya existe'});

//para convertir en modelo
const user = mongoose.model('user', userSchema);

export default user;