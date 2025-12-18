<template>
  <q-select
    v-model="innerValue"
    :behavior="behavior"
    :clearable="clearable"
    :dense="dense"
    :disable="disable"
    :dropdown-icon="dropdownIcon"
    :hint="hint"
    :loading="loading"
    :options="computedOptions"
    :outlined="outlined"
    :borderless="borderless"
    :use-chips="useChips"
    emit-value
    map-options
    option-label="label"
    option-value="value"
  >
    <!-- Custom option rendering to support themable icon for the Create option -->
    <template #option="scope">
      <q-item v-bind="scope.itemProps">
        <q-item-section v-if="scope.opt.value === createValue" avatar>
          <q-icon name="add_circle" />
        </q-item-section>
        <q-item-section>
          <q-item-label>
            <!-- For the Create option, show the createLabel without the emoji; others show label as-is -->
            {{ scope.opt.value === createValue ? createLabel : scope.opt.label }}
          </q-item-label>
        </q-item-section>
      </q-item>
    </template>

    <!-- Selected item chip/input rendering -->
    <template #selected-item="scope">
      <div class="row items-center no-wrap q-gutter-xs">
        <q-icon v-if="scope.opt.value === createValue" name="add_circle" size="18px" />
        <span>{{ scope.opt.value === createValue ? createLabel : scope.opt.label }}</span>
      </div>
    </template>
  </q-select>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { DropdownItem } from 'src/types';
import useAccountStore from 'src/stores/account-store';

const accountStore = useAccountStore();
defineOptions({ name: 'AccountDropdown' });
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
    borderless?: boolean;
    loading?: boolean;
    disable?: boolean;
    hint?: string;
    behavior?: 'default' | 'dialog' | 'menu';
    dropdownIcon?: string;
  }>(),
  {
    modelValue: null,
    items: () => [],
    includeCreateOption: true,
    createLabel: 'Create Account',
    createValue: 'create-account',
    useChips: false,
    clearable: false,
    dense: false,
    outlined: false,
    borderless: true,
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

const router = useRouter();

const CREATE_OPTION = computed<DropdownItem>(() => ({
  label: `➕ ${props.createLabel}`,
  value: props.createValue,
}));

// Build options list ensuring the Create option is present and listed last
const computedOptions = computed<DropdownItem[]>(() => {
  const out: DropdownItem[] = [];
  const seen = new Set<string | number>();

  // First, append provided items excluding any that match the create value
  for (const it of props.items) {
    if (it.value === CREATE_OPTION.value.value) continue; // ensure Create isn't in the middle
    if (!seen.has(it.value)) {
      out.push(it);
      seen.add(it.value);
    }
  }

  // Finally, append the Create option if requested so it is always last
  if (props.includeCreateOption) {
    out.push(CREATE_OPTION.value);
  }
  return out;
});

// Local state: don't preselect Create by default so it remains clickable
const innerValue = ref<string | number | null>(props.modelValue ?? accountStore.activeKey ?? null);

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
  // Navigate based on selection
  if (v === props.createValue) {
    router.push({ name: 'create-account' }).catch(() => {});
  } else if (v !== null && v !== undefined) {
    accountStore.setActiveKey(v as string).catch(() => {});
    router.push({ name: 'edit-account', params: { alias: v } }).catch(() => {});
  }
});
</script>

<style scoped></style>
