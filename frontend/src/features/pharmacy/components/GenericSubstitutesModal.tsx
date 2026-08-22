import { useState, useEffect } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyDrug } from '../types/pharmacy.types';

interface Props {
  open: boolean;
  onClose: () => void;
  activeIngredient: string;
  strength?: string;
  originalTradeName?: string;
  onSelectSubstitute?: (drug: PharmacyDrug) => void;
}

export function GenericSubstitutesModal({
  open,
  onClose,
  activeIngredient,
  strength,
  originalTradeName,
  onSelectSubstitute,
}: Props) {
  const [substitutes, setSubstitutes] = useState<PharmacyDrug[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && activeIngredient) {
      setLoading(true);
      pharmacyApi
        .findSubstitutes(activeIngredient, strength)
        .then((res) => setSubstitutes(res))
        .catch(() => setSubstitutes([]))
        .finally(() => setLoading(false));
    }
  }, [open, activeIngredient, strength]);

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={onClose} width="min(680px, 95vw)" ariaLabel="بدائل ومثائل الدواء">
      <div dir="rtl" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>
              💊 بدائل ومثائل الدواء (Generic Substitutes)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              المادة الفعالة: <strong style={{ color: '#0284c7' }}>{activeIngredient}</strong> {strength ? `(${strength})` : ''}
              {originalTradeName ? ` • الدواء الأصلي: ${originalTradeName}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginTop: '16px', maxHeight: '420px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري البحث عن البدائل والمثائل المتوفرة...</div>
          ) : substitutes.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>🔍</div>
              <strong style={{ color: '#334155' }}>لم يتم العثور على بدائل مسجلة بنفس المادة الفعالة</strong>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                يمكنك تسجيل بدائل أخرى من دليل الأدوية أو البحث بتركيز مختلف.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {substitutes.map((drug) => (
                <div
                  key={drug.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{drug.trade_name}</strong>
                      {drug.trade_name_ar && <span style={{ fontSize: '0.85rem', color: '#64748b' }}>({drug.trade_name_ar})</span>}
                      {drug.controlled_level !== 'none' && (
                        <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          جدول أدوية
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '3px' }}>
                      {drug.dosage_form} • {drug.manufacturer || 'شركة عامة'} • {drug.units_per_box} {drug.unit_name}/علبة
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#16a34a' }}>
                        {Number(drug.box_price).toFixed(2)} ج.م <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>للعلبة</span>
                      </div>
                      {Number(drug.strip_price) > 0 && (
                        <div style={{ fontSize: '0.78rem', color: '#0284c7', fontWeight: 700 }}>
                          {Number(drug.strip_price).toFixed(2)} ج.م <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>/{drug.unit_name}</span>
                        </div>
                      )}
                    </div>

                    {onSelectSubstitute && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSubstitute(drug);
                          onClose();
                        }}
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        اختيار البديل
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'left', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
