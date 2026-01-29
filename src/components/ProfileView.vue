<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from '../types';
import { SimplePool } from 'nostr-tools';

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

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
];

const pool = new SimplePool();

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
  try {
    const event = await pool.get(DEFAULT_RELAYS, {
      authors: [props.storedKey.id],
      kinds: [0],
    });

    if (event && event.content) {
      const content = JSON.parse(event.content) as NostrProfile;
      profile.value = {
        ...profile.value,
        ...content,
      };
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
  } finally {
    loading.value = false;
  }
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
  <div class="profile-view">
    <div v-if="loading" class="flex flex-center q-pa-xl">
      <q-spinner color="primary" size="3em" />
    </div>
    <div v-else>
      <!-- Banner Section -->
      <div class="banner-container">
        <q-img v-if="profile.banner" :src="profile.banner" class="banner-image" fit="cover" />
        <div v-else class="banner-placeholder bg-grey-9" />

        <!-- Edit Profile Button overlaid on banner or just below -->
        <div class="row justify-end q-pa-sm edit-btn-container">
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

      <!-- Content Section -->
      <div class="q-px-md q-pb-md content-section">
        <!-- Avatar - partially overlapping banner -->
        <div class="avatar-wrapper">
          <q-avatar class="profile-avatar" size="120px">
            <q-img v-if="profile.picture" :src="profile.picture" />
            <q-icon v-else class="bg-grey-3 full-width full-height" color="grey-7" name="person" />
          </q-avatar>
        </div>

        <div class="profile-info q-mt-sm">
          <div class="row justify-between items-start">
            <div>
              <div class="text-h6 text-weight-bold text-white">
                {{ profile.display_name || profile.name || 'Anonymous' }}
              </div>
              <div v-if="profile.name && profile.display_name" class="text-subtitle2 text-grey-5">
                @{{ profile.name }}
              </div>
            </div>
          </div>

          <div v-if="profile.about" class="text-body2 text-white q-mt-sm about-text">
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
}

.banner-container {
  position: relative;
  height: 200px;
  width: 100%;
}

.banner-image,
.banner-placeholder {
  height: 100%;
  width: 100%;
}

.edit-btn-container {
  position: absolute;
  bottom: -45px;
  right: 0;
  width: 100%;
  z-index: 10;
}

.edit-profile-btn {
  border: 1px solid;
  font-size: 0.8rem;
}

.content-section {
  position: relative;
}

.avatar-wrapper {
  margin-top: -80px;
  position: relative;
  z-index: 1;
}

.profile-avatar {
  border: 4px solid black;
  background-color: black;
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
