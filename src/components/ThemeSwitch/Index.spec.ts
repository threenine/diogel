import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import ThemeSwitch from './Index.vue';
import type * as Quasar from 'quasar';

type QuasarModule = typeof Quasar;

// Local mock for Quasar's useQuasar dark API so we can control isActive deterministically
let darkState = { isActive: false, set: () => void 0 } as {
  isActive: boolean;
  set: (v: boolean) => void;
};

vi.mock('quasar', async () => {
  const actual = await vi.importActual<QuasarModule>('quasar');
  return {
    ...actual,
    useQuasar: () => ({ dark: darkState }),
  };
});

// Minimal stub for QToggle that supports v-model and size prop
const QToggleStub = defineComponent({
  name: 'QToggle',
  props: {
    modelValue: { type: Boolean, default: false },
    size: { type: String, default: 'md' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return () =>
      h(
        'button',
        {
          'data-size': props.size,
          'data-model-value': String(props.modelValue),
          onClick: () => emit('update:modelValue', !props.modelValue),
        },
        props.modelValue ? 'on' : 'off',
      );
  },
});

const mountWithQuasar = (props?: Record<string, unknown>) =>
  mount(ThemeSwitch, {
    props: props ?? {},
    global: {
      stubs: { 'q-toggle': QToggleStub },
    },
  });

describe('ThemeSwitch', () => {
  let setSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mock dark API for each test
    setSpy = vi.fn((v: boolean) => {
      darkState.isActive = v;
    });
    darkState = { isActive: false, set: setSpy };
  });

  afterEach(() => {
    // cleanup
    setSpy.mockClear();
  });

  it('renders a QToggle with default size xl and reflects dark mode state', async () => {
    // Dark mode is off by default from beforeEach
    const wrapper = mountWithQuasar();
    const toggle = wrapper.get('button');

    // size prop passed through
    expect(toggle.attributes('data-size')).toBe('xl');

    // v-model initialized from Dark.isActive
    expect(toggle.attributes('data-model-value')).toBe('false');

    // Simulate user toggling it on
    await toggle.trigger('click');

    // Should call dark.set(true) under the hood
    expect(setSpy).toHaveBeenCalledWith(true);
    expect(darkState.isActive).toBe(true);
  });

  it('accepts a custom size and toggles dark off when turned off', async () => {
    // Start with dark enabled
    darkState.isActive = true;
    const wrapper = mountWithQuasar({ size: 'sm' });
    const toggle = wrapper.get('button');

    expect(toggle.attributes('data-size')).toBe('sm');
    // v-model initialized from Dark.isActive
    expect(toggle.attributes('data-model-value')).toBe('true');

    // Toggle off
    await toggle.trigger('click');
    expect(setSpy).toHaveBeenCalledWith(false);
    expect(darkState.isActive).toBe(false);
  });
});
