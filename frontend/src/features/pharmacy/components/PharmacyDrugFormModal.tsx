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

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  padding: '0 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '13px',
  color: '#0f172a',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  marginBottom: '6px',
  lineHeight: '1.2',
};

export function PharmacyDrugFormModal({
  open,
  onClose,
  editingDrug,
  formData,
  setFormData,
  onSubmit,
}: PharmacyDrugFormModalProps) {
  const handleBoxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const bp = Number(e.target.value);
    const units = Number(formData.units_per_box || 1);
    setFormData({
      ...formData,
      box_price: bp,
      strip_price: units > 0 ? Number((bp / units).toFixed(2)) : bp,
    });
  };

  const handleUnitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const units = Number(e.target.value);
    const bp = Number(formData.box_price || 0);
    setFormData({
      ...formData,
      units_per_box: units,
      strip_price: units > 0 ? Number((bp / units).toFixed(2)) : bp,
    });
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="min(820px, 95vw)"
      ariaLabel={editingDrug ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد بدليل الصيدلية'}
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <div className="standard-dialog-header">
          <div className="standard-dialog-header-info">
            <h3 className="standard-dialog-title">
              {editingDrug ? 'تعديل بيانات الدواء' : 'إضافة دواء جديد بدليل الصيدلية'}
            </h3>
            <p className="standard-dialog-subtitle">
              إدخال وتحديث البيانات العلمية والتجارية والتسعيرة الجبرية للدواء
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

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 20px 20px 20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 16px' }}>
            <div>
              <label style={labelStyle}>الاسم التجاري (English) *</label>
              <input
                type="text"
                required
                value={formData.trade_name || ''}
                onChange={(e) => setFormData({ ...formData, trade_name: e.target.value })}
                placeholder="مثال: Panadol Extra"
                style={inputStyle}
                dir="ltr"
              />
            </div>

            <div>
              <label style={labelStyle}>الاسم التجاري (بالعربي)</label>
              <input
                type="text"
                value={formData.trade_name_ar || ''}
                onChange={(e) => setFormData({ ...formData, trade_name_ar: e.target.value })}
                placeholder="مثال: بنادول إكسترا"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>المادة الفعالة (English) *</label>
              <input
                type="text"
                required
                value={formData.active_ingredient || ''}
                onChange={(e) => setFormData({ ...formData, active_ingredient: e.target.value })}
                placeholder="مثال: Paracetamol + Caffeine"
                style={inputStyle}
                dir="ltr"
              />
            </div>

            <div>
              <label style={labelStyle}>المادة الفعالة (بالعربي)</label>
              <input
                type="text"
                value={formData.active_ingredient_ar || ''}
                onChange={(e) => setFormData({ ...formData, active_ingredient_ar: e.target.value })}
                placeholder="مثال: باراسيتامول + كافيين"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>الشكل الصيدلي</label>
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
                style={{ height: '36px', borderRadius: '8px' }}
              />
            </div>

            <div>
              <label style={labelStyle}>التركيز الدوائي</label>
              <input
                type="text"
                placeholder="مثال: 500mg"
                value={formData.strength || ''}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                style={inputStyle}
                dir="ltr"
              />
            </div>

            <div>
              <label style={labelStyle}>الشركة المصنعة</label>
              <input
                type="text"
                placeholder="اسم الشركة أو المصنع"
                value={formData.manufacturer || ''}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>الباركود الدولي</label>
              <input
                type="text"
                placeholder="رقم الباركود الدولي"
                value={formData.barcode || ''}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                style={{ ...inputStyle, fontFamily: 'monospace' }}
                dir="ltr"
              />
            </div>

            <div>
              <label style={labelStyle}>سعر العلبة (التسعيرة الجبرية)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.box_price ?? 0}
                onChange={handleBoxPriceChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>عدد الشرائط / الوحدات بالعلبة</label>
              <input
                type="number"
                min="1"
                value={formData.units_per_box ?? 1}
                onChange={handleUnitsChange}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>سعر بيع الشريط التلقائي</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.strip_price ?? 0}
                onChange={(e) => setFormData({ ...formData, strip_price: Number(e.target.value) })}
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>جدول الرقابة الدوائية</label>
              <CustomSelect
                value={formData.controlled_level || 'none'}
                onChange={(val) => setFormData({ ...formData, controlled_level: val as any })}
                options={[
                  { value: 'none', label: 'عادي (غير مجدول OTC)' },
                  { value: 'table_1', label: 'جدول أول (مؤثر / عهدة)' },
                  { value: 'table_2', label: 'جدول ثانٍ (رقابة مشددة)' },
                ]}
                style={{ height: '36px', borderRadius: '8px' }}
              />
            </div>
          </div>

          <div className="standard-dialog-footer" style={{ marginTop: '8px' }}>
            <Button variant="secondary" type="button" onClick={onClose}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              type="submit"
              style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
            >
              {editingDrug ? 'تحديث بيانات الدواء' : 'حفظ وإدراج بالدليل'}
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
