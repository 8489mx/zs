import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppProviders } from '@/app/providers';
import { AppRouter } from '@/app/router';
import '@/styles/app.css';
import '@/lib/i18n';

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
