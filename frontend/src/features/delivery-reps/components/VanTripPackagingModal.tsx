import React, { useState } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  CheckCircleIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import { vanSalesApi } from '../api/van-sales.api';
import { toast } from '@/shared/components/system-alert';

interface CustomerOption {
  id: number;
  name: string;
}

interface VanTripPackagingModalProps {
  open: boolean;
  onClose: () => void;
  tripId: number;
  customers: CustomerOption[];
  defaultCustomerId?: number | null;
  onSuccess: () => void;
}

export const VanTripPackagingModal: React.FC<VanTripPackagingModalProps> = ({
  open,
  onClose,
  tripId,
  customers,
  defaultCustomerId,
  onSuccess,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | ''>(defaultCustomerId || '');
  const [packagingType, setPackagingType] = useState<string>('plastic_crate');
  const [qtyOut, setQtyOut] = useState<string>('0');
  const [qtyIn, setQtyIn] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const packagingTypes = [
    { value: 'plastic_crate', label: 'صناديق بلاستيك / أقفاص' },
    { value: 'wooden_pallet', label: 'طبالي خشبية (بالتات)' },
    { value: 'gas_cylinder', label: 'أسطوانات غاز / فريون' },
    { value: 'other', label: 'فوارغ أخرى' },
  ];

  const handleSubmit = async () => {
    setError('');
    const outNum = parseInt(qtyOut, 10) || 0;
    const inNum = parseInt(qtyIn, 10) || 0;

    if (outNum === 0 && inNum === 0) {
      setError('يرجى تحديد عدد الفوارغ المسلمة للعميل (صادر) أو المستلمة منه (وارد)');
      return;
    }

    setIsSubmitting(true);
    try {
      await vanSalesApi.recordPackagingMovement(tripId, {
        customerId: selectedCustomerId ? Number(selectedCustomerId) : undefined,
        packagingType,
        qtyOut: outNum,
        qtyIn: inNum,
        notes: notes.trim() || undefined,
      });
      toast.success('تم تسجيل حركة الفوارغ وتحديث رصيد الصناديق بنجاح');
      setQtyOut('0');
      setQtyIn('0');
      setNotes('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل تسجيل حركة الفوارغ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="تسجيل حركة فوارغ وصناديق"
      subtitle="إثبات تسليم أو استرجاع الصناديق والبالتات والأسطوانات على ذمة العميل"
      badge="ذمة الفوارغ"
      width="min(500px, 95vw)"
      footer={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '100%', gap: '10px' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ minHeight: '38px', fontSize: '12.5px', padding: '0 16px' }}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              minHeight: '38px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              padding: '0 20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CheckCircleIcon size={15} color="#ffffff" />
            <span>{isSubmitting ? 'جاري التسجيل...' : 'تأكيد حركة الفوارغ'}</span>
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangleIcon size={16} color="#dc2626" />
            <span>{error}</span>
          </div>
        )}

        {/* Customer Select */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            العميل / المحل:
          </label>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : '')}
            style={{
              width: '100%',
              height: '38px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12.5px',
              padding: '0 10px',
              boxSizing: 'border-box',
            }}
          >
            <option value="">-- حركة عامة بدون تحديد عميل --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Packaging Type */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
            نوع الفارغ:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {packagingTypes.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setPackagingType(type.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: packagingType === type.value ? '2px solid #170e5e' : '1px solid #cbd5e1',
                  backgroundColor: packagingType === type.value ? '#eef2ff' : '#ffffff',
                  color: packagingType === type.value ? '#170e5e' : '#334155',
                  fontWeight: packagingType === type.value ? 800 : 600,
                  fontSize: '11.5px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantities (Out / In) - RTL Stepper Principle (+ on right, - on left) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Delivered to Customer (Out) */}
          <div style={{ backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#c2410c', marginBottom: '6px', textAlign: 'center' }}>
              المسلم للعميل (صادر)
            </label>
            <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setQtyOut((prev) => String((parseInt(prev, 10) || 0) + 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ea580c',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
              <input
                type="number"
                min="0"
                value={qtyOut}
                onChange={(e) => setQtyOut(e.target.value)}
                style={{
                  width: '54px',
                  height: '32px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                }}
              />
              <button
                type="button"
                onClick={() => setQtyOut((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                -
              </button>
            </div>
          </div>

          {/* Returned from Customer (In) */}
          <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px' }}>
            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 800, color: '#15803d', marginBottom: '6px', textAlign: 'center' }}>
              المستلم من العميل (مرتجع)
            </label>
            <div dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setQtyIn((prev) => String((parseInt(prev, 10) || 0) + 1))}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#16a34a',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                +
              </button>
              <input
                type="number"
                min="0"
                value={qtyIn}
                onChange={(e) => setQtyIn(e.target.value)}
                style={{
                  width: '54px',
                  height: '32px',
                  textAlign: 'center',
                  fontWeight: 800,
                  fontSize: '14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                }}
              />
              <button
                type="button"
                onClick={() => setQtyIn((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) - 1)))}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 900,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                -
              </button>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            ملاحظات:
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثال: فوارغ بحالة جيدة / استبدال فارغ بتالف"
            style={{
              width: '100%',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12px',
              padding: '0 10px',
              backgroundColor: '#ffffff',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </StandardDialog>
  );
};
