<script lang="ts" setup>
import DiogelLogo from 'components/DiogelLogo/Index.vue';
import SidebarFooterLinks from 'components/sidebar/SidebarFooterLinks.vue';
</script>

<template>
  <q-layout class="sidebar-root" view="hHh Lpr lFf">
    <header class="sidebar-header">
      <div class="sidebar-brand">
        <DiogelLogo size="md" />
        <span class="sidebar-brand__name">Diogel</span>
      </div>
    </header>

    <q-page-container class="sidebar-body diogel-scrollbar">
      <router-view />
    </q-page-container>

    <SidebarFooterLinks />
  </q-layout>
</template>

<style scoped>
/*
 * The panel is a single narrow column. Width is owned by the browser, so the layout is fluid
 * from the 320px floor upward and never scrolls horizontally (NFR-11, NFR-12).
 */
.sidebar-root {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
  height: 100vh;
  background: var(--page-bg);
  overflow-x: hidden;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.sidebar-brand__name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--text-color);
  letter-spacing: -0.0125em;
}

.sidebar-body {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
}
</style>
