import { onBeforeUnmount, onMounted, watch } from 'vue';
import useSettingsStore from 'src/stores/settings-store';
import useVaultStore from 'src/stores/vault-store';

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
  'focus',
];

export function useVaultAutoLock() {
  const settingsStore = useSettingsStore();
  const vaultStore = useVaultStore();

  let lastActivityAt = Date.now();
  let intervalId: number | null = null;
  let isLocking = false;

  const markActivity = () => {
    if (vaultStore.isUnlocked) {
      lastActivityAt = Date.now();
    }
  };

  const stopMonitoring = () => {
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
  };

  const maybeLockForInactivity = async () => {
    if (!vaultStore.isUnlocked || isLocking) return;

    const minutes = settingsStore.vaultAutoLockMinutes;
    if (minutes <= 0) return;

    const idleMs = Date.now() - lastActivityAt;
    const maxIdleMs = minutes * 60 * 1000;

    if (idleMs < maxIdleMs) return;

    isLocking = true;
    try {
      await vaultStore.lock('inactivity');
    } finally {
      isLocking = false;
    }
  };

  const startMonitoring = () => {
    stopMonitoring();

    if (!vaultStore.isUnlocked) return;
    if (settingsStore.vaultAutoLockMinutes <= 0) return;

    lastActivityAt = Date.now();
    intervalId = window.setInterval(() => {
      void maybeLockForInactivity();
    }, 15_000);
  };

  onMounted(() => {
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, markActivity, { passive: true });
    });

    startMonitoring();
  });

  onBeforeUnmount(() => {
    stopMonitoring();

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.removeEventListener(eventName, markActivity);
    });
  });

  watch(
    () => vaultStore.isUnlocked,
    (isUnlocked) => {
      if (isUnlocked) {
        lastActivityAt = Date.now();
        startMonitoring();
      } else {
        stopMonitoring();
      }
    },
    { immediate: true },
  );

  watch(
    () => settingsStore.vaultAutoLockMinutes,
    () => {
      if (vaultStore.isUnlocked) {
        lastActivityAt = Date.now();
      }
      startMonitoring();
    },
  );

  return {
    markActivity,
  };
}
