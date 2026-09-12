import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { IconSearch, IconPrinter, IconEdit, IconTrash } from './PharmacyIcons';
import type { PharmacyDrug } from '../types/pharmacy.types';

interface PharmacyDrugsTableProps {
  drugs: PharmacyDrug[];
  loading: boolean;
  onOpenSubstitutes: (activeIngredient: string, tradeName: string) => void;
  onOpenDoseSticker: (tradeName: string, activeIngredient?: string) => void;
  onEdit: (drug: PharmacyDrug) => void;
  onDelete: (id: number) => void;
}

export function PharmacyDrugsTable({
  drugs,
  loading,
  onOpenSubstitutes,
  onOpenDoseSticker,
  onEdit,
  onDelete,
}: PharmacyDrugsTableProps) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.78rem', fontWeight: 700 }}>
              <th style={{ padding: '10px 14px' }}>الدواء / الاسم التجاري</th>
              <th style={{ padding: '10px 14px' }}>المادة الفعالة والتركيز</th>
              <th style={{ padding: '10px 14px' }}>الشكل الصيدلي</th>
              <th style={{ padding: '10px 14px' }}>الشركة المصنعة</th>
              <th style={{ padding: '10px 14px' }}>التسعيرة (العلبة / الشريط)</th>
              <th style={{ padding: '10px 14px' }}>جدول الرقابة</th>
              <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات والبدائل</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل دليل الأدوية...
                </td>
              </tr>
            ) : drugs.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  لا توجد أدوية مطابقة للبحث
                </td>
              </tr>
            ) : (
              drugs.map((drug) => (
                <tr key={drug.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{drug.trade_name}</div>
                    {drug.trade_name_ar && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{drug.trade_name_ar}</div>
                    )}
                    {drug.barcode && (
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                        {drug.barcode}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ color: '#334155', fontWeight: 600 }}>{drug.active_ingredient}</div>
                    {drug.strength && (
                      <span style={{ fontSize: '0.7rem', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px', color: '#475569' }}>
                        {drug.strength}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#475569' }}>
                    {drug.dosage_form || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#64748b' }}>
                    {drug.manufacturer || '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>
                      علبة: {drug.box_price} <CurrencySymbol />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>
                      شريط: {drug.strip_price} <CurrencySymbol /> ({drug.units_per_box} شرائط)
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {drug.controlled_level === 'table_1' ? (
                      <span style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangleIcon size={12} />
                        <span>جدول أول (مؤثر)</span>
                      </span>
                    ) : drug.controlled_level === 'table_2' ? (
                      <span style={{ background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                        جدول ثانٍ (رقابة)
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>OTC عادي</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onOpenSubstitutes(drug.active_ingredient, drug.trade_name)}
                        title="البحث عن بدائل ومثائل نفس المادة الفعالة"
                        style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <IconSearch />
                        <span>البدائل</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenDoseSticker(drug.trade_name, drug.active_ingredient)}
                        title="طباعة استيكر الجرعة الطبية"
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px', color: '#475569', cursor: 'pointer' }}
                      >
                        <IconPrinter />
                      </button>

                      <button
                        type="button"
                        onClick={() => onEdit(drug)}
                        title="تعديل الدواء"
                        style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px', color: '#475569', cursor: 'pointer' }}
                      >
                        <IconEdit />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(drug.id)}
                        title="حذف"
                        style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '4px', color: '#dc2626', cursor: 'pointer' }}
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
