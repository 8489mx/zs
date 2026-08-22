import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyClinicalService } from '../types/pharmacy.types';
import { CLINICAL_SERVICE_LABELS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';

export default function PharmacyClinicalServicesPage() {
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

  const { data, isLoading } = useQuery({
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.customer_name) return;
    createMutation.mutate(newService);
  };

  return (
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🩺</span> سجل الفحوصات والخدمات الصيدلانية (Clinical Services)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            قياس ضغط الدم، السكر، الوزن، وحقن المرضى مع حفظ سجل القياسات لكل مريض
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="btn btn-primary"
          style={{ fontWeight: 800, fontSize: '0.85rem', background: '#0284c7', borderColor: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span> تسجيل فحص / خدمة جديدة
        </button>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px' }}>نوع الخدمة / الفحص</th>
              <th style={{ padding: '12px 14px' }}>اسم المريض / الهاتف</th>
              <th style={{ padding: '12px 14px' }}>النتيجة والقياس</th>
              <th style={{ padding: '12px 14px' }}>ملاحظات الصيدلي</th>
              <th style={{ padding: '12px 14px' }}>رسوم الخدمة</th>
              <th style={{ padding: '12px 14px' }}>التاريخ والوقت</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
              </tr>
            ) : data?.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد خدمات مسجلة</td>
              </tr>
            ) : (
              data?.map((srv: PharmacyClinicalService) => {
                const info = CLINICAL_SERVICE_LABELS[srv.service_type] || { title: srv.service_type, icon: '🩺', unit: '' };
                return (
                  <tr key={srv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a' }}>
                      <span style={{ marginLeft: '6px' }}>{info.icon}</span> {info.title}
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
                      {Number(srv.fee) > 0 ? `${Number(srv.fee).toFixed(2)} ج.م` : 'مجانية'}
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
        <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(560px, 95vw)" ariaLabel="تسجيل فحص صيدلاني">
          <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                🩺 تسجيل فحص أو خدمة رعاية صيدلانية
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  نوع الخدمة:
                </label>
                <select
                  value={newService.service_type || 'blood_pressure'}
                  onChange={(e) => setNewService({ ...newService, service_type: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', fontWeight: 700 }}
                >
                  <option value="blood_pressure">🩺 قياس ضغط الدم والنبض</option>
                  <option value="blood_glucose">🩸 قياس السكر بالدم (صائم / عشوائي)</option>
                  <option value="weight_bmi">⚖️ قياس الوزن ومؤشر كتلة الجسم</option>
                  <option value="injection">💉 إعطاء حقنة عضل / وريد</option>
                  <option value="wound_dressing">🩹 غيار وتطهير جروح</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  اسم المريض*:
                </label>
                <input
                  type="text"
                  required
                  value={newService.customer_name || ''}
                  onChange={(e) => setNewService({ ...newService, customer_name: e.target.value })}
                  placeholder="اسم المريض..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  هاتف المريض:
                </label>
                <input
                  type="text"
                  value={newService.customer_phone || ''}
                  onChange={(e) => setNewService({ ...newService, customer_phone: e.target.value })}
                  placeholder="010XXXXXXXX"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  قيمة القياس الأولى (الضغط / السكر / الوزن):
                </label>
                <input
                  type="text"
                  value={newService.metric_value_1 || ''}
                  onChange={(e) => setNewService({ ...newService, metric_value_1: e.target.value })}
                  placeholder="مثال: 120/80 أو 110 mg/dL"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  قيمة ثانوية (النبض / الحالة):
                </label>
                <input
                  type="text"
                  value={newService.metric_value_2 || ''}
                  onChange={(e) => setNewService({ ...newService, metric_value_2: e.target.value })}
                  placeholder="مثال: نبض 75 / عشوائي بعد الأكل"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  ملاحظات وتوجيهات الصيدلي:
                </label>
                <input
                  type="text"
                  value={newService.pharmacist_notes || ''}
                  onChange={(e) => setNewService({ ...newService, pharmacist_notes: e.target.value })}
                  placeholder="مثال: الضغط مستقر / يفضل تقليل الأملاح..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  رسوم الخدمة (ج.م):
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newService.fee ?? 0}
                  onChange={(e) => setNewService({ ...newService, fee: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ الفحص'}
              </button>
            </div>
          </form>
        </DialogShell>
      )}
    </div>
  );
}
