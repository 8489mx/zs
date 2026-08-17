import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { POS_SHORTCUTS, getStartupIssues, type PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

export function PosWorkspaceQuickShortcuts() {
  return (
    <Card className="pos-shortcuts-strip-card pos-secondary-tools-card" title="اختصارات التشغيل السريع" description="اختصارات لوحة المفاتيح المهمة في العمل اليومي داخل الكاشير.">
      <div className="pos-shortcuts-inline-row">
        {POS_SHORTCUTS.map((shortcut) => (
          <div key={shortcut.key} className="pos-shortcut-inline-item">
            <span className="kbd-chip">{shortcut.key}</span>
            <strong>{shortcut.label}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PosWorkspaceStartupIssues({ pos, onRequestOpenShift }: { pos: PosWorkspaceState; onRequestOpenShift?: () => void }) {
  const issues = getStartupIssues(pos);

  if (pos.isLoading || !issues.length) return null;

  const hasNoShift = pos.requiresCashierShift && !pos.ownOpenShift;

  return (
    <div style={{ margin: '0 0 16px' }}>
      {hasNoShift && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '12px',
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          color: '#92400e',
          fontWeight: 600,
          boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
          marginBottom: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <span>لا توجد وردية كاشير مفتوحة لهذا المستخدم. يلزم فتح وردية لبدء تسجيل المبيعات النقدية والشبكة.</span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onRequestOpenShift}
            style={{
              background: '#d97706',
              borderColor: '#b45309',
              color: '#ffffff',
              fontWeight: 700,
              padding: '8px 18px',
              borderRadius: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            فتح وردية الآن
          </Button>
        </div>
      )}

      {issues.filter(i => !i.includes('وردية')).length > 0 && (
        <Card className="pos-shortcuts-strip-card pos-alert-strip-card" title="راجع هذه النقاط قبل بدء البيع" description="حل النقاط التالية سيجعل الكاشير جاهزًا للاستخدام بدون تعطيل.">
          <div className="pos-alert-inline-row" style={{ alignItems: 'stretch' }}>
            {issues.filter(i => !i.includes('وردية')).map((issue, index) => (
              <div key={`${index}-${issue}`} className="pos-alert-inline-item" style={{ display: 'grid', gap: 8 }}>
                <div>{issue}</div>
                <div className="actions compact-actions">
                  {!pos.hasOperationalSetup ? <Link to="/settings/core"><Button variant="secondary">إكمال الإعدادات</Button></Link> : null}
                  {!pos.hasCatalogReady ? <Link to="/products"><Button variant="secondary">إضافة صنف</Button></Link> : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function PosWorkspaceStatusCards() {
  return null;
}
