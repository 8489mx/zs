import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/app.css';
import '@/lib/i18n';
import * as Sentry from '@sentry/react';

if (import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true' && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

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
      if (el.type !== 'password' && !el.dataset.allowAutofill) {
        if (!el.getAttribute('autocomplete') || el.getAttribute('autocomplete') === 'on') {
          el.setAttribute('autocomplete', 'off');
        }
        el.setAttribute('data-lpignore', 'true');
        el.setAttribute('data-form-type', 'other');
      }
    }
  };

  document.addEventListener('focusin', (e) => suppressAutofill(e.target as Element), true);
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('form').forEach(suppressAutofill);
    document.querySelectorAll('input:not([type="password"])').forEach(suppressAutofill);
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
