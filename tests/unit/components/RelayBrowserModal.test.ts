import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RelayBrowserModal from 'src/components/RelayBrowserModal.vue';
import { listRelayCatalog } from 'src/services/relay-service';

const i18nMock = {
  t: (key: string) => key,
};

vi.mock('vue-i18n', () => ({
  useI18n: () => i18nMock,
}));

vi.mock('src/services/relay-service', () => ({
  listRelayCatalog: vi.fn(),
}));

const stubs = {
  'q-dialog': {
    template: '<div><slot v-if="modelValue" /></div>',
    props: ['modelValue'],
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
    props: ['label', 'icon'],
  },
  'q-spacer': {
    template: '<div />',
  },
  'q-spinner': {
    template: '<div />',
  },
  'q-icon': {
    template: '<div />',
    props: ['name'],
  },
  'q-list': {
    template: '<div><slot /></div>',
  },
  'q-item': {
    template: '<div><slot /></div>',
  },
  'q-item-section': {
    template: '<div><slot /></div>',
    props: ['side'],
  },
  'q-item-label': {
    template: '<div><slot /></div>',
    props: ['caption', 'lines'],
  },
  'q-badge': {
    template: '<span>{{ label }}</span>',
    props: ['color', 'label'],
  },
};

const directives = {
  'close-popup': vi.fn(),
};

describe('RelayBrowserModal.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly when modelValue is true and shows empty state', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue([]);

    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs,
        directives,
      },
    });

    await flushPromises();

    expect(wrapper.exists()).toBe(true);
    expect(wrapper.text()).toContain('relays.browser.title');
    expect(wrapper.text()).toContain('relays.browser.empty');
  });

  it('renders cached relay catalog entries in the list', async () => {
    const mockRelays = [
      {
        url: 'wss://relay.example.com',
        hostname: 'relay.example.com',
        status: 'online',
        metadata: {
          name: 'Example Relay',
          description: 'A test relay',
        },
      },
    ];
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);

    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: false,
      },
      global: {
        stubs,
        directives,
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    expect(wrapper.text()).toContain('Example Relay');
    expect(wrapper.text()).toContain('wss://relay.example.com');
    expect(wrapper.text()).toContain('A test relay');
    expect(wrapper.text()).toContain('online');
  });

  it('falls back to hostname or URL when display name is missing', async () => {
    const mockRelays = [
      {
        url: 'wss://no-name.com',
        hostname: 'no-name.com',
        status: 'online',
        metadata: {},
      },
      {
        url: 'wss://no-nothing.com',
        status: 'offline',
      },
    ];
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);

    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: false,
      },
      global: {
        stubs,
        directives,
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    expect(wrapper.text()).toContain('no-name.com');
    expect(wrapper.text()).toContain('wss://no-nothing.com');
  });

  it('handles missing optional metadata without crashing', async () => {
    const mockRelays = [
      {
        url: 'wss://minimal.com',
        status: 'unknown',
      },
    ];
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);

    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: false,
      },
      global: {
        stubs,
        directives,
      },
    });

    await wrapper.setProps({ modelValue: true });
    await flushPromises();

    expect(wrapper.text()).toContain('wss://minimal.com');
    expect(wrapper.text()).toContain('unknown');
  });

  it('emits update:modelValue when close button is clicked', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue([]);

    const wrapper = mount(RelayBrowserModal, {
      props: {
        modelValue: true,
      },
      global: {
        stubs,
        directives,
      },
    });

    await flushPromises();

    const closeBtn = wrapper.findAll('button').find((b) => b.text().includes('relays.browser.close'));
    await closeBtn?.trigger('click');

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });
});
