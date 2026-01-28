<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from '../types';
import { finalizeEvent, getPublicKey, SimplePool } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';
import useSettingsStore from '../stores/settings-store';
import BannerEditor from './BannerEditor.vue';
import AvatarEditor from './AvatarEditor.vue';

defineOptions({ name: 'ProfileImage' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const $q = useQuasar();
const { t } = useI18n();
const settingsStore = useSettingsStore();

const uploading = ref(false);

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
const saving = ref(false);

const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
];

const pool = new SimplePool();

async function fetchProfile() {
  if (!props.storedKey.id) return;

  // Reset profile data before fetching new one
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
    $q.notify({
      type: 'negative',
      message: t('profile.fetchError'),
    });
  } finally {
    loading.value = false;
  }
}

async function saveProfile(field: 'picture' | 'banner', url: string) {
  saving.value = true;
  try {
    const sk = hexToBytes(props.storedKey.account.privkey);
    const pk = getPublicKey(sk);

    // Fetch latest profile to avoid overwriting other fields
    const latestEvent = await pool.get(DEFAULT_RELAYS, {
      authors: [pk],
      kinds: [0],
    });

    let currentProfile: NostrProfile = {};
    if (latestEvent && latestEvent.content) {
      currentProfile = JSON.parse(latestEvent.content) as NostrProfile;
    }

    // SURGICAL UPDATE: Only touch the one field requested.
    const updatedProfile = {
      ...currentProfile,
      [field]: url,
    };

    const eventTemplate = {
      kind: 0,
      created_at: Math.floor(Date.now() / 1000),
      tags: [],
      content: JSON.stringify(updatedProfile),
      pubkey: pk,
    };

    const signedEvent = finalizeEvent(eventTemplate, sk);
    await Promise.any(pool.publish(DEFAULT_RELAYS, signedEvent));

    $q.notify({
      type: 'positive',
      message: t('profile.saveSuccess'),
    });
  } catch (error) {
    console.error('Error saving profile:', error);
    $q.notify({
      type: 'negative',
      message: t('profile.saveError'),
    });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await settingsStore.getSettings();
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
  <div class="q-pa-md">
    <div v-if="loading" class="flex flex-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>
    <div v-else class="q-gutter-md">
      <BannerEditor
        v-model="profile.banner"
        :name="profile.name"
        :stored-key="storedKey"
        @save="(field, url) => saveProfile(field, url)"
        @uploading="(status) => (uploading = status)"
      />

      <AvatarEditor
        v-model="profile.picture"
        :name="profile.name"
        :stored-key="storedKey"
        @save="(field, url) => saveProfile(field, url)"
        @uploading="(status) => (uploading = status)"
      />
    </div>
  </div>
</template>
