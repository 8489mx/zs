import { useTranslation } from 'react-i18next';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { IconSave } from '../PharmacyIcons';
import { INSURANCE_PROVIDERS } from '../../constants/pharmacy.constants';
import type { PharmacyPrescription, PrescribedItem } from '../../types/pharmacy.types';

const COPAY_PRESETS = [0, 10, 15, 20, 25, 30, 50, 100];

interface PrescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingRx: Partial<PharmacyPrescription> & { items?: PrescribedItem[] };
  setEditingRx: React.Dispatch<React.SetStateAction<Partial<PharmacyPrescription> & { items?: PrescribedItem[] } | null>>;
  onSave: (e: React.FormEvent) => void;
  isPending: boolean;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  isOpen,
  onClose,
  editingRx,
  setEditingRx,
  onSave,
  isPending,
}) => {
  const { t } = useTranslation();
  const handleApplyCopayPreset = (percent: number) => {
    const tot = Number(editingRx.total_amount || 0);
    const pat = tot * (percent / 100);
    setEditingRx({
      ...editingRx,
      patient_copay_percent: percent,
      patient_amount: pat,
      insurance_amount: tot - pat,
    });
  };

  return (
    <DialogShell open={isOpen} onClose={onClose} width="min(760px, 95vw)" ariaLabel={t('pharmacy.prescriptions.prescription_modal.s0', "صرف روشتة طبية وحساب التأمين الصحي")}>
      <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
            {t('pharmacy.prescriptions.prescription_modal.s1', "صرف روشتة طبية وحساب التأمين الصحي")}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
          >
            <XIcon size={16} />
          </button>
        </div>
        <form onSubmit={onSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s2', "اسم المريض")} <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                required
                className="purchase-prototype-field-input"
                value={editingRx.customer_name || ''}
                onChange={(e) => setEditingRx({ ...editingRx, customer_name: e.target.value })}
                placeholder={t('pharmacy.prescriptions.prescription_modal.s3', "اسم المريض بالكامل...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s4', "هاتف المريض")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={editingRx.customer_phone || ''}
                onChange={(e) => setEditingRx({ ...editingRx, customer_phone: e.target.value })}
                placeholder="010XXXXXXXX"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s5', "اسم الطبيب المعالج")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={editingRx.doctor_name || ''}
                onChange={(e) => setEditingRx({ ...editingRx, doctor_name: e.target.value })}
                placeholder={t('pharmacy.prescriptions.prescription_modal.s6', "د. أحمد...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s7', "التخصص الطبي")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={editingRx.doctor_specialty || ''}
                onChange={(e) => setEditingRx({ ...editingRx, doctor_specialty: e.target.value })}
                placeholder={t('pharmacy.prescriptions.prescription_modal.s8', "باطنة / أطفال / عظام...")}
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s9', "شركة التأمين / التعاقد")}
              </label>
              <CustomSelect
                value={editingRx.insurance_provider || INSURANCE_PROVIDERS[0]}
                onChange={(val) => setEditingRx({ ...editingRx, insurance_provider: val })}
                options={INSURANCE_PROVIDERS.map((p) => ({ value: p, label: p }))}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s10', "كود الموافقة")}
              </label>
              <input
                type="text"
                className="purchase-prototype-field-input"
                value={editingRx.approval_code || ''}
                onChange={(e) => setEditingRx({ ...editingRx, approval_code: e.target.value })}
                placeholder="Approval Code"
                style={{ width: '100%', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Quick Copay presets */}
          <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
              {t('pharmacy.prescriptions.prescription_modal.s11', "نسبة تحمل المريض (Co-Pay %):")}
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {COPAY_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleApplyCopayPreset(p)}
                  className={'btn btn-sm ' + (editingRx.patient_copay_percent === p ? 'btn-primary' : 'btn-secondary')}
                  style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                >
                  {p === 0 ? t('pharmacy.prescriptions.prescription_modal.s12', "0% (كاش كامل)") : p === 100 ? t('pharmacy.prescriptions.prescription_modal.s13', "100% (تأمين كامل)") : p + '%'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s14', "إجمالي قيمة الأدوية (")}{getGlobalCurrencySymbol()}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                required
                className="purchase-prototype-field-input"
                value={editingRx.total_amount ?? 0}
                onChange={(e) => {
                  const tot = parseFloat(e.target.value) || 0;
                  const copay = Number(editingRx.patient_copay_percent || 0);
                  const pat = tot * (copay / 100);
                  setEditingRx({
                    ...editingRx,
                    total_amount: tot,
                    patient_amount: pat,
                    insurance_amount: tot - pat,
                  });
                }}
                style={{ width: '100%', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s15', "المطلوب سداده من المريض")}
              </label>
              <input
                type="number"
                step="0.01"
                className="purchase-prototype-field-input"
                value={editingRx.patient_amount ?? 0}
                onChange={(e) => setEditingRx({ ...editingRx, patient_amount: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', fontWeight: 800, color: '#16a34a', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                {t('pharmacy.prescriptions.prescription_modal.s16', "مطالبة التأمين")}
              </label>
              <input
                type="number"
                step="0.01"
                className="purchase-prototype-field-input"
                value={editingRx.insurance_amount ?? 0}
                onChange={(e) => setEditingRx({ ...editingRx, insurance_amount: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', color: 'var(--primary, #1e1b4b)', fontWeight: 700, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
            <Button variant="secondary" onClick={onClose}>{t('pharmacy.prescriptions.prescription_modal.s17', "إلغاء")}</Button>
            <Button variant="primary" type="submit" disabled={isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <IconSave size={15} />
              <span>{isPending ? t('pharmacy.prescriptions.prescription_modal.s18', "جاري الحفظ...") : t('pharmacy.prescriptions.prescription_modal.s19', "حفظ وصرف الروشتة")}</span>
            </Button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
};
