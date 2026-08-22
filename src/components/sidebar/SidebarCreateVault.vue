<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useVault } from 'src/composables/useVault';

defineOptions({ name: 'SidebarCreateVault' });

const emit = defineEmits<{ (event: 'back'): void }>();

const { t } = useI18n();
const { password, confirmPassword, loading, loginError, handleCreate } = useVault();

/**
 * S18, the vault creation form in the panel.
 *
 * Creation used to open a full tab, which the specification required until 2026-08-22 and which
 * made a browser window appear in the middle of first-run onboarding. It is two password fields; it
 * fits the column.
 *
 * There is no navigation here and there must not be. `handleCreate` returns early on a panel route,
 * so the panel re-renders from vault state once the vault exists and lands on S16, the prompt to
 * add a key. Key creation and import stay full-tab: they involve seed phrases and their backup,
 * which a 320px ephemeral column is the wrong place to display.
 */
const tooShort = computed(() => password.value.length > 0 && password.value.length < 8);
const mismatched = computed(
  () => confirmPassword.value.length > 0 && confirmPassword.value !== password.value,
);
const submittable = computed(
  () => password.value.length >= 8 && confirmPassword.value === password.value && !loading.value,
);
</script>

<template>
  <section class="sidebar-create" :aria-label="t('sidebar.createVault.ariaLabel')">
    <h2 class="sidebar-create__title">{{ t('sidebar.createVault.title') }}</h2>
    <p class="sidebar-create__body">{{ t('sidebar.createVault.body') }}</p>

    <q-input
      v-model="password"
      class="sidebar-create__field"
      dense
      filled
      :error="tooShort"
      :error-message="t('sidebar.createVault.minimum')"
      :label="t('sidebar.createVault.password')"
      type="password"
    />
    <q-input
      v-model="confirmPassword"
      class="sidebar-create__field"
      dense
      filled
      :error="mismatched"
      :error-message="t('sidebar.createVault.mismatch')"
      :label="t('sidebar.createVault.confirmPassword')"
      type="password"
      @keyup.enter="submittable && handleCreate()"
    />

    <div v-if="loginError" class="sidebar-create__error">{{ loginError }}</div>

    <div class="sidebar-create__actions">
      <q-btn
        flat
        no-caps
        class="sidebar-create__back"
        :label="t('sidebar.createVault.back')"
        :disable="loading"
        @click="emit('back')"
      />
      <q-btn
        no-caps
        class="diogel-btn-primary"
        :label="t('sidebar.createVault.action')"
        :disable="!submittable"
        :loading="loading"
        @click="handleCreate"
      />
    </div>
  </section>
</template>

<style scoped>
.sidebar-create {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px 12px;
}

.sidebar-create__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
}

.sidebar-create__body {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.75;
}

.sidebar-create__field {
  width: 100%;
}

.sidebar-create__error {
  font-size: 0.85rem;
  color: var(--q-negative);
}

.sidebar-create__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* NFR-7: a target small enough to miss is a target that fails the requirement. */
.sidebar-create__actions .q-btn {
  min-height: 36px;
}
</style>
