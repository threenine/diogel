import { onMounted, onUnmounted, ref, type Ref } from 'vue';

import { LogLevel, logService } from 'src/services/log-service';

export interface UseActiveTabResult {
  /** Origin of the active tab in this window, or an empty string when there is none. */
  activeOrigin: Ref<string>;
}

const toOrigin = (url: string | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return parsed.origin;
  } catch {
    return '';
  }
};

/**
 * Track the active tab's origin for panel context.
 *
 * This is context only. A request always carries its own origin, and the panel must display that
 * rather than this value, because a request may come from a background tab or another window
 * (ADR D2, specification S8).
 */
export function useActiveTab(): UseActiveTabResult {
  const activeOrigin = ref('');

  const refresh = async (): Promise<void> => {
    try {
      if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      activeOrigin.value = toOrigin(tab?.url);
    } catch (error: unknown) {
      logService.log(LogLevel.DEBUG, '[Sidebar] Failed to read active tab', {
        error: error instanceof Error ? error.message : String(error),
      });
      activeOrigin.value = '';
    }
  };

  const onActivated = (): void => {
    void refresh();
  };

  const onUpdated = (_tabId: number, changeInfo: chrome.tabs.OnUpdatedInfo): void => {
    if (changeInfo.url === undefined && changeInfo.status === undefined) return;
    void refresh();
  };

  onMounted(() => {
    void refresh();
    chrome.tabs?.onActivated?.addListener(onActivated);
    chrome.tabs?.onUpdated?.addListener(onUpdated);
  });

  onUnmounted(() => {
    chrome.tabs?.onActivated?.removeListener(onActivated);
    chrome.tabs?.onUpdated?.removeListener(onUpdated);
  });

  return { activeOrigin };
}
