<script lang="ts" setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import * as nip19 from 'nostr-tools/nip19';

import type { StoredKey } from 'src/types';

const { t, d } = useI18n();
const $q = useQuasar();

const props = defineProps<{
  keys: StoredKey[];
}>();

interface KeyRow {
  alias: string;
  npub: string;
  canCopyNpub: boolean;
  createdAt: string | null;
  isActive: boolean;
}

const columns = computed(() => [
  { name: 'alias', label: t('keyManagement.table.name'), field: 'alias', align: 'left' as const },
  {
    name: 'npub',
    label: t('keyManagement.table.publicKey'),
    field: 'npub',
    align: 'left' as const,
  },
  {
    name: 'createdAt',
    label: t('keyManagement.table.createdDate'),
    field: 'createdAt',
    align: 'left' as const,
  },
  {
    name: 'action',
    label: t('keyManagement.table.action'),
    field: 'alias',
    align: 'right' as const,
  },
]);

const rows = computed<KeyRow[]>(() =>
  props.keys.map((key) => {
    let npub: string;
    try {
      npub = nip19.npubEncode(key.id);
    } catch {
      npub = '';
    }

    return {
      alias: key.alias,
      npub,
      canCopyNpub: npub.length > 0,
      createdAt: key.createdAt,
      isActive: false,
    };
  }),
);

function formatCreatedDate(value: string | null): string {
  if (!value) {
    return t('keyManagement.table.unknownDate');
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return t('keyManagement.table.unknownDate');
  }

  return d(date, 'short');
}

async function copyPublicKey(npub: string): Promise<void> {
  if (!npub) {
    return;
  }

  try {
    await navigator.clipboard.writeText(npub);
    $q.notify({ type: 'positive', message: t('account.copySuccess') });
  } catch {
    $q.notify({ type: 'negative', message: t('keyManagement.table.copyPublicKeyFailed') });
  }
}
</script>

<template>
  <q-table
    :columns="columns"
    :rows="rows"
    :no-data-label="t('keyManagement.table.noKeys')"
    class="key-management-table"
    flat
    row-key="alias"
  >
    <template v-slot:body-cell-createdAt="slotProps">
      <q-td :props="slotProps">
        {{ formatCreatedDate(String(slotProps.row.createdAt)) }}
      </q-td>
    </template>

    <template v-slot:body-cell-action="slotProps">
      <q-td :props="slotProps" class="text-right">
        <q-btn
          :aria-label="t('keyManagement.table.copyPublicKeyAriaLabel', { alias: slotProps.row.alias })"
          color="secondary"
          :disable="!slotProps.row.canCopyNpub"
          flat
          icon="content_copy"
          round
          @click.stop="copyPublicKey(slotProps.row.npub)"
        />
        <q-btn
          :label="t('keyManagement.viewAction')"
          :to="{ name: 'view-key', params: { alias: slotProps.row.alias } }"
          color="primary"
          flat
          no-caps
        />
      </q-td>
    </template>
  </q-table>
</template>

<style scoped>
.key-management-table {
  width: 100%;
}
</style>
