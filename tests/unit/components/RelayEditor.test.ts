import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RelayEditor from 'src/components/RelayEditor.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: vi.fn(),
  }),
}));

// Mock nostr-tools
vi.mock('nostr-tools', () => {
  return {
    SimplePool: class {
      get = vi.fn().mockResolvedValue(null);
      close = vi.fn();
    },
    finalizeEvent: vi.fn(),
  };
});

vi.mock('@noble/hashes/utils', () => ({
  hexToBytes: vi.fn(),
}));

describe('RelayEditor.vue', () => {
  const props = {
    storedKey: {
      id: 'pubkey',
      alias: 'alias',
      account: {
        privkey: '00'.repeat(32),
      },
      createdAt: new Date().toISOString(),
    },
  };

  const globalStubs = {
    'q-input': {
      template: '<div class="q-input-stub"><slot name="append" /></div>',
    },
    'q-btn': {
      template: '<button class="q-btn-stub" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
      props: ['icon']
    },
    'q-checkbox': true,
    'q-list': true,
    'q-item': true,
    'q-item-section': true,
    'q-item-label': true,
    'q-badge': true,
    'q-spinner': true,
    'q-tooltip': true,
    'relay-browser-modal': {
       template: '<div v-if="modelValue" class="mock-modal">Relay Browser Modal</div>',
       props: ['modelValue']
    }
  };

  it('renders Browse button', () => {
    const wrapper = mount(RelayEditor, {
      props,
      global: {
        stubs: globalStubs,
      },
    });

    const browseBtn = wrapper.find('button[data-icon="explore"]');
    expect(browseBtn.exists()).toBe(true);
  });

  it('opens modal when Browse button is clicked', async () => {
    const wrapper = mount(RelayEditor, {
      props,
      global: {
        stubs: globalStubs,
      },
    });

    expect(wrapper.find('.mock-modal').exists()).toBe(false);

    const browseBtn = wrapper.find('button[data-icon="explore"]');
    await browseBtn.trigger('click');

    expect(wrapper.find('.mock-modal').exists()).toBe(true);
  });
});
