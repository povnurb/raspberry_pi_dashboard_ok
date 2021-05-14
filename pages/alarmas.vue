<template>
    <div>
        <h2>
            Reglas de Alarmas
        </h2>
        <!-- Nuevo Formulario de Alarmas -->
        <div class="row">
            <div class="col-sm-12">
                <card v-if="$store.state.devices.length > 0">

                    <div slot="header">
                        <h4 class="card-title">Crear una nueva regla de Alarma {{selectedWidgetIndex}}</h4>
                    </div>
                    <div class="row">
                        <div class="col-3">
                            <el-select required class="select-success" placeholder="Variable" v-model="selectedWidgetIndex"
                            style="margin-top: 25px;">
                                <el-option v-for="widget, index in $store.state.selectedDevice.template.widgets" :key="index" class="text-dark" :value="index" :label="widget.variableFullName"></el-option>
                            </el-select>

                        </div>
                        <div class="col-3">
                            <el-select required class="select-warning" placeholder="Condition" v-model="newRule.condition" style="margin-top: 25px;">
                                <el-option class="text-dark" value="=" label="Igual a"></el-option>
                                <el-option class="text-dark" value=">" label="Mayor que"></el-option>
                                <el-option class="text-dark" value=">=" label="Mayor igual a"></el-option>
                                <el-option class="text-dark" value="<" label="Menor que"></el-option>
                                <el-option class="text-dark" value="<=" label="Menor igual a"></el-option>
                                <el-option class="text-dark" value="!=" label="Diferente a"></el-option>
                            </el-select>
                        </div>
                        <div class="col-3">
                            <base-input label="Valor" v-model="newRule.value" type="number"></base-input>
                        </div>
                        <div class="col-3">
                            <base-input label="Tiempo de rebote en minutos" v-model="newRule.triggerTime" type="number"></base-input>
                        </div>
                    </div>
                    <br><br>
                    <div class="row pull-right">
                        <div class="col-12">
                            <base-button @click="createNewRule()" native-type="submit" type="primary" class="mb-3" size="lg" :disabled="$store.state.devices.length == 0">
                                Agregar regla de Alarma
                            </base-button>
                        </div>

                    </div>
                </card>
                <card v-else>
                    Necesitas seleccionar un dispositivo para crear una Alarma

                </card>
            </div>

        </div>
        
        <!-- ALARMS TABLE-->
        <div class="row" v-if="$store.state.devices.length > 0">
          <div class="col-sm-12">
            <card>
              <div slot="header">
                <h4 class="card-tittle">Reglas de Alarmas</h4>
              </div>
              <el-table v-if="$store.state.selectedDevice.alarmRules.length > 0" 
                :data="$store.state.selectedDevice.alarmRules">

                <el-table-column min-width="50" label="#" align="center">
                  <div class="photo" slot-scope="{row, $index}">
                    {{$index + 1}}
                  </div>
                </el-table-column>
                <el-table-column prop="variableFullName" label="Nombre de la Variable"></el-table-column>
                <el-table-column prop="variable" label="Variable"></el-table-column>
                <el-table-column prop="condition" label="Condición"></el-table-column>
                <el-table-column prop="value" label="Valor"></el-table-column>
                <el-table-column prop="triggerTime" label="Trigger Time"></el-table-column>
                <el-table-column prop="counter" label="Disparos"></el-table-column>

                <el-table-column header-align="right" align="right" label="Acciones">
                  <div slot-scope="{row, $index}" class="text-right table-actions">

                    <el-tooltip content="Delete" effect="ligth" placement="top">
                      <base-button @click="deleteDevice(row)" type="danger" icon size="sm" class="btn-link">
                        <i class="tim-icons icon-simple-remove "></i>
                      </base-button>
                    </el-tooltip>

                    <el-tooltip content="Rule Status" style="margin-left: 20px;">
                      <i class="fas fa-exclamation-triangle" :class="{'text-warning': row.status}"></i>
                    </el-tooltip>

                    <!--no ato row.status al v model por que al cambiar de status cambiaria directo sobre store-->
                    <el-tooltip content="Change Rule Status" style="margin-left: 5px;">
                      <base-switch @click="updateStatusRule(row)" :value="row.status" type="primary" on-text="ON"
                        off-text="OFF" style="margin-top: 10px;"></base-switch>
                    </el-tooltip>
                  </div>
                </el-table-column>
              </el-table>
              <h4 v-else class="card-title">No Existen Reglas </h4>
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
        deviceName: null,
        status: true,
        variableFullName: null,
        variable: null,
        value: null,
        condition: null,
        triggerTime: null
      }
    };
  },
  methods: {

    deleteDevice(rule) {

      const axiosHeaders = {
        headers: {
          token: this.$store.state.auth.token
        },
        params: {
          emqxRuleId: rule.emqxRuleId
        }
      };

      this.$axios
        .delete("/alarm-rule", axiosHeaders)
        .then(res => {
           if (res.data.status == "success") {
            this.$notify({
              type: "success",
              icon: "tim-icons icon-check-2",
              message: "Success! Alarm Rule was deleted"
            });
            this.$store.dispatch("getDevices");
            return;
          }
        })
        .catch(e => {
          this.$notify({
            type: "danger",
            icon: "tim-icons icon-alert-circle-exc",
            message: "Error"
          });
          console.log(e);
          return;
        });
    },

    updateStatusRule(rule) {
      const axiosHeaders = {
        headers: {
          token: this.$store.state.auth.token
        }
      };

      var ruleCopy = JSON.parse(JSON.stringify(rule));

      ruleCopy.status = !ruleCopy.status;

      const toSend = { rule: ruleCopy };

      this.$axios
        .put("/alarm-rule", toSend, axiosHeaders)
        .then(res => {
          if (res.data.status == "success") {
            this.$notify({
              type: "success",
              icon: "tim-icons icon-check-2",
              message: "Success! Alarm Rule was updated"
            });

            this.$store.dispatch("getDevices");

            return;
          }
        })
        .catch(e => {
          this.$notify({
            type: "danger",
            icon: "tim-icons icon-alert-circle-exc",
            message: "Error"
          });
          console.log(e);
          return;
        });
    },

    createNewRule() {
      if (this.selectedWidgetIndex == null) {
        this.$notify({
          type: "warning",
          icon: "tim-icons icon-alert-circle-exc",
          message: " Variable must be selected"
        });
        return;
      }

      if (this.newRule.condition == null) {
        this.$notify({
          type: "warning",
          icon: "tim-icons icon-alert-circle-exc",
          message: " Condition must be selected"
        });
        return;
      }

      if (this.newRule.value == null) {
        this.$notify({
          type: "warning",
          icon: "tim-icons icon-alert-circle-exc",
          message: " Value is empty"
        });
        return;
      }

      if (this.newRule.triggerTime == null) {
        this.$notify({
          type: "warning",
          icon: "tim-icons icon-alert-circle-exc",
          message: " Trigger Time is empty"
        });
        return;
      }

      this.newRule.dId = this.$store.state.selectedDevice.dId;
      this.newRule.deviceName = this.$store.state.selectedDevice.name;
      this.newRule.variableFullName = this.$store.state.selectedDevice.template.widgets[
        this.selectedWidgetIndex
      ].variableFullName;
      this.newRule.variable = this.$store.state.selectedDevice.template.widgets[
        this.selectedWidgetIndex
      ].variable;

      const axiosHeaders = {
        headers: {
          token: this.$store.state.auth.token
        }
      };

      var toSend = {
        newRule: this.newRule
      };

      this.$axios.post("/alarm-rule", toSend, axiosHeaders)
          .then(res => {
            console.log(res.data.status)
            if (res.data.status == "success") {
              
              this.newRule.variable = null;
              this.newRule.condition = null;
              this.newRule.value = null;
              this.newRule.triggerTime = null;
              
              this.$notify({ type: 'success', icon: 'tim-icons icon-check-2', message: '!EXITO¡ la regla de alarma fue agregada' });
              
              this.$store.dispatch("getDevices");
              
              return;
            }

          })
          .catch(e => {
            this.$notify({ type: 'danger', icon: 'tim-icons icon-alert-circle-exc', message: 'Error' });
            console.log(e)
            return;
          });
    }
  }
};
</script>