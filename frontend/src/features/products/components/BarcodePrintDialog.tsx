import { useEffect, useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { buildBarcodePreviewHtml, DEFAULT_BARCODE_PRINT_PRESET_ID, getBarcodeCardData, getBarcodePrintPreset, getBarcodePrintPresetsByFamily, printProductBarcodeLabels, type BarcodePrintFamily } from '@/lib/barcode-labels';
import type { Product, ProductUnit } from '@/types/domain';

interface BarcodePrintDialogProps {
  open: boolean;
  product: Product | null;
  unit?: ProductUnit | null;
  onClose: () => void;
}

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

  return (
    <DialogShell open={open} onClose={onClose} width="min(1180px, 100%)" zIndex={85} ariaLabel="طباعة ملصقات الباركود">
      <div className="page-stack">
        <div className="section-title">
          <div className="section-heading-copy">
            <h3>توليد / طباعة ملصقات الباركود</h3>
            <p className="section-description">{product.name} · {card.unit?.name || 'قطعة'} · {card.barcode || 'بدون باركود'}</p>
          </div>
          <div className="section-title-actions actions compact-actions">
            <span className="nav-pill">{preset.pageLabel}</span>
            <Button type="button" variant="secondary" onClick={onClose}>إغلاق</Button>
          </div>
        </div>

        <div className="two-column-grid" style={{ alignItems: 'start' }}>
          <div className="card" style={{ minHeight: 0 }}>
            <div className="form-grid">
              <Field label="نوع الطباعة">
                <select value={family} onChange={(event) => {
                  const nextFamily = event.target.value === 'thermal' ? 'thermal' : 'sheet';
                  setFamily(nextFamily);
                  const nextPreset = getBarcodePrintPresetsByFamily(nextFamily)[0];
                  if (nextPreset) {
                    setPresetId(nextPreset.id);
                    setLabelsPerPage(nextPreset.maxLabelsPerPage);
                    setCopies(Math.max(1, Math.min(copies, nextPreset.maxLabelsPerPage)));
                  }
                }}>
                  <option value="sheet">A4 sticker sheet</option>
                  <option value="thermal">Thermal label</option>
                </select>
              </Field>
              <Field label="Preset المقاس">
                <select value={presetId} onChange={(event) => {
                  const nextPreset = getBarcodePrintPreset(event.target.value);
                  setPresetId(nextPreset.id);
                  setLabelsPerPage(nextPreset.maxLabelsPerPage);
                  setCopies(Math.max(1, Math.min(copies, nextPreset.maxLabelsPerPage)));
                }}>
                  {presetOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                </select>
              </Field>
              <Field label="عدد النسخ">
                <input type="number" min="1" max="500" value={copies} onChange={(event) => setCopies(Math.max(1, Number(event.target.value || 1)))} />
              </Field>
              <Field label="عدد الملصقات في الصفحة">
                <input type="number" min="1" max={preset.maxLabelsPerPage} value={labelsPerPage} onChange={(event) => setLabelsPerPage(Math.max(1, Math.min(preset.maxLabelsPerPage, Number(event.target.value || 1))))} />
              </Field>
              <Field label="مقاس الملصق">
                <input value={`${preset.labelWidthMm} × ${preset.labelHeightMm} mm`} readOnly disabled />
              </Field>
              <Field label="المعاينة الحالية">
                <input value={`${family === 'sheet' ? 'A4' : 'Thermal'} · ${preset.label}`} readOnly disabled />
              </Field>
            </div>
            <div className="actions compact-actions" style={{ marginTop: 12 }}>
              <Button type="button" onClick={() => printProductBarcodeLabels(product, unit, { presetId, copies, labelsPerPage })} disabled={!card.barcode}>طباعة الآن</Button>
              <Button type="button" variant="secondary" onClick={() => {
                setPresetId(DEFAULT_BARCODE_PRINT_PRESET_ID);
                const defaultPreset = getBarcodePrintPreset(DEFAULT_BARCODE_PRINT_PRESET_ID);
                setFamily(defaultPreset.family);
                setCopies(Math.min(24, defaultPreset.maxLabelsPerPage));
                setLabelsPerPage(defaultPreset.maxLabelsPerPage);
              }}>إعادة الضبط</Button>
            </div>
            {!card.barcode ? <div className="error-box" style={{ marginTop: 12 }}>الصنف أو الوحدة الحالية لا تحتوي على باركود صالح للطباعة.</div> : null}
          </div>

          <div className="card" style={{ minHeight: 0 }}>
            <div className="section-title" style={{ marginBottom: 8 }}>
              <div className="section-heading-copy">
                <h3 style={{ fontSize: 16 }}>معاينة قبل الطباعة</h3>
                <p className="section-description">المعاينة التالية تقرب شكل الصفحة أو الرول قبل الطباعة الفعلية.</p>
              </div>
            </div>
            <div className={`barcode-label-preview-shell barcode-label-preview-shell-${family}`}>
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
