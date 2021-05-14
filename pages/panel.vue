<template>
    <div>
        <h2>
            Panel
        </h2>
        <div class="row" v-if="$store.state.devices.length > 0">
      <div 
        v-for="(widget, index) in $store.state.selectedDevice.template.widgets" 
        :key="index" 
        :class="[widget.column]"
        >
      
        <Rtnumberchart
          v-if="widget.widget == 'numberchart'"
          :config="fixWidget(widget)"
        ></Rtnumberchart>

        <Iotswitch
          v-if="widget.widget == 'switch'"
          :config="fixWidget(widget)"
        ></Iotswitch>

        <Iotbutton
          v-if="widget.widget == 'button'"
          :config="fixWidget(widget)"
        ></Iotbutton>

        <Iotindicator
          v-if="widget.widget == 'indicator'"
          :config="fixWidget(widget)"
        ></Iotindicator>
        <!-- <Json :value="$store.state.selectedDevice.userId"></Json>
        <Json :value="$store.state.selectedDevice.dId"></Json>
        <Json :value="fixWidgetv(widget)"></Json><br><br><br> -->
      </div>
    </div>

    <div v-else>Selecciona un dispositivo...</div>
    </div>
</template>
<script>

export default {
    middleware:"authenticated",
    name: 'Dashboard',
    data() {
        return {


        }
    },

    mounted() {


    },

    methods: {

        fixWidget(widget){
      var widgetCopy = JSON.parse(JSON.stringify(widget));
      widgetCopy.selectedDevice.dId = this.$store.state.selectedDevice.dId;
      widgetCopy.selectedDevice.name = this.$store.state.selectedDevice.name;
      widgetCopy.userId = this.$store.state.selectedDevice.userId;
      
      if (widget.widget =="numberchart"){
        widgetCopy.demo = false;
      }

      return widgetCopy;
    },

    fixWidgetv(widget){
      var widgetCopyv = JSON.parse(JSON.stringify(widget));
      widgetCopyv.selectedDevice.dId = this.$store.state.selectedDevice.dId;
      return widget.variable;
    },
    
    }
    
};
</script>