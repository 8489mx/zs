import { useTranslation } from 'react-i18next';
import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface CreateSaasPlanModalProps {
  open: boolean;
  onClose: () => void;
  newPlan: any;
  setNewPlan: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  featurePlans: any[];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function CreateSaasPlanModal({
  open,
  onClose,
  newPlan,
  setNewPlan,
  onSubmit,
  isPending,
  featurePlans,
}: CreateSaasPlanModalProps) {
  const { t } = useTranslation();
  return (
    <DialogShell
      open={open}
      onClose={onClose}
      width="640px"
      ariaLabel={t('saas_admin.create_saas_plan_modal.s0', "إضافة باقة جديدة")}
    >
      <div className="dialog-card" style={{ padding: '6px 0' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                <line x1="12" y1="22.08" x2="12" y2="12"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                {t('saas_admin.create_saas_plan_modal.s1', "إضافة باقة اشتراك جديدة")}
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                {t('saas_admin.create_saas_plan_modal.s2', "تحديد السعر ومدة الاشتراك وحدود الاستخدام للباقة السحابية.")}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            title={t('saas_admin.create_saas_plan_modal.s3', "إغلاق")}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>{t('saas_admin.create_saas_plan_modal.s4', "1. بيانات الباقة الأساسية")}</span>
            </div>
            <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Field label={t('saas_admin.create_saas_plan_modal.s5', "كود الباقة (إنجليزي) *")}>
                <input 
                  required 
                  value={newPlan.code} 
                  onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })} 
                  dir="ltr"
                  placeholder={t('saas_admin.create_saas_plan_modal.s6', "مثال: BASIC, PRO, ENTERPRISE")}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label={t('saas_admin.create_saas_plan_modal.s7', "اسم الباقة بالعربية *")}>
                <input 
                  required 
                  value={newPlan.name} 
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} 
                  placeholder={t('saas_admin.create_saas_plan_modal.s8', "مثال: الباقة الأساسية")}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
            </div>
          </div>

          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>{t('saas_admin.create_saas_plan_modal.s9', "2. التسعير وفترة الفوترة")}</span>
            </div>
            <div className="saas-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <Field label={t('saas_admin.create_saas_plan_modal.s10', "السعر *")}>
                <input 
                  required 
                  type="number"
                  min="0"
                  value={newPlan.price === 0 ? '' : newPlan.price} 
                  onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })} 
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label={t('saas_admin.create_saas_plan_modal.s11', "العملة")}>
                <select 
                  value={newPlan.currency} 
                  onChange={(e) => setNewPlan({ ...newPlan, currency: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="EGP">{t('saas_admin.create_saas_plan_modal.s12', "EGP (جنيه)")}</option>
                  <option value="USD">{t('saas_admin.create_saas_plan_modal.s13', "USD (دولار)")}</option>
                  <option value="SAR">{t('saas_admin.create_saas_plan_modal.s14', "SAR (ريال)")}</option>
                  <option value="AED">{t('saas_admin.create_saas_plan_modal.s15', "AED (درهم)")}</option>
                </select>
              </Field>
              <Field label={t('saas_admin.create_saas_plan_modal.s16', "فترة الفوترة (أشهر)")}>
                <select
                  value={newPlan.billing_period_months}
                  onChange={(e) => setNewPlan({ ...newPlan, billing_period_months: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value={1}>{t('saas_admin.create_saas_plan_modal.s17', "شهر واحد (1)")}</option>
                  <option value={3}>{t('saas_admin.create_saas_plan_modal.s18', "3 أشهر")}</option>
                  <option value={6}>{t('saas_admin.create_saas_plan_modal.s19', "6 أشهر")}</option>
                  <option value={12}>{t('saas_admin.create_saas_plan_modal.s20', "سنة كاملة (12)")}</option>
                  <option value={24}>{t('saas_admin.create_saas_plan_modal.s21', "سنتان (24)")}</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>{t('saas_admin.create_saas_plan_modal.s22', "3. الحدود والميزات المرتبطة")}</span>
            </div>
            <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Field label={t('saas_admin.create_saas_plan_modal.s23', "الحد الأقصى للمستخدمين (0 = غير محدود)")}>
                <input 
                  type="number"
                  min="0"
                  value={newPlan.max_users === 0 ? '' : newPlan.max_users} 
                  onChange={(e) => setNewPlan({ ...newPlan, max_users: Number(e.target.value) })} 
                  placeholder={t('saas_admin.create_saas_plan_modal.s24', "0 لغير محدود")}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label={t('saas_admin.create_saas_plan_modal.s25', "الحد الأقصى للفروع (0 = غير محدود)")}>
                <input 
                  type="number"
                  min="0"
                  value={newPlan.max_branches === 0 ? '' : newPlan.max_branches} 
                  onChange={(e) => setNewPlan({ ...newPlan, max_branches: Number(e.target.value) })} 
                  placeholder={t('saas_admin.create_saas_plan_modal.s26', "0 لغير محدود")}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
            </div>
            <div style={{ marginTop: '10px' }}>
              <Field label={t('saas_admin.create_saas_plan_modal.s27', "باقة الميزات الافتراضية (اختياري)")}>
                <select
                  value={newPlan.feature_plan_id}
                  onChange={(e) => setNewPlan({ ...newPlan, feature_plan_id: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="">{t('saas_admin.create_saas_plan_modal.s28', "-- بدون ربط (يتم تحديد الميزات يدوياً) --")}</option>
                  {featurePlans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
            >
              {t('saas_admin.create_saas_plan_modal.s29', "إلغاء")}
            </button>
            <button
              type="submit"
              className="button"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                padding: '8px 24px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
              }}
              disabled={isPending || !newPlan.code || !newPlan.name}
            >
              {isPending ? t('saas_admin.create_saas_plan_modal.s30', "جاري الحفظ...") : t('saas_admin.create_saas_plan_modal.s31', "حفظ الباقة")}
            </button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
