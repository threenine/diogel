<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useVault } from 'src/composables/useVault';

type NavigationRouteName =
  | 'dashboard'
  | 'keys'
  | 'profile'
  | 'relays'
  | 'settings'
  | 'logs'
  | 'edit-account';
type ProfileTab = 'profile' | 'images';

interface NavigationTarget {
  name: NavigationRouteName;
  query?: {
    tab?: ProfileTab;
  };
}

interface NavigationItem {
  id: 'dashboard' | 'keys' | 'profile' | 'relays' | 'logs' | 'settings';
  icon: string;
  label: string;
  caption: string;
  target: NavigationTarget;
  isActive: () => boolean;
}

const { handleLock } = useVault();
const { t } = useI18n();
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

const routeName = computed(() => (typeof route.name === 'string' ? route.name : ''));

const navigationItems = computed<NavigationItem[]>(() => [
  {
    id: 'dashboard',
    icon: 'dashboard',
    label: t('navigation.dashboard.label'),
    caption: t('navigation.dashboard.caption'),
    target: { name: 'dashboard' },
    isActive: () => routeName.value === 'dashboard',
  },
  {
    id: 'keys',
    icon: 'key',
    label: t('navigation.keys.label'),
    caption: t('navigation.keys.caption'),
    target: { name: 'keys' },
    isActive: () => routeName.value === 'edit-account' || routeName.value === 'keys',
  },
  {
    id: 'profile',
    icon: 'person',
    label: t('navigation.profile.label'),
    caption: t('navigation.profile.caption'),
    target: { name: 'profile', query: { tab: 'profile' } },
    isActive: () => routeName.value === 'profile',
  },
  {
    id: 'relays',
    icon: 'hub',
    label: t('navigation.relays.label'),
    caption: t('navigation.relays.caption'),
    target: { name: 'relays' },
    isActive: () => routeName.value === 'relays',
  },
  {
    id: 'logs',
    icon: 'flaky',
    label: t('navigation.logs.label'),
    caption: t('navigation.logs.caption'),
    target: { name: 'logs' },
    isActive: () => routeName.value === 'logs',
  },
  {
    id: 'settings',
    icon: 'settings',
    label: t('navigation.settings.label'),
    caption: t('navigation.settings.caption'),
    target: { name: 'settings' },
    isActive: () => routeName.value === 'settings',
  },
]);

function navigateTo(item: NavigationItem) {
  if (item.isActive()) {
    return;
  }

  void router.push(item.target);

  if (props.vertical) {

    return;
  }
}
</script>

<template>
  <q-list v-if="vertical" class="main-navigation main-navigation--vertical">
    <q-item
      v-for="item in navigationItems"
      :key="item.id"
      v-ripple
      clickable
      :active="item.isActive()"
      active-class="main-navigation__item--active"
      class="main-navigation__item"
      @click="navigateTo(item)"
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
          :key="item.id"
          v-ripple
          clickable
          :active="item.isActive()"
          active-class="main-navigation__item--active"
          class="main-navigation__item"
          @click="navigateTo(item)"
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
