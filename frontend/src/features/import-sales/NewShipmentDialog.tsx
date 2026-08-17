import { useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { useCreateShipmentMutation } from './api/shipments.api';
import { useQuery } from '@tanstack/react-query';
import { suppliersApi } from '@/shared/api/suppliers.api';

interface NewShipmentDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NewShipmentDialog({ open, onClose }: NewShipmentDialogProps) {
  const [containerNumber, setContainerNumber] = useState('');
  const [arrivalDate, setArrivalDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [billOfLading, setBillOfLading] = useState('');
  const [shippingDate, setShippingDate] = useState('');
  const createMutation = useCreateShipmentMutation();

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: () => suppliersApi.listAll(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!containerNumber) return;
    
    await createMutation.mutateAsync({
      containerNumber,
      arrivalDate: arrivalDate || undefined,
      supplierId: supplierId || undefined,
      billOfLading: billOfLading || undefined,
      shippingDate: shippingDate || undefined,
    });
    
    setContainerNumber('');
    setArrivalDate('');
    setSupplierId('');
    setBillOfLading('');
    setShippingDate('');
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
            <label>المصنع / المورد</label>
            <select 
              className="input"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
            >
              <option value="">-- إختيار المورد --</option>
              {suppliersData?.suppliers?.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>رقم بوليصة الشحن (B/L)</label>
            <input 
              type="text" 
              className="input" 
              value={billOfLading}
              onChange={(e) => setBillOfLading(e.target.value)}
              placeholder="مثال: BL-12345"
            />
          </div>

          <div className="form-group">
            <label>تاريخ الشحن (مغادرة الميناء)</label>
            <input 
              type="date" 
              className="input" 
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
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
