<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from 'src/types';
import { finalizeEvent, getPublicKey, SimplePool } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils';

defineOptions({ name: 'ProfileEditor' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const $q = useQuasar();
const { t } = useI18n();

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

// Default relays for fetching/publishing if none are configured in the app yet
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://purplepag.es',
];

const pool = new SimplePool();

async function fetchProfile() {
  if (!props.storedKey.id) return;

  loading.value = true;
  try {
    const event = await pool.get(DEFAULT_RELAYS, {
      authors: [props.storedKey.id],
      kinds: [0],
    });

    if (event && event.content) {
      const content = JSON.parse(event.content) as NostrProfile;
      profile.value = {
        name: content.name || '',
        display_name: content.display_name || '',
        about: content.about || '',
        website: content.website || '',
        nip05: content.nip05 || '',
        lud16: content.lud16 || '',
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

async function saveProfile() {
  saving.value = true;
  try {
    const sk = hexToBytes(props.storedKey.account.privkey);
    const pk = getPublicKey(sk);

    // Fetch latest profile to avoid overwriting other fields (like picture/banner)
    const latestEvent = await pool.get(DEFAULT_RELAYS, {
      authors: [pk],
      kinds: [0],
    });

    let currentProfile: NostrProfile = {};
    if (latestEvent && latestEvent.content) {
      currentProfile = JSON.parse(latestEvent.content) as NostrProfile;
    }

    const updatedProfile = {
      ...currentProfile,
      ...profile.value,
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
  <div class="q-pa-md">
    <div v-if="loading" class="flex flex-center q-pa-lg">
      <q-spinner color="primary" size="3em" />
    </div>
    <q-form v-else class="q-gutter-md" @submit="saveProfile">
      <q-input v-model="profile.name" :label="t('profile.name')" dense outlined />
      <q-input v-model="profile.display_name" :label="t('profile.displayName')" dense outlined />
      <q-input v-model="profile.about" :label="t('profile.about')" dense outlined type="textarea" />
      <q-input v-model="profile.website" :label="t('profile.website')" dense outlined />
      <q-input v-model="profile.nip05" :label="t('profile.nip05')" dense outlined />
      <q-input v-model="profile.lud16" :label="t('profile.lud16')" dense outlined />

      <div class="row justify-end q-mt-md">
        <q-btn :label="t('profile.save')" :loading="saving" color="primary" type="submit" />
      </div>
    </q-form>
  </div>
</template>
