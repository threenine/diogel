import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RelayEditor from 'src/components/RelayEditor.vue';
import RelayBrowserModal from 'src/components/RelayBrowserModal.vue';

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
      template: '<input class="q-input-stub" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)"><slot name="append" /></input>',
      props: ['modelValue'],
    },
    'q-btn': {
      template: '<button class="q-btn-stub" :data-icon="icon" @click="$emit(\'click\')"><slot /></button>',
      props: ['icon']
    },
    'q-checkbox': {
      template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
      props: ['modelValue', 'label'],
    },
    'q-list': true,
    'q-item': true,
    'q-item-section': true,
    'q-item-label': true,
    'q-badge': true,
    'q-spinner': true,
    'q-tooltip': true,
    'relay-browser-modal': {
       template: '<div v-if="modelValue" class="mock-modal">Relay Browser Modal</div>',
       props: ['modelValue'],
       emits: ['select']
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

  it('populates input and defaults when relay is selected', async () => {
    const wrapper = mount(RelayEditor, {
      props,
      global: {
        stubs: globalStubs,
      },
    });

    const modal = wrapper.getComponent(RelayBrowserModal);
    const mockRelay = {
      url: 'wss://selected-relay.com',
      hostname: 'selected-relay.com',
    };

    await modal.setValue(true, 'modelValue');
    await modal.vm.$emit('select', mockRelay);

    // Check URL input
    const input = wrapper.find('input.q-input-stub');
    expect((input.element as HTMLInputElement).value).toBe('wss://selected-relay.com');

    // Check checkboxes
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    expect(checkboxes).toHaveLength(2);

    // Based on template: read is first, write is second
    expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(true); // Read
    expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(false); // Write
  });
});
