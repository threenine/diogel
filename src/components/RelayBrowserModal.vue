<script lang="ts" setup>
import { ref, watch, onMounted, computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RelayCatalogEntry } from 'src/types/relay';
import { listRelayCatalog, refreshRelayCatalog, getRelayDiscoveryStatus } from 'src/services/relay-service';
import { filterAndSortRelays } from 'src/utils/relay-filters';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'select', relay: RelayCatalogEntry): void;
}>();

const relays = ref<RelayCatalogEntry[]>([]);
const loading = ref(false);
const refreshing = ref(false);
const searchText = ref('');
const searchOnly = ref(false);
let statusInterval: ReturnType<typeof setInterval> | null = null;

const filteredRelays = computed(() => {
  return filterAndSortRelays(relays.value, searchText.value, searchOnly.value);
});

async function fetchRelays() {
  if (loading.value) return;
  loading.value = true;
  try {
    relays.value = await listRelayCatalog();
    console.log(`[RelayBrowserModal] Fetched ${relays.value.length} relays`);

    // If we have very few relays (only seeds), maybe trigger a refresh
    if (relays.value.length < 10 && !refreshing.value) {
       await triggerRefresh();
    }
  } catch (error) {
    console.error('[RelayBrowserModal] Failed to fetch relays:', error);
    relays.value = [];
  } finally {
    loading.value = false;
  }
}

async function triggerRefresh(force = false) {
  if (refreshing.value) return;
  refreshing.value = true;
  try {
    await refreshRelayCatalog(force);
    startPollingStatus();
  } catch (error) {
    console.error('[RelayBrowserModal] Failed to trigger refresh:', error);
    refreshing.value = false;
  }
}

async function checkStatus() {
  try {
    const status = await getRelayDiscoveryStatus();
    if (status) {
      refreshing.value = status.isDiscoveryInProgress;
      // Refresh the list if discovery is happening or just finished
      relays.value = await listRelayCatalog();

      if (!status.isDiscoveryInProgress) {
        stopPollingStatus();
      }
    } else {
      refreshing.value = false;
      stopPollingStatus();
    }
  } catch (error) {
    console.error('[RelayBrowserModal] Failed to check status:', error);
    stopPollingStatus();
  }
}

function startPollingStatus() {
  if (statusInterval) return;
  statusInterval = setInterval(() => {
    void checkStatus();
  }, 2000);
  void checkStatus();
}

function stopPollingStatus() {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
}

onMounted(() => {
  if (props.modelValue) {
    void fetchRelays();
    void checkStatus(); // Check if discovery is already in progress
  }
});

onBeforeUnmount(() => {
  stopPollingStatus();
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      void fetchRelays();
      void checkStatus();
    } else {
      stopPollingStatus();
    }
  },
);

function getDisplayName(relay: RelayCatalogEntry) {
  try {
    return relay.metadata?.name || relay.hostname || relay.url || 'Unknown Relay';
  } catch (e) {
    console.error('[RelayBrowserModal] Error in getDisplayName:', e);
    return relay.url || 'Unknown Relay';
  }
}

function close() {
  emit('update:modelValue', false);
}

function selectRelay(relay: RelayCatalogEntry) {
  emit('select', relay);
  close();
}
</script>

<template>
  <q-dialog :model-value="props.modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card style="min-width: 400px; max-height: 80vh" class="column no-wrap">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('relays.browser.title') }}</div>
        <q-spacer />
        <q-btn
          flat
          round
          dense
          icon="refresh"
          :loading="refreshing"
          class="q-mr-sm"
          @click="triggerRefresh(true)"
        >
          <q-tooltip>{{ t('relays.browser.refresh') }}</q-tooltip>
        </q-btn>
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <q-input
          v-model="searchText"
          :label="t('relays.browser.search_placeholder')"
          dense
          outlined
          clearable
          class="q-mb-sm"
        >
          <template #append>
            <q-icon name="search" />
          </template>
        </q-input>
        <q-toggle v-model="searchOnly" :label="t('relays.browser.search_only')" dense />
      </q-card-section>

      <q-card-section class="col scroll q-pt-none">
        <div v-if="loading" class="flex justify-center q-my-md">
          <q-spinner color="primary" size="3em" />
          <div class="q-mt-sm full-width text-center">{{ t('relays.browser.loading') }}</div>
        </div>
        <div v-else-if="filteredRelays.length === 0" class="text-center q-pa-lg text-grey">
          <q-icon name="explore" size="4em" class="q-mb-md" />
          <div>{{ t('relays.browser.empty') }}</div>
        </div>
        <q-list v-else separator>
          <q-item
            v-for="relay in filteredRelays"
            :key="relay.url"
            clickable
            @click="selectRelay(relay)"
          >
            <q-item-section v-if="relay.metadata?.icon" avatar>
              <q-avatar size="32px">
                <img :src="relay.metadata.icon" alt="Relay Icon" />
              </q-avatar>
            </q-item-section>
            <q-item-section v-else avatar>
              <q-avatar size="32px" color="primary" text-color="white" icon="hub" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ getDisplayName(relay) }}</q-item-label>
              <q-item-label caption lines="1">{{ relay.url }}</q-item-label>
              <q-item-label v-if="relay.metadata?.description" caption lines="2">
                {{ relay.metadata.description }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-badge
                :color="relay.status === 'online' ? 'positive' : 'grey'"
                :label="relay.status"
              />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('relays.browser.close')" color="primary" @click="close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.scroll {
  overflow-y: auto;
}
</style>
