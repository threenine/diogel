import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '/',
        name: 'home',
        component: () => import('pages/IndexPage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('pages/ExtensionSettings.vue'),
      },
      {
        path: 'create-account',
        name: 'create-account',
        component: () => import('pages/CreateAccount.vue'),
      },
      {
        path: 'edit-account',
        name: 'edit-account',
        component: () => import('pages/EditAccount.vue'),
      },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
