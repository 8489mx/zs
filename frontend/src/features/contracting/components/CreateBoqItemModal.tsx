import { UniversalBoqItemModal } from './UniversalBoqItemModal';

export interface CreateBoqItemModalProps {
  open: boolean;
  projectId: string;
  projectName?: string;
  initialItem?: any;
  itemToEdit?: any;
  onClose: () => void;
  onCreated?: () => void;
  onSuccess?: () => void;
}

export function CreateBoqItemModal({
  open,
  projectId,
  projectName,
  initialItem,
  itemToEdit,
  onClose,
  onCreated,
  onSuccess,
}: CreateBoqItemModalProps) {
  const item = initialItem || itemToEdit;
  const handleSuccess = onCreated || onSuccess;
  return (
    <UniversalBoqItemModal
      open={open}
      mode="project"
      projectId={projectId}
      projectName={projectName}
      initialItem={item}
      onClose={onClose}
      onCreated={handleSuccess}
      onSaved={handleSuccess}
    />
  );
}
