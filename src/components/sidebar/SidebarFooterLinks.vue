<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineOptions({ name: 'SidebarFooterLinks' });

const { t } = useI18n();

/**
 * Which button is focused, so the tooltip can follow focus as well as hover.
 *
 * Quasar's QTooltip shows on hover only — verified in the built panel, where focusing a footer
 * button rendered no tooltip at all. That would leave the label as a pointer-only affordance, which
 * NFR-1 forbids, so focus drives it explicitly.
 */
const focused = ref<string | null>(null);

/**
 * Management surfaces stay full-tab; the panel links out to them rather than hosting them.
 */
function openInTab(path: string): void {
  const url = chrome.runtime.getURL(`www/index.html#${path}`);
  void chrome.tabs.create({ url });
}

const links = [
  { id: 'dashboard', icon: 'dashboard', labelKey: 'sidebar.links.dashboard', path: '/dashboard' },
  { id: 'keys', icon: 'key', labelKey: 'sidebar.links.keys', path: '/keys' },
  { id: 'settings', icon: 'settings', labelKey: 'sidebar.links.settings', path: '/settings' },
] as const;
</script>

<template>
  <nav class="sidebar-footer" :aria-label="t('sidebar.links.ariaLabel')">
    <q-btn
      v-for="link in links"
      :key="link.id"
      flat
      dense
      class="sidebar-footer__link"
      :icon="link.icon"
      :aria-label="t(link.labelKey)"
      :title="t(link.labelKey)"
      @click="openInTab(link.path)"
      @focus="focused = link.id"
      @blur="focused = null"
      @keydown.esc="focused = null"
    >
      <!--
        The name lives on `aria-label`, not here. A tooltip is a pointer affordance, and NFR-1 says
        no interaction may depend on one — so this is what a sighted user sees, while assistive
        technology reads the label whether or not anything is hovered.

        Escape dismisses it and it follows the button's own hover, with focus driven explicitly
        above because Quasar does not do that itself (WCAG 1.4.13, NFR-1).
      -->
      <q-tooltip
        class="sidebar-footer__tooltip"
        anchor="top middle"
        self="bottom middle"
        :offset="[0, 6]"
        :delay="300"
        :model-value="focused === link.id ? true : null"
      >
        {{ t(link.labelKey) }}
      </q-tooltip>
    </q-btn>
  </nav>
</template>

<style scoped>
.sidebar-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid var(--header-border);
  background: var(--header-bg);
  flex-shrink: 0;
}

/*
 * Icon-only, so the target must be held open deliberately: a dense q-btn shrinks to its content and
 * WCAG 2.2 AA wants 24px (NFR-7). 36px leaves room without crowding a 320px-floor row.
 */
.sidebar-footer__link {
  flex: 1 1 auto;
  min-width: 36px;
  min-height: 36px;
}
</style>
