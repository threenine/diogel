<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';
import useAccountStore from '../stores/account-store';
import ProfileImage from '../components/ProfileImage.vue';
import ProfileEditor from '../components/ProfileEditor.vue';
import ProfilePreview from '../components/ProfilePreview.vue';


const { t } = useI18n();
const accountStore = useAccountStore();
const route = useRoute();
const router = useRouter();
const profileRefreshKey = ref(0);

function handleProfileSaved() {
  profileRefreshKey.value += 1;
}

function clearLegacyTabQuery() {
  if (typeof route.query.tab === 'undefined') {
    return;
  }

  const queryWithoutTab = { ...route.query };
  delete queryWithoutTab.tab;
  void router.replace({ query: queryWithoutTab });
}

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((k) => k.alias === activeAlias);
});

onMounted(async () => {
  await accountStore.getKeys();
  clearLegacyTabQuery();
});

watch(
  () => route.query.tab,
  () => {
    clearLegacyTabQuery();
  },
);
</script>

<template>
  <q-page class="dashboard-page profile-page">
    <section class="dashboard-hero">
      <h1 class="dashboard-hero-title">{{ t('profile.title') }}</h1>
      <p class="dashboard-hero-caption">{{ t('profile.dashboardCaption') }}</p>
    </section>

    <template v-if="activeStoredKey">
      <q-card class="dashboard-card profile-page__card profile-page__editor-card">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ t('profile.editorTitle') }}</div>
        </q-card-section>
        <q-card-section>
          <ProfileEditor :stored-key="activeStoredKey" @saved="handleProfileSaved" />
        </q-card-section>
      </q-card>

      <q-card class="dashboard-card profile-page__card profile-page__preview-card">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ t('profile.previewTitle') }}</div>
        </q-card-section>
        <q-card-section>
          <ProfilePreview :refresh-key="profileRefreshKey" :stored-key="activeStoredKey" />
        </q-card-section>
      </q-card>

      <q-card class="dashboard-card profile-page__card profile-page__images-card">
        <q-card-section class="q-pb-none">
          <div class="text-h6">{{ t('profile.imagesSectionTitle') }}</div>
        </q-card-section>
        <q-card-section>
          <ProfileImage :stored-key="activeStoredKey" />
        </q-card-section>
      </q-card>
    </template>

    <q-card v-else class="dashboard-card profile-page__card">
      <div class="text-center q-pa-xl">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noAccounts') }}</div>
        <p class="text-grey-6">{{ t('account.noAccountDesc') }}</p>
        <q-btn
          class="q-mt-md diogel-btn-primary"
          :label="t('account.create')"
          :to="{ name: 'add-new-key' }"
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
</style>
