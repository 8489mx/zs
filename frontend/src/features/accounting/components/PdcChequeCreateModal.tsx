import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { pdcChequesApi, type ChequeType, type CreatePdcChequePayload } from '../api/accounting.api';

export interface PdcChequeCreateModalProps {
  open: boolean;
  onClose: () => void;
  chequeType: ChequeType;
  onCreated?: () => void;
}

const getInitialState = (type: ChequeType): CreatePdcChequePayload => ({
  type,
  chequeNumber: '',
  bankName: '',
  branchName: '',
  drawerName: '',
  partnerName: '',
  amount: 0,
  currency: 'EGP',
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: '',
  notes: '',
});

export function PdcChequeCreateModal({
  open,
  onClose,
  chequeType,
  onCreated,
}: PdcChequeCreateModalProps) {
  const queryClient = useQueryClient();
  const [newCheque, setNewCheque] = useState<CreatePdcChequePayload>(() => getInitialState(chequeType));

  useEffect(() => {
    if (open) {
      setNewCheque(getInitialState(chequeType));
    }
  }, [open, chequeType]);

  const createMutation = useMutation({
    mutationFn: (payload: CreatePdcChequePayload) => pdcChequesApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pdc-cheques-list'] });
      void queryClient.invalidateQueries({ queryKey: ['pdc-cheques-stats'] });
      if (onCreated) onCreated();
      onClose();
    },
  });

  if (!open) return null;

  return (
    <DialogShell
      isOpen={open}
      onClose={onClose}
      size="lg"
    >
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title">
            {chequeType === 'receivable'
              ? 'تسجيل ورقة قبض جديدة (شيك عميل)'
              : 'تحرير ورقة دفع جديدة (شيك مورد)'}
          </h2>
          <p className="standard-dialog-subtitle">
            إدخال بيانات الشيك البنكي وتفاصيل الساحب والمبلغ وتاريخ الاستحقاق
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="standard-dialog-close-btn"
          aria-label="إغلاق"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="standard-dialog-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            رقم الشيك <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="text"
            value={newCheque.chequeNumber}
            onChange={(e) => setNewCheque({ ...newCheque, chequeNumber: e.target.value })}
            placeholder="مثال: 00482910"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            {chequeType === 'receivable' ? 'اسم العميل / المستفيد' : 'اسم المورد المستفيد'}{' '}
            <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="text"
            value={newCheque.partnerName}
            onChange={(e) => setNewCheque({ ...newCheque, partnerName: e.target.value })}
            placeholder="الاسم الثلاثي أو اسم المنشأة"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            البنك المسحوب عليه <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="text"
            value={newCheque.bankName}
            onChange={(e) => setNewCheque({ ...newCheque, bankName: e.target.value })}
            placeholder="مثال: البنك الأهلي المصري / بنك الراجحي"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            فرع البنك
          </label>
          <input
            type="text"
            value={newCheque.branchName || ''}
            onChange={(e) => setNewCheque({ ...newCheque, branchName: e.target.value })}
            placeholder="مثال: فرع التجمع الخامس"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            المبلغ <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="number"
            step="0.01"
            value={newCheque.amount || ''}
            onChange={(e) => setNewCheque({ ...newCheque, amount: Number(e.target.value) })}
            placeholder="0.00"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              fontWeight: 700,
              color: '#0f172a',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            العملة
          </label>
          <select
            value={newCheque.currency}
            onChange={(e) => setNewCheque({ ...newCheque, currency: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          >
            <option value="EGP">جنيه مصري (EGP)</option>
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="USD">دولار أمريكي (USD)</option>
            <option value="EUR">يورو (EUR)</option>
            <option value="AED">درهم إماراتي (AED)</option>
            <option value="KWD">دينار كويتي (KWD)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            تاريخ التحرير / الاستلام <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="date"
            value={newCheque.issueDate}
            onChange={(e) => setNewCheque({ ...newCheque, issueDate: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            تاريخ الاستحقاق (الصرف) <span style={{ color: '#e11d48' }}>*</span>
          </label>
          <input
            type="date"
            value={newCheque.dueDate}
            onChange={(e) => setNewCheque({ ...newCheque, dueDate: e.target.value })}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            اسم الساحب الفعلي (إن وجد)
          </label>
          <input
            type="text"
            value={newCheque.drawerName || ''}
            onChange={(e) => setNewCheque({ ...newCheque, drawerName: e.target.value })}
            placeholder="اسم صاحب الحساب البنكي الموقع"
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            ملاحظات إضافية
          </label>
          <textarea
            rows={2}
            value={newCheque.notes || ''}
            onChange={(e) => setNewCheque({ ...newCheque, notes: e.target.value })}
            placeholder="رقم الفاتورة أو العقد المرتبط بالشيك..."
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '12px',
              color: '#1e293b',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>
      </div>

      <div className="standard-dialog-footer">
        <Button
          type="button"
          variant="secondary"
          onClick={onClose}
          style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}
        >
          إلغاء
        </Button>
        <Button
          type="button"
          onClick={() => createMutation.mutate(newCheque)}
          disabled={
            createMutation.isPending ||
            !newCheque.chequeNumber ||
            !newCheque.partnerName ||
            !newCheque.bankName ||
            !newCheque.amount ||
            !newCheque.dueDate
          }
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: createMutation.isPending || !newCheque.chequeNumber ? 0.6 : 1,
          }}
        >
          {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الشيك بالحافظة'}
        </Button>
      </div>
    </DialogShell>
  );
}
