import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';

const state = vi.hoisted(() => ({ vaultExists: true, isUnlocked: true }));

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

vi.mock('src/stores/vault-store', () => ({
  default: () => ({
    get vaultExists() {
      return state.vaultExists;
    },
    get isUnlocked() {
      return state.isUnlocked;
    },
  }),
}));

vi.mock('src/stores/account-store', () => ({
  default: () => ({ activeKey: undefined, storedKeys: new Set(), getKeys: vi.fn() }),
}));

vi.mock('src/composables/useActiveTab', () => ({ useActiveTab: () => ({ activeOrigin: ref('') }) }));

vi.mock('src/composables/useApprovalQueue', () => ({
  useApprovalQueue: () => ({
    pending: ref([]),
    current: ref(null),
    content: ref(null),
    decide: vi.fn(),
    refresh: vi.fn(),
  }),
}));

const mountPage = async () => {
  const SidebarHome = (await import('src/pages/SidebarHome.vue')).default;
  return mount(SidebarHome, {
    global: {
      stubs: {
        'q-page': { template: '<div><slot /></div>' },
        'q-icon': true,
        'q-btn': { template: '<button>{{ label }}</button>', props: ['label'] },
        ProfileView: true,
        CurrentRequest: true,
        PendingRequestList: true,
        SidebarUnlock: { template: '<div class="sidebar-unlock" />' },
      },
    },
  });
};

describe('SidebarHome body precedence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.vaultExists = true;
    state.isUnlocked = true;
  });

  describe('when no vault exists', () => {
    beforeEach(() => {
      state.vaultExists = false;
      state.isUnlocked = false;
    });

    it('offers to set Porwr up', async () => {
      const wrapper = await mountPage();

      expect(wrapper.find('.sidebar-setup').exists()).toBe(true);
    });

    it('never offers to unlock a vault that does not exist', async () => {
      // The bug this guards (#158): `!isUnlocked` alone put the unlock view in front of a user who
      // had no vault to unlock.
      const wrapper = await mountPage();

      expect(wrapper.find('.sidebar-unlock').exists()).toBe(false);
    });
  });

  describe('when the vault exists but is locked', () => {
    beforeEach(() => {
      state.vaultExists = true;
      state.isUnlocked = false;
    });

    it('shows the unlock view (S2)', async () => {
      const wrapper = await mountPage();

      expect(wrapper.find('.sidebar-unlock').exists()).toBe(true);
      expect(wrapper.find('.sidebar-setup').exists()).toBe(false);
    });
  });

  describe('when the vault is unlocked', () => {
    it('shows neither setup nor unlock', async () => {
      const wrapper = await mountPage();

      expect(wrapper.find('.sidebar-setup').exists()).toBe(false);
      expect(wrapper.find('.sidebar-unlock').exists()).toBe(false);
    });
  });
});
