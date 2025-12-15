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
    defaultFilename?: string;
  }>(),
  {
    defaultFilename: 'export.zip',
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
const localFilename = ref(props.defaultFilename);
const showPassword = ref(false);

watch(
  () => props.defaultFilename,
  (v) => {
    if (v && !localFilename.value) localFilename.value = v;
  },
);

function onCancel() {
  modelValue.value = false;
}

function onConfirm() {
  if (!localPassword.value || !localFilename.value) return;
  emit('confirm', { password: localPassword.value, filename: localFilename.value });
}
</script>

<style scoped></style>
