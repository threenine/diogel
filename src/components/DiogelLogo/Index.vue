<template>
  <img :src="logoSrc" alt="Diogel" :class="['diogel-logo', sizeClass]" />
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useQuasar } from 'quasar';

defineOptions({ name: 'DiogelLogo' });

const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md' | 'lg' | 'xl';
  }>(),
  {
    size: 'md',
  },
);

const $q = useQuasar();

const logoSrc = computed(() => {
  const path = $q.dark.isActive ? 'www/images/dark/diogel.svg' : 'www/images/light/diogel.svg';

  return chrome.runtime?.getURL(path) ?? path.replace(/^www\//, '');
});

const sizeClass = computed(() => `diogel-logo--${props.size}`);
</script>

<style scoped>
.diogel-logo {
  display: inline-block;
  object-fit: contain;
}

.diogel-logo--sm {
  width: 24px;
  height: 24px;
}

.diogel-logo--md {
  width: 35px;
  height: 35px;
}

.diogel-logo--lg {
  width: 90px;
  height: 90px;
}

.diogel-logo--xl {
  width: 150px;
  height: 150px;
}
</style>
