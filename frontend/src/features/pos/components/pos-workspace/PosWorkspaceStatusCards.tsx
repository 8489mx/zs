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
    <div>
      {hasNoShift && (
        <div style={{
          background: '#fffbeb',
          border: '1px solid #fde68a',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          color: '#92400e',
          fontWeight: 500,
          fontSize: '0.82rem',
          marginBottom: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>⚠️</span>
            <span>لا توجد وردية مفتوحة — يلزم فتح وردية لتسجيل المبيعات.</span>
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={onRequestOpenShift}
            style={{
              background: '#d97706',
              borderColor: '#b45309',
              color: '#ffffff',
              fontWeight: 600,
              padding: '4px 12px',
              fontSize: '0.78rem',
              borderRadius: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            فتح وردية
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
