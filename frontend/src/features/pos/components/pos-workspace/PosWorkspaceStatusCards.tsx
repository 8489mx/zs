import { Card } from '@/components/ui/Card';
import { POS_SHORTCUTS } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

export function PosWorkspaceStartupIssues({ startupIssues }: { startupIssues: string[] }) {
  if (!startupIssues.length) return null;
  return (
    <Card title="تنبيهات قبل أول فاتورة" actions={<span className="nav-pill">جاهزية التشغيل</span>} className="pos-inline-status-card">
      <div className="list-stack">
        {startupIssues.map((issue) => <div key={issue} className="error-box">{issue}</div>)}
      </div>
    </Card>
  );
}

export function PosWorkspaceStatusCards({ contextBadges }: { contextBadges: Array<{ key: string; label: string }> }) {
  return (
    <div className="two-column-grid pos-ops-grid pos-ops-grid-tight">
      <Card title="أوامر الكاشير السريعة" actions={<span className="nav-pill">اختصارات لوحة المفاتيح</span>} className="pos-inline-status-card">
        <div className="pos-shortcuts-grid">
          {POS_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.key} className="list-row pos-shortcut-row">
              <div><strong>{shortcut.label}</strong></div>
              <span className="kbd-chip">{shortcut.key}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="ملخص التشغيل الحالي" actions={<span className="nav-pill">سريع وواضح</span>} className="pos-inline-status-card">
        <div className="pos-context-grid pos-context-grid-premium">
          {contextBadges.map((item) => (
            <div key={item.key} className="detail-item pos-context-item">
              <div className="detail-label">الحالة</div>
              <div className="detail-value">{item.label}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
