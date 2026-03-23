<script lang="ts" setup>
import AccountDropdown from 'components/AccountDropdown/Index.vue';
</script>

<template>
  <div class="popup-header-actions">
    <AccountDropdown
      dense
      outlined
      class="account-select"
      dropdown-icon="expand_more"
    />
  </div>
</template>

<style scoped>
.popup-header-actions {
  display: flex;
  align-items: center;
}

.account-select {
  width: 160px;
}
</style>
