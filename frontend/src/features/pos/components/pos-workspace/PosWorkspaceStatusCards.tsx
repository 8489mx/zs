import { Link } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
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
        <div
          style={{
            minHeight: '34px',
            height: '34px',
            boxSizing: 'border-box',
            background: 'rgba(255, 251, 235, 0.92)',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            borderRadius: '8px',
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            color: '#b45309',
            fontSize: '12px',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, overflow: 'hidden' }}>
            <AlertTriangleIcon size={14} color="#d97706" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
              لا توجد وردية مفتوحة — يلزم فتح وردية لتسجيل المبيعات.
            </span>
          </div>
          <button
            type="button"
            onClick={onRequestOpenShift}
            style={{
              flexShrink: 0,
              height: '24px',
              minHeight: '24px',
              padding: '0 10px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: 'none',
              background: '#170c5c',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            فتح وردية
          </button>
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
