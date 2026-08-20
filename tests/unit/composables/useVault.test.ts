import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVault } from 'src/composables/useVault';

const testState = vi.hoisted(() => ({
  notifyMock: vi.fn(),
  pushMock: vi.fn(async () => undefined),
  route: {
    name: 'login' as string,
    query: {} as Record<string, string>,
  },
  vaultStore: {
    create: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(async () => undefined),
  },
}));

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('quasar')>();
  return {
    ...actual,
    useQuasar: () => ({ notify: testState.notifyMock }),
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
  useRouter: () => ({ push: testState.pushMock }),
}));

vi.mock('src/stores/vault-store', () => ({
  default: () => testState.vaultStore,
}));

interface HarnessVm {
  password: string;
  confirmPassword: string;
  mnemonic: string;
  passphrase: string;
  loading: boolean;
  loginError: string;
  handleCreate: () => Promise<void>;
  handleUnlock: () => Promise<void>;
  handleLock: () => Promise<void>;
  getPostLoginRouteName: () => string;
}

const TestHarness = defineComponent({
  name: 'UseVaultHarness',
  setup() {
    return useVault();
  },
  template: '<div />',
});

describe('useVault', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testState.route.name = 'login';
    testState.route.query = {};
  });

  describe('handleCreate', () => {
    it('does nothing when the password is too short', async () => {
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'short';
      vm.confirmPassword = 'short';

      await vm.handleCreate();

      expect(testState.vaultStore.create).not.toHaveBeenCalled();
    });

    it('does nothing when the passwords do not match', async () => {
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'longenough1';
      vm.confirmPassword = 'longenough2';

      await vm.handleCreate();

      expect(testState.vaultStore.create).not.toHaveBeenCalled();
    });

    it('creates the vault and navigates to dashboard by default on success', async () => {
      testState.vaultStore.create.mockResolvedValue({ success: true });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'longenough1';
      vm.confirmPassword = 'longenough1';

      await vm.handleCreate();

      expect(testState.notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'positive' }));
      expect(testState.pushMock).toHaveBeenCalledWith({ name: 'dashboard' });
      expect(vm.loading).toBe(false);
    });

    it('navigates to home when created from the extension login context', async () => {
      testState.route.query = { loginContext: 'extension' };
      testState.vaultStore.create.mockResolvedValue({ success: true });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'longenough1';
      vm.confirmPassword = 'longenough1';

      await vm.handleCreate();

      expect(testState.pushMock).toHaveBeenCalledWith({ name: 'home' });
    });

    it('surfaces a formatted error and notifies on failure', async () => {
      testState.vaultStore.create.mockResolvedValue({ success: false, error: 'boom', errorCode: 'GEN_UNKNOWN' });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'longenough1';
      vm.confirmPassword = 'longenough1';

      await vm.handleCreate();

      expect(vm.loginError).not.toBe('');
      expect(testState.notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'negative' }));
      expect(testState.pushMock).not.toHaveBeenCalled();
    });
  });

  describe('handleUnlock', () => {
    it('redirects to the requested path on success when one is given', async () => {
      testState.route.query = { redirect: '/settings' };
      testState.vaultStore.unlock.mockResolvedValue({ success: true });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'correct-password';

      await vm.handleUnlock();

      expect(testState.pushMock).toHaveBeenCalledWith({ path: '/settings', query: testState.route.query });
    });

    it('falls back to the post-login route when no redirect is given', async () => {
      testState.vaultStore.unlock.mockResolvedValue({ success: true });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'correct-password';

      await vm.handleUnlock();

      expect(testState.pushMock).toHaveBeenCalledWith({ name: 'dashboard' });
    });

    it('surfaces a formatted error and notifies on failure', async () => {
      testState.vaultStore.unlock.mockResolvedValue({ success: false, error: 'Invalid password', errorCode: 'VLT_INVALID_PASSWORD' });
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;
      vm.password = 'wrong-password';

      await vm.handleUnlock();

      expect(vm.loginError).not.toBe('');
      expect(testState.notifyMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'negative' }));
      expect(testState.pushMock).not.toHaveBeenCalled();
    });
  });

  describe('handleLock', () => {
    it('locks the vault and navigates to login with the dashboard context', async () => {
      testState.route.name = 'settings';
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;

      await vm.handleLock();

      expect(testState.vaultStore.lock).toHaveBeenCalledTimes(1);
      expect(testState.pushMock).toHaveBeenCalledWith({ name: 'login', query: { loginContext: 'dashboard' } });
    });

    it('uses the extension login context outside dashboard routes', async () => {
      testState.route.name = 'popup';
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;

      await vm.handleLock();

      expect(testState.pushMock).toHaveBeenCalledWith({ name: 'login', query: { loginContext: 'extension' } });
    });

    it('locks without leaving the panel when the sidebar is the active surface', async () => {
      // The panel renders its own unlock view. Routing would pull the full-tab login page into
      // the 360px panel, which the sidebar surface map forbids.
      testState.route.name = 'sidebar';
      const wrapper = mount(TestHarness);
      const vm = wrapper.vm as unknown as HarnessVm;

      await vm.handleLock();

      expect(testState.vaultStore.lock).toHaveBeenCalledTimes(1);
      expect(testState.pushMock).not.toHaveBeenCalled();
    });
  });
});
