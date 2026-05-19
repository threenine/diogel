<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

type WidgetId = 'activity' | 'insights' | 'status' | 'quickActions';

interface WidgetPlaceholder {
  id: WidgetId;
  icon: string;
  routeName?: 'relays';
}

const { t } = useI18n();
const router = useRouter();

const widgetPlaceholders: WidgetPlaceholder[] = [
  {
    id: 'activity',
    icon: 'dashboard_customize',
  },
  {
    id: 'insights',
    icon: 'insights',
  },
  {
    id: 'status',
    icon: 'monitor_heart',
    routeName: 'relays',
  },
  {
    id: 'quickActions',
    icon: 'bolt',
  },
];

function openWidgetDestination(widget: WidgetPlaceholder) {
  if (!widget.routeName) {
    return;
  }

  void router.push({ name: widget.routeName });
}
</script>

<template>
  <q-page class="dashboard-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('dashboard.title') }}</h1>
      <p class="dashboard-hero-caption">{{ t('dashboard.caption') }}</p>
    </section>

    <section class="dashboard-widget-grid">
      <q-card
        v-for="widget in widgetPlaceholders"
        :key="widget.id"
        class="dashboard-card dashboard-widget-placeholder"
        flat
        :clickable="Boolean(widget.routeName)"
        @click="openWidgetDestination(widget)"
      >
        <q-card-section class="dashboard-widget-placeholder__content">
          <q-icon :name="widget.icon" color="grey-6" size="md" />
          <h2 class="dashboard-widget-placeholder__title">
            {{ t(`dashboard.widgets.${widget.id}.title`) }}
          </h2>
          <p class="dashboard-widget-placeholder__caption">
            {{ t(`dashboard.widgets.${widget.id}.caption`) }}
          </p>
          <q-badge color="grey-3" text-color="grey-8" :label="t('dashboard.placeholderBadge')" />
        </q-card-section>
      </q-card>
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-widget-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.dashboard-widget-placeholder__content {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-start;
}

.dashboard-widget-placeholder__title {
  margin: 0;
  color: var(--text-color);
  font-size: 1.05rem;
  font-weight: 600;
}

.dashboard-widget-placeholder__caption {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
}
</style>
