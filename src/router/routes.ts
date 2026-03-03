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
    path: '/settings',
    component: () => import('layouts/MainLayout.vue'),
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
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'profile',
        component: () => import('pages/ProfilePage.vue'),
      },
    ],
  },
  {
    path: '/logs',
    component: () => import('layouts/MainLayout.vue'),
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
    component: () => import('layouts/MainLayout.vue'),
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
