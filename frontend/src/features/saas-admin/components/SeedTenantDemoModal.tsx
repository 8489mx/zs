import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { XIcon, ShoppingCartIcon, TagIcon, UtensilsIcon, SmartphoneIcon, ShieldCheckIcon, SparklesIcon } from '@/shared/components/icons/AppIcons';
import { saasAdminApi, type SaasTenantRow } from '../api/saas-admin.api';
import { getFriendlyApiErrorMessage } from '@/lib/api-error-message';

interface SeedTenantDemoModalProps {
  tenant: SaasTenantRow;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

const ACTIVITIES = [
  { key: 'supermarket', label: 'سوبر ماركت وبقالة', icon: ShoppingCartIcon, color: '#170e5e', desc: 'أغذية، مشروبات، معلبات، باركودات وأوزان' },
  { key: 'restaurant_cafe', label: 'مطعم وكافيه (KDS)', icon: UtensilsIcon, color: '#d97706', desc: 'وجبات، مشروبات، طاولات، وإضافات الأطباق' },
  { key: 'fashion_clothing', label: 'أزياء وملابس وأحذية', icon: TagIcon, color: '#7c3aed', desc: 'ألوان ومقاسات وماركات وتشكيلات موسمية' },
  { key: 'electronics_mobile', label: 'إلكترونيات وموبايلات', icon: SmartphoneIcon, color: '#0284c7', desc: 'هواتف ذكية، سيريال IMEI، ملحقات وقطع غيار' },
  { key: 'pharmacy', label: 'صيدلية وأدوية ومستحضرات', icon: ShieldCheckIcon, color: '#16a34a', desc: 'أدوية، تواريخ صلاحية، تشغيلات (Batches)، ووصفات' },
];

export function SeedTenantDemoModal({ tenant, onClose, onSuccess }: SeedTenantDemoModalProps) {
  const queryClient = useQueryClient();
  const [selectedActivity, setSelectedActivity] = useState<string>(tenant.activityType || 'supermarket');
  const [wipeExisting, setWipeExisting] = useState<boolean>(true);
  const [seedSales, setSeedSales] = useState<boolean>(true);
  const [seedOnlineOrders, setSeedOnlineOrders] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const seedMutation = useMutation({
    mutationFn: () => saasAdminApi.seedTenantDemo(tenant.id, {
      activityType: selectedActivity,
      wipeExisting,
      seedSales,
      seedOnlineOrders,
    }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['saas-admin-tenants'] });
      onSuccess(res.message || 'تم سكب البيانات التجريبية للمشترك بنجاح!');
      onClose();
    },
    onError: (err) => {
      setErrorMessage(getFriendlyApiErrorMessage(err, 'فشل سكب البيانات التجريبية'));
    },
  });

  return (
    <DialogShell
      open={true}
      onClose={onClose}
      width="620px"
      ariaLabel="سكب بيانات تجريبية للمشترك"
    >
      <div className="dialog-card" dir="rtl" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SparklesIcon size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                سكب بيانات تجريبية للمشترك
              </h3>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                النسخة: <strong style={{ color: '#0f172a' }}>{tenant.businessName || tenant.slug}</strong> ({tenant.slug})
              </div>
            </div>
          </div>
          <button
            type="button"
            className="dialog-shell-close-btn"
            onClick={onClose}
            style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px', border: 'none', background: '#f1f5f9', cursor: 'pointer', color: '#64748b' }}
          >
            <XIcon size={14} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '12.5px', fontWeight: 600 }}>
            {errorMessage}
          </div>
        )}

        {/* Activity Selection Cards */}
        <div>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'block' }}>
            اختر نوع النشاط التجاري لتوليد البيانات المطابقة له:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
            {ACTIVITIES.map((act) => {
              const isSelected = selectedActivity === act.key;
              const IconComp = act.icon;
              return (
                <div
                  key={act.key}
                  onClick={() => setSelectedActivity(act.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #170e5e' : '1px solid #e2e8f0',
                    background: isSelected ? '#f8fafc' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: isSelected ? act.color : '#f1f5f9',
                    color: isSelected ? '#ffffff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <IconComp size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: isSelected ? '#170e5e' : '#0f172a' }}>
                      {act.label}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {act.desc}
                    </div>
                  </div>
                  <input
                    type="radio"
                    name="activity"
                    checked={isSelected}
                    onChange={() => setSelectedActivity(act.key)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155' }}>
            <input
              type="checkbox"
              checked={wipeExisting}
              onChange={(e) => setWipeExisting(e.target.checked)}
            />
            <span>تفريغ وتصفير أي بيانات سابقة للمشترك قبل سكب الحزمة الجديدة (موصى به)</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155' }}>
            <input
              type="checkbox"
              checked={seedSales}
              onChange={(e) => setSeedSales(e.target.checked)}
            />
            <span>توليد فواتير ومبيعات سابقة لرؤية الرسوم البيانية وتقارير الأرباح</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#334155' }}>
            <input
              type="checkbox"
              checked={seedOnlineOrders}
              onChange={(e) => setSeedOnlineOrders(e.target.checked)}
            />
            <span>توليد طلبات متجر إلكتروني تجريبية لاختبار دورة الطلبات الأونلاين</span>
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={seedMutation.isPending}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            style={{ background: '#170e5e', color: '#ffffff', fontWeight: 800 }}
          >
            {seedMutation.isPending ? 'جاري السكب...' : 'تأكيد وسكب البيانات'}
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
