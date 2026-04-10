import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RelayBrowserModal from 'src/components/RelayBrowserModal.vue';

const i18nMock = {
  t: (key: string) => key,
};

vi.mock('vue-i18n', () => ({
  useI18n: () => i18nMock,
}));

describe('RelayBrowserModal.vue', () => {
  it('renders correctly when modelValue is true', async () => {
    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          'q-dialog': {
            template: '<div><slot /></div>',
            props: ['modelValue']
          },
          'q-card': {
            template: '<div><slot /></div>',
          },
          'q-card-section': {
            template: '<div><slot /></div>',
          },
          'q-card-actions': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
            props: ['label', 'icon']
          },
          'q-spacer': {
            template: '<div />',
          },
          'q-spinner': {
            template: '<div />',
          },
          'q-icon': {
            template: '<div />',
            props: ['name']
          }
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toContain('relays.browser.title');
    expect(wrapper.text()).toContain('relays.browser.empty');
  });

  it('emits update:modelValue when close button is clicked', async () => {
    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs: {
          'q-dialog': {
            template: '<div><slot /></div>',
            props: ['modelValue']
          },
          'q-card': {
            template: '<div><slot /></div>',
          },
          'q-card-section': {
            template: '<div><slot /></div>',
          },
          'q-card-actions': {
            template: '<div><slot /></div>',
          },
          'q-btn': {
            template: '<button @click="$emit(\'click\')">{{ label }}<slot /></button>',
            props: ['label', 'icon']
          },
          'q-spacer': {
            template: '<div />',
          },
          'q-spinner': {
            template: '<div />',
          },
          'q-icon': {
            template: '<div />',
            props: ['name']
          }
        },
      },
    });

    const closeBtn = wrapper.findAll('button').find(b => b.text().includes('relays.browser.close'));
    await closeBtn?.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });
});
