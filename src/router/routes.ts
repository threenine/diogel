import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('layouts/BlankLayout.vue'),
    children: [
      {
        path: '',
        name: 'login',
        component: () => import('pages/VaultLogin.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/ExtensionLayout.vue'),
    children: [
      {
        path: '/',
        name: 'home',
        component: () => import('pages/IndexPage.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '/settings',
        name: 'settings',
        component: () => import('pages/ExtensionSettings.vue'),
      },
      {
        path: 'create-account',
        name: 'create-account',
        component: () => import('pages/CreateAccount.vue'),
      },
      {
        path: '/profile',
        name: 'profile',
        component: () => import('pages/ProfilePage.vue'),
      },
      {
        path: 'edit-account/:alias?',
        name: 'edit-account',
        component: () => import('pages/EditAccount.vue'),
        props: true,
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
