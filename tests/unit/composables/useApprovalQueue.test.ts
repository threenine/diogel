import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent } from 'vue';

const { sendBexMessage } = vi.hoisted(() => ({ sendBexMessage: vi.fn() }));

vi.mock('src/services/bridge-client', () => ({ sendBexMessage }));
vi.mock('src/services/log-service', () => ({
  LogLevel: { DEBUG: 'debug' },
  logService: { log: vi.fn() },
}));

import { resetApprovalQueue, useApprovalQueue } from 'src/composables/useApprovalQueue';

const Consumer = defineComponent({
  name: 'QueueConsumer',
  setup() {
    return useApprovalQueue();
  },
  template: '<div />',
});

/** Lets the mounted `void refresh()` settle before assertions. */
const flush = async (): Promise<void> => {
  await vi.waitFor(() => expect(sendBexMessage).toHaveBeenCalled());
};

describe('useApprovalQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApprovalQueue();
    sendBexMessage.mockResolvedValue([]);
  });

  afterEach(() => {
    resetApprovalQueue();
    vi.useRealTimers();
  });

  describe('shared state', () => {
    it('runs one poller however many consumers are mounted', async () => {
      vi.useFakeTimers();
      const setInterval = vi.spyOn(globalThis, 'setInterval');

      const header = mount(Consumer);
      const page = mount(Consumer);

      // The header shows the count while the page shows the request. Two pollers would race and
      // could disagree about what is waiting.
      expect(setInterval).toHaveBeenCalledTimes(1);

      header.unmount();
      page.unmount();
    });

    it('hands every consumer the same queue object', () => {
      const header = mount(Consumer);
      const page = mount(Consumer);

      expect(header.vm.pending).toBe(page.vm.pending);
      expect(header.vm.current).toBe(page.vm.current);

      header.unmount();
      page.unmount();
    });
  });

  describe('teardown', () => {
    it('keeps polling while any consumer remains', async () => {
      vi.useFakeTimers();
      const clearInterval = vi.spyOn(globalThis, 'clearInterval');

      const header = mount(Consumer);
      const page = mount(Consumer);

      header.unmount();
      expect(clearInterval).not.toHaveBeenCalled();

      page.unmount();
      expect(clearInterval).toHaveBeenCalled();
    });

    it('requeues the presented request only once the last consumer has gone', () => {
      const header = mount(Consumer);
      const page = mount(Consumer);

      header.unmount();
      expect(sendBexMessage).not.toHaveBeenCalledWith('nostr.requests.requeuePresented');

      page.unmount();
      // Closing the panel is never a decision (FR-6); navigating within it is not either.
      expect(sendBexMessage).toHaveBeenCalledWith('nostr.requests.requeuePresented');
    });
  });

  describe('refresh', () => {
    it('reads the queue from the background rather than caching a decision', async () => {
      const record = { id: 'req-1', state: 'presented' };
      sendBexMessage.mockImplementation((event: string) => {
        if (event === 'nostr.requests.list') return Promise.resolve([record]);
        if (event === 'nostr.requests.current') return Promise.resolve(record);
        return Promise.resolve(null);
      });

      const wrapper = mount(Consumer);
      await flush();
      await vi.waitFor(() => expect(wrapper.vm.pendingCount).toBe(1));

      expect(wrapper.vm.current).toEqual(record);
      wrapper.unmount();
    });
  });
});
