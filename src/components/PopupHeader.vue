<script lang="ts" setup>


import AccountList from 'components/AccountList.vue';
</script>

<template>
  <div class="q-pa-md q-gutter-sm">
  <q-header elevated class="row items-center">
    <q-img alt="Diogel"
           src="https://res.cloudinary.com/threenine-co-uk/image/upload/v1690313878/diogel_artpfy.png"
           title="Diogel"
           style="height: 40px; max-width: 40px"
           class="q-ma-md q-pa-xs"

    />
    <q-space />
    <account-list />
  </q-header>
  </div>
</template>

<style scoped></style>
