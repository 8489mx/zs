import { useState, useMemo } from 'react';
import { ContractingProject } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { GovernmentLicensesModal } from './GovernmentLicensesModal';
import { ProjectHealthWidget } from './ProjectHealthWidget';
import { TenderEstimatorModal } from './TenderEstimatorModal';
import { MarkTenderLostModal } from './MarkTenderLostModal';
import { AwardTenderModal } from './AwardTenderModal';
import { contractingApi } from '../api/contracting.api';
import { toast, systemConfirm } from '@/shared/components/system-alert';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';

interface ContractingProjectsTabProps {
  projects: ContractingProject[];
  loading: boolean;
  onSelectProject: (projectId: string, targetTab?: string) => void;
  onNewProject: () => void;
  onRefresh?: () => Promise<void> | void;
}

type PipelineTab = 'active' | 'tenders' | 'lost';

const LOSS_REASON_LABELS: Record<string, string> = {
  price_higher_than_competitor: 'السعر أعلى من المنافس',
  client_cancelled_project: 'إلغاء المشروع من المالك',
  payment_terms_conflict: 'عدم التوافق مع شروط الدفع',
  technical_specifications: 'اشتراطات فنية غير متاحة',
  duration_too_short: 'مدة التنفيذ غير كافية',
  other: 'أسباب أخرى',
};

export function ContractingProjectsTab({
  projects,
  loading,
  onSelectProject,
  onNewProject,
  onRefresh,
}: ContractingProjectsTabProps) {
  const { formatCurrency } = useSystemCurrency();
  const [activeTab, setActiveTab] = useState<PipelineTab>('active');

  // Modals
  const [licensesModal, setLicensesModal] = useState<{ open: boolean; projectId: string; projectName: string }>({
    open: false,
    projectId: '',
    projectName: '',
  });
  const [isTenderEstimatorOpen, setIsTenderEstimatorOpen] = useState(false);
  const [lostModal, setLostModal] = useState<{ open: boolean; project: ContractingProject | null }>({
    open: false,
    project: null,
  });
  const [awardModal, setAwardModal] = useState<{ open: boolean; project: ContractingProject | null }>({
    open: false,
    project: null,
  });

  // Categorize Projects
  const activeProjects = useMemo(
    () => projects.filter((p) => p.status === 'active' || p.status === 'suspended' || p.status === 'completed' || p.status === 'handed_over'),
    [projects]
  );

  const tenderProjects = useMemo(
    () => projects.filter((p) => p.status === 'planning' || p.status === 'draft' || p.status === 'submitted' || p.status === 'negotiation'),
    [projects]
  );

  const lostProjects = useMemo(
    () => projects.filter((p) => p.status === 'lost' || p.status === 'cancelled'),
    [projects]
  );

  const displayedProjects = useMemo(() => {
    if (activeTab === 'tenders') return tenderProjects;
    if (activeTab === 'lost') return lostProjects;
    return activeProjects;
  }, [activeTab, activeProjects, tenderProjects, lostProjects]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>
            قيد التنفيذ
          </span>
        );
      case 'completed':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#0f172a', border: '1px solid #cbd5e1' }}>
            مكتمل ومسلّم
          </span>
        );
      case 'suspended':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            معلق مؤقتاً
          </span>
        );
      case 'submitted':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
            بانتظار رد العميل
          </span>
        );
      case 'negotiation':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>
            تحت التفاوض (مراجعة)
          </span>
        );
      case 'lost':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            أرشيف (لم يُرسَ)
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
            ملغي
          </span>
        );
      case 'draft':
      case 'planning':
      default:
        return (
          <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f8fafc', color: '#170e5e', border: '1px solid #cbd5e1' }}>
            عطاء قيد الدراسة
          </span>
        );
    }
  };

  const handleCreateRevision = async (prj: ContractingProject) => {
    const confirmed = await systemConfirm({
      title: 'إنشاء مراجعة تفاوضية جديدة للعطاء',
      message: `هل أنت متأكد من إنشاء مراجعة تفاوضية جديدة للعطاء [${prj.code}] "${prj.name}"؟ سيتم نسخ بنود المقايسة وتوليد كود مراجعة جديد مع تجميد النسخة الحالية كمرجع تاريخي.`,
      confirmText: 'نعم، أنشئ مراجعة جديدة',
      variant: 'primary',
    });
    if (!confirmed) return;

    try {
      const cloned = await contractingApi.createTenderRevision(prj.id);
      toast.success(`تم إنشاء المراجعة التفاوضية بنجاح بكود: ${cloned.code}`);
      if (onRefresh) await onRefresh();
      onSelectProject(cloned.id, 'tender');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إنشاء المراجعة التفاوضية');
    }
  };

  const handleReviveTender = async (prj: ContractingProject) => {
    const confirmed = await systemConfirm({
      title: 'إعادة فتح العطاء للتفاوض',
      message: `هل ترغب في إعادة فتح العطاء المرجعي [${prj.code}] وإعادته لمسار التفاوض النشط لدراسة عرضه مجدداً؟`,
      confirmText: 'نعم، أعد فتح العطاء',
      variant: 'primary',
    });
    if (!confirmed) return;

    try {
      await contractingApi.updateProject(prj.id, { status: 'negotiation' });
      toast.success('تمت استعادة العطاء إلى مسار العطاءات والمفاوضات بنجاح!');
      if (onRefresh) await onRefresh();
      setActiveTab('tenders');
    } catch (err: any) {
      toast.error(err?.message || 'تعذر إعادة فتح العطاء');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* 1. Header & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            سجل المشاريع الإنشائية والعطاءات (Projects & Bidding Register)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            فصل هندسي صارم بين مسار دراسة العطاءات والمناقصات، وبين المشاريع التنفيذية السارية
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => onSelectProject('', 'tender')}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#170e5e',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Sliders size={15} />
            <span>دراسة وتسعير عطاء جديد</span>
          </button>
          <button
            type="button"
            onClick={onNewProject}
            style={{
              height: '36px',
              padding: '0 16px',
              borderRadius: '8px',
              fontWeight: 700,
              background: '#170e5e',
              color: '#ffffff',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.15)',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Plus size={15} />
            <span>مشروع تعاقدي مباشر</span>
          </button>
        </div>
      </div>

      {/* 2. Pipeline Segment Tabs */}
      <div style={{ display: 'flex', gap: '10px', background: '#f1f5f9', padding: '6px', borderRadius: '10px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          style={{
            height: '34px',
            padding: '0 16px',
            borderRadius: '7px',
            border: 'none',
            fontSize: 'var(--font-body)',
            fontWeight: 600,
            background: activeTab === 'active' ? '#ffffff' : 'transparent',
            color: activeTab === 'active' ? '#170e5e' : '#64748b',
            boxShadow: activeTab === 'active' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AppIcons.Building size={15} />
          <span>المشاريع التنفيذية السارية</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'active' ? '#f1f5f9' : '#e2e8f0', color: activeTab === 'active' ? '#170e5e' : '#64748b', fontWeight: 700 }}>
            {activeProjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tenders')}
          style={{
            height: '34px',
            padding: '0 16px',
            borderRadius: '7px',
            border: 'none',
            fontSize: 'var(--font-body)',
            fontWeight: 600,
            background: activeTab === 'tenders' ? '#ffffff' : 'transparent',
            color: activeTab === 'tenders' ? '#170e5e' : '#64748b',
            boxShadow: activeTab === 'tenders' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AppIcons.Sliders size={15} />
          <span>مسار العطاءات والمناقصات</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'tenders' ? '#f1f5f9' : '#e2e8f0', color: activeTab === 'tenders' ? '#170e5e' : '#64748b', fontWeight: 700 }}>
            {tenderProjects.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('lost')}
          style={{
            height: '34px',
            padding: '0 16px',
            borderRadius: '7px',
            border: 'none',
            fontSize: 'var(--font-body)',
            fontWeight: 600,
            background: activeTab === 'lost' ? '#ffffff' : 'transparent',
            color: activeTab === 'lost' ? '#170e5e' : '#64748b',
            boxShadow: activeTab === 'lost' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AppIcons.Archive size={15} />
          <span>أرشيف العطاءات غير المرسّاة (المرجع التاريخي)</span>
          <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: activeTab === 'lost' ? '#f1f5f9' : '#e2e8f0', color: activeTab === 'lost' ? '#170e5e' : '#64748b', fontWeight: 700 }}>
            {lostProjects.length}
          </span>
        </button>
      </div>

      {/* 3. Table Card */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري تحميل سجل المشاريع والعطاءات...
          </div>
        ) : displayedProjects.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              {activeTab === 'tenders' ? <AppIcons.Sliders size={48} /> : activeTab === 'lost' ? <AppIcons.Archive size={48} /> : <AppIcons.Building size={48} />}
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {activeTab === 'tenders'
                ? 'لا توجد عطاءات قيد الدراسة أو التفاوض حالياً'
                : activeTab === 'lost'
                ? 'أرشيف العطاءات غير المرسّاة فارغ'
                : 'لا توجد مشاريع إنشائية تنفيذية مسجلة بعد'}
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '440px', margin: '0 auto 16px' }}>
              {activeTab === 'tenders'
                ? 'قم باستيراد مقايسة العميل وتسعيرها وتفكيك الكود لحساب تكاليف الخامات والمصنعيات واستخراج عروض الأسعار.'
                : activeTab === 'lost'
                ? 'أي عطاء لم يوفق فيه سيُحفظ هنا كمرجع تسعيري دائم للاستفادة من حسابات التكلفة في العمليات القادمة.'
                : 'قم بترسية أحد العطاءات أو إضافة مشروع تعاقدي جديد لبدء التوريدات واليوميات وإصدار المستخلصات.'}
            </div>
            {activeTab === 'tenders' ? (
              <button
                type="button"
                onClick={() => onSelectProject('', 'tender')}
                style={{
                  height: '36px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--font-body)',
                }}
              >
                بدء دراسة وتسعير عطاء الآن
              </button>
            ) : null}
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
            <table style={{ width: '100%', minWidth: '1060px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right' }}>
              <colgroup>
                <col style={{ width: '110px' }} />
                <col style={{ width: '190px' }} />
                <col style={{ width: '130px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '115px' }} />
                <col style={{ width: '115px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '65px' }} />
                <col style={{ width: '115px' }} />
              </colgroup>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 6px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                    {activeTab === 'tenders' ? 'كود العطاء' : activeTab === 'lost' ? 'كود العطاء' : 'كود المشروع'}
                  </th>
                  <th style={{ padding: '12px 8px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                    {activeTab === 'tenders' ? 'اسم العطاء المقترح' : activeTab === 'lost' ? 'اسم العطاء وسبب الرفض' : 'المشروع والموقع'}
                  </th>
                  <th style={{ padding: '12px 8px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>العميل</th>
                  <th style={{ padding: '12px 8px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                    {activeTab === 'tenders' ? 'المراجعة' : activeTab === 'lost' ? 'سعر المنافس' : 'المدير المسؤول'}
                  </th>
                  <th style={{ padding: '12px 6px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                    {activeTab === 'tenders' ? 'القيمة التقديرية' : activeTab === 'lost' ? 'القيمة المدروسة' : 'التعاقد الأصلي'}
                  </th>
                  <th style={{ padding: '12px 6px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>
                    {activeTab === 'active' ? 'القيمة المعدلة' : 'الدفعة المقدمة'}
                  </th>
                  <th style={{ padding: '12px 6px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '12px 4px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>الصحة</th>
                  <th style={{ padding: '12px 6px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#334155', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {displayedProjects.map((prj) => {
                  const isTender = prj.status === 'planning' || prj.status === 'draft' || prj.status === 'submitted' || prj.status === 'negotiation';
                  const isLost = prj.status === 'lost';

                  return (
                    <tr key={prj.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Code */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <button
                          type="button"
                          onClick={() => onSelectProject(prj.id, isTender || isLost ? 'tender' : 'boq')}
                          title={isTender || isLost ? 'فتح دراسة وتسعير العطاء' : 'فتح مقايسة المشروع'}
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#170e5e',
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                          }}
                        >
                          {prj.code}
                        </button>
                      </td>

                      {/* Name & Location */}
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div
                          onClick={() => onSelectProject(prj.id, isTender || isLost ? 'tender' : 'boq')}
                          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer', color: '#170e5e' }}
                          title={prj.name}
                        >
                          {prj.name}
                        </div>
                        {isLost && prj.lossReason ? (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#b91c1c', fontWeight: 600, marginTop: '2px' }}>
                            السبب: {LOSS_REASON_LABELS[prj.lossReason] || prj.lossReason}
                          </div>
                        ) : prj.locationAddress ? (
                          <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }} title={prj.locationAddress}>
                            {prj.locationAddress}
                          </div>
                        ) : null}
                      </td>

                      {/* Client */}
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', verticalAlign: 'middle' }} title={prj.clientName || ''}>
                        {prj.clientName || '—'}
                      </td>

                      {/* Manager / Revision / Competitor */}
                      <td style={{ padding: '8px 8px', fontSize: 'var(--font-body)', color: '#475569', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center', verticalAlign: 'middle' }}>
                        {isTender ? (
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                            Rev-{(prj as any).revisionNumber || 0}
                          </span>
                        ) : isLost ? (
                          <span style={{ color: '#0f172a', fontWeight: 600 }}>
                            {(prj as any).competitorPrice ? formatCurrency(Number((prj as any).competitorPrice)) : 'غير محدد'}
                          </span>
                        ) : (
                          prj.projectManager || '—'
                        )}
                      </td>

                      {/* Value */}
                      <td style={{ padding: '8px 6px', fontSize: '0.8rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {Number(prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </td>

                      {/* Revised / Down payment */}
                      <td style={{ padding: '8px 6px', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', textAlign: 'center', verticalAlign: 'middle' }}>
                        {activeTab === 'active' ? (
                          Number(prj.revisedContractValue || prj.contractValue).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        ) : (
                          Number(prj.downPaymentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {getStatusBadge(prj.status)}
                      </td>

                      {/* Health */}
                      <td style={{ padding: '8px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <ProjectHealthWidget projectId={prj.id} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '6px 4px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', justifyContent: 'center' }}>
                          {isTender ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onSelectProject(prj.id, 'tender')}
                                style={{
                                  width: '88px',
                                  height: '21px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  background: '#170e5e',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                دراسة العطاء
                              </button>
                              <div style={{ display: 'flex', gap: '3px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleCreateRevision(prj)}
                                  title="إنشاء مراجعة تفاوضية جديدة"
                                  style={{
                                    width: '42px',
                                    height: '21px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    background: '#ffffff',
                                    color: '#334155',
                                    border: '1px solid #cbd5e1',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  مراجعة
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAwardModal({ open: true, project: prj })}
                                  title="اعتماد وترسية العطاء كمشروع ساري"
                                  style={{
                                    width: '43px',
                                    height: '21px',
                                    borderRadius: '4px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: '#170e5e',
                                    color: '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: 0,
                                  }}
                                >
                                  ترسية
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => setLostModal({ open: true, project: prj })}
                                style={{
                                  width: '88px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  color: '#64748b',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                أرشفة (لم يُرسَ)
                              </button>
                            </>
                          ) : isLost ? (
                            <>
                              <button
                                type="button"
                                onClick={() => onSelectProject(prj.id, 'tender')}
                                style={{
                                  width: '88px',
                                  height: '21px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  background: '#170e5e',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                }}
                              >
                                استعراض المقايسة
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReviveTender(prj)}
                                style={{
                                  width: '88px',
                                  height: '20px',
                                  borderRadius: '4px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  color: '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  padding: 0,
                                }}
                              >
                                إعادة للتفاوض
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => onSelectProject(prj.id, 'boq')}
                                style={{
                                  width: '74px',
                                  height: '21px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                المقايسة (SOV)
                              </button>
                              <button
                                type="button"
                                onClick={() => onSelectProject(prj.id, 'financials')}
                                style={{
                                  width: '74px',
                                  height: '21px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                المستخلصات
                              </button>
                              <button
                                type="button"
                                onClick={() => setLicensesModal({ open: true, projectId: prj.id, projectName: prj.name })}
                                style={{
                                  width: '74px',
                                  height: '21px',
                                  borderRadius: '4px',
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  background: '#ffffff',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: 0,
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                تراخيص
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Government Licenses Modal */}
      {licensesModal.open && (
        <GovernmentLicensesModal
          open={licensesModal.open}
          projectId={licensesModal.projectId}
          projectName={licensesModal.projectName}
          onClose={() => setLicensesModal({ open: false, projectId: '', projectName: '' })}
        />
      )}

      {/* Tender Estimator Modal */}
      {isTenderEstimatorOpen && (
        <TenderEstimatorModal
          isOpen={isTenderEstimatorOpen}
          onClose={() => setIsTenderEstimatorOpen(false)}
        />
      )}

      {/* Mark Tender Lost Modal */}
      {lostModal.open && lostModal.project && (
        <MarkTenderLostModal
          open={lostModal.open}
          projectId={lostModal.project.id}
          projectCode={lostModal.project.code}
          projectName={lostModal.project.name}
          onClose={() => setLostModal({ open: false, project: null })}
          onSuccess={async () => {
            if (onRefresh) await onRefresh();
          }}
        />
      )}

      {/* Award Tender Modal */}
      {awardModal.open && awardModal.project && (
        <AwardTenderModal
          open={awardModal.open}
          projectId={awardModal.project.id}
          projectCode={awardModal.project.code}
          projectName={awardModal.project.name}
          clientName={awardModal.project.clientName}
          contractValue={Number(awardModal.project.contractValue || 0)}
          initialDownPayment={Number(awardModal.project.downPaymentAmount || 0)}
          initialRetentionPercent={Number(awardModal.project.retentionPercent || 5)}
          onClose={() => setAwardModal({ open: false, project: null })}
          onSuccess={async () => {
            if (onRefresh) await onRefresh();
            setActiveTab('active');
          }}
        />
      )}
    </div>
  );
}
