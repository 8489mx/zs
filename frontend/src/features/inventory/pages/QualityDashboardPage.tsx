import { useState, useEffect, type FC } from 'react';
import {
  qualityAssuranceApi,
  type QCPointRecord,
  type QCInspectionRecord,
  type QCNCRRecord,
} from '../api/quality-assurance.api';
import { CreateQCPointModal } from '../components/quality/CreateQCPointModal';
import { RecordInspectionModal } from '../components/quality/RecordInspectionModal';
import { CreateNCRModal } from '../components/quality/CreateNCRModal';
import { toast } from '@/shared/components/system-alert';
import {
  PlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  CheckShieldIcon,
} from '@/shared/components/icons/AppIcons';

export const QualityDashboardPage: FC = () => {
  const [activeTab, setActiveTab] = useState<'inspections' | 'ncrs' | 'points'>('inspections');
  const [summary, setSummary] = useState<any>(null);
  const [inspections, setInspections] = useState<QCInspectionRecord[]>([]);
  const [ncrs, setNcrs] = useState<QCNCRRecord[]>([]);
  const [points, setPoints] = useState<QCPointRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isPointModalOpen, setIsPointModalOpen] = useState(false);
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [isNcrModalOpen, setIsNcrModalOpen] = useState(false);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [sumRes, inspRes, ncrRes, ptsRes] = await Promise.all([
        qualityAssuranceApi.getSummary(),
        qualityAssuranceApi.getInspections(),
        qualityAssuranceApi.getNCRs(),
        qualityAssuranceApi.getPoints(),
      ]);
      setSummary(sumRes);
      setInspections(inspRes || []);
      setNcrs(ncrRes || []);
      setPoints(ptsRes || []);
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحميل بيانات الجودة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleUpdateNcrStatus = async (id: string, status: 'investigating' | 'resolved' | 'closed') => {
    try {
      await qualityAssuranceApi.updateNCRStatus(id, status);
      toast.success('تم تحديث حالة تقرير عدم المطابقة بنجاح');
      fetchAllData();
    } catch (err: any) {
      toast.error(err?.message || 'فشل تحديث حالة الـ NCR');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#dcfce7', color: '#15803d' }}>مطابق (Pass)</span>;
      case 'failed':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>غير مطابق (Fail)</span>;
      case 'conditional':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>قبول مشروط</span>;
      case 'open':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#fee2e2', color: '#b91c1c' }}>مفتوح</span>;
      case 'investigating':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#fef3c7', color: '#b45309' }}>قيد التحقيق</span>;
      case 'resolved':
      case 'closed':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>مغلق ومعالج</span>;
      default:
        return <span>{status}</span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 700, background: '#7f1d1d', color: '#ffffff' }}>حرج</span>;
      case 'major':
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#fed7aa', color: '#9a3412' }}>جوهري</span>;
      default:
        return <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>بسيط</span>;
    }
  };

  return (
    <div style={{ maxWidth: '1280px', width: 'min(100%, 1280px)', margin: '0 auto', padding: '24px 16px' }} dir="rtl">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
            إدارة الجودة والامتثال وتقارير عدم المطابقة (Quality Control & NCR)
          </h1>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#64748b' }}>
            معايير الفحص الإلزامية للمشتريات والتصنيع، رصد حدود التسامح، ومعالجة تقارير عدم المطابقة
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsPointModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#1e293b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <CheckShieldIcon size={15} />
            معيار فحص جديد
          </button>
          <button
            onClick={() => setIsInspectionModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              background: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <PlusIcon size={15} />
            تسجيل فحص عينة
          </button>
          <button
            onClick={() => setIsNcrModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#991b1b',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <AlertTriangleIcon size={15} />
            فتح تقرير NCR
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>معدل القبول العام للجودة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#16a34a' }}>
            {summary?.rates?.acceptanceRatePercent ?? 100}%
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>إجمالي الفحوصات المنفذة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
            {summary?.totalInspections ?? 0}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>تقارير عدم المطابقة المفتوحة (Open NCRs)</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: (summary?.openNCRs ?? 0) > 0 ? '#ea580c' : '#0f172a' }}>
            {summary?.openNCRs ?? 0}
          </div>
        </div>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '4px' }}>عيوب ومخالفات حرجة نشطة</div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: (summary?.criticalDefects ?? 0) > 0 ? '#dc2626' : '#16a34a' }}>
            {summary?.criticalDefects ?? 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '16px', display: 'flex', gap: '8px' }}>
        {[
          { id: 'inspections', label: `سجل الفحوصات (${inspections.length})` },
          { id: 'ncrs', label: `تقارير عدم المطابقة NCR (${ncrs.length})` },
          { id: 'points', label: `نقاط ومعايير الجودة (${points.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              background: activeTab === tab.id ? '#170e5e' : '#f8fafc',
              color: activeTab === tab.id ? '#ffffff' : '#475569',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>جاري تحميل البيانات...</div>
        ) : activeTab === 'inspections' ? (
          inspections.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <CheckShieldIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px' }}>لا توجد فحوصات جودة مسجلة</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>اضغط على "تسجيل فحص عينة" لمعاينة شحنة أو دفعة إنتاج</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>المستند المرجعي</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الصنف</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>معيار الفحص</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>الكمية المفحوصة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>المقبول</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>المرفوض</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>النتيجة والحالة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((insp) => (
                    <tr key={insp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#1e293b' }}>
                        {insp.reference_doc_id}
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>{insp.reference_doc_type}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{insp.product_name}</div>
                        {insp.product_code && <div style={{ fontSize: '11px', color: '#64748b' }}>{insp.product_code}</div>}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {insp.point_name || 'فحص عام'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                        {insp.inspected_qty}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>
                        {insp.accepted_qty}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 700, color: insp.rejected_qty > 0 ? '#dc2626' : '#94a3b8' }}>
                        {insp.rejected_qty}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(insp.status)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px' }}>
                        {insp.created_at ? new Date(insp.created_at).toLocaleDateString('ar-EG') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : activeTab === 'ncrs' ? (
          ncrs.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <CheckCircleIcon size={40} style={{ color: '#16a34a', opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontWeight: 600, fontSize: '14px' }}>لا توجد تقارير عدم مطابقة مفتوحة</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>كافة الدفعات والمنتجات مطابقة للمعايير المعتمدة</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>رقم الـ NCR</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الصنف</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الخطورة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>وصف العيب</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الإجراء المتخذ</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الحالة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'center' }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {ncrs.map((ncr) => (
                    <tr key={ncr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 800, color: '#991b1b' }}>
                        {ncr.ncr_number}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                        {ncr.product_name}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getSeverityBadge(ncr.severity)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {ncr.defect_description}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#170e5e', fontWeight: 600 }}>
                        {ncr.disposition_action === 'quarantine_scrap' ? 'حجر وإتلاف' : ncr.disposition_action === 'return_to_vendor' ? 'إرجاع للمورد' : ncr.disposition_action === 'rework' ? 'إصلاح داخلي' : 'قبول مشروط'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {getStatusBadge(ncr.status)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {ncr.status === 'open' && (
                            <button
                              onClick={() => handleUpdateNcrStatus(ncr.id, 'investigating')}
                              style={{ padding: '4px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#ffffff', cursor: 'pointer' }}
                            >
                              بدء التحقيق
                            </button>
                          )}
                          {ncr.status !== 'closed' && (
                            <button
                              onClick={() => handleUpdateNcrStatus(ncr.id, 'closed')}
                              style={{ padding: '4px 8px', fontSize: '11.5px', borderRadius: '6px', border: '1px solid #86efac', background: '#f0fdf4', color: '#15803d', cursor: 'pointer' }}
                            >
                              إغلاق ومعالجة
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          points.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#64748b' }}>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>لا توجد نقاط ومعايير جودة معرفة</div>
              <div style={{ fontSize: '12.5px', marginTop: '4px' }}>اضغط على "معيار فحص جديد" لتعريف متطلبات الفحص وحدود التسامح</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', textAlign: 'right' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>اسم المعيار</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>المرحلة</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>نوع الاختبار</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>الصنف المحدد</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>حدود التسامح</th>
                    <th style={{ padding: '12px 16px', fontWeight: 600 }}>إلزامي</th>
                  </tr>
                </thead>
                <tbody>
                  {points.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                        {p.name}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {p.trigger_stage === 'receipt' ? 'استلام مشتريات' : p.trigger_stage === 'manufacturing' ? 'إنتاج تصنيعي' : p.trigger_stage === 'delivery' ? 'تسليم مبيعات' : 'فحص داخلي'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.test_type === 'pass_fail' ? 'مطابق / غير مطابق' : p.test_type === 'measure' ? 'قياس كمي' : 'قائمة متطلبات'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#334155' }}>
                        {p.product_name || 'عام على كافة الأصناف'}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>
                        {p.test_type === 'measure' ? `[${p.norm_measure_min ?? '—'} إلى ${p.norm_measure_max ?? '—'}] ${p.measure_unit || ''}` : '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {p.is_mandatory ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>إلزامي</span>
                        ) : (
                          <span style={{ color: '#64748b' }}>اختياري</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <CreateQCPointModal
        open={isPointModalOpen}
        onClose={() => setIsPointModalOpen(false)}
        onSuccess={fetchAllData}
      />

      <RecordInspectionModal
        open={isInspectionModalOpen}
        onClose={() => setIsInspectionModalOpen(false)}
        onSuccess={fetchAllData}
        qcPoints={points}
      />

      <CreateNCRModal
        open={isNcrModalOpen}
        onClose={() => setIsNcrModalOpen(false)}
        onSuccess={fetchAllData}
      />
    </div>
  );
};
