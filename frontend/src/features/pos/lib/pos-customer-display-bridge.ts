import {
  type CustomerDisplayPayload,
  POS_CFD_BROADCAST_CHANNEL,
  POS_CFD_STORAGE_KEY,
} from '@/features/pos/types/pos-customer-display.types';

let broadcastChannelInstance: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return null;
  }
  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel(POS_CFD_BROADCAST_CHANNEL);
    } catch {
      broadcastChannelInstance = null;
    }
  }
  return broadcastChannelInstance;
}

export function broadcastCustomerDisplayState(payload: CustomerDisplayPayload): void {
  // 1. Post message via BroadcastChannel (0ms in-browser communication)
  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ type: 'CFD_STATE_UPDATE', payload });
    } catch {
      // ignore
    }
  }

  // 2. Persist to localStorage for initial load & storage event cross-tab sync
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(POS_CFD_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage quota error
    }
  }
}

export function getCustomerDisplayInitialState(): CustomerDisplayPayload | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(POS_CFD_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function subscribeCustomerDisplayState(
  callback: (payload: CustomerDisplayPayload) => void,
): () => void {
  if (typeof window === 'undefined') return () => {};

  // 1. Listen via BroadcastChannel
  const channel = getBroadcastChannel();
  const onChannelMessage = (event: MessageEvent) => {
    if (event.data?.type === 'CFD_STATE_UPDATE' && event.data.payload) {
      callback(event.data.payload);
    }
  };

  if (channel) {
    channel.addEventListener('message', onChannelMessage);
  }

  // 2. Listen via storage event (fallback / cross-window sync)
  const onStorageChange = (event: StorageEvent) => {
    if (event.key === POS_CFD_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        callback(parsed);
      } catch {
        // ignore
      }
    }
  };

  window.addEventListener('storage', onStorageChange);

  // Return unsubscribe cleanup function
  return () => {
    if (channel) {
      channel.removeEventListener('message', onChannelMessage);
    }
    window.removeEventListener('storage', onStorageChange);
  };
}

export function openCustomerDisplayWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  const width = Math.min(1280, window.screen?.availWidth || 1024);
  const height = Math.min(800, window.screen?.availHeight || 768);
  const left = window.screen?.availWidth ? window.screen.availWidth - 100 : 0;

  return window.open(
    '/pos/customer-display',
    'CustomerFacingDisplayWindow',
    `width=${width},height=${height},left=${left},top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`,
  );
}

export function openKitchenDisplayWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open('/kds', 'KitchenDisplayWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
}

export function openDigitalSignageWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open('/signage', 'DigitalSignageWindow', 'menubar=no,toolbar=no,location=no,status=no,resizable=yes');
}

