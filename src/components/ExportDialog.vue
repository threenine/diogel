<template>
  <q-dialog v-model="modelValue">
    <q-card style="min-width: 380px; max-width: 90vw">
      <q-card-section>
        <div class="text-h6">Export Account</div>
        <div class="text-subtitle2 q-mt-xs">Choose a password and file name</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-md">
        <q-input
          v-model="localPassword"
          :rules="[(v) => !!v || 'Password is required']"
          :type="showPassword ? 'text' : 'password'"
          autofocus
          dense
          label="Password"
        >
          <template #append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-input
          v-model="localFilename"
          :rules="[(v) => !!v || 'File name is required']"
          dense
          label="File name"
          @update:model-value="onFilenameEdited"
        />
      </q-card-section>

      <q-separator />

      <q-card-actions align="right">
        <q-btn color="primary" flat label="Cancel" @click="onCancel" />
        <q-btn color="primary" flat label="Export" @click="onConfirm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

defineOptions({ name: 'ExportDialog' });

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    alias: string;
  }>(),
  {
    alias: '',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm', payload: { password: string; filename: string }): void;
}>();

const modelValue = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const localPassword = ref('');
const localFilename = ref('');
const showPassword = ref(false);
const filenameManuallyEdited = ref(false);

function buildDefaultFilenameFromAlias(alias: string) {
  const base = (alias ?? '').trim() || 'nostr-account';
  return base.endsWith('.zip') ? base : `${base}.zip`;
}
watch(
  () => props.alias,
  (alias) => {
    if (!filenameManuallyEdited.value) {
      localFilename.value = buildDefaultFilenameFromAlias(alias);
    }
  },
  { immediate: true },
);

watch(
  () => props.modelValue,
  (isOpen) => {
    // When opening the dialog, refresh filename from alias (unless user already edited it)
    if (isOpen && !filenameManuallyEdited.value) {
      localFilename.value = buildDefaultFilenameFromAlias(props.alias);
    }
  },
);

function onFilenameEdited() {
  filenameManuallyEdited.value = true;
}
function onCancel() {
  modelValue.value = false;
}

function onConfirm() {
  if (!localPassword.value || !localFilename.value) return;
  emit('confirm', { password: localPassword.value, filename: localFilename.value });
}
</script>

<style scoped></style>
