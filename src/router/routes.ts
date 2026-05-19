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
    component: () => import('layouts/ExtensionLayout.vue'),
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
    path: '/keys',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'keys',
        component: () => import('pages/KeyManagementPage.vue'),
      },
    ],
  },
  {
    path: '/logs',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'logs',
        component: () => import('pages/ViewLogs.vue'),
      },
    ],
  },
  {
    path: '/edit-account/:alias?',
    component: () => import('layouts/DashboardLayout.vue'),
    children: [
      {
        path: '',
        name: 'edit-account',
        component: () => import('pages/EditAccount.vue'),
        props: true,
      },
    ],
  },
  {
    path: '/create-account',
    component: () => import('layouts/ExtensionLayout.vue'),
    children: [
      {
        path: '',
        name: 'create-account',
        component: () => import('pages/CreateAccount.vue'),
      },
    ],
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
