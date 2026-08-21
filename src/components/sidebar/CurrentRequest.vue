<script lang="ts" setup>
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import RequestOriginHeader from 'components/sidebar/RequestOriginHeader.vue';
import RequestPreview from 'components/sidebar/RequestPreview.vue';
import RequestRiskWarning from 'components/sidebar/RequestRiskWarning.vue';
import RequestDecisionBar from 'components/sidebar/RequestDecisionBar.vue';
import {
  classifyRequest,
  getEventKindLabel,
  getRequestTypeLabel,
} from 'src/services/approval-preview';
import type {
  ApprovalDuration,
  ApprovalRequestContent,
  ApprovalRequestRecord,
} from 'app/src-bex/types/background';

defineOptions({ name: 'CurrentRequest' });

const props = defineProps<{
  request: ApprovalRequestRecord;
  content: ApprovalRequestContent | null;
  busy?: boolean;
}>();

const emit = defineEmits<{
  (event: 'decide', id: string, approved: boolean, duration: ApprovalDuration): void;
}>();

const { t } = useI18n();

const heading = ref<HTMLElement | null>(null);

const riskClass = computed(() => classifyRequest(props.request.requestType, props.request.eventKind));

const requestTypeLabel = computed(() => getRequestTypeLabel(props.request.requestType));

const kindLabel = computed(() =>
  props.request.eventKind >= 0 ? getEventKindLabel(props.request.eventKind) : null,
);

const isTerminal = computed(() =>
  props.request.state === 'expired' || props.request.state === 'interrupted',
);

// Focus lands on the heading, never on an approve control (NFR-2).
watch(
  () => props.request.id,
  async () => {
    await nextTick();
    heading.value?.focus();
  },
  { immediate: true },
);
</script>

<template>
  <article class="current-request">
    <h2 ref="heading" tabindex="-1" class="current-request__heading">
      {{ requestTypeLabel }}
    </h2>

    <RequestOriginHeader :origin="request.origin" :account-alias="request.accountAlias" />

    <div v-if="kindLabel" class="current-request__kind">
      <span class="current-request__kind-label">{{ t('request.kind') }}</span>
      <span class="current-request__kind-value">{{ kindLabel }}</span>
    </div>

    <RequestRiskWarning :risk-class="riskClass" :event-kind="request.eventKind" />

    <!-- A terminal request shows why it cannot be acted on, and offers no approval control. -->
    <div v-if="isTerminal" class="current-request__terminal" role="status">
      {{
        request.state === 'expired'
          ? t('request.states.expired')
          : t('request.states.interrupted')
      }}
    </div>

    <template v-else>
      <RequestPreview :content="content" :risk-class="riskClass" />
      <RequestDecisionBar
        :risk-class="riskClass"
        :allow-remember="content?.allowRemember ?? false"
        :busy="busy"
        @decide="(approved, duration) => emit('decide', request.id, approved, duration)"
      />
    </template>
  </article>
</template>

<style scoped>
/* The column inset belongs to the page, once. See SidebarHome. */
.current-request {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.current-request__heading {
  margin: 0;
  font-size: 1rem;
  outline: none;
}

.current-request__kind {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 0.8rem;
}

.current-request__kind-label {
  color: var(--text-muted, #888);
}

.current-request__kind-value {
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.current-request__terminal {
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.85rem;
}
</style>
