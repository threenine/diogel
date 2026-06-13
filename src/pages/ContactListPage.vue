<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useQuasar } from 'quasar';
import useAccountStore from 'src/stores/account-store';
import type { ContactProfile, Nip02Contact } from 'src/types/contact-list';
import type { StoredKey } from 'src/types';
import {
  fetchContactList,
  fetchContactProfiles,
  formatContactNpub,
  getContactDisplayName,
  publishContactList,
  validateContactInput,
} from 'src/services/contact-list-service';

const { t } = useI18n();
const $q = useQuasar();
const accountStore = useAccountStore();

const contacts = ref<Nip02Contact[]>([]);
const profiles = ref<Record<string, ContactProfile>>({});
const sourceEventId = ref<string | undefined>();
const sourceCreatedAt = ref<number | undefined>();
const loading = ref(false);
const publishing = ref(false);
const loadingProfiles = ref(false);
const errorMessage = ref('');
const dirty = ref(false);
const dialogOpen = ref(false);
const editingPubkey = ref<string | undefined>();
const pubkeyInput = ref('');
const relayUrlInput = ref('');
const petnameInput = ref('');
const formError = ref('');

const activeStoredKey = computed<StoredKey | undefined>(() => {
  const activeAlias = accountStore.activeKey;
  const keys = Array.from(accountStore.storedKeys);
  if (!activeAlias) {
    return keys[0];
  }

  return keys.find((key) => key.alias === activeAlias) ?? keys[0];
});

const sortedContacts = computed(() => contacts.value);

const sourceSummary = computed(() => {
  if (!sourceEventId.value || !sourceCreatedAt.value) {
    return t('contacts.noPublishedList');
  }

  return t('contacts.sourceSummary', {
    eventId: sourceEventId.value.slice(0, 12),
    date: new Date(sourceCreatedAt.value * 1000).toLocaleString(),
  });
});

function getProfile(contact: Nip02Contact): ContactProfile | undefined {
  return profiles.value[contact.pubkey];
}

function getDisplayName(contact: Nip02Contact): string {
  return getContactDisplayName(contact, getProfile(contact));
}

function getContactSubtitle(contact: Nip02Contact): string {
  const profile = getProfile(contact);
  if (profile?.nip05) {
    return profile.nip05;
  }

  if (contact.petname && (profile?.displayName || profile?.name)) {
    return contact.petname;
  }

  return formatContactNpub(contact.pubkey);
}

function getContactBio(contact: Nip02Contact): string {
  return getProfile(contact)?.about ?? '';
}

async function enrichProfiles() {
  const pubkeys = contacts.value.map((contact) => contact.pubkey);
  if (pubkeys.length === 0) {
    profiles.value = {};
    return;
  }

  loadingProfiles.value = true;
  try {
    profiles.value = await fetchContactProfiles(pubkeys);
  } catch {
    profiles.value = {};
  } finally {
    loadingProfiles.value = false;
  }
}

function resetForm() {
  editingPubkey.value = undefined;
  pubkeyInput.value = '';
  relayUrlInput.value = '';
  petnameInput.value = '';
  formError.value = '';
}

function openAddDialog() {
  resetForm();
  dialogOpen.value = true;
}

function openEditDialog(contact: Nip02Contact) {
  editingPubkey.value = contact.pubkey;
  pubkeyInput.value = contact.pubkey;
  relayUrlInput.value = contact.relayUrl;
  petnameInput.value = contact.petname;
  formError.value = '';
  dialogOpen.value = true;
}

async function loadContacts() {
  if (!activeStoredKey.value) {
    return;
  }

  loading.value = true;
  errorMessage.value = '';

  try {
    const state = await fetchContactList(activeStoredKey.value);
    contacts.value = state.contacts;
    sourceEventId.value = state.sourceEventId;
    sourceCreatedAt.value = state.sourceCreatedAt;
    dirty.value = false;
    await enrichProfiles();
  } catch (error: unknown) {
    errorMessage.value = error instanceof Error ? error.message : String(error);
  } finally {
    loading.value = false;
  }
}

function saveContact() {
  const result = validateContactInput(
    pubkeyInput.value,
    relayUrlInput.value,
    petnameInput.value,
    contacts.value,
    editingPubkey.value,
  );

  if (!result.valid || !result.contact) {
    formError.value = result.error ?? t('contacts.invalidContact');
    return;
  }

  if (editingPubkey.value) {
    contacts.value = contacts.value.map((contact) =>
      contact.pubkey === editingPubkey.value ? result.contact as Nip02Contact : contact,
    );
  } else {
    contacts.value = [...contacts.value, result.contact];
  }

  dirty.value = true;
  void enrichProfiles();
  dialogOpen.value = false;
  resetForm();
}

function removeContact(contact: Nip02Contact) {
  contacts.value = contacts.value.filter((item) => item.pubkey !== contact.pubkey);
  const nextProfiles = { ...profiles.value };
  delete nextProfiles[contact.pubkey];
  profiles.value = nextProfiles;
  dirty.value = true;
}

async function publishChanges() {
  if (!activeStoredKey.value || !dirty.value) {
    return;
  }

  publishing.value = true;
  errorMessage.value = '';

  try {
    const result = await publishContactList(activeStoredKey.value, contacts.value);
    sourceEventId.value = result.event.id;
    sourceCreatedAt.value = result.event.created_at;
    dirty.value = false;
    $q.notify({ type: 'positive', message: t('contacts.publishSuccess') });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    errorMessage.value = message;
    $q.notify({ type: 'negative', message });
  } finally {
    publishing.value = false;
  }
}

onMounted(async () => {
  await accountStore.getKeys();

  if (!accountStore.activeKey && activeStoredKey.value) {
    await accountStore.setActiveKey(activeStoredKey.value.alias);
  }

  await loadContacts();
});
</script>

<template>
  <q-page class="dashboard-page contacts-page">
    <section class="dashboard-hero contacts-page__hero">
      <div>
        <h1 class="dashboard-hero-title">{{ t('contacts.title') }}</h1>
        <p class="dashboard-hero-caption">{{ t('contacts.dashboardCaption') }}</p>
      </div>
      <div v-if="activeStoredKey" class="contacts-page__actions">
        <q-btn
          flat
          icon="refresh"
          :label="t('contacts.refresh')"
          :loading="loading"
          @click="loadContacts"
        />
        <q-btn
          class="diogel-btn-primary"
          icon="publish"
          :disable="!dirty || publishing"
          :label="t('contacts.publish')"
          :loading="publishing"
          @click="publishChanges"
        />
      </div>
    </section>

    <q-card v-if="!activeStoredKey" class="dashboard-card contacts-page__card">
      <div class="text-center q-pa-xl">
        <q-icon color="grey-5" name="account_circle" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('account.noAccounts') }}</div>
        <p class="text-grey-6">{{ t('account.noAccountDesc') }}</p>
        <q-btn class="q-mt-md diogel-btn-primary" :label="t('account.create')" :to="{ name: 'add-new-key' }" />
      </div>
    </q-card>

    <q-card v-else class="dashboard-card contacts-page__card">
      <q-card-section class="contacts-page__summary">
        <div>
          <div class="text-h6">{{ activeStoredKey.alias }}</div>
          <div class="text-caption text-grey-7">{{ sourceSummary }}</div>
        </div>
        <q-chip v-if="dirty" color="warning" text-color="dark" icon="edit">
          {{ t('contacts.unsavedChanges') }}
        </q-chip>
      </q-card-section>

      <q-banner v-if="dirty" class="bg-orange-1 text-orange-10 q-ma-md" rounded>
        {{ t('contacts.replaceWarning') }}
      </q-banner>

      <q-banner v-if="errorMessage" class="bg-red-1 text-red-10 q-ma-md" rounded>
        {{ errorMessage }}
      </q-banner>

      <q-card-section class="contacts-page__toolbar">
        <div class="text-subtitle1">
          {{ t('contacts.count', { count: contacts.length }) }}
          <span v-if="loadingProfiles" class="text-caption text-grey-7 q-ml-sm">
            {{ t('contacts.loadingProfiles') }}
          </span>
        </div>
        <q-btn icon="person_add" color="primary" :label="t('contacts.add')" @click="openAddDialog" />
      </q-card-section>

      <q-separator />

      <q-card-section v-if="loading" class="text-center q-pa-xl">
        <q-spinner color="primary" size="3em" />
        <p class="text-grey-7 q-mt-md">{{ t('contacts.loading') }}</p>
      </q-card-section>

      <q-list v-else-if="sortedContacts.length > 0" separator>
        <q-item v-for="contact in sortedContacts" :key="contact.pubkey" class="contacts-page__contact">
          <q-item-section avatar>
            <q-avatar v-if="getProfile(contact)?.picture">
              <img :src="getProfile(contact)?.picture" alt="" />
              <q-tooltip v-if="getContactBio(contact)" class="contacts-page__bio-tooltip">
                {{ getContactBio(contact) }}
              </q-tooltip>
            </q-avatar>
            <q-avatar v-else color="primary" text-color="white" icon="person">
              <q-tooltip v-if="getContactBio(contact)" class="contacts-page__bio-tooltip">
                {{ getContactBio(contact) }}
              </q-tooltip>
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ getDisplayName(contact) }}</q-item-label>
            <q-item-label caption>{{ getContactSubtitle(contact) }}</q-item-label>
            <q-item-label caption class="contacts-page__pubkey">
              {{ formatContactNpub(contact.pubkey) }}
            </q-item-label>
            <q-item-label v-if="contact.relayUrl" caption>{{ contact.relayUrl }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="contacts-page__row-actions">
              <q-btn flat round dense icon="edit" :aria-label="t('contacts.edit')" @click="openEditDialog(contact)" />
              <q-btn flat round dense color="negative" icon="delete" :aria-label="t('contacts.remove')" @click="removeContact(contact)" />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-section v-else class="text-center q-pa-xl">
        <q-icon color="grey-5" name="contacts" size="4em" />
        <div class="text-h6 text-grey-7 q-mt-md">{{ t('contacts.emptyTitle') }}</div>
        <p class="text-grey-6">{{ t('contacts.emptyCaption') }}</p>
      </q-card-section>
    </q-card>

    <q-dialog v-model="dialogOpen">
      <q-card class="contacts-page__dialog">
        <q-card-section>
          <div class="text-h6">
            {{ editingPubkey ? t('contacts.editTitle') : t('contacts.addTitle') }}
          </div>
        </q-card-section>

        <q-card-section class="q-gutter-md">
          <q-input v-model="pubkeyInput" outlined :label="t('contacts.pubkey')" :disable="!!editingPubkey" />
          <q-input v-model="relayUrlInput" outlined :label="t('contacts.relayUrl')" />
          <q-input v-model="petnameInput" outlined :label="t('contacts.petname')" />
          <q-banner v-if="formError" class="bg-red-1 text-red-10" rounded>{{ formError }}</q-banner>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn v-close-popup flat :label="t('account.cancel')" />
          <q-btn color="primary" :label="t('contacts.save')" @click="saveContact" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.contacts-page {
  width: 100%;
}

.contacts-page__hero,
.contacts-page__summary,
.contacts-page__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.contacts-page__actions,
.contacts-page__row-actions {
  display: flex;
  gap: 0.5rem;
}

.contacts-page__card {
  overflow: hidden;
}

.contacts-page__pubkey {
  word-break: break-all;
}

:global(.contacts-page__bio-tooltip) {
  max-width: 22rem;
  white-space: normal;
}

.contacts-page__dialog {
  width: min(42rem, 92vw);
}

@media (max-width: 700px) {
  .contacts-page__hero,
  .contacts-page__summary,
  .contacts-page__toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
