import { useTranslation } from 'react-i18next';
import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { IconSave } from '../PharmacyIcons';
import { MAJOR_DISTRIBUTORS } from '../../constants/pharmacy.constants';
import type { PharmacyShortage } from '../../types/pharmacy.types';

interface ShortageDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortage: Partial<PharmacyShortage> | null;
  setShortage: React.Dispatch<React.SetStateAction<Partial<PharmacyShortage> | null>>;
  isPending: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export const ShortageDetailModal: React.FC<ShortageDetailModalProps> = ({
  isOpen,
  onClose,
  shortage,
  setShortage,
  isPending,
  onSubmit,
}) => {
  const { t } = useTranslation();
  if (!isOpen || !shortage) return null;

  return (
    <DialogShell
      open={isOpen}
      onClose={onClose}
      width="min(640px, 95vw)"
      ariaLabel={shortage.id ? t('pharmacy.shortages.shortage_detail_modal.s0', "تعديل بيانات الصنف الناقص") : t('pharmacy.shortages.shortage_detail_modal.s1', "تسجيل صنف مفصل في كشكول النواقص")}
    >
      <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            {shortage.id ? t('pharmacy.shortages.shortage_detail_modal.s2', "تعديل بيانات الصنف الناقص") : t('pharmacy.shortages.shortage_detail_modal.s3', "تسجيل صنف مفصل في كشكول النواقص")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s4', "اسم الدواء الناقص")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="purchase-prototype-field-input"
                value={shortage.product_name || ''}
                onChange={(e) => setShortage({ ...shortage, product_name: e.target.value })}
                placeholder={t('pharmacy.shortages.shortage_detail_modal.s5', "اسم الدواء والشكل...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s6', "المادة الفعالة")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={shortage.active_ingredient || ''}
                onChange={(e) => setShortage({ ...shortage, active_ingredient: e.target.value })}
                placeholder={t('pharmacy.shortages.shortage_detail_modal.s7', "المادة الفعالة (اختياري)...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s8', "الشركة الموزعة المفضلة")}
              </label>
              <CustomSelect
                value={shortage.suggested_distributor || MAJOR_DISTRIBUTORS[0]}
                onChange={(val) => setShortage({ ...shortage, suggested_distributor: val })}
                options={MAJOR_DISTRIBUTORS.map((d) => ({ value: d, label: d }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s9', "الكمية المطلوبة (العلب)")}
              </label>
              <input
                type="number"
                min="1"
                className="purchase-prototype-field-input"
                value={shortage.requested_quantity ?? 1}
                onChange={(e) => setShortage({ ...shortage, requested_quantity: parseFloat(e.target.value) || 1 })}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s10', "الأولوية")}
              </label>
              <CustomSelect
                value={shortage.priority || 'normal'}
                onChange={(val) => setShortage({ ...shortage, priority: val as any })}
                options={[
                  { value: 'urgent', label: t('pharmacy.shortages.shortage_detail_modal.s11', "عاجل جداً (نقص شديد)") },
                  { value: 'customer_request', label: t('pharmacy.shortages.shortage_detail_modal.s12', "طلب مريض محجوز") },
                  { value: 'normal', label: t('pharmacy.shortages.shortage_detail_modal.s13', "عادي (طلبية دورية)") },
                ]}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.shortages.shortage_detail_modal.s14', "اسم العميل (في حال الحجز)")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={shortage.customer_name || ''}
                onChange={(e) => setShortage({ ...shortage, customer_name: e.target.value })}
                placeholder={t('pharmacy.shortages.shortage_detail_modal.s15', "اسم العميل...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <Button variant="secondary" onClick={onClose}>{t('pharmacy.shortages.shortage_detail_modal.s16', "إلغاء")}</Button>
            <Button variant="primary" type="submit" disabled={isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconSave size={15} />
              <span>{isPending ? t('pharmacy.shortages.shortage_detail_modal.s17', "جاري الحفظ...") : t('pharmacy.shortages.shortage_detail_modal.s18', "حفظ في كشكول النواقص")}</span>
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
};
