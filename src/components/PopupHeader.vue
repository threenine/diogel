<script lang="ts" setup>
import AccountList from 'components/AccountList.vue';
</script>

<template>
  <div>
    <q-header class="row items-center" >
      <div class="text-h6">
        <q-img src="/images/diogel.svg" style="width: 35px; height: 35px" />
      </div>

      <q-space />
      <div class="q-pr-md"><account-list /></div>
    </q-header>
  </div>
</template>

<style scoped></style>
