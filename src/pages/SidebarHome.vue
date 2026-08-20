<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import useAccountStore from '../stores/account-store';
import ProfileView from '../components/ProfileView.vue';
import CurrentRequest from '../components/sidebar/CurrentRequest.vue';
import PendingRequestList from '../components/sidebar/PendingRequestList.vue';
import SidebarUnlock from '../components/sidebar/SidebarUnlock.vue';
import { useActiveTab } from '../composables/useActiveTab';
import { useApprovalQueue } from '../composables/useApprovalQueue';
import useVaultStore from '../stores/vault-store';
import type { ApprovalDuration } from 'app/src-bex/types/background';

defineOptions({ name: 'SidebarHome' });

const { t } = useI18n();
const accountStore = useAccountStore();
const { activeOrigin } = useActiveTab();
const vaultStore = useVaultStore();
const { pending, current, content, decide, refresh } = useApprovalQueue();

const busy = ref(false);

/**
 * Body precedence from the interaction specification §3: unlock, then the current request, then
 * the pending list, then the idle view.
 */
const showUnlock = computed(() => !vaultStore.isUnlocked);

async function onDecide(id: string, approved: boolean, duration: ApprovalDuration): Promise<void> {
  busy.value = true;
  try {
    await decide(id, approved, duration);
  } finally {
    busy.value = false;
  }
}

async function onSelect(id: string): Promise<void> {
  await sendPresent(id);
}

async function sendPresent(id: string): Promise<void> {
  const target = pending.value.find((request) => request.id === id);
  if (!target) return;
  current.value = target;
  await refresh();
}

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((key) => key.alias === activeAlias);
});

function openInTab(path: string): void {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}

onMounted(async () => {
  await accountStore.getKeys();
});
</script>

<template>
  <q-page class="sidebar-home">
    <!-- Unlock takes precedence over everything, and names any waiting request (S5, S15). -->
    <SidebarUnlock
      v-if="showUnlock"
      :waiting-request="current"
      @reject="(id) => onDecide(id, false, 'once')"
    />

    <template v-else-if="current">
      <CurrentRequest
        :request="current"
        :content="content"
        :busy="busy"
        @decide="onDecide"
      />
      <PendingRequestList
        :requests="pending"
        :current-id="current.id"
        @select="onSelect"
      />
    </template>

    <template v-else>
    <!-- Idle view: shown only when the vault is unlocked and nothing is waiting. -->
    <section v-if="activeOrigin" class="sidebar-home__context" :aria-label="t('sidebar.activeSite.ariaLabel')">
      <div class="sidebar-home__context-label">{{ t('sidebar.activeSite.label') }}</div>
      <div class="sidebar-home__context-origin">{{ activeOrigin }}</div>
    </section>

    <!-- The lock action lives in the header, so it stays reachable once a request is presented. -->
    <div v-if="activeStoredKey" class="sidebar-home__account">
      <ProfileView :stored-key="activeStoredKey" />
    </div>

    <div v-else class="sidebar-home__empty">
      <q-icon color="grey-5" name="account_circle" size="3em" />
      <div class="text-subtitle1 text-grey-7 q-mt-sm">{{ t('account.noActiveAccount') }}</div>
      <p class="text-grey-6">{{ t('account.noActiveAccountDesc') }}</p>
      <q-btn
        no-caps
        class="diogel-btn-primary"
        :label="t('sidebar.links.keys')"
        @click="openInTab('/keys')"
      />
    </div>
    </template>
  </q-page>
</template>

<style scoped>
/*
 * The panel column is inset once, here. The request components used to add 12px of their own on
 * top of this, so request content sat 24px from each edge and cost 48px of a 320px floor, while
 * the idle view sat at 12px — an inset that changed with the state on screen.
 */
.sidebar-home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  min-width: 0;
}

.sidebar-home__context {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  min-width: 0;
}

.sidebar-home__context-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted, #888);
}

/* Origins can be long and must never force the panel to scroll sideways. */
.sidebar-home__context-origin {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.sidebar-home__account {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.sidebar-home__empty {
  text-align: center;
  padding: 24px 8px;
}
</style>
