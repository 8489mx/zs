import React from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { SaasPlan } from '@/features/saas-admin/api/saas-admin.api';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface EditSaasPlanModalProps {
  editingPlan: SaasPlan | null;
  setEditingPlan: React.Dispatch<React.SetStateAction<SaasPlan | null>>;
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

export function EditSaasPlanModal({
  editingPlan,
  setEditingPlan,
  onSubmit,
  isPending,
  featurePlans,
}: EditSaasPlanModalProps) {
  if (!editingPlan) return null;

  return (
    <DialogShell
      open={Boolean(editingPlan)}
      onClose={() => setEditingPlan(null)}
      width="640px"
      ariaLabel="تعديل باقة الاشتراك"
    >
      <div className="dialog-card" style={{ padding: '6px 0' }} dir="rtl">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                تعديل باقة الاشتراك: {editingPlan.name}
              </h3>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                تحديث التسعير وفترة الفوترة وحدود النسخ الشاغلة.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={() => setEditingPlan(null)}
            title="إغلاق"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}
          >
            <XIcon size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>1. بيانات الباقة الأساسية</span>
            </div>
            <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Field label="كود الباقة (إنجليزي) *">
                <input 
                  required 
                  value={editingPlan.code} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, code: e.target.value })} 
                  dir="ltr"
                  placeholder="مثال: BASIC, PRO"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label="اسم الباقة بالعربية *">
                <input 
                  required 
                  value={editingPlan.name} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })} 
                  placeholder="مثال: الباقة الأساسية"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
            </div>
          </div>

          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>2. التسعير وفترة الفوترة</span>
            </div>
            <div className="saas-modal-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <Field label="السعر *">
                <input 
                  required 
                  type="number"
                  min="0"
                  value={editingPlan.price} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })} 
                  placeholder="0.00"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label="العملة">
                <select 
                  value={editingPlan.currency} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="EGP">EGP (جنيه)</option>
                  <option value="USD">USD (دولار)</option>
                  <option value="SAR">SAR (ريال)</option>
                  <option value="AED">AED (درهم)</option>
                </select>
              </Field>
              <Field label="فترة الفوترة (أشهر)">
                <select
                  value={editingPlan.billing_period_months}
                  onChange={(e) => setEditingPlan({ ...editingPlan, billing_period_months: Number(e.target.value) })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value={1}>شهر واحد (1)</option>
                  <option value={3}>3 أشهر</option>
                  <option value={6}>6 أشهر</option>
                  <option value={12}>سنة كاملة (12)</option>
                  <option value={24}>سنتان (24)</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="saas-modal-card" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
            <div className="saas-modal-card-title" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '10px' }}>
              <span>3. الحدود والميزات والخطة</span>
            </div>
            <div className="saas-modal-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              <Field label="أقصى عدد مستخدمين (0 = غير محدود)">
                <input 
                  type="number"
                  min="0"
                  value={editingPlan.max_users || 0} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, max_users: Number(e.target.value) })} 
                  placeholder="0 لغير محدود"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
              <Field label="أقصى عدد فروع (0 = غير محدود)">
                <input 
                  type="number"
                  min="0"
                  value={editingPlan.max_branches || 0} 
                  onChange={(e) => setEditingPlan({ ...editingPlan, max_branches: Number(e.target.value) })} 
                  placeholder="0 لغير محدود"
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </Field>
            </div>
            <div style={{ marginTop: '10px' }}>
              <Field label="باقة الميزات المرتبطة">
                <select
                  value={editingPlan.feature_plan_id || ''}
                  onChange={(e) => setEditingPlan({ ...editingPlan, feature_plan_id: e.target.value || null })}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                >
                  <option value="">-- بدون ربط --</option>
                  {featurePlans.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
              </Field>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="edit_is_active"
                checked={editingPlan.is_active}
                onChange={(e) => setEditingPlan({ ...editingPlan, is_active: e.target.checked })}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="edit_is_active" style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', cursor: 'pointer' }}>
                مفعلة ومتاحة لاشتراكات العملاء
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setEditingPlan(null)}
              style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontWeight: 700 }}
            >
              إلغاء
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
              disabled={isPending || !editingPlan.code || !editingPlan.name}
            >
              {isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>
        </form>
      </div>
    </DialogShell>
  );
}
