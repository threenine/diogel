<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { get, getActive } from 'src/services/dexie-storage';
import {
  buildQuickSignPreviewEvent,
  getQuickSignAvailability,
  listQuickSignAccountRelayUrls,
  listQuickSignAccounts,
  quickSignEvent,
  type QuickSignAccountOption,
  type QuickSignFormInput,
  type QuickSignPreparedEvent,
} from 'src/services/quick-sign-service';

const { t } = useI18n();

const loading = ref(false);
const accountAlias = ref('');
const accounts = ref<QuickSignAccountOption[]>([]);
const eventJson = ref(
  JSON.stringify(
    {
      kind: 1,
      content: '',
      tags: [],
    },
    null,
    2,
  ),
);
const publish = ref(false);
const relayOptions = ref<string[]>([]);
const selectedRelayUrls = ref<string[]>([]);
const showPreviewDialog = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const previewEvent = ref<QuickSignPreparedEvent | null>(null);

const selectedAccountLabel = computed(() => {
  const selected = accounts.value.find((account) => account.value === accountAlias.value);
  return selected?.label ?? '-';
});

const stateMessage = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value;
  }
  return t('dashboard.widgets.quickSign.ready');
});

function buildInput(): QuickSignFormInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(eventJson.value);
  } catch {
    parsed = {};
  }

  const payload = (parsed !== null && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
  const kind = payload.kind === 30023 ? 30023 : 1;
  const content = typeof payload.content === 'string' ? payload.content : '';
  const tags = Array.isArray(payload.tags)
    ? payload.tags
      .filter((tag): tag is [unknown, unknown] => Array.isArray(tag) && tag.length >= 2)
      .map((tag) => ({
        type: String(tag[0]) as 'p' | 'a' | 't' | 'e',
        value: String(tag[1]),
      }))
    : [];

  return {
    accountAlias: accountAlias.value,
    kind,
    content,
    tags,
  };
}

async function loadOptions(): Promise<void> {
  const [loadedAccounts, activeAlias] = await Promise.all([
    listQuickSignAccounts(),
    getActive(),
  ]);

  accounts.value = loadedAccounts;

  if (activeAlias && loadedAccounts.some((account) => account.value === activeAlias)) {
    accountAlias.value = activeAlias;
  } else {
    accountAlias.value = loadedAccounts[0]?.value ?? '';
  }

  relayOptions.value = await listQuickSignAccountRelayUrls(accountAlias.value);
  selectedRelayUrls.value = relayOptions.value;
}

watch(accountAlias, async (alias) => {
  relayOptions.value = await listQuickSignAccountRelayUrls(alias);
  selectedRelayUrls.value = publish.value ? relayOptions.value : [];
});

watch(publish, (enabled) => {
  if (!enabled) {
    selectedRelayUrls.value = [];
    return;
  }

  selectedRelayUrls.value = relayOptions.value;
});

async function openPreview(): Promise<void> {
  successMessage.value = null;
  errorMessage.value = null;

  const availability = await getQuickSignAvailability(publish.value, selectedRelayUrls.value);
  if (availability.state !== 'ready') {
    if (availability.state === 'locked') {
      errorMessage.value = t('dashboard.widgets.quickSign.states.locked');
      return;
    }

    if (availability.state === 'no-account') {
      errorMessage.value = t('dashboard.widgets.quickSign.states.noAccount');
      return;
    }

    if (availability.state === 'no-relay') {
      errorMessage.value = t('dashboard.widgets.quickSign.states.noRelay');
      return;
    }

    if (availability.state === 'invalid-account') {
      errorMessage.value = t('dashboard.widgets.quickSign.states.invalidAccount');
      return;
    }

    errorMessage.value = t('dashboard.widgets.quickSign.states.error');
    return;
  }

  const keys = await get();
  const selectedAccount = keys[accountAlias.value];
  if (!selectedAccount) {
    errorMessage.value = t('dashboard.widgets.quickSign.states.invalidAccount');
    return;
  }

  const prepared = buildQuickSignPreviewEvent(selectedAccount.id, buildInput());
  if (!prepared.validation.valid) {
    errorMessage.value = prepared.validation.errors.join(' ');
    return;
  }

  previewEvent.value = prepared;
  showPreviewDialog.value = true;
}

function cancelPreview(): void {
  showPreviewDialog.value = false;
}

async function confirmSign(): Promise<void> {
  if (!previewEvent.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = null;
  successMessage.value = null;

  try {
    const result = await quickSignEvent(previewEvent.value.event, publish.value, selectedRelayUrls.value);
    if (!result.success || !result.signedEvent) {
      errorMessage.value = result.error || t('dashboard.widgets.quickSign.signFailure');
      return;
    }

    successMessage.value = result.published
      ? t('dashboard.widgets.quickSign.signPublishSuccess')
      : t('dashboard.widgets.quickSign.signSuccess');
    eventJson.value = JSON.stringify(
      {
        kind: 1,
        content: '',
        tags: [],
      },
      null,
      2,
    );
    showPreviewDialog.value = false;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await loadOptions();
});
</script>

<template>
  <q-card id="quick-sign" class="dashboard-card quick-sign-card">
    <q-card-section class="dashboard-card-section quick-sign-card__section">
      <div class="quick-sign-card__header">
        <q-icon name="edit_note" size="sm" color="primary" />
        <h2 class="quick-sign-card__title">{{ t('dashboard.widgets.quickSign.title') }}</h2>
      </div>

      <p class="quick-sign-card__caption">{{ t('dashboard.widgets.quickSign.caption') }}</p>

      <q-select
        v-model="accountAlias"
        :label="t('dashboard.widgets.quickSign.account')"
        :options="accounts"
        option-label="label"
        option-value="value"
        emit-value
        map-options
        outlined
        dense
      />

      <q-input
        v-model="eventJson"
        :label="t('dashboard.widgets.quickSign.eventJson')"
        outlined
        type="textarea"
        autogrow
        dense
      />

      <p class="quick-sign-card__hint">{{ t('dashboard.widgets.quickSign.supportedKinds') }}</p>

      <q-toggle v-model="publish" :label="t('dashboard.widgets.quickSign.publish')" />

      <p v-if="publish" class="quick-sign-card__hint">
        {{ t('dashboard.widgets.quickSign.publishDestinationSummary', { count: selectedRelayUrls.length }) }}
      </p>

      <q-select
        v-if="publish"
        v-model="selectedRelayUrls"
        :label="t('dashboard.widgets.quickSign.relays')"
        :options="relayOptions"
        outlined
        dense
        multiple
        use-chips
      />

      <q-btn color="primary" :label="t('dashboard.widgets.quickSign.preview')" @click="openPreview" />

      <q-banner v-if="successMessage" class="bg-positive text-white">{{ successMessage }}</q-banner>
      <q-banner v-else-if="stateMessage" class="bg-grey-2 text-dark">{{ stateMessage }}</q-banner>
    </q-card-section>
  </q-card>

  <q-dialog v-model="showPreviewDialog" persistent>
    <q-card class="quick-sign-preview">
      <q-card-section>
        <div class="text-h6">{{ t('dashboard.widgets.quickSign.previewTitle') }}</div>
      </q-card-section>

      <q-card-section>
        <p class="quick-sign-preview__meta">
          {{ t('dashboard.widgets.quickSign.previewAccount') }} <strong>{{ selectedAccountLabel }}</strong>
        </p>
        <p class="quick-sign-preview__meta" v-if="publish">
          {{ t('dashboard.widgets.quickSign.previewRelays') }}
          <strong>
            {{
              selectedRelayUrls.length
                ? t('dashboard.widgets.quickSign.publishDestinationSummary', { count: selectedRelayUrls.length })
                : '-'
            }}
            {{ selectedRelayUrls.length ? `(${selectedRelayUrls.join(', ')})` : '' }}
          </strong>
        </p>
        <pre class="quick-sign-preview__json">{{ JSON.stringify(previewEvent?.event, null, 2) }}</pre>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('dashboard.widgets.quickSign.cancel')" @click="cancelPreview" />
        <q-btn
          color="primary"
          :label="t('dashboard.widgets.quickSign.confirm')"
          :loading="loading"
          @click="confirmSign"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.quick-sign-card__section {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.quick-sign-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-sign-card__title {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.quick-sign-card__caption {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.quick-sign-card__hint {
  margin: 0;
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.quick-sign-preview {
  min-width: min(90vw, 640px);
}

.quick-sign-preview__json {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  background: #111;
  color: #e9e9e9;
  padding: 12px;
  border-radius: 8px;
}

.quick-sign-preview__meta {
  margin: 0 0 8px;
}
</style>
