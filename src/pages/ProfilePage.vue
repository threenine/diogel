<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useAccountStore from '../stores/account-store';
import ProfileImage from '../components/ProfileImage.vue';
import ProfileEditor from '../components/ProfileEditor.vue';
import RelayEditor from '../components/RelayEditor.vue';

import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import WarningCard from 'components/WarningCard.vue';

const { t } = useI18n();
const accountStore = useAccountStore();
const route = useRoute();
const router = useRouter();

type ProfileTab = 'profile' | 'images' | 'relays' | 'keys';

function resolveTabFromRoute(): ProfileTab {
  const routeTab = route.query.tab;

  if (routeTab === 'profile' || routeTab === 'images' || routeTab === 'relays' || routeTab === 'keys') {
    return routeTab;
  }

  if (route.path.startsWith('/keys')) {
    return 'keys';
  }

  if (route.path.startsWith('/relays')) {
    return 'relays';
  }

  return 'profile';
}

const tab = ref<ProfileTab>(resolveTabFromRoute());

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((k) => k.alias === activeAlias);
});

onMounted(async () => {
  await accountStore.getKeys();
});

watch(
  () => [route.path, route.query.tab],
  () => {
    const resolvedTab = resolveTabFromRoute();

    if (tab.value !== resolvedTab) {
      tab.value = resolvedTab;
    }
  },
);

watch(tab, (newTab) => {
  const currentTab = typeof route.query.tab === 'string' ? route.query.tab : undefined;
  const queryTab = newTab === 'profile' ? undefined : newTab;

  if (currentTab === queryTab) {
    return;
  }

  void router.replace({
    query: {
      ...route.query,
      tab: queryTab,
    },
  });
});
</script>

<template>
  <q-page class="dashboard-page profile-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('profile.title') }}</h1>
      <p class="dashboard-hero-caption">{{ t('profile.dashboardCaption') }}</p>
    </section>

    <q-card class="dashboard-card profile-page__card">
      <div v-if="activeStoredKey">
        <q-tabs
          v-model="tab"
          active-color="primary"
          align="justify"
          class="dashboard-tabs text-primary text-caption"
          dense
          indicator-color="primary"
          inline-label
          narrow-indicator
        >
          <q-tab
            :label="t('profile.title')"
            class="text-caption"
            icon="person"
            name="profile"
          />
          <q-tab
            :label="t('profile.imagesTitle')"
            class="text-caption"
            icon="image"
            name="images"
          />
          <q-tab
            :label="t('profile.relaysTitle')"
            class="text-caption"
            icon="hub"
            name="relays"
          />
          <q-tab :label="t('profile.keysTitle')" class="text-caption" icon="key" name="keys" />
        </q-tabs>

        <q-tab-panels v-model="tab" animated class="profile-page__tab-panels">
          <q-tab-panel class="q-pa-none" name="profile">
            <ProfileEditor :stored-key="activeStoredKey" />
          </q-tab-panel>

          <q-tab-panel class="q-pa-none" name="images">
            <ProfileImage :stored-key="activeStoredKey" />
          </q-tab-panel>

          <q-tab-panel class="q-pa-none" name="relays">
            <RelayEditor :stored-key="activeStoredKey" />
          </q-tab-panel>

          <q-tab-panel class="q-pa-none" name="keys">
            <q-card-section>
              <ViewStoredKey :stored-key="activeStoredKey" />
            </q-card-section>
            <q-card-section class="q-pt-none row justify-end paddings-sm">
              <q-separator horizontal inset />
            </q-card-section>

            <q-card-section class="q-pt-none row justify-end paddings-sm">
              <ExportButton :stored-key="activeStoredKey" />
            </q-card-section>

            <q-separator horizontal class="q-mt-xl q-mb-md" inset />

            <q-card-section class="text-center">
              <warning-card
                :headline="t('warning.exportKeys')"
                :message="t('warning.backupNotice')"
              />
            </q-card-section>
          </q-tab-panel>
        </q-tab-panels>
      </div>
      <div v-else class="text-center q-pa-xl">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noAccounts') }}</div>
        <p class="text-grey-6">{{ t('account.noAccountDesc') }}</p>
        <q-btn
          class="q-mt-md diogel-btn-primary"
          :label="t('account.create')"
          to="/create-account"
        />
      </div>
    </q-card>
  </q-page>
</template>

<style scoped>
.profile-page {
  width: 100%;
}

.profile-page__card {
  overflow: hidden;
}

.profile-page__tab-panels {
  background: transparent;
}
</style>
