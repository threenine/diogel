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
      <q-item class="no-wrap" v-bind="scope.itemProps">
        <q-item-section v-if="scope.opt.value === createValue" avatar>
          <q-icon name="add_circle" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-no-wrap">
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
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { DropdownItem } from 'src/types';
import useAccountStore from 'src/stores/account-store';

const accountStore = useAccountStore();
defineOptions({ name: 'AccountDropdown' });
const props = withDefaults(
  defineProps<{
    /** External v-model */
    modelValue?: string | number | null;
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

// Build options list from the account store ensuring the Create option is listed last
const computedOptions = computed<DropdownItem[]>(() => {
  const fromStore: DropdownItem[] = Array.from(accountStore.storedKeys).map((key) => ({
    label: key.alias,
    value: key.alias,
  }));

  // Ensure Create option is last
  return props.includeCreateOption ? [...fromStore, CREATE_OPTION.value] : fromStore;
});

// Local state: select activeKey if present; otherwise empty
const innerValue = ref<string | number | null>(props.modelValue ?? accountStore.activeKey ?? null);

// Load keys initially and start listening for changes (chrome.storage listener)
onMounted(async () => {
  await accountStore.getKeys();
  accountStore.listenToStorageChanges();
  // After loading, ensure selection reflects activeKey (or empty if none)
  innerValue.value = props.modelValue ?? accountStore.activeKey ?? null;
});

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
    router.push({ path: '/' }).catch(() => {});
  }
});

// Keep selection in sync with store.activeKey if it changes elsewhere
watch(
  () => accountStore.activeKey,
  (alias) => {
    // Only update if external model isn't explicitly controlling it
    if (props.modelValue === null || props.modelValue === undefined) {
      innerValue.value = alias ?? null;
    }
  },
);
</script>

<style scoped></style>
