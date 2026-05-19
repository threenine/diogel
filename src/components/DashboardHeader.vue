<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import AccountDropdown from 'components/AccountDropdown/Index.vue';

const $q = useQuasar();
const route = useRoute();

const emit = defineEmits<{
  (event: 'toggle-menu'): void;
}>();

const routeTitleOverrides: Record<string, string> = {
  'edit-account': 'Edit Account',
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

const headerLogo = computed(() => {
  return $q.dark.isActive
    ? '../../src-bex/assets/images/diogel-header-dark.png'
    : '../../src-bex/assets/images/diogel-header-light.png';
});
</script>

<template>
  <q-header class="dashboard-topbar">
    <q-toolbar class="dashboard-topbar__toolbar">
      <div class="dashboard-topbar__brand">
        <q-btn
          class="dashboard-topbar__menu-button"
          flat
          round
          dense
          icon="menu"
          aria-label="Toggle dashboard navigation"
          @click="emit('toggle-menu')"
        />
        <q-img
          class="dashboard-topbar__logo"
          :src="headerLogo"
          fit="contain"
        />
      </div>
      <q-toolbar-title class="dashboard-topbar__title">{{ pageTitle }}</q-toolbar-title>
      <div class="dashboard-topbar__account"><account-dropdown /></div>
    </q-toolbar>
  </q-header>
</template>

<style scoped></style>
