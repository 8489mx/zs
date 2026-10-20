import React, { useState } from 'react';
import {
  useChinaSuppliersQuery,
  useUpsertSupplierMetaMutation,
  useQcInspectionsQuery,
  useCreateQcInspectionMutation,
  ChinaSupplier,
} from './api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import {
  ShieldAlertIcon,
  CheckCircleIcon,
  FileTextIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  SearchIcon,
  SlidersIcon,
  UsersIcon,
  AlertTriangleIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

export default function ChinaSourcingPage() {
  const { data: suppliers = [], isLoading, refetch } = useChinaSuppliersQuery();
  const { data: qcInspections = [], refetch: refetchQc } = useQcInspectionsQuery();
  const upsertSupplierMetaMutation = useUpsertSupplierMetaMutation('');
  const createQcMutation = useCreateQcInspectionMutation();

  const [activeTab, setActiveTab] = useState<'factories' | 'qc' | 'trips'>('factories');
  const [search, setSearch] = useState('');

  // Sourcing Meta Modal
  const [selectedSupplier, setSelectedSupplier] = useState<ChinaSupplier | null>(null);
  const [chineseName, setChineseName] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [moq, setMoq] = useState('');
  const [leadTime, setLeadTime] = useState<number>(30);
  const [bankBeneficiary, setBankBeneficiary] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankSwift, setBankSwift] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [notes, setNotes] = useState('');

  // QC Modal
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [qcStage, setQcStage] = useState('pre_shipment');
  const [qcDate, setQcDate] = useState(new Date().toISOString().slice(0, 10));
  const [qcInspector, setQcInspector] = useState('');
  const [qcSampleSize, setQcSampleSize] = useState<number>(100);
  const [qcPassedQty, setQcPassedQty] = useState<number>(98);
  const [qcFailedQty, setQcFailedQty] = useState<number>(2);
  const [qcDefectNotes, setQcDefectNotes] = useState('');
  const [qcStatus, setQcStatus] = useState('passed');

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.chinese_name && s.chinese_name.includes(search)) ||
      (s.city && s.city.toLowerCase().includes(search.toLowerCase()))
  );

  const openMetaModal = (s: ChinaSupplier) => {
    setSelectedSupplier(s);
    setChineseName(s.chinese_name || '');
    setCity(s.city || '');
    setProvince(s.province || '');
    setMoq(s.moq_description || '');
    setLeadTime(s.production_lead_time_days || 30);
    const bank = s.verified_bank_details || {};
    setBankBeneficiary(bank.beneficiaryName || '');
    setBankName(bank.bankName || '');
    setBankSwift(bank.swiftCode || '');
    setBankIban(bank.ibanOrAccount || '');
    setNotes(s.import_notes || '');
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      await upsertSupplierMetaMutation.mutateAsync({
        chineseName,
        city,
        province,
        moqDescription: moq,
        productionLeadTimeDays: Number(leadTime),
        verifiedBankDetails: {
          beneficiaryName: bankBeneficiary,
          bankName,
          swiftCode: bankSwift,
          ibanOrAccount: bankIban,
        },
        auditStatus: 'verified',
        notes,
      });
      toast.success('تم حفظ وتوثيق بيانات المصنع والحساب البنكي بنجاح');
      setSelectedSupplier(null);
      refetch();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء حفظ بيانات المصنع: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const handleCreateQc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createQcMutation.mutateAsync({
        stage: qcStage,
        inspectionDate: qcDate,
        inspectorName: qcInspector,
        sampleSize: Number(qcSampleSize),
        passedQuantity: Number(qcPassedQty),
        failedQuantity: Number(qcFailedQty),
        defectNotes: qcDefectNotes,
        status: qcStatus,
      });
      toast.success('تم تسجيل تقرير فحص الجودة في الصين بنجاح');
      setIsQcModalOpen(false);
      refetchQc();
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تسجيل تقرير الفحص: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  return (
    <div dir="rtl" style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* 1. Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 4, height: 22, backgroundColor: '#170e5e', borderRadius: 2, display: 'inline-block' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              سورسينج الصين وإدارة المصانع وفحص الجودة (China Sourcing & QC)
            </h1>
          </div>
          <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '4px 14px 0 0' }}>
            توثيق حسابات البنوك لمنع الاحتيال، متابعة مواعيد الإنتاج، وتقارير فحص الجودة قبل الشحن
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setIsQcModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              backgroundColor: '#170e5e',
              border: 'none',
              borderRadius: 8,
              fontSize: '12.5px',
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            <PlusCircleIcon size={15} />
            تقرير فحص جودة جديد (QC)
          </button>
        </div>
      </div>

      {/* 2. Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 8 }}>
        <button
          onClick={() => setActiveTab('factories')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'factories' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'factories' ? '#ffffff' : '#475569',
          }}
        >
          دليل المصانع والحسابات الموثقة ({suppliers.length})
        </button>

        <button
          onClick={() => setActiveTab('qc')}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            fontSize: '12.5px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === 'qc' ? '#170e5e' : '#f1f5f9',
            color: activeTab === 'qc' ? '#ffffff' : '#475569',
          }}
        >
          تقارير فحص الجودة والإنتاج ({qcInspections.length})
        </button>
      </div>

      {/* 3. Tab: Factories */}
      {activeTab === 'factories' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 300 }}>
              <input
                type="text"
                placeholder="بحث عن مصنع أو مدينة أو مقاطعة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', height: 34, padding: '4px 32px 4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
              <span style={{ position: 'absolute', right: 10, top: 9, color: '#94a3b8' }}>
                <SearchIcon size={14} />
              </span>
            </div>

            <button
              onClick={() => refetch()}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px' }}
            >
              <RefreshCwIcon size={13} />
              تحديث
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المصنع / المورد الدولي</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الاسم الصيني والموقع</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>حد الطلب الأدنى MOQ</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>مدة الإنتاج والتجهيز</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الحساب البنكي الموثق</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>الرصيد المفتوح</th>
                  <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map((s) => {
                  const bank = s.verified_bank_details || {};
                  const isVerified = Boolean(bank.bankName && bank.swiftCode);
                  return (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: '12.5px', fontWeight: 700, color: '#0f172a' }}>
                        {s.name}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                        {s.chinese_name ? `${s.chinese_name} (${s.city || ''})` : s.city || '—'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                        {s.moq_description || 'غير محدد'}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>
                        {s.production_lead_time_days || 30} يوم
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: isVerified ? '#ecfdf5' : '#fffbeb',
                            color: isVerified ? '#047857' : '#b45309',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isVerified ? <CheckCircleIcon size={12} /> : <AlertTriangleIcon size={12} />}
                          {isVerified ? 'حساب موثق ومحمى' : 'يحتاج توثيق'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: Number(s.balance || 0) > 0 ? '#b91c1c' : '#059669' }}>
                        ${Number(s.balance || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          onClick={() => openMetaModal(s)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: 6,
                            fontSize: '11.5px',
                            fontWeight: 700,
                            color: '#170e5e',
                            cursor: 'pointer',
                          }}
                        >
                          توثيق البيانات
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. Tab: QC Inspections */}
      {activeTab === 'qc' && (
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              سجل فحوصات الجودة ومراحل التصنيع ({qcInspections.length})
            </h2>
            <button
              onClick={() => refetchQc()}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '12px' }}
            >
              <RefreshCwIcon size={13} />
              تحديث
            </button>
          </div>

          {qcInspections.length === 0 ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
              لا توجد تقارير فحص مسجلة حتى الآن.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>تاريخ الفحص</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>مرحلة الفحص</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المفتش / شركة الفحص</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>العينة المفحوصة</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>المقبول vs المرفوض</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>ملاحظات العيوب</th>
                    <th style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 700, color: '#475569' }}>القرار النهائي</th>
                  </tr>
                </thead>
                <tbody>
                  {qcInspections.map((q) => (
                    <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>{q.inspection_date}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {q.stage === 'pre_shipment' ? 'قبل الشحن (Pre-Shipment)' : q.stage === 'during_production' ? 'أثناء الإنتاج (DUPRO)' : q.stage}
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>{q.inspector_name || 'مكتب فحص الصين'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#475569' }}>{q.sample_size} قطعة</td>
                      <td style={{ padding: '12px 14px', fontSize: '12px' }}>
                        <span style={{ color: '#059669', fontWeight: 700 }}>{q.passed_quantity} مطابق</span> | <span style={{ color: '#b91c1c', fontWeight: 700 }}>{q.failed_quantity} مرفوض</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: '12px', color: '#64748b' }}>{q.defect_notes || 'لا توجد ملاحظات حرجة'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            backgroundColor: q.status === 'passed' ? '#dcfce7' : q.status === 'conditional' ? '#fef3c7' : '#fee2e2',
                            color: q.status === 'passed' ? '#166534' : q.status === 'conditional' ? '#92400e' : '#991b1b',
                          }}
                        >
                          {q.status === 'passed' ? 'معتمد للشحن' : q.status === 'conditional' ? 'معتمد بشروط' : 'مرفوض'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. Sourcing Metadata Dialog */}
      <StandardDialog
        open={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplier(null)}
        title={`توثيق بيانات المصنع الصيني والحساب البنكي: ${selectedSupplier?.name || ''}`}
        subtitle="توثيق الحسابات البنكية الرسمية المعتمدة لحماية الحوالات الخارجية من الاحتيال"
        width="650px"
      >
        <form onSubmit={handleSaveMeta} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                الاسم الصيني للمصنع (Chinese Company Name)
              </label>
              <input
                type="text"
                value={chineseName}
                onChange={(e) => setChineseName(e.target.value)}
                placeholder="مثال: 广州智能科技有限公司"
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                المدينة والمقاطعة
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="مثال: Shenzhen, Guangdong"
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                الحد الأدنى للطلب MOQ
              </label>
              <input
                type="text"
                value={moq}
                onChange={(e) => setMoq(e.target.value)}
                placeholder="مثال: 500 قطعة لكل لون"
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                مدة التصنيع والتجهيز (بالأيام)
              </label>
              <input
                type="number"
                value={leadTime}
                onChange={(e) => setLeadTime(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          {/* Bank Verified Details Box */}
          <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e' }}>
              الحساب البنكي الموثق للحوالات الدولية (Verified Bank Account)
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>اسم المستفيد (Beneficiary Name)</label>
              <input
                type="text"
                value={bankBeneficiary}
                onChange={(e) => setBankBeneficiary(e.target.value)}
                placeholder="اسم الشركة المطابق للسجل التجاري الصيني"
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12px' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>اسم البنك (Bank Name)</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="مثال: Bank of China"
                  style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12px' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>سويفت كود (SWIFT Code)</label>
                <input
                  type="text"
                  value={bankSwift}
                  onChange={(e) => setBankSwift(e.target.value)}
                  placeholder="مثال: BKCHCNBJ110"
                  style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569', display: 'block', marginBottom: 4 }}>رقم الحساب / الآيبان (Account / IBAN)</label>
              <input
                type="text"
                value={bankIban}
                onChange={(e) => setBankIban(e.target.value)}
                placeholder="رقم الحساب البنكي المعتمد"
                style={{ width: '100%', height: 34, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>
              ملاحظات المورد والتعامل
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="شروط التسليم، شهادات الجودة، وكيل الشحن المحلي..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setSelectedSupplier(null)}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={upsertSupplierMetaMutation.isPending}
              style={{ padding: '8px 20px', backgroundColor: '#170e5e', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
            >
              {upsertSupplierMetaMutation.isPending ? 'جاري الحفظ...' : 'حفظ وتوثيق المصنع'}
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* 6. QC Inspection Dialog */}
      <StandardDialog
        open={isQcModalOpen}
        onClose={() => setIsQcModalOpen(false)}
        title="تسجيل تقرير فحص جودة جديد (New QC Inspection)"
        subtitle="فحص العينات في الصين ومطابقة المواصفات قبل شحن الحاوية"
        width="600px"
      >
        <form onSubmit={handleCreateQc} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>مرحلة الفحص</label>
              <select
                value={qcStage}
                onChange={(e) => setQcStage(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              >
                <option value="raw_material">فحص المواد الخام</option>
                <option value="during_production">أثناء الإنتاج (DUPRO)</option>
                <option value="pre_shipment">قبل الشحن (Pre-Shipment)</option>
                <option value="container_loading">أثناء تحميل الحاوية (CLC)</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>تاريخ الفحص</label>
              <input
                type="date"
                required
                value={qcDate}
                onChange={(e) => setQcDate(e.target.value)}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>المفتش / وكيل الجودة</label>
              <input
                type="text"
                value={qcInspector}
                onChange={(e) => setQcInspector(e.target.value)}
                placeholder="اسم المفتش أو شركة الفحص"
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>حجم العينة المفحوصة (قطعة)</label>
              <input
                type="number"
                value={qcSampleSize}
                onChange={(e) => setQcSampleSize(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>القطع المقبولة</label>
              <input
                type="number"
                value={qcPassedQty}
                onChange={(e) => setQcPassedQty(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>القطع المرفوعة / المعيبة</label>
              <input
                type="number"
                value={qcFailedQty}
                onChange={(e) => setQcFailedQty(Number(e.target.value))}
                style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>القرار النهائي للفحص</label>
            <select
              value={qcStatus}
              onChange={(e) => setQcStatus(e.target.value)}
              style={{ width: '100%', height: 36, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            >
              <option value="passed">معتمد ومطابق للشحن (Passed)</option>
              <option value="conditional">معتمد بشروط / إعادة تعبئة (Conditional)</option>
              <option value="rejected">مرفوض تماماً / إعادة تصنيع (Rejected)</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: 4 }}>ملاحظات العيوب والاختبارات</label>
            <textarea
              rows={3}
              value={qcDefectNotes}
              onChange={(e) => setQcDefectNotes(e.target.value)}
              placeholder="تفاصيل العيوب الملاحظة، اختلاف الألوان، مطابقة الأوزان والأبعاد..."
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '12.5px' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setIsQcModalOpen(false)}
              style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 600, color: '#475569', cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={createQcMutation.isPending}
              style={{ padding: '8px 20px', backgroundColor: '#170e5e', border: 'none', borderRadius: 6, fontSize: '12.5px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
            >
              {createQcMutation.isPending ? 'جاري الحفظ...' : 'حفظ تقرير الفحص'}
            </button>
          </div>
        </form>
      </StandardDialog>
    </div>
  );
}
