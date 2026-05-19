<script setup lang="ts">
import ActiveKeysCard from 'src/components/dashboard/ActiveKeysCard.vue';
import ConnectedRelaysCard from 'src/components/dashboard/ConnectedRelaysCard.vue';
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
      <TotalSignedEventsCard />
      <ActiveKeysCard clickable @open="openKeyManagement" />
      <ConnectedRelaysCard clickable @open="openRelayManagement" />
      <RecentActivityCard clickable @open="openEventHistory" />
    </section>
  </q-page>
</template>

<style scoped>
.dashboard-widget-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
</style>
