import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/app.css';
import '@/lib/i18n';

const reportGlobalError = (error: any, type: string) => {
  try {
    fetch('/api/logs/frontend-error', {
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
