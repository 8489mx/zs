import { Card } from '@/shared/ui/card';
import { POS_SHORTCUTS, getStartupIssues, type PosWorkspaceState } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

export function PosWorkspaceQuickShortcuts() {
  return (
    <Card className="pos-shortcuts-strip-card">
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
    <Card className="pos-shortcuts-strip-card pos-alert-strip-card">
      <div className="pos-alert-inline-row">
        <span className="nav-pill">تنبيهات</span>
        {issues.map((issue, index) => (
          <div key={`${index}-${issue}`} className="pos-alert-inline-item">
            {issue}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PosWorkspaceStatusCards() {
  return null;
}
