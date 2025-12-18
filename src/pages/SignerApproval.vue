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
});

async function approve() {
  await $q.bex.send('nostr.approval.respond', { approved: true });
  window.close();
}

async function reject() {
  await $q.bex.send('nostr.approval.respond', { approved: false });
  window.close();
}
</script>

<template>
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
        <q-btn
          flat
          :label="t('approval.reject')"
          color="negative"
          @click="reject"
        />
        <q-btn
          unelevated
          :label="t('approval.approve')"
          color="primary"
          @click="approve"
        />
      </q-card-actions>
    </q-card>
  </q-page>
</template>

<style scoped>
.break-word {
  word-break: break-all;
}
</style>
