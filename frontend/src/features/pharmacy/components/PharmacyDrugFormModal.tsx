import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { XIcon } from '@/shared/components/icons/AppIcons';
import type { PharmacyDrug } from '../types/pharmacy.types';

interface PharmacyDrugFormModalProps {
  open: boolean;
  onClose: () => void;
  editingDrug: Partial<PharmacyDrug> | null;
  formData: Partial<PharmacyDrug>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<PharmacyDrug>>>;
  onSubmit: (e: React.FormEvent) => void;
}

export function PharmacyDrugFormModal({
  open,
  onClose,
  editingDrug,
  formData,
  setFormData,
  onSubmit,
}: PharmacyDrugFormModalProps) {
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(760px, 95vw)"
      ariaLabel={editingDrug ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد بالدليل'}
      showCloseButton={false}
    >
      <div className="dialog-card" style={{ padding: '20px', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            {editingDrug ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد بدليل الصيدلية'}
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>الاسم التجاري (English) *</label>
              <input
                type="text"
                required
                value={formData.trade_name}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>الاسم التجاري (بالعربي)</label>
              <input
                type="text"
                value={formData.trade_name_ar || ''}
                onChange={(e) => setFormData({ ...formData, trade_name_ar: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>المادة الفعالة (English) *</label>
              <input
                type="text"
                required
                value={formData.active_ingredient}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>المادة الفعالة (بالعربي)</label>
              <input
                type="text"
                value={formData.active_ingredient_ar || ''}
                onChange={(e) => setFormData({ ...formData, active_ingredient_ar: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>الشكل الصيدلي</label>
              <CustomSelect
                value={formData.dosage_form}
                onChange={(val) => setFormData({ ...formData, dosage_form: val })}
                options={[
                  { value: 'أقراص (Tablets)', label: 'أقراص (Tablets)' },
                  { value: 'كبسولات (Capsules)', label: 'كبسولات (Capsules)' },
                  { value: 'شراب (Syrup)', label: 'شراب (Syrup)' },
                  { value: 'أمبولات حقن (Ampoules)', label: 'أمبولات حقن (Ampoules)' },
                  { value: 'فوار (Sachets)', label: 'فوار وأكياس (Sachets)' },
                  { value: 'كريم جلدي (Cream)', label: 'كريم موضعي (Cream)' },
                  { value: 'مرهم (Ointment)', label: 'مرهم (Ointment)' },
                  { value: 'قطرة / بخاخ أنف (Drops/Spray)', label: 'قطرة / بخاخ' },
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>التركيز</label>
              <input
                type="text"
                placeholder="مثال: 500mg"
                value={formData.strength || ''}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>الشركة المصنعة</label>
              <input
                type="text"
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>الباركود الدولي</label>
              <input
                type="text"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', fontFamily: 'monospace', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>سعر العلبة (التسعيرة الجبرية)</label>
              <input
                type="number"
                step="0.1"
                value={formData.box_price || 0}
                onChange={(e) => {
                  const bp = Number(e.target.value);
                  const units = Number(formData.units_per_box || 1);
                  setFormData({ ...formData, box_price: bp, strip_price: units > 0 ? bp / units : bp });
                }}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>عدد الشرائط / الوحدات بالعلبة</label>
              <input
                type="number"
                min="1"
                value={formData.units_per_box || 1}
                onChange={(e) => {
                  const units = Number(e.target.value);
                  const bp = Number(formData.box_price || 0);
                  setFormData({ ...formData, units_per_box: units, strip_price: units > 0 ? bp / units : bp });
                }}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>سعر بيع الشريط التلقائي</label>
              <input
                type="number"
                step="0.01"
                value={formData.strip_price || 0}
                onChange={(e) => setFormData({ ...formData, strip_price: Number(e.target.value) })}
                className="purchase-prototype-field-input"
                style={{ width: '100%', marginTop: '4px', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155' }}>جدول الرقابة الدوائية</label>
              <CustomSelect
                value={formData.controlled_level}
                onChange={(val) => setFormData({ ...formData, controlled_level: val as any })}
                options={[
                  { value: 'none', label: 'عادي (غير مجدول OTC)' },
                  { value: 'table_1', label: 'جدول أول (مؤثر / عهدة)' },
                  { value: 'table_2', label: 'جدول ثانٍ (رقابة مشددة)' },
                ]}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button variant="primary" type="submit">
              {editingDrug ? 'تحديث الدواء' : 'حفظ وإدراج بالدليل'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
