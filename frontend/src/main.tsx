import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/app.css';
import '@/lib/i18n';
import { initErrorTracking } from '@/lib/error-tracking';

// Sentry is loaded on demand (and only when enabled) — see src/lib/error-tracking.ts (PERF-7).
initErrorTracking();

import { resolveRequestUrl } from '@/lib/http';

const reportGlobalError = (error: any, type: string) => {
  try {
    fetch(resolveRequestUrl('/api/logs/frontend-error'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error?.message || String(error),
        stack: error?.stack,
        type,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(() => {});
  } catch (e) {
    // Ignore
  }
};

window.addEventListener('error', (event) => {
  reportGlobalError(event.error || { message: event.message }, 'window.error');
});

window.addEventListener('unhandledrejection', (event) => {
  reportGlobalError(event.reason || { message: 'Unhandled Rejection' }, 'unhandledrejection');
});

import { ActivationGuard } from '@/shared/components/ActivationGuard';
import { SilentErrorBoundary } from '@/core/components/SilentErrorBoundary';
import { initProductIconTheme } from '@/shared/components/icons/product-icon-theme';

initProductIconTheme();

// Globally suppress intrusive browser autofill overlays on business ERP forms
if (typeof document !== 'undefined') {
  const suppressAutofill = (el: Element | null) => {
    if (!el) return;
    if (el instanceof HTMLFormElement) {
      if (!el.hasAttribute('autocomplete')) el.setAttribute('autocomplete', 'off');
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (!el.dataset.allowAutofill) {
        if (!el.getAttribute('autocomplete') || el.getAttribute('autocomplete') === 'on') {
          el.setAttribute('autocomplete', 'off');
        }
        el.setAttribute('data-lpignore', 'true');
        el.setAttribute('data-1p-ignore', 'true');
        el.setAttribute('data-form-type', 'other');
      }
    }
  };

  document.addEventListener('focusin', (e) => suppressAutofill(e.target as Element), true);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form').forEach(suppressAutofill);
    document.querySelectorAll('input, textarea').forEach(suppressAutofill);
  });

  // Mobile & Touch-Emulation Stuck-Pointer & Drag-Lock Shield
  let isPointerDown = false;

  const clearStraySelection = () => {
    if (window.innerWidth <= 900) {
      const sel = window.getSelection();
      if (sel && sel.type === 'Range') {
        const active = document.activeElement;
        if (!active || (!active.matches('input, textarea') && !active.closest('[contenteditable="true"]'))) {
          sel.removeAllRanges();
        }
      }
    }
  };

  const handlePointerRelease = (e?: Event) => {
    if (isPointerDown) {
      isPointerDown = false;
      clearStraySelection();
      // If an element holds pointer capture, release it to prevent stuck drag
      if (e && 'pointerId' in e && e.target && 'releasePointerCapture' in (e.target as any)) {
        try {
          (e.target as any).releasePointerCapture((e as any).pointerId);
        } catch (_) {}
      }
    }
  };

  window.addEventListener('pointerdown', () => { isPointerDown = true; }, true);
  window.addEventListener('mousedown', () => { isPointerDown = true; }, true);
  window.addEventListener('touchstart', () => { isPointerDown = true; }, { passive: true, capture: true });

  window.addEventListener('pointerup', handlePointerRelease, true);
  window.addEventListener('mouseup', handlePointerRelease, true);
  window.addEventListener('touchend', handlePointerRelease, { passive: true, capture: true });
  window.addEventListener('touchcancel', handlePointerRelease, { passive: true, capture: true });
  window.addEventListener('pointercancel', handlePointerRelease, true);
  window.addEventListener('mouseleave', handlePointerRelease, true);
  window.addEventListener('blur', handlePointerRelease);

  // Active Drag-Lock Breaker: When cursor moves with buttons === 0, force-break any stuck drag state
  const checkButtonsState = (e: MouseEvent | PointerEvent) => {
    if (window.innerWidth <= 900 && e.buttons === 0) {
      if (isPointerDown) {
        handlePointerRelease(e);
        // Dispatch synthetic release to force any browser emulation layer to end the touch
        try {
          e.target?.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
        } catch (_) {}
      }
      clearStraySelection();
    }
  };

  window.addEventListener('mousemove', checkButtonsState, { passive: true, capture: true });
  window.addEventListener('pointermove', checkButtonsState, { passive: true, capture: true });

  // Suppress accidental text selection & HTML5 drag-and-drop on mobile
  document.addEventListener('selectstart', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && !target.closest('input, textarea, [contenteditable="true"], .selectable-text')) {
      if (window.innerWidth <= 900) {
        e.preventDefault();
      }
    }
  });

  document.addEventListener('dragstart', (e) => {
    const target = e.target as HTMLElement | null;
    if (target && target.getAttribute('draggable') !== 'true' && !target.closest?.('[draggable="true"]')) {
      e.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SilentErrorBoundary>
      <AppProviders>
        <ActivationGuard>
          <AppRouter />
        </ActivationGuard>
      </AppProviders>
    </SilentErrorBoundary>
  </React.StrictMode>
);
