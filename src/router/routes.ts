import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/popup',
    component: () => import('layouts/ExtensionLayout.vue'),
    children: [
      {
        path: '',
        name: 'popup',
        component: () => import('pages/PopupHome.vue'),
      },
    ],
  },
  {
    path: '/login',
    component: () => import('layouts/LoginLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/VaultLogin.vue'),
      },
    ],
  },
  {
    path: '/dashboard',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'dashboard',
        component: () => import('pages/DashboardPage.vue'),
      },
    ],
  },
  {
    path: '/settings',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'settings',
        component: () => import('pages/ExtensionSettings.vue'),
      },
    ],
  },
  {
    path: '/profile',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('pages/ProfilePage.vue'),
      },
    ],
  },
  {
    path: '/relays',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'relays',
        component: () => import('pages/RelayManagementPage.vue'),
      },
    ],
  },
  {
    path: '/contacts',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'contacts',
        component: () => import('pages/ContactListPage.vue'),
      },
    ],
  },
  {
    path: '/wallet-connections',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'wallet-connections',
        component: () => import('pages/WalletConnectionsPage.vue'),
      },
    ],
  },
  {
    path: '/keys',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: 'import',
        name: 'import-key',
        component: () => import('pages/ImportKeyPage.vue'),
      },
      {
        path: 'new',
        name: 'add-new-key',
        component: () => import('pages/AddNewKeyPage.vue'),
      },
      {
        path: ':alias',
        name: 'view-key',
        component: () => import('pages/ViewKeyPage.vue'),
        props: true,
      },
      {
        path: '',
        name: 'keys',
        component: () => import('pages/KeyManagementPage.vue'),
      },
    ],
  },
  {
    path: '/event-history',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'event-history',
        component: () => import('pages/ViewLogs.vue'),
      },
    ],
  },
  {
    path: '/logs',
    redirect: { name: 'event-history' },
  },
  {
    path: '/edit-account/:alias?',
    redirect: (to) => {
      const alias = typeof to.params.alias === 'string' ? to.params.alias : undefined;
      if (alias) {
        return { name: 'view-key', params: { alias } };
      }

      return { name: 'keys' };
    },
  },
  {
    path: '/create-account',
    name: 'create-account',
    redirect: { name: 'add-new-key' },
  },
  {
    path: '/',
    component: () => import('layouts/ExtensionLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/IndexPage.vue'),
      },
    ],
  },
  {
    path: '/approve',
    component: () => import('layouts/PopupLayout.vue'),
    children: [{ path: '', component: () => import('pages/SignerApproval.vue') }],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
