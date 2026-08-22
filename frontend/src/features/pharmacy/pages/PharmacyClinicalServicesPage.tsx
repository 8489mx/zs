import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyClinicalService } from '../types/pharmacy.types';
import { CLINICAL_SERVICE_LABELS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import {
  IconStethoscope,
  IconPlus,
  IconRefresh,
  IconSave,
  IconHeartPulse,
  IconActivity,
} from '../components/PharmacyIcons';

export default function PharmacyClinicalServicesPage() {
  useAppToolbar([{ label: 'الفحوصات والخدمات الصيدلانية' }]);
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [newService, setNewService] = useState<Partial<PharmacyClinicalService>>({
    service_type: 'blood_pressure',
    customer_name: '',
    customer_phone: '',
    metric_value_1: '120/80',
    metric_value_2: '75',
    pharmacist_notes: '',
    fee: 0,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pharmacy', 'clinical-services'],
    queryFn: pharmacyApi.listClinicalServices,
  });

  const createMutation = useMutation({
    mutationFn: pharmacyApi.createClinicalService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'clinical-services'] });
      setModalOpen(false);
    },
  });

  const servicesList = data || [];
  const totalItems = servicesList.length;

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
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="سجل الفحوصات والخدمات والرعاية الصيدلانية"
          description="تسجيل ومتابعة قياس ضغط الدم، السكر بالدم، مؤشر كتلة الجسم، وإعطاء الحقن مع حفظ سجل صحي لكل مريض"
          badge={<span className="nav-pill">{totalItems} فحص مسجل</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={() => setModalOpen(true)}
                style={{ background: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={16} />
                <span>تسجيل فحص / خدمة جديدة</span>
              </Button>
              <Button
                variant="secondary"
                onClick={() => void refetch()}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconRefresh size={16} />
                <span>تحديث</span>
              </Button>
            </div>
          }
        />

        {/* 4 Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الفحوصات والخدمات</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#7c3aed', marginTop: '2px' }}>{totalItems}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
              <IconStethoscope size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>قياسات ضغط الدم والنبض</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '2px' }}>{bpCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#dc2626' }}>
              <IconHeartPulse size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تحاليل السكر والحقن</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>{glucoseCount + injectionCount}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
              <IconActivity size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إيراد الخدمات الصيدلانية</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                {totalFees.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconActivity size={20} />
            </div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
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
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                        {info.title}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{srv.customer_name}</strong>
                        {srv.customer_phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{srv.customer_phone}</div>}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0284c7' }}>
                        {srv.metric_value_1} {info.unit}
                        {srv.metric_value_2 && <span style={{ fontSize: '0.75rem', color: '#64748b', marginRight: '6px' }}>({srv.metric_value_2})</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#475569' }}>
                        {srv.pharmacist_notes || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>
                        {Number(srv.fee) > 0 ? (Number(srv.fee).toFixed(2) + ' ج.م') : 'مجانية'}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#64748b', fontSize: '0.75rem' }}>
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
          <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(580px, 95vw)" ariaLabel="تسجيل فحص صيدلاني">
            <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconStethoscope size={20} color="#7c3aed" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  تسجيل فحص أو خدمة رعاية صيدلانية
                </h3>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    نوع الخدمة
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={newService.service_type || 'blood_pressure'}
                    onChange={(e) => setNewService({ ...newService, service_type: e.target.value as any })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff', fontWeight: 700 }}
                  >
                    <option value="blood_pressure">قياس ضغط الدم والنبض</option>
                    <option value="blood_glucose">قياس السكر بالدم (صائم / عشوائي)</option>
                    <option value="weight_bmi">قياس الوزن ومؤشر كتلة الجسم</option>
                    <option value="injection">إعطاء حقنة عضل / وريد</option>
                    <option value="wound_dressing">غيار وتطهير جروح</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    اسم المريض <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={newService.customer_name || ''}
                    onChange={(e) => setNewService({ ...newService, customer_name: e.target.value })}
                    placeholder="اسم المريض..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    هاتف المريض
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={newService.customer_phone || ''}
                    onChange={(e) => setNewService({ ...newService, customer_phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    قيمة القياس الأولى (الضغط / السكر / الوزن)
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={newService.metric_value_1 || ''}
                    onChange={(e) => setNewService({ ...newService, metric_value_1: e.target.value })}
                    placeholder="مثال: 120/80 أو 110 mg/dL"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                  {/* Quick Values Helpers */}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '120/80', metric_value_2: '72' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>120/80</button>
                    <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '140/90', metric_value_2: '80' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>140/90</button>
                    <button type="button" onClick={() => setNewService({ ...newService, metric_value_1: '110 mg/dL', metric_value_2: 'صائم' })} className="btn btn-sm btn-secondary" style={{ padding: '2px 6px', fontSize: '0.7rem' }}>110 صائم</button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    قيمة ثانوية (النبض / الحالة)
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={newService.metric_value_2 || ''}
                    onChange={(e) => setNewService({ ...newService, metric_value_2: e.target.value })}
                    placeholder="مثال: نبض 75 / عشوائي بعد الأكل"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    ملاحظات وتوجيهات الصيدلي
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={newService.pharmacist_notes || ''}
                    onChange={(e) => setNewService({ ...newService, pharmacist_notes: e.target.value })}
                    placeholder="مثال: الضغط مستقر / يفضل تقليل الأملاح..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    رسوم الخدمة (ج.م)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="purchase-prototype-field-input"
                    value={newService.fee ?? 0}
                    onChange={(e) => setNewService({ ...newService, fee: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button variant="primary" type="submit" disabled={createMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSave size={16} />
                  <span>{createMutation.isPending ? 'جاري الحفظ...' : 'حفظ الفحص'}</span>
                </Button>
              </div>
            </form>
          </DialogShell>
        )}
      </main>
    </div>
  );
}
