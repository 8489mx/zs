import { UniversalBoqItemModal } from './UniversalBoqItemModal';

export interface CreateBoqItemModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  initialItem?: any;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateBoqItemModal({
  open,
  projectId,
  projectName,
  initialItem,
  onClose,
  onCreated,
}: CreateBoqItemModalProps) {
  return (
    <UniversalBoqItemModal
      open={open}
      mode="project"
      projectId={projectId}
      projectName={projectName}
      initialItem={initialItem}
      onClose={onClose}
      onCreated={onCreated}
      onSaved={onCreated}
    />
  );
}
