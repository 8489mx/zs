import { useTranslation } from 'react-i18next';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CalendarIcon, AlertCircleIcon, FileTextIcon } from '@/shared/components/icons/AppIcons';
import { fiscalYearsApi } from '../../api/fiscal-years.api';
import type { CreateFiscalYearPayload } from '../../types/fiscal-years.types';

export interface CreateFiscalYearModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateFiscalYearModal({ open, onClose, onCreated }: CreateFiscalYearModalProps) {
  const { t } = useTranslation();
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
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('accounting.fiscal_years.create_fiscal_year_modal.s0', "إضافة سنة مالية جديدة")}
      subtitle={t('accounting.fiscal_years.create_fiscal_year_modal.s1', "تحديد النطاق الزمني والبيانات التعريفية للدورة المحاسبية السنوية")}
      size="md"
    >
      <form id="create-fiscal-year-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

        {/* Card 1: Definition */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <FileTextIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{t('accounting.fiscal_years.create_fiscal_year_modal.s2', "البيانات التعريفية")}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {t('accounting.fiscal_years.create_fiscal_year_modal.s3', "اسم السنة المالية")} <span style={{ color: '#e11d48' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={t('accounting.fiscal_years.create_fiscal_year_modal.s4', "مثال: السنة المالية 2025")}
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
                {t('accounting.fiscal_years.create_fiscal_year_modal.s5', "كود السنة المالية")}
              </label>
              <input
                type="text"
                value={formData.code || ''}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder={t('accounting.fiscal_years.create_fiscal_year_modal.s6', "مثال: FY-2025")}
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
        </div>

        {/* Card 2: Date Range */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '10px',
          padding: '14px 16px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>
            <CalendarIcon size={15} style={{ color: '#170e5e' }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>{t('accounting.fiscal_years.create_fiscal_year_modal.s7', "النطاق الزمني للدورة")}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                {t('accounting.fiscal_years.create_fiscal_year_modal.s8', "تاريخ بداية السنة")} <span style={{ color: '#e11d48' }}>*</span>
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
                {t('accounting.fiscal_years.create_fiscal_year_modal.s9', "تاريخ نهاية السنة")} <span style={{ color: '#e11d48' }}>*</span>
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
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              fontSize: '11.5px',
              color: '#64748b',
              lineHeight: 1.6,
            }}
          >
            {t('accounting.fiscal_years.create_fiscal_year_modal.s10', "تنبيه: يجب ألا تتداخل التواريخ المحددة مع أي سنة مالية أخرى مسجلة لنفس المنشأة. ستكون حالة السنة المالية تلقائياً «مفتوحة» لاستقبال القيود والعمليات حتى يحين موعد إقفالها.")}
          </div>
        </div>
      </form>

      <StandardDialogFooter>
        <Button type="button" variant="secondary" onClick={onClose} disabled={createMutation.isPending} style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '8px' }}>
          {t('accounting.fiscal_years.create_fiscal_year_modal.s11', "إلغاء")}
        </Button>
        <Button
          type="submit"
          form="create-fiscal-year-form"
          disabled={createMutation.isPending}
          style={{
            backgroundColor: '#170e5e',
            color: '#ffffff',
            padding: '8px 22px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            opacity: createMutation.isPending ? 0.6 : 1,
          }}
        >
          {createMutation.isPending ? t('accounting.fiscal_years.create_fiscal_year_modal.s12', "جاري الحفظ...") : t('accounting.fiscal_years.create_fiscal_year_modal.s13', "حفظ السنة المالية")}
        </Button>
      </StandardDialogFooter>
    </StandardDialog>
  );
}
