<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const loading = ref(false);

function close() {
  emit('update:modelValue', false);
}
</script>

<template>
  <q-dialog :model-value="props.modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card style="min-width: 350px; max-height: 80vh" class="column no-wrap">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ t('relays.browser.title') }}</div>
        <q-spacer />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section class="col scroll q-pt-md">
        <div v-if="loading" class="flex justify-center q-my-md">
          <q-spinner color="primary" size="3em" />
          <div class="q-mt-sm full-width text-center">{{ t('relays.browser.loading') }}</div>
        </div>
        <div v-else class="text-center q-pa-lg text-grey">
          <q-icon name="explore" size="4em" class="q-mb-md" />
          <div>{{ t('relays.browser.empty') }}</div>
        </div>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat :label="t('relays.browser.close')" color="primary" @click="close" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.scroll {
  overflow-y: auto;
}
</style>
