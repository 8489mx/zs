import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/ui/button';
import { useAppToolbar } from '@/stores/toolbar-store';
import { pharmacyApi } from '../api/pharmacy.api';
import type { PharmacyPrescription, PrescribedItem } from '../types/pharmacy.types';
import { INSURANCE_PROVIDERS } from '../constants/pharmacy.constants';
import { DialogShell } from '@/shared/components/dialog-shell';
import { DoseStickerPrintModal } from '../components/DoseStickerPrintModal';
import {
  IconPrescription,
  IconPlus,
  IconRefresh,
  IconTag,
  IconSave,
  IconCheck,
} from '../components/PharmacyIcons';

const COPAY_PRESETS = [0, 10, 15, 20, 25, 30, 50, 100];

export default function PharmacyPrescriptionsPage() {
  useAppToolbar([{ label: 'الروشتات والتأمين' }]);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [insuranceFilter, setInsuranceFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRx, setEditingRx] = useState<Partial<PharmacyPrescription> & { items?: PrescribedItem[] } | null>(null);

  const [stickerMed, setStickerMed] = useState('');
  const [stickerPatient, setStickerPatient] = useState('');
  const [stickerOpen, setStickerOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
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

  const totalItems = data?.pagination.totalItems || 0;
  const prescriptionsList = data?.prescriptions || [];

  const totalAmountSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.total_amount) || 0), 0);
  const totalPatientSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.patient_amount) || 0), 0);
  const totalInsuranceSum = prescriptionsList.reduce((acc: number, r: PharmacyPrescription) => acc + (Number(r.insurance_amount) || 0), 0);

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

  const handleApplyCopayPreset = (percent: number) => {
    if (!editingRx) return;
    const tot = Number(editingRx.total_amount || 0);
    const pat = tot * (percent / 100);
    setEditingRx({
      ...editingRx,
      patient_copay_percent: percent,
      patient_amount: pat,
      insurance_amount: tot - pat,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRx || !editingRx.customer_name) return;
    upsertMutation.mutate(editingRx);
  };

  return (
    <div className="page-stack page-shell" dir="rtl">
      <main className="document-prototype-column" style={{ paddingBottom: '100px', maxWidth: '1280px', margin: '0 auto' }}>
        <PageHeader
          title="الروشتات الطبية والتأمين الصحي والنقابات"
          description="تسجيل وصرف الروشتات الطبية، حساب نسبة تحمل المريض (Co-Pay) ومطالبات شركات التأمين، وطباعة ملصقات الجرعة"
          badge={<span className="nav-pill">{totalItems} روشتة مسجلة</span>}
          actions={
            <div className="actions compact-actions">
              <Button
                variant="primary"
                onClick={handleOpenAdd}
                style={{ background: '#16a34a', borderColor: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <IconPlus size={16} />
                <span>صرف روشتة جديدة</span>
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

        {/* 4 Summary KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي الروشتات المصروفة</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>{totalItems}</div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}>
              <IconPrescription size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>إجمالي قيمة الروشتات</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {totalAmountSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0284c7' }}>
              <IconPrescription size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>تحصيل المرضى (Co-pay)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#16a34a', marginTop: '2px' }}>
                {totalPatientSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <IconCheck size={20} />
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>مطالبات شركات التأمين</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0284c7', marginTop: '2px' }}>
                {totalInsuranceSum.toFixed(2)} <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ج.م</span>
              </div>
            </div>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <IconPrescription size={20} />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', background: '#fff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={'btn btn-sm ' + (insuranceFilter === 'all' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setInsuranceFilter('all'); setPage(1); }}
            >
              الكل ({totalItems})
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (insuranceFilter === 'كاش بدون تأمين' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setInsuranceFilter('كاش بدون تأمين'); setPage(1); }}
            >
              كاش
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (insuranceFilter === 'تأمين صحي حكومي' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setInsuranceFilter('تأمين صحي حكومي'); setPage(1); }}
            >
              تأمين صحي حكومي
            </button>
            <button
              type="button"
              className={'btn btn-sm ' + (insuranceFilter === 'نقابة المهندسين' ? 'btn-primary' : 'btn-secondary')}
              onClick={() => { setInsuranceFilter('نقابة المهندسين'); setPage(1); }}
            >
              نقابات
            </button>
          </div>

          <div style={{ minWidth: '320px' }}>
            <input
              type="text"
              className="purchase-prototype-field-input"
              placeholder="بحث برقم الروشتة، اسم المريض، الهاتف، الطبيب، أو رقم بطاقة التأمين..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '6px 12px' }}
            />
          </div>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 800 }}>
                <th style={{ padding: '10px 14px' }}>رقم الروشتة</th>
                <th style={{ padding: '10px 14px' }}>المريض / الطبيب</th>
                <th style={{ padding: '10px 14px' }}>جهة التأمين / الكود</th>
                <th style={{ padding: '10px 14px' }}>إجمالي الروشتة</th>
                <th style={{ padding: '10px 14px' }}>تحمل المريض (Co-pay)</th>
                <th style={{ padding: '10px 14px' }}>الحالة</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>جاري التحميل...</td>
                </tr>
              ) : prescriptionsList.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: '#64748b' }}>لا توجد روشتات مسجلة</td>
                </tr>
              ) : (
                prescriptionsList.map((rx: PharmacyPrescription) => (
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
                      <span style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #86efac', padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800 }}>
                        تم الصرف
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        className="btn-sm"
                        onClick={() => {
                          setStickerPatient(rx.customer_name);
                          setStickerMed('علاج الروشتة');
                          setStickerOpen(true);
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <IconTag size={14} />
                        <span>استيكر</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && editingRx && (
          <DialogShell open={modalOpen} onClose={() => setModalOpen(false)} width="min(760px, 95vw)" ariaLabel="صرف روشتة طبية">
            <form onSubmit={handleSave} dir="rtl" style={{ padding: '16px 20px' }}>
              <div style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <IconPrescription size={20} color="#16a34a" />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  صرف روشتة طبية وحساب التأمين الصحي
                </h3>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    اسم المريض <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    className="purchase-prototype-field-input"
                    value={editingRx.customer_name || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, customer_name: e.target.value })}
                    placeholder="اسم المريض بالكامل..."
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
                    value={editingRx.customer_phone || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, customer_phone: e.target.value })}
                    placeholder="010XXXXXXXX"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    اسم الطبيب المعالج
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingRx.doctor_name || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, doctor_name: e.target.value })}
                    placeholder="د. أحمد..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    التخصص الطبي
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingRx.doctor_specialty || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, doctor_specialty: e.target.value })}
                    placeholder="باطنة / أطفال / عظام..."
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    شركة التأمين / التعاقد
                  </label>
                  <select
                    className="purchase-prototype-field-input"
                    value={editingRx.insurance_provider || INSURANCE_PROVIDERS[0]}
                    onChange={(e) => setEditingRx({ ...editingRx, insurance_provider: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', background: '#fff' }}
                  >
                    {INSURANCE_PROVIDERS.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    كود الموافقة
                  </label>
                  <input
                    type="text"
                    className="purchase-prototype-field-input"
                    value={editingRx.approval_code || ''}
                    onChange={(e) => setEditingRx({ ...editingRx, approval_code: e.target.value })}
                    placeholder="Approval Code"
                    style={{ width: '100%', padding: '8px 12px' }}
                  />
                </div>

                {/* Quick Copay presets */}
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    نسبة تحمل المريض (Co-Pay %):
                  </label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    {COPAY_PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleApplyCopayPreset(p)}
                        className={'btn btn-sm ' + (editingRx.patient_copay_percent === p ? 'btn-primary' : 'btn-secondary')}
                        style={{ padding: '3px 8px', fontSize: '0.75rem' }}
                      >
                        {p === 0 ? '0% (كاش كامل)' : p === 100 ? '100% (تأمين كامل)' : p + '%'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                    إجمالي قيمة الأدوية (ج.م) <span style={{ color: '#dc2626' }}>*</span>
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
                    style={{ width: '100%', padding: '8px 12px', fontWeight: 700 }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      المطلوب سداده من المريض
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="purchase-prototype-field-input"
                      value={editingRx.patient_amount ?? 0}
                      onChange={(e) => setEditingRx({ ...editingRx, patient_amount: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 12px', fontWeight: 800, color: '#16a34a' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      مطالبة التأمين
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="purchase-prototype-field-input"
                      value={editingRx.insurance_amount ?? 0}
                      onChange={(e) => setEditingRx({ ...editingRx, insurance_amount: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px 12px', color: '#0284c7' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                <Button variant="secondary" onClick={() => setModalOpen(false)}>إلغاء</Button>
                <Button variant="primary" type="submit" disabled={upsertMutation.isPending} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <IconSave size={16} />
                  <span>{upsertMutation.isPending ? 'جاري الحفظ...' : 'حفظ وصرف الروشتة'}</span>
                </Button>
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
      </main>
    </div>
  );
}
