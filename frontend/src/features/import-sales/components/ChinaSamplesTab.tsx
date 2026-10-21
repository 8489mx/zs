import React, { useState } from 'react';
import {
  useSampleOrdersQuery,
  useCreateSampleOrderMutation,
  useUpdateSampleInspectionMutation,
  useChinaSuppliersQuery,
} from '../api/shipments.api';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { formatCurrency } from '@/lib/format';
import {
  PlusCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  SlidersIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';

export function ChinaSamplesTab() {
  const { data: samples = [], isLoading, refetch } = useSampleOrdersQuery();
  const { data: suppliers = [] } = useChinaSuppliersQuery();
  const createSampleMutation = useCreateSampleOrderMutation();
  const updateInspectionMutation = useUpdateSampleInspectionMutation('');

  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [selectedSampleForInspection, setSelectedSampleForInspection] = useState<any | null>(null);

  // Form State
  const [projectId, setProjectId] = useState('');
  const [supplierId, setSupplierId] = useState<number | ''>('');
  const [productName, setProductName] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [sampleCostUsd, setSampleCostUsd] = useState<number>(150);
  const [courierTrackingNo, setCourierTrackingNo] = useState('');

  // Inspection State
  const [inspectionScore, setInspectionScore] = useState<number>(9.5);
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [approveAsReference, setApproveAsReference] = useState(true);

  // Fetch Projects
  const { data: projects = [] } = useQuery({
    queryKey: ['import-projects'],
    queryFn: async () => {
      const res = await http<any[]>('/api/import-sales/projects');
      return Array.isArray(res) ? res : (res as any)?.items || [];
    },
  });

  const handleRequestSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('يرجى اختيار المصنع');
      return;
    }
    if (!productName.trim()) {
      toast.error('اسم الصنف / العينة مطلوب');
      return;
    }
    try {
      await createSampleMutation.mutateAsync({
        projectId: projectId || undefined,
        supplierId: Number(supplierId),
        productName: productName.trim(),
        specifications: specifications || undefined,
        sampleCostUsd: Number(sampleCostUsd),
        courierTrackingNo: courierTrackingNo || undefined,
      });
      toast.success('تم تسجيل طلب العينة من المصنع بنجاح');
      setIsRequestOpen(false);
      setProductName('');
      refetch();
    } catch (err: any) {
      toast.error('فشل طلب العينة: ' + (err.message || 'خطأ'));
    }
  };

  const handleSaveInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSampleForInspection) return;
    try {
      await updateInspectionMutation.mutateAsync({
        inspectionScore: Number(inspectionScore),
        inspectionNotes: inspectionNotes || undefined,
        referenceSampleApproved: approveAsReference,
        status: approveAsReference ? 'approved' : 'tested',
      });
      toast.success(
        approveAsReference
          ? 'تم اعتماد العينة كمرجعية فنية ملزمة لخط الإنتاج'
          : 'تم حفظ نتيجة فحص العينة بنجاح'
      );
      setSelectedSampleForInspection(null);
      refetch();
    } catch (err: any) {
      toast.error('فشل حفظ الفحص: ' + (err.message || 'خطأ'));
    }
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Top Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
            سجل العينات والفحص المخبري المرجعي (Sample Tracker & Reference Approval)
          </h2>
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            متابعة وصول العينات السريعة (DHL/FedEx) واعتماد العينة القياسية كمرجع ملزم للمصنع قبل تحويل الدفعة المقدمة
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRequestOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 14px',
            backgroundColor: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: 6,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          <PlusCircleIcon size={14} />
          طلب عينة جديدة
        </button>
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>اسم المنتج / العينة</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>المصنع المصدر</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>تكلفة العينة والشحن ($)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>بوليصة التتبع السريع</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>تقييم الفحص (/10)</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>عينة مرجعية معتمدة</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>الحالة</th>
              <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'center' }}>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {samples.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد طلبات عينات مسجلة حالياً
                </td>
              </tr>
            ) : (
              samples.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{s.product_name}</td>
                  <td style={{ padding: '10px 14px' }}>{s.supplier_name || `مصنع #${s.supplier_id}`}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 600 }}>${s.sample_cost_usd}</td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#0369a1' }}>
                    {s.courier_tracking_no || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                    {s.inspection_score ? `${s.inspection_score} / 10` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {s.reference_sample_approved ? (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: '#dcfce7',
                          color: '#166534',
                        }}
                      >
                        <CheckShieldIcon size={12} />
                        معتمدة كعينة أساسية
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#64748b' }}>غير معتمدة</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor:
                          s.status === 'approved'
                            ? '#dcfce7'
                            : s.status === 'rejected'
                            ? '#fee2e2'
                            : '#fef3c7',
                        color:
                          s.status === 'approved'
                            ? '#166534'
                            : s.status === 'rejected'
                            ? '#b91c1c'
                            : '#b45309',
                      }}
                    >
                      {s.status === 'approved' ? 'معتمدة' : s.status === 'rejected' ? 'مرفوضة' : 'قيد الفحص'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSampleForInspection(s);
                        setInspectionScore(s.inspection_score || 9.5);
                        setInspectionNotes(s.inspection_notes || '');
                        setApproveAsReference(true);
                      }}
                      style={{
                        padding: '4px 10px',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: 4,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                        color: '#170e5e',
                      }}
                    >
                      فحص واعتماد
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Request Sample */}
      <StandardDialog
        isOpen={isRequestOpen}
        onClose={() => setIsRequestOpen(false)}
        title="طلب عينة جديدة من المصنع"
        subtitle="تسجيل طلب إرسال عينة بالبريد السريع لمطابقتها مع المعايير الفنية والتجارية"
        width="600px"
        compact
      >
        <form onSubmit={handleRequestSample} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                المصنع المورد: *
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                required
              >
                <option value="">-- اختر المصنع --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.city ? `(${s.city})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                مشروع الاستيراد:
              </label>
              <select
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">-- اختياري --</option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.project_no} - {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              اسم الصنف / العينة: *
            </label>
            <input
              type="text"
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={productName}
              placeholder="مثال: قلاية هوائية ديجيتال 6 لتر سيلفر"
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                تكلفة العينة والشحن ($):
              </label>
              <input
                type="number"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={sampleCostUsd}
                onChange={(e) => setSampleCostUsd(Number(e.target.value))}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                رقم بوليصة الشحن السريع (DHL/FedEx):
              </label>
              <input
                type="text"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={courierTrackingNo}
                placeholder="DHL-849201938"
                onChange={(e) => setCourierTrackingNo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
              المواصفات الفنية المطلوبة بالعينة:
            </label>
            <textarea
              rows={2}
              className="input"
              style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
              value={specifications}
              placeholder="مثال: قابس ثلاثي بريطاني 220V، طلاء تيفال مانع للالتصاق، كرتونة ملونة 5 طبقات"
              onChange={(e) => setSpecifications(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setIsRequestOpen(false)}
              style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
            >
              إلغاء
            </button>
            <button
              type="submit"
              style={{ padding: '7px 16px', backgroundColor: '#170e5e', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
            >
              تسجيل الطلب
            </button>
          </div>
        </form>
      </StandardDialog>

      {/* Modal: Inspection & Approval */}
      {selectedSampleForInspection && (
        <StandardDialog
          isOpen={!!selectedSampleForInspection}
          onClose={() => setSelectedSampleForInspection(null)}
          title={`فحص واعتماد العينة: ${selectedSampleForInspection.product_name}`}
          subtitle={`المصنع: ${selectedSampleForInspection.supplier_name} | بوليصة الشحن: ${selectedSampleForInspection.courier_tracking_no || '—'}`}
          width="550px"
          compact
        >
          <form onSubmit={handleSaveInspection} dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                درجة تقييم جودة العينة (من 10): *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={inspectionScore}
                onChange={(e) => setInspectionScore(Number(e.target.value))}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                ملاحظات الفحص والعيوب (إن وجدت):
              </label>
              <textarea
                rows={3}
                className="input"
                style={{ width: '100%', padding: '7px 10px', fontSize: 13 }}
                value={inspectionNotes}
                placeholder="العينة مطابقة 100% للمواصفات الكهربائية، تم اختبارها لمدة 48 ساعة متواصلة بنجاح"
                onChange={(e) => setInspectionNotes(e.target.value)}
              />
            </div>

            <div style={{ backgroundColor: '#f8fafc', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: '#166534', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={approveAsReference}
                  onChange={(e) => setApproveAsReference(e.target.checked)}
                />
                اعتماد العينة كمرجعية قياسية ملزمة لخط الإنتاج (Gold Standard Sample)
              </label>
              <p style={{ margin: '4px 24px 0 0', fontSize: 11.5, color: '#64748b' }}>
                سيتم إلزام المصنع بهذه العينة في أمر الشراء الدولي IPO، وتطبيق الفحص النهائي بالميناء بناءً عليها
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setSelectedSampleForInspection(null)}
                style={{ padding: '7px 14px', backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 12.5, cursor: 'pointer' }}
              >
                إلغاء
              </button>
              <button
                type="submit"
                style={{ padding: '7px 16px', backgroundColor: '#15803d', color: '#ffffff', border: 'none', borderRadius: 6, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' }}
              >
                حفظ نتيجة الفحص والاعتماد
              </button>
            </div>
          </form>
        </StandardDialog>
      )}
    </div>
  );
}
