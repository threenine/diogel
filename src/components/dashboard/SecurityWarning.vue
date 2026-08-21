<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    title: string;
    message: string;
    icon?: string;
  }>(),
  {
    icon: 'warning_amber',
  },
);
</script>

<template>
  <section class="security-warning" :aria-label="title">
    <q-icon class="security-warning__icon" :name="props.icon" aria-hidden="true" size="md" />
    <div class="security-warning__content">
      <h2 class="security-warning__title">{{ title }}</h2>
      <p class="security-warning__message">{{ message }}</p>
    </div>
  </section>
</template>

<style scoped>
.security-warning {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--q-warning);
  border-radius: 12px;
  background: color-mix(in srgb, var(--q-warning) 14%, transparent);
}

.security-warning__icon {
  color: var(--q-warning);

}

.security-warning__title {
  margin: 0;
  font-size: 1.5rem;
  line-height: 1.2;
  font-weight: 600;
}

.security-warning__message {
  margin: 10px 4px 0;
  line-height: 1.4;
  font-size: 1.2rem;
  white-space: pre-line;
}
</style>
