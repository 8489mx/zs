import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyClinicalService } from '../types/pharmacy.types';
import { CLINICAL_SERVICE_LABELS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  IconStethoscope,
  IconHeartPulse,
  IconActivity,
  IconPlus,
  IconRefresh,
  IconSave,
} from '../components/PharmacyIcons';

export default function PharmacyClinicalServicesPage() {
  useAppToolbar([
    { label: 'الرئيسية', to: '/' },
    { label: 'الصيدلية والأدوية', to: '/pharmacy' },
    { label: 'الرعاية والقياسات الإكلينيكية' },
  ]);
  const queryClient = useQueryClient();
  const [page] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [newService, setNewService] = useState<Partial<PharmacyClinicalService>>({
    service_type: 'blood_pressure',
    customer_name: '',
    customer_phone: '',
    metric_value_1: '',
    metric_value_2: '',
    pharmacist_notes: '',
    fee: 0,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'clinical-services', page],
    queryFn: () => pharmacyApi.listClinicalServices(),
  });

  const createMutation = useMutation({
    mutationFn: (dto: Partial<PharmacyClinicalService>) => pharmacyApi.createClinicalService(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'clinical-services'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setNewService({
        service_type: 'blood_pressure',
        customer_name: '',
        customer_phone: '',
        metric_value_1: '',
        metric_value_2: '',
        pharmacist_notes: '',
        fee: 0,
      });
    },
  });

  const servicesList: PharmacyClinicalService[] = Array.isArray(data) ? data : ((data as any)?.services || []);
  const totalItems = Array.isArray(data) ? data.length : ((data as any)?.pagination?.totalItems || servicesList.length);

  const bpCount = servicesList.filter((s: PharmacyClinicalService) => s.service_type === 'blood_pressure').length;
  const glucoseCount = servicesList.filter((s: PharmacyClinicalService) => s.service_type === 'blood_glucose').length;
  const injectionCount = servicesList.filter((s: PharmacyClinicalService) => s.service_type === 'injection').length;
  const totalFees = servicesList.reduce((acc: number, s: PharmacyClinicalService) => acc + (Number(s.fee) || 0), 0);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.customer_name) return;
    createMutation.mutate(newService);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '80px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        <PageHeader
          title="الرعاية الصيدلانية والفحوصات الإكلينيكية"
          description="سجل قياسات ضغط الدم، السكر العشوائي والصائم، مؤشر كتلة الجسم (BMI)، والحقن والغيار"
          badge={<span className="cashier-chip" style={{ fontWeight: 700, color: 'var(--primary, #1e1b4b)', background: '#f1f5f9', border: '1px solid #e2e8f0' }}>{totalItems} فحص مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => setModalOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={15} />
                <span>تسجيل فحص صيدلاني</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={15} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 Summary KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الفحوصات والخدمات</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary, #1e1b4b)', marginTop: '2px' }}>{totalItems}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #1e1b4b)' }}>
              <IconStethoscope size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>قياسات ضغط الدم والنبض</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{bpCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <IconHeartPulse size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تحاليل السكر والحقن</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>{glucoseCount + injectionCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155' }}>
              <IconActivity size={18} />
            </div>
          </div>

          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إيراد الخدمات الصيدلانية</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#16a34a', marginTop: '2px' }}>
                {totalFees.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconActivity size={18} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>نوع الخدمة / الفحص</th>
                <th style={{ padding: '10px 14px' }}>اسم المريض / الهاتف</th>
                <th style={{ padding: '10px 14px' }}>النتيجة والقياس</th>
                <th style={{ padding: '10px 14px' }}>ملاحظات وتوجيهات الصيدلي</th>
                <th style={{ padding: '10px 14px' }}>رسوم الخدمة</th>
                <th style={{ padding: '10px 14px' }}>التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
                </tr>
              ) : servicesList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد خدمات مسجلة</td>
                </tr>
              ) : (
                servicesList.map((srv: PharmacyClinicalService) => {
                  const info = CLINICAL_SERVICE_LABELS[srv.service_type] || { title: srv.service_type, icon: '', unit: '' };
                  return (
                    <tr key={srv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--primary, #1e1b4b)' }}>
                        {info.title}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong style={{ color: '#0f172a' }}>{srv.customer_name}</strong>
                        {srv.customer_phone && <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{srv.customer_phone}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f766e' }}>
                        {srv.metric_value_1} {info.unit}
                        {srv.metric_value_2 && <span style={{ fontSize: '0.74rem', color: '#64748b', marginRight: '6px' }}>({srv.metric_value_2})</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {srv.pharmacist_notes || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>
                        {Number(srv.fee) > 0 ? (Number(srv.fee).toFixed(2) + ' ج.م') : 'مجانية'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.74rem' }}>
                        {new Date(srv.created_at).toLocaleString('ar-EG')}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <DialogShell
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            width="min(580px, 95vw)"
            ariaLabel="تسجيل فحص أو خدمة رعاية صيدلانية"
          >
            <div dir="rtl" style={{ background: '#ffffff', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>
                  تسجيل فحص أو خدمة رعاية صيدلانية
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ border: 'none', background: '#f1f5f9', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      نوع الخدمة
                    </label>
                    <CustomSelect
                      value={newService.service_type || 'blood_pressure'}
                      onChange={(val) => setNewService({ ...newService, service_type: val as any })}
                      options={[
                        { value: 'blood_pressure', label: 'قياس ضغط الدم والنبض' },
                        { value: 'blood_glucose', label: 'قياس السكر بالدم (صائم / عشوائي)' },
                        { value: 'weight_bmi', label: 'قياس الوزن ومؤشر كتلة الجسم' },
                        { value: 'injection', label: 'إعطاء حقنة عضل / وريد' },
                        { value: 'wound_dressing', label: 'غيار وتطهير جروح' },
                      ]}
                    />
                  </div>


                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      اسم المريض <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      className="purchase-prototype-field-input"
                      value={newService.customer_name || ''}
                      onChange={(e) => setNewService({ ...newService, customer_name: e.target.value })}
                      placeholder="اسم المريض..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      هاتف المريض
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={newService.customer_phone || ''}
                      onChange={(e) => setNewService({ ...newService, customer_phone: e.target.value })}
                      placeholder="010XXXXXXXX"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      قيمة القياس الأولى (الضغط / السكر / الوزن)
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={newService.metric_value_1 || ''}
                      onChange={(e) => setNewService({ ...newService, metric_value_1: e.target.value })}
                      placeholder="مثال: 120/80 أو 110 mg/dL"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                    {/* Quick Values Helpers */}
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '120/80', metric_value_2: '72' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>120/80</button>
                      <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '140/90', metric_value_2: '80' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>140/90</button>
                      <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '110 mg/dL', metric_value_2: 'صائم' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>110 صائم</button>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      قيمة ثانوية (النبض / الحالة)
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={newService.metric_value_2 || ''}
                      onChange={(e) => setNewService({ ...newService, metric_value_2: e.target.value })}
                      placeholder="مثال: نبض 75 / عشوائي بعد الأكل"
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      ملاحظات وتوجيهات الصيدلي
                    </label>
                    <input
                      type="text"
                      className="purchase-prototype-field-input"
                      value={newService.pharmacist_notes || ''}
                      onChange={(e) => setNewService({ ...newService, pharmacist_notes: e.target.value })}
                      placeholder="مثال: الضغط مستقر / يفضل تقليل الأملاح..."
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                      رسوم الخدمة (ج.م)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="purchase-prototype-field-input"
                      value={newService.fee ?? 0}
                      onChange={(e) => setNewService({ ...newService, fee: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                  <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                  <Button variant="primary" type="submit" disabled={createMutation.isPending} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <IconSave size={15} />
                    <span>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفحص'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
