// PERF-7 (ARCHITECTURE_INVARIANTS.md §2.6): @sentry/react is only downloaded when error tracking is
// actually enabled. It used to be imported statically by main.tsx and SilentErrorBoundary, so every
// user paid for the SDK on first load even though VITE_ERROR_TRACKING_ENABLED is off by default.
// Do not `import ... from '@sentry/react'` anywhere else — go through this module.

type SentryModule = typeof import('@sentry/react');

let sentryPromise: Promise<SentryModule | null> | null = null;

export function isErrorTrackingEnabled(): boolean {
  return import.meta.env.VITE_ERROR_TRACKING_ENABLED === 'true' && Boolean(import.meta.env.VITE_SENTRY_DSN);
}

function loadSentry(): Promise<SentryModule | null> {
  if (!isErrorTrackingEnabled()) return Promise.resolve(null);
  if (!sentryPromise) {
    sentryPromise = import('@sentry/react')
      .then((Sentry) => {
        Sentry.init({
          dsn: import.meta.env.VITE_SENTRY_DSN,
          environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'production',
          release: import.meta.env.VITE_SENTRY_RELEASE,
          tracesSampleRate: 0,
          replaysSessionSampleRate: 0,
          replaysOnErrorSampleRate: 0,
        });
        return Sentry;
      })
      .catch(() => null);
  }
  return sentryPromise;
}

export function initErrorTracking(): void {
  void loadSentry();
}

export function captureErrorToTracking(error: unknown, context?: Record<string, Record<string, unknown>>): void {
  void loadSentry().then((Sentry) => {
    Sentry?.captureException(error, context ? { contexts: context } : undefined);
  });
}
