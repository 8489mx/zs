import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, CalendarIcon, AlertCircleIcon } from '@/shared/components/icons/AppIcons';
import { fiscalYearsApi } from '../../api/fiscal-years.api';
import type { CreateFiscalYearPayload } from '../../types/fiscal-years.types';

export interface CreateFiscalYearModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateFiscalYearModal({ open, onClose, onCreated }: CreateFiscalYearModalProps) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<CreateFiscalYearPayload>({
    name: `السنة المالية ${currentYear}`,
    code: `FY-${currentYear}`,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        name: `السنة المالية ${currentYear}`,
        code: `FY-${currentYear}`,
        startDate: `${currentYear}-01-01`,
        endDate: `${currentYear}-12-31`,
      });
      setErrorMessage(null);
    }
  }, [open, currentYear]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateFiscalYearPayload) => fiscalYearsApi.createFiscalYear(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['accounting', 'fiscal-years'] });
      if (onCreated) onCreated();
      onClose();
    },
    onError: (err: any) => {
      setErrorMessage(err?.message || 'حدث خطأ أثناء إنشاء السنة المالية.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.name.trim()) {
      setErrorMessage('يجب إدخال اسم السنة المالية.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setErrorMessage('يجب تحديد تاريخ بداية وتاريخ نهاية صالحين.');
      return;
    }
    if (formData.startDate >= formData.endDate) {
      setErrorMessage('تاريخ بداية السنة المالية يجب أن يكون قبل تاريخ النهاية.');
      return;
    }

    createMutation.mutate(formData);
  };

  if (!open) return null;

  return (
    <DialogShell isOpen={open} onClose={onClose} size="md">
      <div className="standard-dialog-header">
        <div>
          <h2 className="standard-dialog-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarIcon size={20} color="#170e5e" />
            <span>إضافة سنة مالية جديدة</span>
          </h2>
          <p className="standard-dialog-subtitle">
            تحديد النطاق الزمني والبيانات التعريفية للدورة المحاسبية السنوية
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

      <form onSubmit={handleSubmit}>
        <div className="standard-dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              <AlertCircleIcon size={18} color="#b91c1c" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                اسم السنة المالية <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: السنة المالية 2025"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                كود السنة المالية
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="مثال: FY-2025"
                dir="ltr"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                تاريخ بداية السنة <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                تاريخ نهاية السنة <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13px',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            تنبيه: يجب ألا تتداخل التواريخ المحددة مع أي سنة مالية أخرى مسجلة لنفس المنشأة. ستكون حالة السنة المالية تلقائياً «مفتوحة» لاستقبال القيود والعمليات حتى يحين موعد إقفالها.
          </div>
        </div>

        <div className="standard-dialog-footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createMutation.isPending}
            style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
          >
            {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ السنة المالية'}
          </Button>
        </div>
      </form>
    </DialogShell>
  );
}
