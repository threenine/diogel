import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SignerApproval from 'src/pages/SignerApproval.vue';

const testState = vi.hoisted(() => ({
  route: {
    query: {} as Record<string, string>,
  },
  bexSendMock: vi.fn(async () => undefined),
}));

vi.mock('quasar', async (importOriginal) => {
  const actual = await importOriginal<typeof import('quasar')>();
  return {
    ...actual,
    useQuasar: () => ({
      bex: {
        send: testState.bexSendMock,
      },
    }),
  };
});

vi.mock('vue-router', () => ({
  useRoute: () => testState.route,
}));

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('src/services/log-service', () => ({
  LogLevel: {
    DEBUG: 'DEBUG',
    ERROR: 'ERROR',
  },
  logService: {
    log: vi.fn(),
  },
}));

const mountPage = () =>
  mount(SignerApproval, {
    global: {
      stubs: {
        'q-page': { template: '<div><slot /></div>' },
        'q-card': { template: '<div><slot /></div>' },
        'q-card-section': { template: '<section><slot /></section>' },
        'q-card-actions': { template: '<div><slot /></div>' },
        'q-avatar': { template: '<div><slot /></div>' },
        'q-img': { template: '<div><slot /></div>' },
        'q-icon': true,
        'q-select': true,
        'q-separator': true,
        'q-btn': true,
      },
    },
  });

describe('SignerApproval.vue', () => {
  beforeEach(() => {
    testState.route.query = {};
    testState.bexSendMock.mockClear();
  });

  it('displays sign-event kind type and content description details', async () => {
    testState.route.query = {
      origin: 'https://client.example',
      requestType: 'sign_event',
      kind: '22242',
      contentDescription: 'Authorize Diogel login for client.example',
    };

    const wrapper = mountPage();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Request Type');
    expect(wrapper.text()).toContain('Sign event request');
    expect(wrapper.text()).toContain('Kind Type');
    expect(wrapper.text()).toContain('Client authentication (22242)');
    expect(wrapper.text()).toContain('Content Description');
    expect(wrapper.text()).toContain('Authorize Diogel login for client.example');
  });

  it('displays non-event signer requests without a content description block', async () => {
    testState.route.query = {
      origin: 'https://client.example',
      requestType: 'get_public_key',
      kind: '-1',
    };

    const wrapper = mountPage();
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Public key request');
    expect(wrapper.text()).toContain('No Nostr event kind');
    expect(wrapper.text()).not.toContain('Content Description');
  });
});
