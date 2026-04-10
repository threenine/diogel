import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import RelayBrowserModal from 'src/components/RelayBrowserModal.vue';
import { listRelayCatalog, refreshRelayCatalog, getRelayDiscoveryStatus } from 'src/services/relay-service';

const i18nMock = {
  t: (key: string) => key,
};

vi.mock('vue-i18n', () => ({
  useI18n: () => i18nMock,
}));

vi.mock('src/services/relay-service', () => ({
  listRelayCatalog: vi.fn(),
  refreshRelayCatalog: vi.fn(),
  getRelayDiscoveryStatus: vi.fn(),
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
    template: '<button @click="$emit(\'click\')" :icon="icon">{{ label }}{{ icon }}<slot /></button>',
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
    template: '<div class="q-item" @click="$emit(\'click\')"><slot /></div>',
    props: ['clickable'],
  },
  'q-item-section': {
    template: '<div><slot /></div>',
    props: ['side'],
  },
  'q-item-label': {
    template: '<div class="q-item-label" :class="{ caption }"><slot /></div>',
    props: ['caption', 'lines'],
  },
  'q-badge': {
    template: '<span>{{ label }}</span>',
    props: ['color', 'label'],
  },
  'q-tooltip': {
    template: '<div><slot /></div>',
  },
  'q-input': {
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label'],
  },
  'q-toggle': {
    template: '<input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
    props: ['modelValue', 'label'],
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

  it('emits select and closes when a relay is clicked', async () => {
    const mockRelays = [
      {
        url: 'wss://relay.example.com',
        hostname: 'relay.example.com',
        status: 'online',
        metadata: { name: 'Example Relay' },
      },
    ];
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);

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

    const item = wrapper.find('.q-item');
    await item.trigger('click');

    expect(wrapper.emitted('select')).toBeTruthy();
    expect(wrapper.emitted('select')?.[0]).toEqual([mockRelays[0]]);
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
  });
});

describe('RelayBrowserModal.vue filtering and sorting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRelays = [
    {
      url: 'wss://zebra.relay.com',
      hostname: 'zebra.relay.com',
      status: 'online',
      metadata: { name: 'Zebra Relay' },
    },
    {
      url: 'wss://apple.relay.com',
      hostname: 'apple.relay.com',
      status: 'online',
      metadata: { name: 'Apple Relay', supported_nips: [50] },
    },
  ];

  it('filters relays by search text', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);
    const wrapper = mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Zebra Relay');
    expect(wrapper.text()).toContain('Apple Relay');

    const input = wrapper.find('input');
    await input.setValue('apple');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Zebra Relay');
    expect(wrapper.text()).toContain('Apple Relay');
  });

  it('filters relays by search-capable toggle', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);
    const wrapper = mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    const toggle = wrapper.find('input[type="checkbox"]');
    (toggle.element as HTMLInputElement).checked = true;
    await toggle.trigger('change');
    await flushPromises();

    expect(wrapper.text()).not.toContain('Zebra Relay');
    expect(wrapper.text()).toContain('Apple Relay');
  });

  it('sorts relays alphabetically by default', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);
    const wrapper = mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    const items = wrapper.findAll('.q-item-label').filter(i => !i.classes('caption'));
    // Apple Relay name, Apple Relay URL, Zebra Relay name, Zebra Relay URL
    expect(items).toHaveLength(4);
    expect(items[0]!.text()).toContain('Apple Relay');
    expect(items[1]!.text()).toContain('wss://apple.relay.com');
    expect(items[2]!.text()).toContain('Zebra Relay');
    expect(items[3]!.text()).toContain('wss://zebra.relay.com');
  });

  it('shows empty state when no results match filter', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue(mockRelays as any);
    const wrapper = mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    const input = wrapper.find('input');
    await input.setValue('non-existent');
    await flushPromises();

    expect(wrapper.text()).toContain('relays.browser.empty');
    expect(wrapper.text()).not.toContain('Zebra Relay');
    expect(wrapper.text()).not.toContain('Apple Relay');
  });

  it('triggers refresh automatically when catalog is small', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue([{ url: 'wss://seed.com', hostname: 'seed.com', isSeed: true }] as any);
    vi.mocked(getRelayDiscoveryStatus).mockResolvedValue({ isDiscoveryInProgress: false } as any);

    mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    expect(refreshRelayCatalog).toHaveBeenCalled();
  });

  it('triggers refresh manually when refresh button is clicked', async () => {
    vi.mocked(listRelayCatalog).mockResolvedValue([
      { url: '1', hostname: '1' },
      { url: '2', hostname: '2' },
      { url: '3', hostname: '3' },
      { url: '4', hostname: '4' },
      { url: '5', hostname: '5' },
      { url: '6', hostname: '6' },
      { url: '7', hostname: '7' },
      { url: '8', hostname: '8' },
      { url: '9', hostname: '9' },
      { url: '10', hostname: '10' },
      { url: '11', hostname: '11' },
    ] as any);
    vi.mocked(getRelayDiscoveryStatus).mockResolvedValue({ isDiscoveryInProgress: false } as any);

    const wrapper = mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    // Auto-refresh should NOT have been called because we have 11 relays
    expect(refreshRelayCatalog).not.toHaveBeenCalled();

    const refreshBtn = wrapper.findAll('button').find((b) => b.attributes('icon') === 'refresh');
    await refreshBtn?.trigger('click');

    expect(refreshRelayCatalog).toHaveBeenCalledWith(true);
  });

  it('polls status when discovery is in progress', async () => {
    vi.useFakeTimers();
    vi.mocked(listRelayCatalog).mockResolvedValue([]);
    vi.mocked(getRelayDiscoveryStatus).mockResolvedValue({ isDiscoveryInProgress: true } as any);

    mount(RelayBrowserModal, {
      props: { modelValue: true },
      global: { stubs, directives },
    });
    await flushPromises();

    // The first call is from onMounted -> checkStatus
    // The second call is from onMounted -> fetchRelays -> triggerRefresh -> startPollingStatus -> checkStatus
    expect(getRelayDiscoveryStatus).toHaveBeenCalled();

    // Advance time to trigger next poll
    await vi.advanceTimersByTimeAsync(2000);
    expect(getRelayDiscoveryStatus).toHaveBeenCalledTimes(3);

    vi.useRealTimers();
  });
});
