<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import type { RelayCatalogEntry } from 'src/types/relay';
import { listRelayCatalog } from 'src/services/relay-service';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const relays = ref<RelayCatalogEntry[]>([]);
const loading = ref(false);

async function fetchRelays() {
  if (loading.value) return;
  loading.value = true;
  try {
    relays.value = await listRelayCatalog();
    console.log(`[RelayBrowserModal] Fetched ${relays.value.length} relays`);
  } catch (error) {
    console.error('[RelayBrowserModal] Failed to fetch relays:', error);
    relays.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.modelValue) {
    void fetchRelays();
  }
});

watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      void fetchRelays();
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
</script>

<template>
  <q-dialog :model-value="props.modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card style="min-width: 400px; max-height: 80vh" class="column no-wrap">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('relays.browser.title') }}</div>
        <q-spacer />
        <q-btn v-close-popup flat round dense icon="close" />
      </q-card-section>

      <q-card-section class="col scroll q-pt-md">
        <div v-if="loading" class="flex justify-center q-my-md">
          <q-spinner color="primary" size="3em" />
          <div class="q-mt-sm full-width text-center">{{ t('relays.browser.loading') }}</div>
        </div>
        <div v-else-if="relays.length === 0" class="text-center q-pa-lg text-grey">
          <q-icon name="explore" size="4em" class="q-mb-md" />
          <div>{{ t('relays.browser.empty') }}</div>
        </div>
        <q-list v-else separator>
          <q-item v-for="relay in relays" :key="relay.url">
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
