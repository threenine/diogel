import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

import ProfileEditor from 'src/components/ProfileEditor.vue';
import type { NostrProfile, StoredKey } from 'src/types';

const { fetchProfileMock, saveProfileMock, verifyIdentifierMock, notifyMock } = vi.hoisted(() => ({
  fetchProfileMock: vi.fn(),
  saveProfileMock: vi.fn(),
  verifyIdentifierMock: vi.fn(),
  notifyMock: vi.fn(),
}));

vi.mock('src/services/profile-service', () => ({
  profileService: {
    fetchProfile: fetchProfileMock,
    saveProfile: saveProfileMock,
  },
}));

vi.mock('src/services/nip05-service', () => ({
  parseNip05Identifier: (value: string) => {
    const normalized = value.trim();
    const match = normalized.match(/^([^@\s]+)@([^@\s]+)$/);
    if (!match) {
      return null;
    }

    const [, name, domain] = match;
    return { name, domain };
  },
  nip05Service: {
    verifyIdentifier: verifyIdentifierMock,
  },
}));

vi.mock('quasar', () => ({
  useQuasar: () => ({
    notify: notifyMock,
  }),
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

const storedKey: StoredKey = {
  id: 'pubkey-1',
  alias: 'alpha',
  account: {
    privkey: 'privkey-1',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
};

const globalStubs = {
  'q-spinner': true,
  'q-form': {
    template: '<form class="q-form-stub" @submit.prevent="$emit(\'submit\')"><slot /></form>',
    emits: ['submit'],
  },
  'q-input': {
    template:
      '<label class="q-input-stub" :data-label="label"><input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot name="append" /></label>',
    props: ['modelValue', 'label', 'rules', 'type'],
    emits: ['update:modelValue'],
  },
  'q-toggle': {
    template:
      '<label class="q-toggle-stub" :data-label="label"><input type="checkbox" :checked="modelValue" @change="$emit(\'update:modelValue\', $event.target.checked)" /></label>',
    props: ['modelValue', 'label'],
    emits: ['update:modelValue'],
  },
  'q-btn': {
    template:
      '<button class="q-btn-stub" :data-label="label" :disabled="disable" @click="$emit(\'click\')"><slot /></button>',
    props: ['label', 'disable', 'loading', 'type'],
    emits: ['click'],
  },
};

async function flushComponent() {
  await Promise.resolve();
  await nextTick();
}

async function mountEditor(profileData?: NostrProfile) {
  fetchProfileMock.mockResolvedValue(profileData ?? null);

  const wrapper = mount(ProfileEditor, {
    props: {
      storedKey,
    },
    global: {
      stubs: globalStubs,
    },
  });

  await flushComponent();
  return wrapper;
}

describe('ProfileEditor.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    saveProfileMock.mockResolvedValue(undefined);
    verifyIdentifierMock.mockResolvedValue({ status: 'verified' });
  });

  it('saves bot=true when enabled', async () => {
    const wrapper = await mountEditor();

    const toggleInput = wrapper.find('.q-toggle-stub input');
    await toggleInput.setValue(true);

    await wrapper.find('form.q-form-stub').trigger('submit');
    await flushComponent();

    expect(saveProfileMock).toHaveBeenCalledWith(
      storedKey.account.privkey,
      expect.objectContaining({
        bot: true,
      }),
    );
  });

  it('serializes partial birthday values as numbers', async () => {
    const wrapper = await mountEditor();
    const birthdayInputs = wrapper.findAll('.profile-editor__birthday-grid input');

    await birthdayInputs[0]!.setValue('1980');
    await birthdayInputs[1]!.setValue('5');

    await wrapper.find('form.q-form-stub').trigger('submit');
    await flushComponent();

    expect(saveProfileMock).toHaveBeenCalledWith(
      storedKey.account.privkey,
      expect.objectContaining({
        birthday: {
          year: 1980,
          month: 5,
        },
      }),
    );
  });

  it('omits birthday when all birthday fields are empty', async () => {
    const wrapper = await mountEditor();

    await wrapper.find('form.q-form-stub').trigger('submit');
    await flushComponent();

    const savePayload = saveProfileMock.mock.calls[0]?.[1] as NostrProfile | undefined;
    expect(savePayload).toBeDefined();
    expect(savePayload?.birthday).toBeUndefined();
  });

  it('does not auto-run NIP-05 verification on input change', async () => {
    const wrapper = await mountEditor();
    const nip05Input = wrapper.find('.q-input-stub[data-label="profile.nip05"] input');

    await nip05Input.setValue('alice@example.com');
    await flushComponent();

    expect(verifyIdentifierMock).not.toHaveBeenCalled();
  });
});
