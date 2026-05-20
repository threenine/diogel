<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ImportKeyForm from 'components/key-management/ImportKeyForm.vue';
import GenerateKeyForm from 'components/key-management/GenerateKeyForm.vue';

const { t } = useI18n();
const tab = ref<'create' | 'import'>('create');
</script>

<template>
  <q-card bordered class="full-width" flat>
    <div class="settings-container">
      <div class="shadow-0">
        <q-toolbar>
          <q-toolbar-title>{{ t('createAccount.title') }}</q-toolbar-title>
        </q-toolbar>

        <q-tabs v-model="tab" class="text-primary" dense no-caps>
          <q-tab :label="t('createAccount.tabs.create')" name="create" />
          <q-tab :label="t('createAccount.tabs.import')" name="import" />
        </q-tabs>
        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="create">
            <generate-key-form />
          </q-tab-panel>

          <q-tab-panel name="import">
            <import-key-form />
          </q-tab-panel>
        </q-tab-panels>
      </div>
    </div>
  </q-card>
</template>

