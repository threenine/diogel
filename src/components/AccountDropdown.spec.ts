import { describe, expect, it } from 'vitest';
import { shallowMount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import AccountDropdown from './AccountDropdown.vue';

// Simple stub for Quasar's q-select that supports v-model and options prop
const QSelectStub = defineComponent({
  name: 'QSelect',
  props: {
    modelValue: {
      type: [String, Number, null],
      default: null,
    },
    options: {
      type: Array as () => Array<{ label: string; value: string | number }>,
      default: () => [],
    },
  },
  emits: ['update:modelValue', 'change'],
  template: `
    <div class="q-select-stub">
      <div class="model-value">{{ modelValue }}</div>
      <ul class="options">
        <li v-for="(o, idx) in options" :key="idx">{{ o.label }}::{{ o.value }}</li>
      </ul>
    </div>
  `,
});

function mountDd(props: Record<string, unknown> = {}) {
  return shallowMount(AccountDropdown, {
    props,
    global: {
      stubs: { 'q-select': QSelectStub },
    },
  });
}

describe('AccountDropdown', () => {
  it('includes the "Create Account" option first by default', () => {
    const wrapper = mountDd({
      items: [
        { label: 'Personal', value: 'acc-1' },
        { label: 'Business', value: 'acc-2' },
      ],
    });

    const q = wrapper.findComponent(QSelectStub);
    const options = q.props('options') as Array<{ label: string; value: string | number }>;
    expect(options.length).toBe(3);
    expect(options[0]).toEqual({ label: 'Create Account', value: 'create-account' });
    expect(options[1]).toEqual({ label: 'Personal', value: 'acc-1' });
    expect(options[2]).toEqual({ label: 'Business', value: 'acc-2' });
  });

  it('defaults selection to createValue when modelValue is not provided', () => {
    const wrapper = mountDd({});
    const q = wrapper.findComponent(QSelectStub);
    expect(q.props('modelValue')).toBe('create-account');
  });

  it('honors provided modelValue', () => {
    const wrapper = mountDd({
      modelValue: 'acc-1',
      items: [
        { label: 'Personal', value: 'acc-1' },
        { label: 'Business', value: 'acc-2' },
      ],
    });
    const q = wrapper.findComponent(QSelectStub);
    expect(q.props('modelValue')).toBe('acc-1');
  });

  it('excludes the default option when includeCreateOption=false', () => {
    const wrapper = mountDd({
      includeCreateOption: false,
      items: [
        { label: 'Personal', value: 'acc-1' },
        { label: 'Business', value: 'acc-2' },
      ],
    });
    const q = wrapper.findComponent(QSelectStub);
    const options: {
      label: string;
      value: string | number;
    }[] = q.props('options') as Array<{ label: string; value: string | number }>;
    expect(options).not.toBeUndefined();
    expect(options).toBeDefined();
    expect(options.length).toBe(2);
    const first = options[0];
    expect(first).toBeDefined();
    expect(first!.label).toBe('Personal');
    expect(options.find((o) => o.value === 'create-account')).toBeUndefined();
  });

  it('emits update:modelValue and change when selection changes', async () => {
    const wrapper = mountDd({
      items: [
        { label: 'Personal', value: 'acc-1' },
        { label: 'Business', value: 'acc-2' },
      ],
    });
    const q = wrapper.findComponent(QSelectStub);

    // Simulate q-select updating its v-model
    q.vm.$emit('update:modelValue', 'acc-2');
    await wrapper.vm.$nextTick();

    // Inner watch should re-emit both events from AccountDropdown

    const update = wrapper.emitted('update:modelValue') as Array<[string]>;
    expect(update.length).toBeGreaterThan(0);
    expect(update[0]![0]).toBe('acc-2');

    const change = wrapper.emitted('change') as Array<[string]>;
    expect(change.length).toBeGreaterThan(0);
    expect(change[0]![0]).toBe('acc-2');
  });
});
