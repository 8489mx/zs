import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import { dynamicPivotApi, type SavePivotTemplatePayload } from '../../api/dynamic-pivot.api';

interface SavePivotTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  currentConfig: {
    dataset: string;
    rowDimension: string;
    colDimension?: string;
    metric: string;
    dateFrom?: string;
    dateTo?: string;
  };
}

export const SavePivotTemplateModal: React.FC<SavePivotTemplateModalProps> = ({
  open,
  onClose,
  onSaved,
  currentConfig,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('يرجى إدخال اسم للتقرير المخصص.');
      return;
    }

    setSaving(true);
    try {
      const payload: SavePivotTemplatePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        dataset: currentConfig.dataset,
        rowDimension: currentConfig.rowDimension,
        colDimension: currentConfig.colDimension,
        metric: currentConfig.metric,
        dateFrom: currentConfig.dateFrom,
        dateTo: currentConfig.dateTo,
        isFavorite,
      };

      await dynamicPivotApi.saveTemplate(payload);
      toast.success(`تم حفظ قالب التقرير «${name.trim()}» بنجاح.`);
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'تعذر حفظ قالب التقرير');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('reports.pivot.save_pivot_template_modal.s0', "حفظ التقرير المحوري كقالب مخصص")}
      subtitle={t('reports.pivot.save_pivot_template_modal.s1', "إتاحة التقرير في الوصول السريع للمديرين والمحاسبين بنقرة واحدة")}
      size="sm"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            {t('reports.pivot.save_pivot_template_modal.s2', "اسم التقرير المخصص *")}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('reports.pivot.save_pivot_template_modal.s3', "مثال: تحليل مبيعات الفروع شهرياً، ربحية المندوبين...")}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#ffffff',
            }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            {t('reports.pivot.save_pivot_template_modal.s4', "وصف أو ملاحظات التقرير")}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('reports.pivot.save_pivot_template_modal.s5', "وصف مختصر للغرض التحليلي أو الإداري من هذا التقرير...")}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '12.5px',
              outline: 'none',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>

        <div style={{ backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b' }}>
          <div><strong>{t('reports.pivot.save_pivot_template_modal.s6', "المصدر:")}</strong> {currentConfig.dataset}</div>
          <div><strong>{t('reports.pivot.save_pivot_template_modal.s7', "أبعاد التحليل:")}</strong> {currentConfig.rowDimension} {currentConfig.colDimension ? `× ${currentConfig.colDimension}` : ''}</div>
          <div><strong>{t('reports.pivot.save_pivot_template_modal.s8', "المؤشر:")}</strong> {currentConfig.metric}</div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#1e293b', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#170e5e' }}
          />
          <span>{t('reports.pivot.save_pivot_template_modal.s9', "تثبيت في القوالب المفضلة بأعلى الصفحة")}</span>
        </label>

        <StandardDialogFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            {t('reports.pivot.save_pivot_template_modal.s10', "إلغاء")}
          </Button>
          <Button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
          >
            {saving ? t('reports.pivot.save_pivot_template_modal.s11', "جاري الحفظ...") : t('reports.pivot.save_pivot_template_modal.s12', "حفظ القالب")}
          </Button>
        </StandardDialogFooter>
      </form>
    </StandardDialog>
  );
};
