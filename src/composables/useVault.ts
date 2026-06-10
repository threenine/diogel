import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import useVaultStore from 'src/stores/vault-store';
import { type ErrorCode, formatErrorForUser } from 'src/types/error-codes.d';

type LoginContext = 'dashboard' | 'extension';
type PostLoginRouteName = 'dashboard' | 'home';

const dashboardRouteNames = new Set([
  'dashboard',
  'settings',
  'profile',
  'logs',
  'keys',
  'view-key',
  'import-key',
  'add-new-key',
  'edit-account',
]);

function getLoginContextFromQuery(value: unknown): LoginContext | undefined {
  if (value === 'dashboard' || value === 'extension') {
    return value;
  }

  return undefined;
}

export function useVault() {
  const vaultStore = useVaultStore();
  const router = useRouter();
  const route = useRoute();
  const $q = useQuasar();

  const password = ref('');
  const confirmPassword = ref('');
  const mnemonic = ref('Generating...');
  const passphrase = ref('');
  const loading = ref(false);
  const loginError = ref('');

  function getPostLoginRouteName(): PostLoginRouteName {
    const loginContext = getLoginContextFromQuery(route.query.loginContext);
    return loginContext === 'extension' ? 'home' : 'dashboard';
  }

  function getCurrentLoginContext(): LoginContext {
    const routeName = route.name;
    if (typeof routeName === 'string' && dashboardRouteNames.has(routeName)) {
      return 'dashboard';
    }

    return 'extension';
  }

  async function handleCreate() {
    if (password.value.length < 8 || password.value !== confirmPassword.value) {
      return;
    }
    loading.value = true;
    loginError.value = '';

    const result = await vaultStore.create(password.value, mnemonic.value, passphrase.value);
    loading.value = false;
    if (result.success) {
      $q.notify({ type: 'positive', message: 'Vault created successfully' });
      await router.push({ name: getPostLoginRouteName() });
    } else {
      loginError.value = formatErrorForUser(result.error, result.errorCode as ErrorCode);
      $q.notify({
        type: 'negative',
        message: loginError.value,
      });
    }
  }

  async function handleUnlock() {
    loading.value = true;
    loginError.value = '';
    const result = await vaultStore.unlock(password.value);
    loading.value = false;
    if (result.success) {
      const redirect = route.query.redirect as string;
      if (redirect) {
        await router.push({ path: redirect, query: route.query });
      } else {
        await router.push({ name: getPostLoginRouteName() });
      }
    } else {
      loginError.value = formatErrorForUser(result.error, result.errorCode as ErrorCode);
      $q.notify({
        type: 'negative',
        message: loginError.value,
      });
    }
  }

  async function handleLock() {
    await vaultStore.lock();
    void router.push({
      name: 'login',
      query: {
        loginContext: getCurrentLoginContext(),
      },
    });
  }

  return {
    vaultStore,
    password,
    confirmPassword,
    mnemonic,
    passphrase,
    loading,
    loginError,
    handleCreate,
    handleUnlock,
    handleLock,
    getPostLoginRouteName,
  };
}
