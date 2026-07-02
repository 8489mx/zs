import React, { Component, ErrorInfo, ReactNode } from 'react';
import { apiCall } from '@/core/utils/api'; // Or whatever fetch wrapper is available, I will use native fetch for safety

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
    
    // Silently log to backend
    fetch('/api/logs/frontend-error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization' could be attached if we check local storage, but for an error endpoint, it might not be strictly needed or we can let the interceptor handle it if we use standard api fetch.
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
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', direction: 'rtl', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ color: '#ef4444' }}>حدث خطأ غير متوقع وتم تسجيله تلقائياً.</h2>
          <p style={{ color: '#6b7280', marginTop: '1rem' }}>
            نعتذر عن هذا العطل. لقد تم إرسال تفاصيل المشكلة للنظام تلقائياً. يرجى إعادة تحديث الصفحة للاستمرار.
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '2rem', padding: '0.5rem 1rem', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            تحديث الصفحة
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
