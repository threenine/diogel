<template>
  <q-select
    v-model="innerValue"
    :behavior="behavior"
    :clearable="clearable"
    :dense="dense"
    :disable="disable"
    :dropdown-icon="dropdownIcon"
    :hint="hint"
    :label="label"
    :loading="loading"
    :options="computedOptions"
    :outlined="outlined"
    :use-chips="useChips"
    emit-value
    map-options
    option-label="label"
    option-value="value"
  />
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

export interface DropdownItem<T = string | number> {
  label: string;
  value: T;
}

const props = withDefaults(
  defineProps<{
    /** External v-model */
    modelValue?: string | number | null;
    /** Items to show in addition to the default Create option */
    items?: DropdownItem[];
    /** Label for the q-select input */
    label?: string;
    /** Whether to include the always-available default option */
    includeCreateOption?: boolean;
    /** Text shown for the default option */
    createLabel?: string;
    /** Value used for the default option */
    createValue?: string | number;
    /** UI props passthroughs */
    useChips?: boolean;
    clearable?: boolean;
    dense?: boolean;
    outlined?: boolean;
    loading?: boolean;
    disable?: boolean;
    hint?: string;
    behavior?: 'default' | 'dialog' | 'menu';
    dropdownIcon?: string;
  }>(),
  {
    modelValue: null,
    items: () => [],
    label: 'Account',
    includeCreateOption: true,
    createLabel: 'Create Account',
    createValue: 'create-account',
    useChips: false,
    clearable: false,
    dense: false,
    outlined: true,
    loading: false,
    disable: false,
    hint: '',
    behavior: 'default',
    dropdownIcon: 'arrow_drop_down',
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number | null): void;
  (e: 'change', value: string | number | null): void;
}>();

const CREATE_OPTION = computed<DropdownItem>(() => ({
  label: props.createLabel,
  value: props.createValue,
}));

// Build options list ensuring the Create option is present and first
const computedOptions = computed<DropdownItem[]>(() => {
  const seen = new Set<string | number>();
  const out: DropdownItem[] = [];

  if (props.includeCreateOption) {
    out.push(CREATE_OPTION.value);
    seen.add(CREATE_OPTION.value.value);
  }

  for (const it of props.items) {
    if (!seen.has(it.value)) {
      out.push(it);
      seen.add(it.value);
    }
  }
  return out;
});

// Local state to manage defaulting to Create option when not provided
const innerValue = ref<string | number | null>(
  props.modelValue ?? (props.includeCreateOption ? props.createValue : null),
);

watch(
  () => props.modelValue,
  (v) => {
    if (v === undefined) return;
    innerValue.value = v;
  },
);

watch(innerValue, (v) => {
  emit('update:modelValue', v);
  emit('change', v);
});
</script>

<style scoped></style>
