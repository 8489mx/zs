import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { useCreateShipmentMutation } from './api/shipments.api';

interface NewShipmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewShipmentDialog({ open, onClose }: NewShipmentDialogProps) {
  const [containerNumber, setContainerNumber] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const createMutation = useCreateShipmentMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber) return;
    
    await createMutation.mutateAsync({
      containerNumber,
      arrivalDate: arrivalDate || undefined,
    });
    
    setContainerNumber('');
    setArrivalDate('');
    onClose();
  };

  return (
    <DialogShell open={open} onClose={onClose} width="400px" ariaLabel="إضافة حاوية جديدة">
      <div style={{ padding: '24px' }} dir="rtl">
        <div className="dialog-header" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>إضافة حاوية جديدة</h2>
        </div>
        <form onSubmit={handleSubmit} className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label>رقم الحاوية *</label>
            <input 
              type="text" 
              className="input" 
              required 
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value)}
              placeholder="مثال: MSCU1234567"
            />
          </div>
          
          <div className="form-group">
            <label>تاريخ الوصول المتوقع</label>
            <input 
              type="date" 
              className="input" 
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>

          <div className="actions compact-actions" style={{ marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
              إلغاء
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              حفظ
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
