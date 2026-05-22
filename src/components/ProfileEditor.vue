<script lang="ts" setup>
import { onMounted, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import type { NostrProfile, StoredKey } from '../types';
import { profileService } from '../services/profile-service';
import { nip05Service, parseNip05Identifier, type Nip05VerificationStatus } from '../services/nip05-service';

defineOptions({ name: 'ProfileEditor' });

const props = defineProps<{
  storedKey: StoredKey;
}>();

const $q = useQuasar();
const { t } = useI18n();

interface ProfileEditorForm extends Omit<NostrProfile, 'bot' | 'birthday'> {
  bot: boolean;
  birthday: BirthdayFormState;
}

interface BirthdayFormState {
  year: string;
  month: string;
  day: string;
}

type ParsedBirthdayValue = number | undefined | null;

function toBirthdayFields(birthday?: NostrProfile['birthday']): BirthdayFormState {
  return {
    year: birthday?.year !== undefined ? String(birthday.year) : '',
    month: birthday?.month !== undefined ? String(birthday.month) : '',
    day: birthday?.day !== undefined ? String(birthday.day) : '',
  };
}

function parseBirthdayValue(value: string, min: number, max: number, exactDigits?: number): ParsedBirthdayValue {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  if (!/^\d+$/.test(trimmedValue)) {
    return null;
  }

  if (exactDigits !== undefined && trimmedValue.length !== exactDigits) {
    return null;
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isInteger(parsedValue) || parsedValue < min || parsedValue > max) {
    return null;
  }

  return parsedValue;
}

function buildBirthdayPayload(form: BirthdayFormState): NostrProfile['birthday'] | undefined {
  const year = parseBirthdayValue(form.year, 1000, 9999, 4);
  const month = parseBirthdayValue(form.month, 1, 12);
  const day = parseBirthdayValue(form.day, 1, 31);

  if (year === null || month === null || day === null) {
    return undefined;
  }

  const birthday: NonNullable<NostrProfile['birthday']> = {
    ...(year !== undefined ? { year } : {}),
    ...(month !== undefined ? { month } : {}),
    ...(day !== undefined ? { day } : {}),
  };

  return Object.keys(birthday).length > 0 ? birthday : undefined;
}

const birthdayYearRules = [
  (value: string) => {
    const parsedYear = parseBirthdayValue(value, 1000, 9999, 4);
    return parsedYear !== null || t('profile.birthdayYearInvalid');
  },
];

const birthdayMonthRules = [
  (value: string) => {
    const parsedMonth = parseBirthdayValue(value, 1, 12);
    return parsedMonth !== null || t('profile.birthdayMonthInvalid');
  },
];

const birthdayDayRules = [
  (value: string) => {
    const parsedDay = parseBirthdayValue(value, 1, 31);
    return parsedDay !== null || t('profile.birthdayDayInvalid');
  },
];

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
  birthday: { year: '', month: '', day: '' },
});

const loading = ref(false);
const saving = ref(false);
const nip05Verifying = ref(false);
const nip05Status = ref<Nip05VerificationStatus | null>(null);

function canVerifyNip05Identifier(identifier: string): boolean {
  return parseNip05Identifier(identifier) !== null;
}

function getNip05VerificationMessage(status: Nip05VerificationStatus): string {
  switch (status) {
    case 'verified':
      return t('profile.nip05Verified');
    case 'malformed':
      return t('profile.nip05Malformed');
    case 'network-error':
      return t('profile.nip05NetworkError');
    case 'invalid-response':
      return t('profile.nip05InvalidResponse');
    case 'not-found':
      return t('profile.nip05NotFound');
    case 'pubkey-mismatch':
      return t('profile.nip05PubkeyMismatch');
    default:
      return t('profile.nip05NetworkError');
  }
}

function isNip05VerifyDisabled(): boolean {
  if (nip05Verifying.value) {
    return true;
  }

  return !canVerifyNip05Identifier(profile.value.nip05 ?? '');
}

async function verifyNip05() {
  const identifier = profile.value.nip05 ?? '';
  if (!canVerifyNip05Identifier(identifier)) {
    nip05Status.value = 'malformed';
    $q.notify({
      type: 'negative',
      message: getNip05VerificationMessage('malformed'),
    });
    return;
  }

  nip05Verifying.value = true;
  try {
    const result = await nip05Service.verifyIdentifier(identifier, props.storedKey.id);
    nip05Status.value = result.status;

    $q.notify({
      type: result.status === 'verified' ? 'positive' : 'negative',
      message: getNip05VerificationMessage(result.status),
    });
  } finally {
    nip05Verifying.value = false;
  }
}

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
    birthday: { year: '', month: '', day: '' },
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
    const { bot, birthday, ...profileBase } = profile.value;
    const birthdayPayload = buildBirthdayPayload(birthday);

    const profileToSave: NostrProfile = {
      ...profileBase,
    };

    if (bot) {
      profileToSave.bot = true;
    }

    if (birthdayPayload) {
      profileToSave.birthday = birthdayPayload;
    }

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
    nip05Status.value = null;
    void fetchProfile();
  },
);

watch(
  () => profile.value.nip05,
  () => {
    nip05Status.value = null;
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
      >
        <template #append>
          <q-btn
            :label="t('profile.nip05Verify')"
            :loading="nip05Verifying"
            :disable="isNip05VerifyDisabled()"
            color="primary"
            flat
            dense
            no-caps
            class="profile-editor__nip05-verify"
            @click="verifyNip05"
          />
        </template>
      </q-input>
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
            v-model="profile.birthday.year"
            :label="t('profile.birthdayYear')"
            :rules="birthdayYearRules"
            outlined
            dense
            type="number"
            class="diogel-input"
          />
          <q-input
            v-model="profile.birthday.month"
            :label="t('profile.birthdayMonth')"
            :rules="birthdayMonthRules"
            outlined
            dense
            type="number"
            class="diogel-input"
          />
          <q-input
            v-model="profile.birthday.day"
            :label="t('profile.birthdayDay')"
            :rules="birthdayDayRules"
            outlined
            dense
            type="number"
            class="diogel-input"
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

.profile-editor__nip05-verify {
  white-space: nowrap;
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
