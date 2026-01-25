<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { NostrRelay, StoredKey } from 'src/types';
import { SimplePool } from 'nostr-tools';
import { finalizeEvent } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';

defineOptions({ name: 'RelayEditor' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const $q = useQuasar();
const $t = useI18n().t;

const relays = ref<NostrRelay[]>([]);
const loading = ref(false);
const saving = ref(false);

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
];

const newRelayUrl = ref('');
const newRelayRead = ref(true);
const newRelayWrite = ref(true);

async function fetchRelayList() {
  loading.value = true;
  const pool = new SimplePool();
  try {
    const event = await pool.get(DEFAULT_RELAYS, {
      kinds: [10002],
      authors: [props.storedKey.id],
    });

    if (event) {
      relays.value = event.tags
        .filter((tag) => tag[0] === 'r')
        .map((tag) => {
          const url = tag[1];
          const marker = tag[2];
          return {
            url,
            read: !marker || marker === 'read',
            write: !marker || marker === 'write',
          };
        });
    }
  } catch (error) {
    console.error('Error fetching relay list:', error);
    $q.notify({
      type: 'negative',
      message: String($t('relays.fetchError')),
    });
  } finally {
    pool.close(DEFAULT_RELAYS);
    loading.value = false;
  }
}

function addRelay() {
  const url = newRelayUrl.value.trim();
  if (!url) return;
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    $q.notify({
      type: 'negative',
      message: String($t('relays.invalidUrl')),
    });
    return;
  }

  if (relays.value.some((r) => r.url === url)) {
    newRelayUrl.value = '';
    return;
  }

  relays.value.push({
    url,
    read: newRelayRead.value,
    write: newRelayWrite.value,
  });

  newRelayUrl.value = '';
  newRelayRead.value = true;
  newRelayWrite.value = true;
}

function removeRelay(index: number) {
  relays.value.splice(index, 1);
}

async function saveRelayList() {
  saving.value = true;
  const pool = new SimplePool();
  try {
    const tags = relays.value.map((r) => {
      const tag = ['r', r.url];
      if (r.read && !r.write) tag.push('read');
      else if (!r.read && r.write) tag.push('write');
      return tag;
    });

    const unsignedEvent = {
      kind: 10002,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content: '',
      pubkey: props.storedKey.id,
    };

    const sk = hexToBytes(props.storedKey.account.privkey);
    const event = finalizeEvent(unsignedEvent, sk);

    await Promise.any(pool.publish(DEFAULT_RELAYS, event));

    $q.notify({
      type: 'positive',
      message: String($t('relays.saveSuccess')),
    });
  } catch (error) {
    console.error('Error saving relay list:', error);
    $q.notify({
      type: 'negative',
      message: String($t('relays.saveError')),
    });
  } finally {
    pool.close(DEFAULT_RELAYS);
    saving.value = false;
  }
}

onMounted(() => {
  void fetchRelayList();
});
</script>

<template>
  <div class="q-pa-md">
    <div class="text-h6 q-mb-md">{{ $t('relays.title') }}</div>

    <div v-if="loading" class="flex justify-center q-my-md">
      <q-spinner color="primary" size="3em" />
    </div>

    <template v-else>
      <div class="q-mb-md">
        <div class="row q-col-gutter-sm items-center">
          <div class="col-grow">
            <q-input
              v-model="newRelayUrl"
              :label="$t('relays.url')"
              dense
              outlined
              @keyup.enter="addRelay"
            />
          </div>
          <div class="col-auto">
            <q-checkbox v-model="newRelayRead" :label="$t('relays.read')" dense />
          </div>
          <div class="col-auto">
            <q-checkbox v-model="newRelayWrite" :label="$t('relays.write')" dense />
          </div>
          <div class="col-auto">
            <q-btn color="primary" icon="add" round @click="addRelay" />
          </div>
        </div>
      </div>

      <q-list v-if="relays.length > 0" bordered separator>
        <q-item v-for="(relay, index) in relays" :key="relay.url">
          <q-item-section>
            <q-item-label>{{ relay.url }}</q-item-label>
            <q-item-label caption>
              <q-badge v-if="relay.read" color="blue-2" label="Read" text-color="blue-9" />
              <q-badge
                v-if="relay.write"
                class="q-ml-xs"
                color="green-2"
                label="Write"
                text-color="green-9"
              />
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="row q-gutter-xs">
              <q-btn flat icon="delete" round size="sm" @click="removeRelay(index)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="text-center q-pa-md text-grey">
        {{ $t('relays.noRelays') }}
      </div>

      <div class="q-mt-md text-caption text-grey">
        {{ $t('relays.recommendedSize') }}
      </div>

      <div class="row justify-end q-mt-lg">
        <q-btn
          :label="$t('relays.save')"
          :loading="saving"
          color="primary"
          @click="saveRelayList"
        />
      </div>
    </template>
  </div>
</template>

<style scoped></style>
