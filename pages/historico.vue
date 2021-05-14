<template>
    <div>
        <h2>
            Historico de Alarmas
        </h2>
        
        <!-- ALARMS TABLE-->
        <div class="row" v-if="$store.state.devices.length > 0">
          <div class="col-sm-12">
            <card>
              <!-- <div slot="header">
                <h4 class="card-tittle">Historico de Alarmas</h4>
              </div> -->
              <el-table v-if="$store.state.notifications.length > 0" 
                :data="$store.state.notifications">

                <el-table-column min-width="50" label="#" align="center">
                  <div class="photo" slot-scope="{$index}">
                    {{$index + 1}}
                  </div>
                </el-table-column>
                <el-table-column prop="variableFullName" label="Variable"></el-table-column>
                <el-table-column prop="payload.value" label="Valor limite"></el-table-column>
                <el-table-column prop="condition" label="Condición"></el-table-column>
                <el-table-column prop="value" label="Valor"></el-table-column>
                <el-table-column prop="time" label="Id"></el-table-column>

                <el-table-column header-align="right" align="right" label="Accion">
                  <div slot-scope="{row,}" class="text-right table-actions warning">

                    <!-- <el-tooltip content="Delete" effect="ligth" placement="top">
                      <base-button @click="deleteAlarm(row)" type="danger" icon size="sm" class="btn-link">
                        <i class="tim-icons icon-simple-remove "></i>
                      </base-button>
                    </el-tooltip> -->

                    <el-tooltip content="Rule Status" style="margin-left: 20px;">
                      <i class="fas fa-exclamation-triangle" :class="{'text-warning': row.status}"></i>
                    </el-tooltip>

                    <!--no ato row.status al v model por que al cambiar de status cambiaria directo sobre store-->
                    
                  </div>
                </el-table-column>
              </el-table>
              <h4 v-else class="card-title">No Existen Alarmas </h4>
            </card>
          </div>
        </div>
    </div>
</template>
<script>
import { Select, Option } from "element-ui";
import { Table, TableColumn } from "element-ui";
import Card from '../components/Cards/Card.vue';
import BaseButton from '../components/BaseButton.vue';
import BaseSwitch from '../components/BaseSwitch.vue';

export default {
  middleware: "authenticated",
  components: {
    Card,
    BaseButton,
    BaseSwitch,
    [Option.name]: Option,
    [Select.name]: Select,
    [Table.name]: Table,
    [TableColumn.name]: TableColumn
  },
  data() {
    return {
      alarmRules: [],
      selectedWidgetIndex: null,
      newRule: {
        dId: null,
        status: true,
        variableFullName: null,
        variable: null,
        value: null,
        condition: null,
        triggerTime: null
      }
    };
  },
  mounted(){   
    this.$store.dispatch("getNotifications");
  },
  methods: {

    unixToDate(ms){
      var d = new Date(parseInt(ms)),
        yyyy = d.getFullYear(),
        mm = ('0' + (d.getMonth()+1)).slice(-2),
        dd = ('0' + d.getDate()).slice(-2),
        hh = d.getHours(),
        dia = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"],
        sub = d.getDay(ms),
        h = hh,
        min = ('0'+d.getMinutes()).slice(-2),
        ampm = 'AM',
        time;
        

        time= dia[sub-1] + " " + dd + '/' + mm + '/' + yyyy + ', ' + h + ':' + min;
        return time;
    },

    deleteAlarm(rule) {

    //   const axiosHeaders = {
    //     headers: {
    //       token: this.$store.state.auth.token
    //     },
    //     params: {
    //       emqxRuleId: rule.emqxRuleId
    //     }
    //   };

    //   this.$axios
    //     .delete("/alarm-rule", axiosHeaders)
    //     .then(res => {
    //        if (res.data.status == "success") {
    //         this.$notify({
    //           type: "success",
    //           icon: "tim-icons icon-check-2",
    //           message: "Success! Alarm Rule was deleted"
    //         });
    //         this.$store.dispatch("getDevices");
    //         return;
    //       }
    //     })
    //     .catch(e => {
    //       this.$notify({
    //         type: "danger",
    //         icon: "tim-icons icon-alert-circle-exc",
    //         message: "Error"
    //       });
    //       console.log(e);
    //       return;
    //     });
    },

  }
  
};
</script>