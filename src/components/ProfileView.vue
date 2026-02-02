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
  <div class="profile-view q-mx-auto" style="max-width: 100%; overflow: hidden">
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>
    <div v-else>
      <!-- Banner Section -->
      <div class="banner-container">
        <q-img v-if="profile.banner" :src="profile.banner" class="banner-image" fit="cover" />
        <div v-else class="banner-placeholder bg-grey-9" />
      </div>

      <!-- Content Section -->
      <div
        class="q-px-md q-pb-md content-section"
        style="margin-top: -40px; position: relative; z-index: 1"
      >
        <!-- Avatar - partially overlapping banner -->
        <div class="row items-end justify-between">
          <q-avatar
            size="80px"
            style="border: 4px solid var(--q-dark-page); background-color: var(--q-dark-page)"
          >
            <q-img v-if="profile.picture" :src="profile.picture" />
            <q-icon v-else class="bg-grey-3 full-width full-height" color="grey-7" name="person" />
          </q-avatar>

          <!-- Edit Profile Button -->
          <div class="q-pa-sm">
            <q-btn
              :label="t('profile.edit')"
              class="edit-profile-btn text-orange-5"
              color="grey-9"
              no-caps
              rounded
              @click="openInTab('/profile')"
            />
          </div>
        </div>

        <div class="profile-info q-mt-sm">
          <div class="row justify-between items-start">
            <div>
              <div class="text-h6 text-weight-bold">
                {{ profile.display_name || profile.name || 'Anonymous' }}
              </div>
              <div v-if="profile.name && profile.display_name" class="text-subtitle2 text-orange-5">
                @{{ profile.name }}
              </div>
            </div>
          </div>

          <div v-if="profile.about" class="text-body2 q-mt-sm about-text">
            {{ profile.about }}
          </div>

          <div v-if="profile.website" class="q-mt-xs">
            <a
              :href="profile.website"
              class="text-orange-5 text-body2 text-decoration-none"
              target="_blank"
            >
              {{ profile.website }}
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-view {
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
}

.banner-container {
  position: relative;
  aspect-ratio: 5 / 1;
  width: 100%;
  overflow: hidden;
  margin-bottom: -10px;
  margin-top: 40px;
}

.banner-image {
  height: 100%;
  width: 100%;
  display: block;
}

.banner-placeholder {
  height: 100%;
  width: 100%;
}

.edit-profile-btn {
  border: 1px solid;
  font-size: 0.8rem;
}

.content-section {
  position: relative;
}

.about-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.text-decoration-none {
  text-decoration: none;
}

.text-decoration-none:hover {
  text-decoration: underline;
}
</style>
