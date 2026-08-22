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
    <DialogShell open={open} onClose={onClose} width="min(720px, 95vw)" ariaLabel="بدائل ومثائل الدواء">
      <div dir="rtl" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>💊</span> بدائل ومثائل الدواء (Generic Substitutes)
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
              المادة الفعالة: <strong style={{ color: '#0284c7' }}>{activeIngredient}</strong> {strength ? ('(' + strength + ')') : ''}
              {originalTradeName ? (' • الدواء المطلوب: ' + originalTradeName) : ''}
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

        <div style={{ marginTop: '16px', maxHeight: '440px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري البحث عن البدائل والمثائل المتوفرة...</div>
          ) : substitutes.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🔍</div>
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
                    borderRadius: '10px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <strong style={{ fontSize: '0.96rem', color: '#0f172a' }}>{drug.trade_name}</strong>
                      {drug.trade_name_ar && <span style={{ fontSize: '0.84rem', color: '#64748b' }}>({drug.trade_name_ar})</span>}
                      {drug.controlled_level !== 'none' && (
                        <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                          جدول أدوية
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                      {drug.dosage_form} • {drug.manufacturer || 'شركة عامة'} • {drug.units_per_box} {drug.unit_name}/علبة
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ fontSize: '1.05rem', color: '#16a34a', display: 'block' }}>
                        {Number(drug.box_price).toFixed(2)} ج.م
                      </strong>
                      {Number(drug.strip_price) > 0 && (
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {Number(drug.strip_price).toFixed(2)} ج.م / {drug.unit_name}
                        </span>
                      )}
                    </div>

                    {onSelectSubstitute && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectSubstitute(drug);
                          onClose();
                        }}
                        className="btn btn-sm btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                      >
                        اختيار
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
