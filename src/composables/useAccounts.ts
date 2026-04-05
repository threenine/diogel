import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import useAccountStore from 'src/stores/account-store';
import type { DropdownItem } from 'src/types';
import { useI18n } from 'vue-i18n';

export function useAccounts() {
  const accountStore = useAccountStore();
  const router = useRouter();
  const { t } = useI18n();
  const model = ref<string | null>(null);

  const CREATE_VALUE = 'create-account';

  const items = computed<DropdownItem[]>(() => {
    const fromStore: DropdownItem[] = Array.from(accountStore.storedKeys)
      .filter((key) => key.alias !== 'Main Account')
      .map((key) => ({
        label: key.alias,
        value: key.alias,
      }));

    return [
      ...fromStore,
      {
        label: `➕ ${t('account.create')}`,
        value: CREATE_VALUE,
      },
    ];
  });

  onMounted(async () => {
    await accountStore.getKeys();
    model.value = accountStore.activeKey ?? null;
    accountStore.listenToStorageChanges();
  });

  watch(
    () => accountStore.activeKey,
    (newKey) => {
      model.value = newKey ?? null;
    },
  );

  watch(model, async (v, oldV) => {
    if (v === oldV) return;

    if (v === CREATE_VALUE) {
      router.push({ name: 'create-account' }).catch(() => {});
    } else if (v && v !== accountStore.activeKey) {
      await accountStore.setActiveKey(v);

      const currentPath = router.currentRoute.value.path;
      const managementPaths = [
        '/',
        '/profile',
        '/settings',
        '/logs',
        '/popup',
        '/login',
        '/create-account',
        '/approve',
      ];
      const isManagementPath =
        managementPaths.includes(currentPath) || currentPath.startsWith('/edit-account');

      if (!isManagementPath) {
        router.push({ path: '/' }).catch(() => {});
      }
    }
  });

  return {
    items,
    model,
    setActiveKey: (alias: string) => accountStore.setActiveKey(alias),
    getKeys: () => accountStore.getKeys(),
    createValue: CREATE_VALUE,
  };
}
