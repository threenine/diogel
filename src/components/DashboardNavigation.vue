<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useVault } from 'src/composables/useVault';

type NavigationRouteName =
  | 'dashboard'
  | 'keys'
  | 'view-key'
  | 'import-key'
  | 'add-new-key'
  | 'profile'
  | 'relays'
  | 'settings'
  | 'event-history'
  | 'edit-account';
type ProfileTab = 'profile' | 'images';

interface NavigationTarget {
  name: NavigationRouteName;
  query?: {
    tab?: ProfileTab;
  };
}

interface NavigationItem {
  id: 'dashboard' | 'keys' | 'profile' | 'relays' | 'event-history' | 'settings';
  icon: string;
  label: string;
  caption: string;
  target: NavigationTarget;
  isActive: () => boolean;
}

interface UtilityLinkItem {
  id: 'support' | 'documentation';
  icon: string;
  label: string;
  caption: string;
  href: string;
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
const appVersion = process.env.APP_VERSION;

const utilityLinks = computed<UtilityLinkItem[]>(() => [
  {
    id: 'support',
    icon: 'support_agent',
    label: t('navigation.support.label'),
    caption: t('navigation.support.caption'),
    href: '#',
  },
  {
    id: 'documentation',
    icon: 'description',
    label: t('navigation.documentation.label'),
    caption: t('navigation.documentation.caption'),
    href: '#',
  },
]);

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
    isActive: () =>
      routeName.value === 'keys' ||
      routeName.value === 'view-key' ||
      routeName.value === 'import-key' ||
      routeName.value === 'add-new-key' ||
      routeName.value === 'edit-account',
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
    id: 'event-history',
    icon: 'flaky',
    label: t('navigation.logs.label'),
    caption: t('navigation.logs.caption'),
    target: { name: 'event-history' },
    isActive: () => routeName.value === 'event-history' || routeName.value === 'logs',
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

function openNewSignature() {
  void router.push({ name: 'dashboard', hash: '#quick-sign' });
}

function openUtilityLink(item: UtilityLinkItem) {
  if (item.href === '#') {
    return;
  }

  window.open(item.href, '_blank', 'noopener,noreferrer');
}
</script>

<template>
  <q-list v-if="vertical" class="main-navigation main-navigation--vertical">
    <div class="main-navigation__brand">
      <img src="/images/diogel.svg" alt="Diogel" class="main-navigation__brand-logo" />
      <div class="main-navigation__brand-content">
        <p class="main-navigation__brand-title">Diogel</p>
        <p class="main-navigation__brand-version">{{ t('footer.version') }} {{ appVersion }}</p>
      </div>
    </div>

    <div class="main-navigation__primary-list">
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
    </div>

    <div class="main-navigation__footer">
      <q-btn
        color="primary"
        class="main-navigation__new-signature"
        icon="edit_note"
        no-caps
        unelevated
        :label="t('navigation.newSignature')"
        @click="openNewSignature"
      />

      <q-separator class="main-navigation__separator" />

      <q-item
        v-for="item in utilityLinks"
        :key="item.id"
        v-ripple
        clickable
        :disable="item.href === '#'"
        class="main-navigation__item"
        @click="openUtilityLink(item)"
      >
        <q-item-section avatar>
          <q-icon :name="item.icon" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ item.label }}</q-item-label>
          <q-item-label caption>{{ item.caption }}</q-item-label>
        </q-item-section>
      </q-item>

      <q-item v-ripple clickable class="main-navigation__item" @click="handleLock">
        <q-item-section avatar>
          <q-icon name="lock" size="sm" />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ t('navigation.lock.label') }}</q-item-label>
          <q-item-label caption>{{ t('navigation.lock.caption') }}</q-item-label>
        </q-item-section>
      </q-item>
    </div>
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

        <q-item v-ripple clickable class="main-navigation__item" @click="openNewSignature">
          <q-item-section avatar>
            <q-icon name="edit_note" size="sm" />
          </q-item-section>
          <q-item-section>{{ t('navigation.newSignature') }}</q-item-section>
        </q-item>

        <q-item
          v-for="item in utilityLinks"
          :key="item.id"
          v-ripple
          clickable
          :disable="item.href === '#'"
          class="main-navigation__item"
          @click="openUtilityLink(item)"
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" size="sm" />
          </q-item-section>
          <q-item-section>{{ item.label }}</q-item-section>
        </q-item>

        <q-item v-ripple clickable class="main-navigation__item" @click="handleLock">
          <q-item-section avatar>
            <q-icon name="lock" size="sm" />
          </q-item-section>
          <q-item-section>{{ t('navigation.lock.label') }}</q-item-section>
        </q-item>
      </q-list>
    </q-menu>
  </q-btn>
</template>

<style scoped></style>
