<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { get, getActive } from 'src/services/dexie-storage';
import {
  buildQuickSignPreviewEvent,
  getQuickSignAvailability,
  quickSignEvent,
  type QuickSignFormInput,
  type QuickSignPreparedEvent,
} from 'src/services/quick-sign-service';

const { t } = useI18n();

const loading = ref(false);
const kind = ref<1>(1);
const content = ref('');
const publish = ref(false);
const showPreviewDialog = ref(false);
const errorMessage = ref<string | null>(null);
const successMessage = ref<string | null>(null);
const previewEvent = ref<QuickSignPreparedEvent | null>(null);

const stateMessage = computed(() => {
  if (errorMessage.value) {
    return errorMessage.value;
  }
  return t('dashboard.widgets.quickSign.ready');
});

function buildInput(): QuickSignFormInput {
  return {
    kind: kind.value,
    content: content.value,
    publish: publish.value,
  };
}

async function openPreview(): Promise<void> {
  successMessage.value = null;
  errorMessage.value = null;

  const availability = await getQuickSignAvailability(publish.value);
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

    errorMessage.value = t('dashboard.widgets.quickSign.states.error');
    return;
  }

  const activeAlias = await getActive();
  if (!activeAlias) {
    errorMessage.value = t('dashboard.widgets.quickSign.states.noAccount');
    return;
  }

  const keys = await get();
  const activeAccount = keys[activeAlias];
  if (!activeAccount) {
    errorMessage.value = t('dashboard.widgets.quickSign.states.noAccount');
    return;
  }

  const prepared = buildQuickSignPreviewEvent(activeAccount.npub, buildInput());
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
    const result = await quickSignEvent(previewEvent.value.event, publish.value);
    if (!result.success || !result.signedEvent) {
      errorMessage.value = result.error || t('dashboard.widgets.quickSign.signFailure');
      return;
    }

    successMessage.value = result.published
      ? t('dashboard.widgets.quickSign.signPublishSuccess')
      : t('dashboard.widgets.quickSign.signSuccess');
    content.value = '';
    showPreviewDialog.value = false;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <q-card class="dashboard-card quick-sign-card">
    <q-card-section class="dashboard-card-section quick-sign-card__section">
      <div class="quick-sign-card__header">
        <q-icon name="edit_note" size="sm" color="primary" />
        <h2 class="quick-sign-card__title">{{ t('dashboard.widgets.quickSign.title') }}</h2>
      </div>

      <p class="quick-sign-card__caption">{{ t('dashboard.widgets.quickSign.caption') }}</p>

      <q-select
        v-model="kind"
        :label="t('dashboard.widgets.quickSign.kind')"
        :options="[{ label: t('dashboard.widgets.quickSign.kindTextNote'), value: 1 }]"
        option-label="label"
        option-value="value"
        emit-value
        map-options
        outlined
        dense
      />

      <q-input
        v-model="content"
        :label="t('dashboard.widgets.quickSign.content')"
        outlined
        type="textarea"
        autogrow
        dense
      />

      <q-toggle v-model="publish" :label="t('dashboard.widgets.quickSign.publish')" />

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
</style>
