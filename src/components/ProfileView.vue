<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from '../types';
import { profileService } from '../services/profile-service';

defineOptions({ name: 'ProfileView' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const { t } = useI18n();

function openInTab(path: string) {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}

const profile = ref<NostrProfile>({
  name: '',
  display_name: '',
  about: '',
  picture: '',
  banner: '',
  website: '',
  nip05: '',
  lud16: '',
});

const loading = ref(false);

async function fetchProfile() {
  if (!props.storedKey.id) return;

  profile.value = {
    name: '',
    display_name: '',
    about: '',
    picture: '',
    banner: '',
    website: '',
    nip05: '',
    lud16: '',
  };

  loading.value = true;
  const profileData = await profileService.fetchProfile(props.storedKey.id);

  if (profileData) {
    profile.value = {
      ...profile.value,
      ...profileData,
    };
  }
  loading.value = false;
}

onMounted(() => {
  void fetchProfile();
});

watch(
  () => props.storedKey.id,
  () => {
    void fetchProfile();
  },
);
</script>

<template>
  <div class="profile-wrapper">
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="2em" />
    </div>

    <q-card v-else class="profile-card" flat bordered>
      <!-- Banner Section -->
      <q-card-section class="q-pa-none">
        <div class="banner-container">
          <q-img
            v-if="profile.banner"
            :src="profile.banner"
            class="banner-image"
            fit="contain"
            ratio="3"
            height="120px"
          />
          <div v-else class="banner-placeholder" />
        </div>
      </q-card-section>

      <!-- Avatar & Info Section -->
      <q-card-section class="content-section">
        <div class="avatar-wrapper">
          <q-avatar size="60px" class="profile-avatar">
            <q-img v-if="profile.picture" :src="profile.picture" />
            <q-icon v-else name="person" color="grey-7" />
          </q-avatar>
        </div>

        <div class="profile-info q-mt-sm">
          <div class="text-heading text-weight-bold">
            {{ profile.display_name || profile.name || 'Anonymous' }}
          </div>
          <div v-if="profile.name && profile.display_name" class="text-caption text-primary">
            @{{ profile.name }}
          </div>

          <div v-if="profile.about" class="text-body q-mt-sm about-text">
            {{ profile.about }}
          </div>

          <div v-if="profile.website" class="q-mt-xs">
            <a :href="profile.website" target="_blank" class="website-link">
              {{ profile.website }}
            </a>
          </div>
        </div>
      </q-card-section>

      <!-- Actions -->
      <q-card-actions align="right">
        <q-btn
          round
          icon="edit"
          size="sm"
          class="diogel-btn-ghost"
          @click="openInTab('/profile')"
        >
          <q-tooltip>{{ t('profile.edit') }}</q-tooltip>
        </q-btn>
      </q-card-actions>
    </q-card>

    <div v-if="!loading" class="text-center q-pa-md text-caption text-warning">
      {{ $t('warning.exportKeys') }}
    </div>
  </div>
</template>

<style scoped lang="scss">
.profile-wrapper {
  padding: 16px;
}

.profile-card {
  .banner-container {
    position: relative;
    height: 120px;
    overflow: hidden;
    background: var(--page-bg);

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to top, rgba(0, 0, 0, 0.3), transparent);
    }
  }

  .banner-image {
    width: 100%;
    height: 100%;
  }

  .banner-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, $primary-light, $primary); // Threenine Orange gradient
    opacity: 0.2;
  }

  .content-section {
    position: relative;
    padding-top: 0;
  }

  .avatar-wrapper {
    margin-top: -30px;
    margin-bottom: 8px;
  }

  .profile-avatar {
    border: 4px solid var(--card-bg);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    background: var(--card-bg);
  }

  .about-text {
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-muted);
  }

  .website-link {
    color: $primary; // Threenine Orange
    text-decoration: none;
    font-size: 0.875rem;

    &:hover {
      text-decoration: underline;
      color: $primary-light;
    }
  }
}
</style>
