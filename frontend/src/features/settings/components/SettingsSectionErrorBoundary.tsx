import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

type Props = {
  sectionKey: string;
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

export class SettingsSectionErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: Props) {
    if (prevProps.sectionKey !== this.props.sectionKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card title="تعذر فتح هذا القسم" actions={<span className="nav-pill">خطأ في العرض</span>} className="workspace-panel">
          <div className="warning-box">حصل خطأ داخل هذا القسم فقط. يمكنك الانتقال لقسم آخر بدون عمل ريفريش كامل.</div>
          <div className="actions compact-actions" style={{ marginTop: 12 }}>
            <Button type="button" variant="secondary" onClick={() => this.setState({ hasError: false })}>إعادة المحاولة</Button>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}
