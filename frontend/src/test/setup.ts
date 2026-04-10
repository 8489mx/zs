import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { DEFAULT_STORE_NAME, DEFAULT_THEME, useAuthStore } from '@/stores/auth-store';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  document.cookie = 'csrf_token=; Max-Age=0; path=/';
  useAuthStore.setState({ user: null, storeName: DEFAULT_STORE_NAME, theme: DEFAULT_THEME, initialized: false });
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: vi.fn(),
});

if (!window.requestAnimationFrame) {
  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: vi.fn().mockImplementation((callback: FrameRequestCallback) => window.setTimeout(() => callback(performance.now()), 1)),
  });
}

if (!window.cancelAnimationFrame) {
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: vi.fn().mockImplementation((id: number) => window.clearTimeout(id)),
  });
}

if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

if (!window.requestIdleCallback) {
  Object.defineProperty(window, 'requestIdleCallback', {
    writable: true,
    value: vi.fn().mockImplementation((callback: IdleRequestCallback) => window.setTimeout(() => callback({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline), 1)),
  });
}

if (!window.cancelIdleCallback) {
  Object.defineProperty(window, 'cancelIdleCallback', {
    writable: true,
    value: vi.fn().mockImplementation((id: number) => window.clearTimeout(id)),
  });
}
