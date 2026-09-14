import { useEffect, useMemo, useState } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { buildBarcodePreviewHtml, DEFAULT_BARCODE_PRINT_PRESET_ID, getBarcodeCardData, getBarcodePrintPreset, getBarcodePrintPresetsByFamily, printProductBarcodeLabels, type BarcodePrintFamily } from '@/lib/barcode-labels';
import type { Product, ProductUnit } from '@/types/domain';

interface BarcodePrintDialogProps {
  open: boolean;
  product: Product | null;
  unit?: ProductUnit | null;
  onClose: () => void;
}

const FAMILY_OPTIONS = [
  { value: 'sheet', label: 'ورق لاصق A4 (Sticker Sheet)' },
  { value: 'thermal', label: 'طابعة حرارية رول (Thermal Label)' },
];

export function BarcodePrintDialog({ open, product, unit, onClose }: BarcodePrintDialogProps) {
  const [family, setFamily] = useState<BarcodePrintFamily>('sheet');
  const [presetId, setPresetId] = useState(DEFAULT_BARCODE_PRINT_PRESET_ID);
  const [copies, setCopies] = useState(24);
  const [labelsPerPage, setLabelsPerPage] = useState(24);

  useEffect(() => {
    if (!open) return;
    setFamily('sheet');
    setPresetId(DEFAULT_BARCODE_PRINT_PRESET_ID);
    const preset = getBarcodePrintPreset(DEFAULT_BARCODE_PRINT_PRESET_ID);
    setCopies(Math.min(24, preset.maxLabelsPerPage));
    setLabelsPerPage(preset.maxLabelsPerPage);
  }, [open, product?.id, unit?.id]);

  const presetOptions = useMemo(() => getBarcodePrintPresetsByFamily(family), [family]);
  const preset = useMemo(() => getBarcodePrintPreset(presetId), [presetId]);
  const card = useMemo(() => (product ? getBarcodeCardData(product, unit) : null), [product, unit]);
  const previewHtml = useMemo(() => (product ? buildBarcodePreviewHtml({ product, unit, presetId, labelsPerPage }) : ''), [product, unit, presetId, labelsPerPage]);

  const presetSelectOptions = useMemo(
    () => presetOptions.map((option) => ({ value: option.id, label: option.label })),
    [presetOptions],
  );

  useEffect(() => {
    const firstPreset = presetOptions[0];
    if (!firstPreset) return;
    if (!presetOptions.some((entry) => entry.id === presetId)) {
      setPresetId(firstPreset.id);
      setLabelsPerPage(firstPreset.maxLabelsPerPage);
      setCopies(Math.min(copies, firstPreset.maxLabelsPerPage));
    }
  }, [presetId, presetOptions, copies]);

  if (!product || !card) return null;

  const handlePrint = () => {
    if (!card.barcode) return;
    printProductBarcodeLabels(product, unit, { presetId, copies, labelsPerPage });
  };

  const handleReset = () => {
    setPresetId(DEFAULT_BARCODE_PRINT_PRESET_ID);
    const defaultPreset = getBarcodePrintPreset(DEFAULT_BARCODE_PRINT_PRESET_ID);
    setFamily(defaultPreset.family);
    setCopies(Math.min(24, defaultPreset.maxLabelsPerPage));
    setLabelsPerPage(defaultPreset.maxLabelsPerPage);
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="توليد وطباعة ملصقات الباركود (Barcode Printing)"
      subtitle={`${product.name} · ${card.unit?.name || 'قطعة'} · باركود: ${card.barcode || 'بدون باركود'}`}
      maxWidth="1100px"
      footerActions={
        <StandardDialogFooter
          cancelText="إغلاق"
          onCancel={onClose}
          submitText="طباعة الآن"
          onSubmit={handlePrint}
          submitDisabled={!card.barcode}
        />
      }
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', alignItems: 'start' }} dir="rtl">
        {/* 1. إعدادات الطباعة والمقاس */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Printer size={15} />
              <span>1. إعدادات الطابعة والمقاس (Printer Settings)</span>
            </div>
            <span className="nav-pill">{preset.pageLabel}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="نوع الطباعة">
              <CustomSelect
                value={family}
                options={FAMILY_OPTIONS}
                onChange={(val) => {
                  const nextFamily = val === 'thermal' ? 'thermal' : 'sheet';
                  setFamily(nextFamily);
                  const nextPreset = getBarcodePrintPresetsByFamily(nextFamily)[0];
                  if (nextPreset) {
                    setPresetId(nextPreset.id);
                    setLabelsPerPage(nextPreset.maxLabelsPerPage);
                    setCopies(Math.max(1, Math.min(copies, nextPreset.maxLabelsPerPage)));
                  }
                }}
              />
            </Field>

            <Field label="Preset المقاس المعتمد">
              <CustomSelect
                value={presetId}
                options={presetSelectOptions}
                onChange={(val) => {
                  const nextPreset = getBarcodePrintPreset(val);
                  setPresetId(nextPreset.id);
                  setLabelsPerPage(nextPreset.maxLabelsPerPage);
                  setCopies(Math.max(1, Math.min(copies, nextPreset.maxLabelsPerPage)));
                }}
              />
            </Field>

            <Field label="عدد النسخ المطلوبة">
              <input
                type="number"
                min="1"
                max="500"
                value={copies}
                onChange={(event) => setCopies(Math.max(1, Number(event.target.value || 1)))}
              />
            </Field>

            <Field label="عدد الملصقات في الصفحة">
              <input
                type="number"
                min="1"
                max={preset.maxLabelsPerPage}
                value={labelsPerPage}
                onChange={(event) => setLabelsPerPage(Math.max(1, Math.min(preset.maxLabelsPerPage, Number(event.target.value || 1))))}
              />
            </Field>

            <Field label="أبعاد الملصق">
              <input value={`${preset.labelWidthMm} × ${preset.labelHeightMm} مم`} readOnly disabled />
            </Field>

            <Field label="نوع الورق المحدد">
              <input value={`${family === 'sheet' ? 'A4' : 'Thermal'} · ${preset.label}`} readOnly disabled />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={handleReset} style={{ fontSize: '0.8rem' }}>
              إعادة الضبط الافتراضي
            </Button>
          </div>

          {!card.barcode ? (
            <div className="error-box" style={{ marginTop: '12px', padding: '8px 12px', fontSize: '0.8rem' }}>
              الصنف أو الوحدة الحالية لا تحتوي على باركود صالح للطباعة.
            </div>
          ) : null}
        </div>

        {/* 2. المعاينة المباشرة للملصق */}
        <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Layers size={15} />
            <span>2. معاينة شكل الملصق (Label Preview)</span>
          </div>
          <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 10px 0' }}>
            المعاينة الحية تحاكي المظهر الفعلي لطباعة الرول أو الصفحة قبل الإرسال للطابعة.
          </p>

          <div className={`barcode-label-preview-shell barcode-label-preview-shell-${family}`} style={{ background: '#ffffff', borderRadius: '6px', padding: '10px', border: '1px solid #e2e8f0' }}>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
