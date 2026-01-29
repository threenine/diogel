<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';

const $q = useQuasar();
const { t } = useI18n();
const route = useRoute();

const origin = ref('');

onMounted(() => {
  origin.value = (route.query.origin as string) || 'Unknown';
  console.log('SignerApproval mounted, origin:', origin.value);

  if ($q.bex) {
    console.log('BEX bridge available');
  } else {
    console.error('BEX bridge NOT available');
  }
});

async function approve() {
  console.log('Approving request...');
  // Give it a small delay to ensure bridge is fully ready if it wasn't
  await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    if (!$q.bex) {
      throw new Error('BEX bridge not available in approve()');
    }
    await $q.bex.send({
      event: 'nostr.approval.respond',
      to: 'background',
      payload: { approved: true },
    });
    console.log('Approval response sent successfully');
    // Another small delay before closing to ensure message is sent
    setTimeout(() => window.close(), 100);
  } catch (err) {
    console.error('Failed to send approval response:', err);
  }
}

async function reject() {
  console.log('Rejecting request...');
  await new Promise((resolve) => setTimeout(resolve, 100));
  try {
    if (!$q.bex) {
      throw new Error('BEX bridge not available in reject()');
    }
    await $q.bex.send({
      event: 'nostr.approval.respond',
      to: 'background',
      payload: { approved: false },
    });
    console.log('Reject response sent successfully');
    setTimeout(() => window.close(), 100);
  } catch (err) {
    console.error('Failed to send reject response:', err);
  }
}
</script>

<template>
  <q-layout>
    <q-page-container v-if="origin" class="flex flex-center" style="height: 100px">
      <q-page class="flex flex-center q-pa-md">
        <q-card style="width: 100%; max-width: 400px">
          <q-card-section>
            <div class="text-h6">{{ t('approval.title') }}</div>
          </q-card-section>

          <q-card-section class="q-pt-none">
            <p>{{ t('approval.description') }}</p>
            <div class="text-caption text-grey-7 q-mt-sm">
              {{ t('approval.origin') }}
            </div>
            <div class="text-subtitle2 break-word">{{ origin }}</div>
          </q-card-section>

          <q-card-actions align="right" class="q-pb-md q-pr-md">
            <q-btn :label="t('approval.reject')" color="negative" flat @click="reject" />
            <q-btn :label="t('approval.approve')" color="primary" unelevated @click="approve" />
          </q-card-actions>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<style scoped>
.break-word {
  word-break: break-all;
}
</style>
