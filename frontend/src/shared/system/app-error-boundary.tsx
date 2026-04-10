import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'حدث خطأ غير متوقع في الواجهة'
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('react_frontend_error', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    window.location.assign('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="screen-center">
          <div className="login-card">
            <h1 style={{ marginTop: 0 }}>حدث خطأ في الواجهة</h1>
            <div className="muted" style={{ marginBottom: 16 }}>
              تم إيقاف الشاشة الحالية لحماية باقي التطبيق من الكسر المتسلسل.
            </div>
            <div className="error-box">{this.state.message}</div>
            <button className="btn btn-primary full-width" onClick={this.handleReset}>العودة إلى لوحة التحكم</button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
