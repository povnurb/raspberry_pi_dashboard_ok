<template>
    <div class="row"><h3></h3></div>
</template>

<script>
    // manda a la pagina de panel
    export default {
        middleware:"notAuthenticated",
        mounted(){
            $nuxt.$router.push("/panel");
        }
    }
</script>
