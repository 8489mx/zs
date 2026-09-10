import { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!containerNumber.trim()) return alert('يرجى إدخال رقم الحاوية');

    await createMutation.mutateAsync({
      containerNumber: containerNumber.trim(),
      arrivalDate: arrivalDate || undefined,
      supplierId: supplierId || undefined,
      billOfLading: billOfLading.trim() || undefined,
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
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إضافة حاوية شحن جديدة"
      subtitle="تسجيل بيانات الحاوية المستوردة وربطها بالمصنع ورقم بوليصة الشحن وتواريخ الإبحار والوصول."
      width="min(580px, 95vw)"
      footerActions={
        <StandardDialogFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitText={createMutation.isPending ? 'جاري الإضافة...' : 'إضافة الحاوية'}
          cancelText="إلغاء"
          isSubmitting={createMutation.isPending}
        />
      }
    >
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              رقم الحاوية <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              required
              value={containerNumber}
              onChange={(e) => setContainerNumber(e.target.value)}
              placeholder="مثال: MSCU1234567"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              المصنع / المورد الأجنبي
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            >
              <option value="">-- اختر المورد / المصنع --</option>
              {suppliersData?.suppliers?.map((sup) => (
                <option key={sup.id} value={sup.id}>
                  {sup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              رقم بوليصة الشحن (B/L)
            </label>
            <input
              type="text"
              value={billOfLading}
              onChange={(e) => setBillOfLading(e.target.value)}
              placeholder="مثال: BL-12345"
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              تاريخ الشحن (مغادرة الميناء)
            </label>
            <input
              type="date"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
              تاريخ الوصول المتوقع إلى الميناء / المخزن
            </label>
            <input
              type="date"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                padding: '0 12px',
                fontSize: '0.84rem',
                background: '#ffffff',
                color: '#0f172a',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </form>
    </StandardDialog>
  );
}
