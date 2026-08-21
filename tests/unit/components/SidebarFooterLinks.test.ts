import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

import SidebarFooterLinks from 'src/components/sidebar/SidebarFooterLinks.vue';

const createTab = vi.fn();

const mountFooter = () =>
  mount(SidebarFooterLinks, {
    global: {
      stubs: {
        'q-btn': { template: '<button>{{ label }}</button>', props: ['label', 'icon'] },
      },
    },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('chrome', {
    runtime: { getURL: (path: string) => `chrome-extension://id/${path}` },
    tabs: { create: createTab },
  });
});

/**
 * The footer offers exactly three destinations (#182).
 *
 * It carried a fourth, Event History, which the panel does not need: the panel is where signing is
 * decided, and reviewing what was signed belongs to the dashboard the first link reaches. The
 * approved specification named a different three again, and was amended to match this.
 */
describe('the sidebar footer', () => {
  it('offers exactly three links', () => {
    const wrapper = mountFooter();

    expect(wrapper.findAll('button')).toHaveLength(3);
  });

  it('offers Dashboard, Keys and Settings, and nothing else', () => {
    const wrapper = mountFooter();

    expect(wrapper.findAll('button').map((button) => button.text())).toEqual([
      'sidebar.links.dashboard',
      'sidebar.links.keys',
      'sidebar.links.settings',
    ]);
  });

  it('opens each in a full tab rather than routing the panel', async () => {
    const wrapper = mountFooter();

    for (const button of wrapper.findAll('button')) {
      await button.trigger('click');
    }

    // Management stays full-tab; a panel that navigated to one would be a 360px dashboard.
    expect(createTab).toHaveBeenCalledTimes(3);
    for (const [{ url }] of createTab.mock.calls as Array<[{ url: string }]>) {
      expect(url).toMatch(/^chrome-extension:\/\/id\/www\/index\.html#\//);
    }
  });
});
