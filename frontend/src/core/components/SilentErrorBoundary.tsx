import { Component, ErrorInfo, ReactNode } from 'react';
import i18n from '@/lib/i18n';
import { captureErrorToTracking } from '@/lib/error-tracking';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class SilentErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    captureErrorToTracking(error, { react: { componentStack: errorInfo.componentStack } });

    // Silently log to backend
    fetch('/api/logs/frontend-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    }).catch(err => {
      console.error('Failed to send error log to server', err);
    });
  }

  public render() {
    const isEn = i18n.language === 'en';
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', direction: isEn ? 'ltr' : 'rtl', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#ef4444' }}>
            {isEn ? 'An unexpected error occurred and was logged automatically.' : 'حدث خطأ غير متوقع وتم تسجيله تلقائياً.'}
          </h2>
          <p style={{ color: '#6b7280', marginTop: '1rem' }}>
            {isEn
              ? 'We apologize for the inconvenience. Error details have been submitted. Please reload the page to continue.'
              : 'نعتذر عن هذا العطل. لقد تم إرسال تفاصيل المشكلة للنظام تلقائياً. يرجى إعادة تحديث الصفحة للاستمرار.'}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            {isEn ? 'Reload Page' : 'تحديث الصفحة'}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
