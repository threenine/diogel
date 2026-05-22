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

interface ProfileEditorForm extends Omit<NostrProfile, 'bot' | 'birthday'> {
  bot: boolean;
  birthday: {
    year?: number;
    month?: number;
    day?: number;
  };
}

function toBirthdayFields(birthday?: NostrProfile['birthday']): ProfileEditorForm['birthday'] {
  return {
    ...(birthday?.year !== undefined ? { year: birthday.year } : {}),
    ...(birthday?.month !== undefined ? { month: birthday.month } : {}),
    ...(birthday?.day !== undefined ? { day: birthday.day } : {}),
  };
}

const profile = ref<ProfileEditorForm>({
  name: '',
  display_name: '',
  about: '',
  picture: '',
  banner: '',
  website: '',
  nip05: '',
  lud16: '',
  bot: false,
  birthday: {},
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
    bot: false,
    birthday: {},
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
        bot: profileData.bot === true,
        birthday: toBirthdayFields(profileData.birthday),
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
    const hasBirthday =
      profile.value.birthday?.year !== undefined ||
      profile.value.birthday?.month !== undefined ||
      profile.value.birthday?.day !== undefined;

    const profileToSave: NostrProfile = {
      ...profile.value,
      ...(profile.value.bot ? { bot: true } : {}),
      ...(hasBirthday ? { birthday: toBirthdayFields(profile.value.birthday) } : {}),
    };

    await profileService.saveProfile(props.storedKey.account.privkey, profileToSave);

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
    <q-form v-else class="profile-editor__form" @submit="saveProfile">
      <q-input
        v-model="profile.name"
        :label="t('profile.name')"
        outlined
        dense
        class="diogel-input profile-editor__field"
        hide-bottom-space
      />
      <q-input
        v-model="profile.display_name"
        :label="t('profile.displayName')"
        outlined
        dense
        class="diogel-input profile-editor__field"
        hide-bottom-space
      />
      <q-input
        v-model="profile.website"
        :label="t('profile.website')"
        outlined
        dense
        class="diogel-input profile-editor__field"
        hide-bottom-space
      />
      <q-input
        v-model="profile.nip05"
        :label="t('profile.nip05')"
        outlined
        dense
        class="diogel-input profile-editor__field"
        hide-bottom-space
      />
      <q-input
        v-model="profile.lud16"
        :label="t('profile.lud16')"
        outlined
        dense
        class="diogel-input profile-editor__field"
        hide-bottom-space
      />
      <q-toggle
        v-model="profile.bot"
        :label="t('profile.bot')"
        color="primary"
        class="profile-editor__field profile-editor__field--toggle"
      />

      <div class="profile-editor__field profile-editor__birthday">
        <div class="profile-editor__birthday-label text-caption">{{ t('profile.birthday') }}</div>
        <div class="profile-editor__birthday-grid">
          <q-input
            v-model.number="profile.birthday.year"
            :label="t('profile.birthdayYear')"
            outlined
            dense
            type="number"
            class="diogel-input"
            hide-bottom-space
          />
          <q-input
            v-model.number="profile.birthday.month"
            :label="t('profile.birthdayMonth')"
            outlined
            dense
            type="number"
            class="diogel-input"
            hide-bottom-space
          />
          <q-input
            v-model.number="profile.birthday.day"
            :label="t('profile.birthdayDay')"
            outlined
            dense
            type="number"
            class="diogel-input"
            hide-bottom-space
          />
        </div>
      </div>
      <q-input
        v-model="profile.about"
        :label="t('profile.about')"
        outlined
        dense
        class="diogel-input profile-editor__field profile-editor__field--full"
        type="textarea"
        hide-bottom-space
      />

      <div class="row justify-end q-mt-sm profile-editor__field--full">
        <q-btn
          :label="t('profile.save')"
          :loading="saving"
          color="primary"
          type="submit"
          class="diogel-btn-primary"
        />
      </div>
    </q-form>
  </div>
</template>

<style lang="scss" scoped>
.profile-editor__form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.profile-editor__field {
  min-width: 0;
}

.profile-editor__field--full {
  grid-column: 1 / -1;
}

.profile-editor__field--toggle {
  display: flex;
  align-items: center;
  min-height: 40px;
}

.profile-editor__birthday-label {
  margin-bottom: 8px;
}

.profile-editor__birthday-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

@media (max-width: 720px) {
  .profile-editor__form {
    grid-template-columns: 1fr;
  }

  .profile-editor__birthday-grid {
    grid-template-columns: 1fr;
  }
}
</style>
