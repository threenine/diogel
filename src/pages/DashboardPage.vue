<script setup lang="ts">
import ActiveKeysCard from 'src/components/dashboard/ActiveKeysCard.vue';
import ConnectedRelaysCard from 'src/components/dashboard/ConnectedRelaysCard.vue';
import QuickSignCard from 'src/components/dashboard/QuickSignCard.vue';
import RecentActivityCard from 'src/components/dashboard/RecentActivityCard.vue';
import TotalSignedEventsCard from 'src/components/dashboard/TotalSignedEventsCard.vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

const { t } = useI18n();
const router = useRouter();

function openKeyManagement() {
  void router.push({ name: 'keys' });
}

function openRelayManagement() {
  void router.push({ name: 'relays' });
}

function openEventHistory() {
  void router.push({ name: 'event-history' });
}
</script>

<template>
  <q-page class="dashboard-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('dashboard.title') }}</h1>
      <p class="dashboard-hero-caption">{{ t('dashboard.caption') }}</p>
    </section>

    <section class="dashboard-widget-grid">
      <div class="dashboard-widget-grid__item dashboard-widget-grid__item--total-signed">
        <TotalSignedEventsCard />
      </div>
      <div class="dashboard-widget-grid__item dashboard-widget-grid__item--active-keys">
        <ActiveKeysCard clickable @open="openKeyManagement" />
      </div>
      <div class="dashboard-widget-grid__item dashboard-widget-grid__item--connected-relays">
        <ConnectedRelaysCard clickable @open="openRelayManagement" />
      </div>
      <div class="dashboard-widget-grid__item dashboard-widget-grid__item--recent-activity">
        <RecentActivityCard clickable @open="openEventHistory" />
      </div>
      <div class="dashboard-widget-grid__item dashboard-widget-grid__item--quick-sign">
        <QuickSignCard />
      </div>
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-widget-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-areas:
    'totalSigned activeKeys connectedRelays'
    'recentActivity recentActivity quickSign';
  align-items: start;
}

.dashboard-widget-grid__item {
  min-width: 0;
}

.dashboard-widget-grid__item--total-signed {
  grid-area: totalSigned;
}

.dashboard-widget-grid__item--active-keys {
  grid-area: activeKeys;
}

.dashboard-widget-grid__item--connected-relays {
  grid-area: connectedRelays;
}

.dashboard-widget-grid__item--recent-activity {
  grid-area: recentActivity;
}

.dashboard-widget-grid__item--quick-sign {
  grid-area: quickSign;
}

@media (max-width: 1023px) {
  .dashboard-widget-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-areas:
      'totalSigned activeKeys'
      'connectedRelays connectedRelays'
      'recentActivity recentActivity'
      'quickSign quickSign';
  }
}

@media (max-width: 699px) {
  .dashboard-widget-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      'totalSigned'
      'activeKeys'
      'connectedRelays'
      'recentActivity'
      'quickSign';
  }
}
</style>
