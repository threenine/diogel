<template>
  <q-page class="flex flex-center">
    <div class="q-pa-md full-width" style="max-width: 600px">
      <q-card>
        <q-tabs
          v-model="tab"
          active-color="primary"
          align="justify"
          class="text-grey"
          dense
          indicator-color="primary"
          narrow-indicator
        >
          <q-tab icon="account_circle" label="Profile" name="profile" />
          <q-tab icon="image" label="Images" name="images" />
          <q-tab icon="mediation" label="Relays" name="relays" />
          <q-tab icon="key" label="Key" name="key" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="profile">
            <div v-if="activeStoredKey">
              <ProfileEditor :stored-key="activeStoredKey" />
            </div>
            <div v-else class="text-center q-pa-md">No active account selected.</div>
          </q-tab-panel>

          <q-tab-panel name="images">
            <div class="text-h6">Alarms</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="relays">
            <div class="text-h6">Movies</div>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
          </q-tab-panel>

          <q-tab-panel name="key">
            <div v-if="activeStoredKey">
              <view-stored-key :stored-key="activeStoredKey" />
              <div class="row justify-end q-mt-md">
                <ExportButton :stored-key="activeStoredKey" />
              </div>
            </div>
            <div v-else class="text-center q-pa-md">No active account selected.</div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </div>
  </q-page>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import useAccountStore from 'src/stores/account-store';
import ViewStoredKey from 'components/ViewStoredKey/Index.vue';
import ExportButton from 'components/ExportButton.vue';
import ProfileEditor from 'components/ProfileEditor.vue';

const accountStore = useAccountStore();
const tab = ref('profile');

const activeStoredKey = computed(() => {
  const activeAlias = accountStore.activeKey;
  if (!activeAlias) return undefined;
  return Array.from(accountStore.storedKeys).find((k) => k.alias === activeAlias);
});

onMounted(async () => {
  await accountStore.getKeys();
});
</script>
