import { useTranslation } from 'react-i18next';
import { getCurrencyDecimals, getGlobalCurrencySymbol } from '@/lib/currencies';
import React from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { BrandCombobox } from '@/shared/components/BrandCombobox';
import type { UpsertTradeInPayload } from '../api/tradein.api';

interface CreateTradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  formData: UpsertTradeInPayload;
  onChange: (val: UpsertTradeInPayload) => void;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  serialLabel: string;
}

export function CreateTradeInModal({
  isOpen,
  onClose,
  formData,
  onChange,
  onSubmit,
  isPending,
  serialLabel,
}: CreateTradeInModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <StandardDialog
      open={true}
      onClose={onClose}
      width="min(760px, 96vw)"
      title={t('tradein.create_trade_in_modal.s0', "تسجيل شراء / استبدال جهاز (شراء من الأفراد)")}
      subtitle={t('tradein.create_trade_in_modal.s1', "توثيق بيانات البائع القانونية وفحص حالة الجهاز وإصدار إقرار التنازل")}
      badge={t('tradein.create_trade_in_modal.s2', "استبدال أجهزة")}
      footerActions={
        <StandardDialogFooter
          onClose={onClose}
          cancelText={t('tradein.create_trade_in_modal.s3', "إلغاء")}
          onSubmit={onSubmit}
          submitText={isPending ? t('tradein.create_trade_in_modal.s4', "جاري الحفظ...") : t('tradein.create_trade_in_modal.s5', "تسجيل الشراء وطباعة الإقرار")}
          isSubmitting={isPending}
        />
      }
    >
      <div dir="rtl" style={{ width: '100%', boxSizing: 'border-box' }}>
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Seller details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', backgroundColor: '#f8fafc' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
              {t('tradein.create_trade_in_modal.s6', "1. بيانات العميل البائع (الإلزامية قانونياً)")}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s7', "اسم البائع رباعي *")}</label>
                <input
                  type="text"
                  required
                  value={formData.sellerName}
                  onChange={(e) => onChange({ ...formData, sellerName: e.target.value })}
                  placeholder={t('tradein.create_trade_in_modal.s8', "محمد أحمد علي...")}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s9', "رقم الهاتف *")}</label>
                <input
                  type="text"
                  required
                  value={formData.sellerPhone}
                  onChange={(e) => onChange({ ...formData, sellerPhone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s10', "الرقم القومي (14 رقم) *")}</label>
                <input
                  type="text"
                  required
                  value={formData.sellerNationalId}
                  onChange={(e) => onChange({ ...formData, sellerNationalId: e.target.value })}
                  placeholder="29xxxx..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>
            </div>
          </div>

          {/* Device details */}
          <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', backgroundColor: '#ffffff' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
              {t('tradein.create_trade_in_modal.s11', "2. مواصفات وسيريال الجهاز")}
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s12', "الماركة / الشركة")}</label>
                <BrandCombobox
                  value={formData.deviceBrand || ''}
                  onChange={(val) => onChange({ ...formData, deviceBrand: val })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s13', "موديل الجهاز *")}</label>
                <input
                  type="text"
                  required
                  value={formData.deviceModel}
                  onChange={(e) => onChange({ ...formData, deviceModel: e.target.value })}
                  placeholder="iPhone 13 Pro Max 256GB..."
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{serialLabel} *</label>
                <input
                  type="text"
                  required
                  value={formData.serialNumber}
                  onChange={(e) => onChange({ ...formData, serialNumber: e.target.value })}
                  placeholder={t('tradein.create_trade_in_modal.s14', "السيريال أو IMEI 1")}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s15', "IMEI 2 (إن وجد)")}</label>
                <input
                  type="text"
                  value={formData.imei2 || ''}
                  onChange={(e) => onChange({ ...formData, imei2: e.target.value })}
                  placeholder="IMEI 2"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontFamily: 'monospace', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s16', "حالة الجهاز الفنية")}</label>
                <CustomSelect
                  value={formData.deviceConditionState || 'used'}
                  onChange={(val) => onChange({ ...formData, deviceConditionState: val as any })}
                  options={[
                    { value: 'new_sealed', label: t('tradein.create_trade_in_modal.s17', "جديد متبرشم (Sealed)") },
                    { value: 'like_new', label: t('tradein.create_trade_in_modal.s18', "كسر زيرو (Like New)") },
                    { value: 'used', label: t('tradein.create_trade_in_modal.s19', "مستعمل (Used)") },
                    { value: 'for_parts', label: t('tradein.create_trade_in_modal.s20', "قطع غيار / تالف") },
                  ]}
                />
              </div>

              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>{t('tradein.create_trade_in_modal.s21', "سعر الشراء المتفق عليه (")}{getGlobalCurrencySymbol()}) *</label>
                <input
                  type="number"
                  required
                  min={10 ** -getCurrencyDecimals()}
                  step={10 ** -getCurrencyDecimals()}
                  value={formData.agreedPurchasePrice || ''}
                  onChange={(e) => onChange({ ...formData, agreedPurchasePrice: Number(e.target.value) })}
                  placeholder="0.00"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 800, color: '#0f172a', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {t('tradein.payment_method', 'طريقة دفع قيمة الجهاز')}
                </label>
                <CustomSelect
                  value={formData.paymentMethod || 'cash'}
                  onChange={(value) => onChange({ ...formData, paymentMethod: value })}
                  options={[
                    { value: 'cash', label: t('tradein.payment_cash', 'نقدي من الخزينة') },
                    { value: 'bank', label: t('tradein.payment_bank', 'من الحساب البنكي الافتراضي') },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Pricing and Stock Check */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', background: '#f1f5f9' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={formData.autoAddToInventory ?? true}
                onChange={(e) => onChange({ ...formData, autoAddToInventory: e.target.checked })}
              />
              <span>{t('tradein.create_trade_in_modal.s22', "إدراج الجهاز تلقائياً في المخزون كصنف متاح للبيع بالسيريال")}</span>
            </label>

            {formData.autoAddToInventory && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>{t('tradein.create_trade_in_modal.s23', "سعر البيع المقترح:")}</span>
                <input
                  type="number"
                  min="0"
                  step={10 ** -getCurrencyDecimals()}
                  value={formData.resalePrice || ''}
                  onChange={(e) => onChange({ ...formData, resalePrice: Number(e.target.value) })}
                  placeholder="0.00"
                  style={{ width: '100px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
              </div>
            )}
          </div>
        </form>
      </div>
    </StandardDialog>
  );
}
