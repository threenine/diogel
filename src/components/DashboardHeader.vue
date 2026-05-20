<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import AccountDropdown from 'components/AccountDropdown/Index.vue';


const route = useRoute();

const routeTitleOverrides: Record<string, string> = {
  'edit-account': 'Edit Account',
  'view-key': 'View Key',
  'import-key': 'Import Key',
  'add-new-key': 'Add New Key',
};

const pageTitle = computed(() => {
  const routeName = typeof route.name === 'string' ? route.name : '';

  if (routeName && routeTitleOverrides[routeName]) {
    return routeTitleOverrides[routeName];
  }

  if (routeName) {
    return routeName
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  const pathSegment = route.path
    .split('/')
    .filter(Boolean)[0];

  if (!pathSegment) {
    return 'Dashboard';
  }

  return pathSegment.charAt(0).toUpperCase() + pathSegment.slice(1);
});

</script>

<template>
  <q-header class="dashboard-topbar">
    <q-toolbar class="dashboard-topbar__toolbar">
      <div class="dashboard-topbar__brand">
      </div>
      <q-toolbar-title class="dashboard-topbar__title">{{ pageTitle }}</q-toolbar-title>
      <div class="dashboard-topbar__account"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
