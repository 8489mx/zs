import { Card } from '@/components/ui/Card';
import { POS_SHORTCUTS } from '@/features/pos/components/pos-workspace/posWorkspace.helpers';

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

export function PosWorkspaceStartupIssues() {
  return null;
}

export function PosWorkspaceStatusCards() {
  return null;
}
