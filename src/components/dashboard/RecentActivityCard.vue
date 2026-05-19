<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { getDashboardSummary, type DashboardActivityItem, type DashboardDataState } from 'src/services/dashboard-service';

const props = withDefaults(
  defineProps<{
    clickable?: boolean;
  }>(),
  {
    clickable: false,
  },
);

const emit = defineEmits<{
  open: [];
}>();

const { t, d } = useI18n();

const loading = ref(true);
const error = ref<string | null>(null);
const state = ref<DashboardDataState>('no-account');
const items = ref<DashboardActivityItem[]>([]);

const statusText = computed(() => {
  if (error.value) {
    return t('dashboard.widgets.common.error');
  }

  if (state.value === 'locked') {
    return t('dashboard.widgets.common.locked');
  }

  if (state.value === 'no-account') {
    return t('dashboard.widgets.common.noAccount');
  }

  if (!items.value.length) {
    return t('dashboard.widgets.recentActivity.empty');
  }

  return t('dashboard.widgets.recentActivity.ready');
});

function onClick() {
  if (!props.clickable) {
    return;
  }

  emit('open');
}

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return d(date, 'short');
}

async function loadSummary() {
  loading.value = true;
  error.value = null;

  try {
    const summary = await getDashboardSummary(4);
    state.value = summary.state;
    items.value = summary.recentActivity;
  } catch {
    error.value = t('dashboard.widgets.common.error');
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void loadSummary();
});
</script>

<template>
  <q-card class="dashboard-card" :clickable="clickable" @click="onClick">
    <q-card-section class="dashboard-card-section dashboard-widget-card__section">
      <div class="dashboard-widget-card__header">
        <q-icon name="flaky" size="sm" color="primary" />
        <h2 class="dashboard-widget-card__title">{{ t('dashboard.widgets.recentActivity.title') }}</h2>
      </div>

      <q-list v-if="!loading && items.length > 0" dense class="dashboard-widget-card__list">
        <q-item v-for="activity in items" :key="`${activity.dateTime}:${activity.message}`" class="dashboard-widget-card__list-item">
          <q-item-section>
            <q-item-label>{{ activity.message }}</q-item-label>
            <q-item-label caption>{{ formatDate(activity.dateTime) }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <div v-else class="dashboard-widget-card__state">
        <q-spinner v-if="loading" color="primary" size="24px" />
        <p class="dashboard-widget-card__caption">{{ statusText }}</p>
      </div>

      <q-badge
        v-if="clickable"
        class="dashboard-widget-card__action"
        color="secondary"
        text-color="white"
        :label="t('dashboard.widgets.recentActivity.action')"
      />
    </q-card-section>
  </q-card>
</template>

<style scoped>
.dashboard-widget-card__section {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dashboard-widget-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dashboard-widget-card__title {
  margin: 0;
  color: var(--text-color);
  font-size: 1rem;
  font-weight: 600;
}

.dashboard-widget-card__list {
  padding: 0;
}

.dashboard-widget-card__list-item {
  min-height: 44px;
  padding-left: 0;
  padding-right: 0;
}

.dashboard-widget-card__state {
  min-height: 78px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
}

.dashboard-widget-card__caption {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}

.dashboard-widget-card__action {
  margin-top: auto;
}
</style>
