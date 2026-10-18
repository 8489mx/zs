import React from 'react';
import i18n from '@/lib/i18n';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';

type Props = {
  sectionKey: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: Error | null;
};

export class SettingsSectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[SettingsSectionErrorBoundary] Error in section:', this.props.sectionKey, error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.sectionKey !== this.props.sectionKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    const isEn = i18n.language === 'en';
    if (this.state.hasError) {
      return (
        <FormSection
          title={isEn ? 'This section could not be opened' : 'تعذر فتح هذا القسم'}
          actions={<span className="nav-pill">{isEn ? 'Display Error' : 'خطأ في العرض'}</span>}
          className="workspace-panel"
        >
          <div className="warning-box">
            {isEn
              ? 'An error occurred in this section only. You can navigate to another section without a full page refresh.'
              : 'حصل خطأ داخل هذا القسم فقط. يمكنك الانتقال لقسم آخر بدون عمل ريفريش كامل.'}
          </div>
          {this.state.error?.message ? (
            <div style={{ marginTop: '10px', padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#991b1b', fontSize: '0.8rem', fontFamily: 'monospace', direction: 'ltr', textAlign: 'left', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {this.state.error.name}: {this.state.error.message}
            </div>
          ) : null}
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => this.setState({ hasError: false, error: null })}>
              {isEn ? 'Retry' : 'إعادة المحاولة'}
            </Button>
          </div>
        </FormSection>
      );
    }

    return this.props.children;
  }
}
