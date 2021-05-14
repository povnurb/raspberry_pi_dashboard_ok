<template>
    <div>
        <h2>
            Alta de dispositivos
        </h2>
        <!-- agregar dispositivos -->
        <div class="row">
            <card>
                <div slot="header">
                    <h4 class="card-title">Agregar un nuevo dispositivo</h4>
                </div>

                <div class="row">
                    <div class="col-4">
                        <base-input label="Nombre del dispositivo:" type="text" placeholder="Ejemplos: Sala PTTI HGO, Jaltepec ..." v-model="newDevice.name">
                        </base-input>
                    </div>

                    <div class="col-4">
                        <base-input label="Identificador:" type="text" placeholder="Ejemplos: 2bd345-2021 ..." v-model="newDevice.dId">
                        </base-input>
                    </div>

                    <div class="col-4">
                        <slot name="label">
                            <label>Tema:</label>
                        </slot>
                        <el-select v-model="selectedIndexTemplate" placeholder="Selecciona un Tema" class="select-primary" style="width:100%"> 
                            <el-option v-for="template, index in templates" :key="template._id" class="text-dark" :label="template.name" :value="index"></el-option>
                            
                        </el-select>
                    </div>

                </div>

                <div class="row pull-right">
                    <div class="col-12">
                        <base-button @click="createNewDevice()" class="mb-3" size="lg">Agregar</base-button>
                    </div>
                </div>
            </card>
        </div>
        <!-- vista de dispositivos -->
        <div class="row">
            <card>
                <div slot="header">
                    <h4 class="card-title">Dispositivos</h4>
                </div>
                <el-table :data="$store.state.devices">
                    <el-table-column prop="name" label="Nombre"></el-table-column>
                    <el-table-column prop="dId" label="Dispositivo Id"></el-table-column>
                    <el-table-column prop="password" label="Password"></el-table-column>
                    <el-table-column prop="templateName" label="Tema"></el-table-column>
                    <el-table-column label="Acciones">

                        <div slot-scope="{row}">

                            [<el-tooltip content="DB" :open-delay="3000">
                                <i class="fas fa-database" style="font-size: 20px" :class="{'text-success' : row.saverRule.status,'text-dark':!row.saverRule.status}"></i>
                            </el-tooltip>]
                            
                            <el-tooltip content="Salvar en Base de Datos" :open-delay="2500" placement="top" style="margin-left:10px">
                                <base-switch 
                                    @click="updateSaverRuleStatus(row.saverRule)"
                                    :value="row.saverRule.status" 
                                    type="primary" 
                                    on-text="On" 
                                    off-text="Off"
                                    ></base-switch>
                            </el-tooltip>

                            <el-tooltip content="Borrar" effect="light" :open-delay="100" placement="right">
                                <base-button type="danger" icon size="sm" class="btn-link" @click="deleteDevice(row)">
                                    <i class="tim-icons icon-simple-remove "></i>
                                </base-button>
                            </el-tooltip>

                        </div>
                        
                        
                    </el-table-column>
                </el-table>
                
            </card>
        </div>
        <!-- <Json :value="$store.state.selectedDevice.userId"></Json> -->
        <!-- <Json :value="$store.state.devices"></Json> -->
    </div>
</template>

<script>
import { Table, TableColumn } from 'element-ui';
import { Select, Option } from 'element-ui';
import BaseSwitch from '../components/BaseSwitch.vue';


export default{
    middleware:"authenticated",
    components:{
        BaseSwitch,
        [Table.name]: Table,
        [TableColumn.name]: TableColumn,
        [Option.name]: Option,
        [Select.name]: Select
    },
    data(){
        return{
           templates: [],
           selectedIndexTemplate:null,
           newDevice:{
               name:"",
               dId: "",
               templateId: "",
               templateName: ""
           },
        };
    },
    mounted(){
        //this.$store.dispatch("getDevices"); //si hay algun error lo podemos quitar
        this.getTemplates();
    },
    methods: {
        //row.saverRule
        updateSaverRuleStatus(rule){
            //console.log("entro la funcion")
            var ruleCopy = JSON.parse(JSON.stringify(rule));

            ruleCopy.status = !ruleCopy.status;
            //console.log("se hace la inversion");
            const toSend = { rule: ruleCopy };

            const axiosHeaders = {
                headers:{
                    token: this.$store.state.auth.token //accessToken o token?
                }
            };
            //console.log("se manda axios")
            this.$axios
                .put("/saver-rule", toSend, axiosHeaders)
                .then(res=>{
                    //console.log(res.data.status);
                    //console.log("respondio axios!!!!!!")
                    if (res.data.status == "Exito"){
                        //console.log("exito deberia jalar");
                        this.$store.dispatch("getDevices");

                        this.$notify({
                            type:"success",
                            icon:"tim-icons icon-check-2",
                            message: " Dispositivo actualizado"
                        });
                    }
                    return;
                })
            .catch(e=>{
                console.log(e);
                this.$notify({
                    type:"danger",
                    icon:"tim-icons icon-alert-circle-exc",
                    message:"Error en actualizar la regla"
                });
                return;
            });
                
        },

        deleteDevice(device){
            if(confirm("¿Deseas borrar el dispositivo " + device.name + "? Esta acción no se puede deshacer")){
                const axiosHeader ={
                    headers:{
                        token: this.$store.state.auth.token
                    },
                    params:{
                        dId:device.dId
                    }
                };
                this.$axios
                    .delete("/device", axiosHeader)
                    .then(res => {
                        if(res.data.status == "Exito"){
                            this.$notify({
                                type:"success",
                                icon:"tim-icons icon-check-2",
                                message: device.name + " !Borrado¡"
                            });
                            this.$store.dispatch("getDevices");
                        }
                    })
                .catch(e=>{
                    console.log(e);
                    this.$notify({
                        type:"danger",
                        icon: "tim-icons icon-alert-circle-exc",
                        message:"Error al borrar el dispositivo "+device.name
                    });
                });
            };
        },
        //new device
        createNewDevice(){
            if(this.newDevice.name == ""){
                this.$notify({
                    type: "warning",
                    icon: "tim-icons icon-alert-circle-exc",
                    message: "El Nombre del Dispositivo esta vacio"
                });
                return;
            }
            if (this.newDevice.dId == ""){
                this.$notify({
                    type: "warning",
                    icon: "tim-icons icon-alert-circle-exc",
                    message: "El ID del Dispositivo esta vacio"
                });
                return;
            }
            if (this.selectedIndexTemplate == null){
                this.$notify({
                    type: "warning",
                    icon: "tim-icons icon-alert-circle-exc",
                    message: "Selecciona un tema"
                });
                return;
            }
            const axiosHeaders = {
                headers:{
                    token: this.$store.state.auth.token
                }
            };

            //Escribimos el Nombre y el Id del tema seleccionado en el objeto newDevice
            this.newDevice.templateId = this.templates[this.selectedIndexTemplate]._id;
            this.newDevice.templateName = this.templates[this.selectedIndexTemplate].name;

            const toSend = {
                newDevice: this.newDevice
            }

            this.$axios
                .post("/device", toSend, axiosHeaders)
                .then(res => {
                    //console.log(res.data.status);
                    if(res.data.status == "Exito"){ //probar con success no jalo, jala con Exito

                        this.$store.dispatch("getDevices");

                        this.newDevice.name = "";
                        this.newDevice.dId = "";
                        this.selectedIndexTemplate = null;

                        this.$notify({
                            type:"success",
                            icon: "tim-icons icon-check-2",
                            message: "Exito! Dispositivo Agregado"
                        });

                        return;
                    }
                })
                .catch(e => {
                    if (
                        e.response.data.status == "Error" && 
                        e.response.data.error.errors.dId.kind == "unique"
                        ){
                        this.$notify({
                            type: "warning",
                            icon: "tim-icons icon-alert-circle-exc",
                            message: "Dispositivo ya registrado en el Sistema."
                        });
                        return;
                    }else{
                        //this.showNotify("danger", "Error");
                        this.$notify({
                            type: "danger",
                            icon: "tim-icons icon-alert-circle-exc",
                            message: "error grave Error error success o Exito alta.vue 191 aprox."
                        });
                        return;
                    }
                });
        },
        //Get templates
        async getTemplates(){
            const axiosHeaders = {
                headers: {
                    token: this.$store.state.auth.token
                }
            };

        try {
            const res = await this.$axios.get("/template", axiosHeaders);
            //console.log(res.data);

            if(res.data.status == "success"){
            this.templates = res.data.data;
            }
        } catch (error) {
            this.$notify({
            type: "danger",
            icon: "tim-icons icon-alert-circle-exc",
            message: "Error favor de volver a login"
            });
            console.log(error);
            return;
        }
        },
        
        
    }
};
</script>
