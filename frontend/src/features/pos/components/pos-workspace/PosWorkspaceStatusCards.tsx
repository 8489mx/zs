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

export function PosWorkspaceStartupIssues({ pos }: { pos: PosWorkspaceState }) {
  const issues = getStartupIssues(pos);

  if (!issues.length) return null;

  return (
    <Card className="pos-shortcuts-strip-card pos-alert-strip-card" title="راجع هذه النقاط قبل بدء البيع" description="حل النقاط التالية سيجعل الكاشير جاهزًا للاستخدام بدون تعطيل.">
      <div className="pos-alert-inline-row" style={{ alignItems: 'stretch' }}>
        {issues.map((issue, index) => (
          <div key={`${index}-${issue}`} className="pos-alert-inline-item" style={{ display: 'grid', gap: 8 }}>
            <div>{issue}</div>
            <div className="actions compact-actions">
              {!pos.hasOperationalSetup ? <Link to="/settings/core"><Button variant="secondary">إكمال الإعدادات</Button></Link> : null}
              {!pos.hasCatalogReady ? <Link to="/products"><Button variant="secondary">إضافة صنف</Button></Link> : null}
              {pos.requiresCashierShift && !pos.ownOpenShift ? <Link to="/cash-drawer"><Button variant="secondary">فتح وردية</Button></Link> : null}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PosWorkspaceStatusCards() {
  return null;
}
