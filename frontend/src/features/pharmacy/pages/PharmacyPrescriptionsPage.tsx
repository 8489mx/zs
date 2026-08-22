import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyPrescription, PrescribedItem } from '../types/pharmacy.types';
import { INSURANCE_PROVIDERS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';

export default function PharmacyPrescriptionsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<Partial<PharmacyPrescription> & { items?: PrescribedItem[] } | null>(null);

  const [stickerMed, setStickerMed] = useState('');
  const [stickerPatient, setStickerPatient] = useState('');
  const [stickerOpen, setStickerOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['pharmacy', 'prescriptions', searchQuery, insuranceFilter, page],
    queryFn: () =>
      pharmacyApi.listPrescriptions({
        q: searchQuery,
        insuranceProvider: insuranceFilter,
        page,
        pageSize: 20,
      }),
  });

  const upsertMutation = useMutation({
    mutationFn: pharmacyApi.upsertPrescription,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'prescriptions'] });
      queryClient.invalidateQueries({ queryKey: ['pharmacy', 'stats'] });
      setModalOpen(false);
      setEditingRx(null);
    },
  });

  const handleOpenAdd = () => {
    setEditingRx({
      customer_name: '',
      customer_phone: '',
      doctor_name: '',
      doctor_specialty: 'باطنة عامة',
      diagnosis: '',
      insurance_provider: INSURANCE_PROVIDERS[0],
      insurance_card_no: '',
      approval_code: '',
      patient_copay_percent: 0,
      total_amount: 0,
      patient_amount: 0,
      insurance_amount: 0,
      status: 'dispensed',
      items: [
        { drugName: '', dosage: 'قرص', frequency: 'مرتين يومياً', duration: 'لمدة أسبوع', price: 0 }
      ],
      dispensed_by: 'د. الصيدلي المناوب',
    });
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRx || !editingRx.customer_name) return;
    upsertMutation.mutate(editingRx);
  };

  return (
    <div className="page-stack" dir="rtl" style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 20px', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📝</span> الروشتات الطبية والتأمين الصحي (Prescriptions & Insurance)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            تسجيل وصرف الروشتات الطبية، حساب نسبة تحمل المريض وشركات التأمين، وطباعة ملصقات الجرعة
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn btn-primary"
          style={{ fontWeight: 800, fontSize: '0.85rem', background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>➕</span> صرف روشتة جديدة
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="بحث برقم الروشتة، اسم المريض، الهاتف، الطبيب، أو رقم بطاقة التأمين..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ flex: '1 1 280px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        />

        <select
          value={insuranceFilter}
          onChange={(e) => { setInsuranceFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
        >
          <option value="all">كل جهات التأمين</option>
          {INSURANCE_PROVIDERS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'right' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
              <th style={{ padding: '12px 14px' }}>رقم الروشتة</th>
              <th style={{ padding: '12px 14px' }}>المريض / الطبيب</th>
              <th style={{ padding: '12px 14px' }}>جهة التأمين / الكود</th>
              <th style={{ padding: '12px 14px' }}>إجمالي الروشتة</th>
              <th style={{ padding: '12px 14px' }}>تحمل المريض (Co-pay)</th>
              <th style={{ padding: '12px 14px' }}>الحالة والتاريخ</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
              </tr>
            ) : data?.prescriptions.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>لا توجد روشتات مسجلة</td>
              </tr>
            ) : (
              data?.prescriptions.map((rx: PharmacyPrescription) => (
                <tr key={rx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 800, fontFamily: 'monospace' }}>
                    {rx.prescription_no}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong>{rx.customer_name}</strong>
                    {rx.customer_phone && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rx.customer_phone}</div>}
                    {rx.doctor_name && <div style={{ fontSize: '0.75rem', color: '#0284c7' }}>د. {rx.doctor_name} ({rx.doctor_specialty || 'طبيب'})</div>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div>{rx.insurance_provider || 'كاش بدون تأمين'}</div>
                    {rx.approval_code && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>موافقة: {rx.approval_code}</div>}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 800 }}>
                    {Number(rx.total_amount).toFixed(2)} ج.م
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: '#16a34a' }}>{Number(rx.patient_amount).toFixed(2)} ج.م</strong>
                    {Number(rx.patient_copay_percent) > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', marginRight: '4px' }}>
                        ({rx.patient_copay_percent}%)
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: '#dcfce7', color: '#16a34a', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                      تم الصرف
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setStickerPatient(rx.customer_name);
                          setStickerMed('علاج الروشتة');
                          setStickerOpen(true);
                        }}
                        className="btn btn-sm"
                        style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', padding: '4px 8px', fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        🏷️ استيكر
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && editingRx && (
        <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(740px, 95vw)" ariaLabel="صرف روشتة طبية">
          <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
            <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                📝 صرف روشتة طبية وحساب التأمين الصحي
              </h3>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  اسم المريض*:
                </label>
                <input
                  type="text"
                  required
                  value={editingRx.customer_name || ''}
                  onChange={(e) => setEditingRx({ ...editingRx, customer_name: e.target.value })}
                  placeholder="اسم المريض بالكامل..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  هاتف المريض:
                </label>
                <input
                  type="text"
                  value={editingRx.customer_phone || ''}
                  onChange={(e) => setEditingRx({ ...editingRx, customer_phone: e.target.value })}
                  placeholder="010XXXXXXXX"
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  اسم الطبيب المعالج:
                </label>
                <input
                  type="text"
                  value={editingRx.doctor_name || ''}
                  onChange={(e) => setEditingRx({ ...editingRx, doctor_name: e.target.value })}
                  placeholder="د. أحمد..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  التخصص الطبي:
                </label>
                <input
                  type="text"
                  value={editingRx.doctor_specialty || ''}
                  onChange={(e) => setEditingRx({ ...editingRx, doctor_specialty: e.target.value })}
                  placeholder="باطنة / أطفال / عظام..."
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  شركة التأمين / التعاقد:
                </label>
                <select
                  value={editingRx.insurance_provider || INSURANCE_PROVIDERS[0]}
                  onChange={(e) => setEditingRx({ ...editingRx, insurance_provider: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff' }}
                >
                  {INSURANCE_PROVIDERS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    كود الموافقة الطبية:
                  </label>
                  <input
                    type="text"
                    value={editingRx.approval_code || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, approval_code: e.target.value })}
                    placeholder="Approval Code"
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    نسبة تحمل المريض (%):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingRx.patient_copay_percent ?? 0}
                    onChange={(e) => {
                      const copay = parseFloat(e.target.value) || 0;
                      const tot = Number(editingRx.total_amount || 0);
                      const pat = tot * (copay / 100);
                      setEditingRx({
                        ...editingRx,
                        patient_copay_percent: copay,
                        patient_amount: pat,
                        insurance_amount: tot - pat,
                      });
                    }}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                  إجمالي قيمة الأدوية (ج.م)*:
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
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
                  style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    المطلوب سداده من المريض:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRx.patient_amount ?? 0}
                    onChange={(e) => setEditingRx({ ...editingRx, patient_amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800, color: '#16a34a' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    مطالبة التأمين:
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingRx.insurance_amount ?? 0}
                    onChange={(e) => setEditingRx({ ...editingRx, insurance_amount: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', color: '#0284c7' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
              <button type="submit" className="btn btn-primary" disabled={upsertMutation.isPending}>
                {upsertMutation.isPending ? 'جاري الحفظ...' : '💾 حفظ وصرف الروشتة'}
              </button>
            </div>
          </form>
        </DialogShell>
      )}

      <DoseStickerPrintModal
        open={stickerOpen}
        onClose={() => setStickerOpen(false)}
        drugName={stickerMed}
        customerName={stickerPatient}
      />
    </div>
  );
}
