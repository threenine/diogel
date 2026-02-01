<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from '../types';
import { profileService } from '../services/profile-service';

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
    const profileData = await profileService.fetchProfile(props.storedKey.id);

    if (profileData) {
      profile.value = {
        name: profileData.name || '',
        display_name: profileData.display_name || '',
        about: profileData.about || '',
        website: profileData.website || '',
        nip05: profileData.nip05 || '',
        lud16: profileData.lud16 || '',
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
    await profileService.saveProfile(props.storedKey.account.privkey, profile.value);

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
