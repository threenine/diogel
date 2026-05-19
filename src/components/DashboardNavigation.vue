<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useVault } from 'src/composables/useVault';

type NavigationRouteName = 'dashboard' | 'profile' | 'settings' | 'logs';

interface NavigationItem {
  name: NavigationRouteName;
  icon: string;
  label: string;
  caption: string;
}

const { handleLock } = useVault();
const router = useRouter();
const route = useRoute();

const props = withDefaults(
  defineProps<{
    vertical?: boolean;
  }>(),
  {
    vertical: false,
  },
);

const navigationItems: NavigationItem[] = [
  {
    name: 'dashboard',
    icon: 'dashboard',
    label: 'Dashboard',
    caption: 'Overview and quick shortcuts',
  },
  {
    name: 'profile',
    icon: 'person',
    label: 'Profile',
    caption: 'Manage your account details',
  },
  {
    name: 'settings',
    icon: 'settings',
    label: 'Extension Settings',
    caption: 'Configure extension preferences',
  },
  {
    name: 'logs',
    icon: 'flaky',
    label: 'Logs',
    caption: 'Review extension activity',
  },
];

const activeRouteName = computed(() => {
  const currentRouteName = route.name;

  if (typeof currentRouteName === 'string') {
    return currentRouteName;
  }

  return '';
});

function openInTab(name: string) {
  const resolved = router.resolve({ name });
  const url = chrome.runtime.getURL(`www/index.html${resolved.href}`);
  void chrome.tabs.create({ url });
}

function navigateTo(name: NavigationRouteName) {
  if (props.vertical) {
    if (activeRouteName.value !== name) {
      void router.push({ name });
    }

    return;
  }

  openInTab(name);
}
</script>

<template>
  <q-list v-if="vertical" class="main-navigation main-navigation--vertical">
    <q-item
      v-for="item in navigationItems"
      :key="item.name"
      v-ripple
      clickable
      :active="activeRouteName === item.name"
      active-class="main-navigation__item--active"
      class="main-navigation__item"
      @click="navigateTo(item.name)"
    >
      <q-item-section avatar>
        <q-icon :name="item.icon" size="sm" />
      </q-item-section>
      <q-item-section>
        <q-item-label>{{ item.label }}</q-item-label>
        <q-item-label caption>{{ item.caption }}</q-item-label>
      </q-item-section>
    </q-item>

    <q-separator class="main-navigation__separator" />

    <q-item v-ripple clickable class="main-navigation__item" @click="handleLock">
      <q-item-section avatar>
        <q-icon name="lock" size="sm" />
      </q-item-section>
      <q-item-section>
        <q-item-label>Lock</q-item-label>
        <q-item-label caption>Lock the vault immediately</q-item-label>
      </q-item-section>
    </q-item>
  </q-list>

  <q-btn v-else class="diogel-btn-ghost" dense icon="menu" round>
    <q-menu anchor="bottom left" self="top left">
      <q-list style="max-width: 300px" class="main-navigation">
        <q-item
          v-for="item in navigationItems"
          :key="item.name"
          v-ripple
          clickable
          :active="activeRouteName === item.name"
          active-class="main-navigation__item--active"
          class="main-navigation__item"
          @click="navigateTo(item.name)"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" size="sm" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <q-separator class="main-navigation__separator" />

        <q-item v-ripple clickable class="main-navigation__item" @click="handleLock">
          <q-item-section avatar>
            <q-icon name="lock" size="sm" />
          </q-item-section>
          <q-item-section>Lock</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped></style>
