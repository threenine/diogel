import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import KeyManagementTable from 'src/components/key-management/KeyManagementTable.vue';
import type { StoredKey } from 'src/types';

vi.mock('nostr-tools/nip19', () => ({
  npubEncode: (value: string) => `npub_${value}`,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    d: (date: Date) => `formatted:${date.toISOString()}`,
  }),
}));

const globalStubs = {
  'q-table': {
    template: `<div class="q-table-stub">
      <div v-for="row in rows" :key="row.alias" class="row-item">
        <span class="row-alias">{{ row.alias }}</span>
        <span class="row-npub">{{ row.npub }}</span>
        <slot name="body-cell-createdAt" :row="row" :props="{ row }" />
        <slot name="body-cell-action" :row="row" :props="{ row }" />
      </div>
    </div>`,
    props: ['columns', 'rows', 'noDataLabel', 'rowKey'],
  },
  'q-td': {
    template: '<div class="q-td-stub"><slot /></div>',
    props: ['props'],
  },
  'q-btn': {
    template:
      '<button class="q-btn-stub" :data-to-name="to?.name" :data-to-alias="to?.params?.alias" :data-label="label"><slot /></button>',
    props: ['to', 'label'],
  },
};

describe('KeyManagementTable.vue', () => {
  it('renders key rows with npub-encoded public keys', () => {
    const keys: StoredKey[] = [
      {
        id: 'pubkey-a',
        alias: 'alpha',
        account: { privkey: 'secret-a' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'pubkey-b',
        alias: 'beta',
        account: { privkey: 'secret-b' },
        createdAt: '2026-02-01T00:00:00.000Z',
      },
    ];

    const wrapper = mount(KeyManagementTable, {
      props: { keys },
      global: { stubs: globalStubs },
    });

    expect(wrapper.findAll('.row-item')).toHaveLength(2);
    expect(wrapper.text()).toContain('alpha');
    expect(wrapper.text()).toContain('beta');
    expect(wrapper.text()).toContain('npub_pubkey-a');
    expect(wrapper.text()).toContain('npub_pubkey-b');
    expect(wrapper.text()).toContain('formatted:2026-01-01T00:00:00.000Z');
    expect(wrapper.text()).toContain('formatted:2026-02-01T00:00:00.000Z');
  });

  it('binds View action route to selected alias', () => {
    const keys: StoredKey[] = [
      {
        id: 'pubkey-a',
        alias: 'alpha',
        account: { privkey: 'secret-a' },
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];

    const wrapper = mount(KeyManagementTable, {
      props: { keys },
      global: { stubs: globalStubs },
    });

    const viewButton = wrapper.find('.q-btn-stub');
    expect(viewButton.exists()).toBe(true);
    expect(viewButton.attributes('data-to-name')).toBe('view-key');
    expect(viewButton.attributes('data-to-alias')).toBe('alpha');
  });
});
