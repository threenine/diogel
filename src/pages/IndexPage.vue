<template>
  <q-page class="flex justify-center">
    <div class="q-pa-md full-width" style="max-width: 600px">
      <q-card>
        <q-tabs
          v-model="tab"
          active-color="primary"
          align="justify"
          class="text-primary text-caption"
          dense
          indicator-color="primary"
          inline-label
          narrow-indicator
        >
          <q-tab class="text-caption" icon="account_circle" label="Profile" name="profile" />
          <q-tab class="text-caption" icon="image" label="Images" name="images" />
          <q-tab class="text-caption" icon="mediation" label="Relays" name="relays" />
          <q-tab class="text-caption" icon="key" label="Key" name="key" />
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
            <div v-if="activeStoredKey">
              <ProfileImage :stored-key="activeStoredKey" />
            </div>
            <div v-else class="text-center q-pa-md">No active account selected.</div>
          </q-tab-panel>

          <q-tab-panel name="relays">
            <div v-if="activeStoredKey">
              <RelayEditor :stored-key="activeStoredKey" />
            </div>
            <div v-else class="text-center q-pa-md">No active account selected.</div>
          </q-tab-panel>

          <q-tab-panel name="key">
            <div v-if="activeStoredKey">
              <view-stored-key :stored-key="activeStoredKey" />
              <div class="row justify-end q-mt-md">
                <ExportButton :stored-key="activeStoredKey" />
              </div>
              <q-separator class="q-mt-md" />
              <q-card bordered class="q-pt-none warning-card" flat>
                <q-item class="bg-warning text-white">
                  <q-item-section avatar>
                    <q-icon color="white" name="warning" />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label>Important</q-item-label>
                  </q-item-section>
                </q-item>

                <q-separator />

                <q-card-section horizontal>
                  <q-card-section bordered>
                    <p>
                      Ensure you back up your keys. If you lose them, you will lose access to your
                      account.
                    </p>
                    <p>You will not be able to recover your account without it.</p>
                  </q-card-section>
                </q-card-section>
              </q-card>
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
import ProfileImage from 'components/ProfileImage.vue';
import RelayEditor from 'components/RelayEditor.vue';

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
