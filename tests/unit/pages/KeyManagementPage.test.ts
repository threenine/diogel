import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import KeyManagementPage from 'src/pages/KeyManagementPage.vue';

const getKeysMock = vi.fn(async () => undefined);

vi.mock('src/stores/account-store', () => ({
  default: () => ({
    storedKeys: [],
    getKeys: getKeysMock,
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

describe('KeyManagementPage.vue', () => {
  it('renders localized security warning under hero section', async () => {
    const wrapper = mount(KeyManagementPage, {
      global: {
        stubs: {
          'q-page': { template: '<div><slot /></div>' },
          'q-card': { template: '<div><slot /></div>' },
          'q-card-section': { template: '<div><slot /></div>' },
          'q-separator': true,
          'q-btn': true,
          'q-icon': true,
          'key-management-table': true,
        },
      },
    });

    await wrapper.vm.$nextTick();

    expect(wrapper.find('.key-management-page__security-warning').exists()).toBe(true);
    expect(wrapper.text()).toContain('keyManagement.securityWarning.title');
    expect(wrapper.text()).toContain('keyManagement.securityWarning.message');
  });
});
