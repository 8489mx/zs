import { useState, useEffect, useCallback } from 'react';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { SnagListModal } from '../components/SnagListModal';
import { ProjectHandoverModal } from '../components/ProjectHandoverModal';
import { BoqProfitabilityModal } from '../components/BoqProfitabilityModal';
import { RetentionLedgerModal } from '../components/RetentionLedgerModal';
import type { ContractingProjectHandover, ContractingSnagItem } from '../contracting.types';

export function ContractingCloseoutPage() {
  const { projects, selectedProjectId, activeProject, reloadProjects } = useContracting();

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  // Modals state
  const [isSnagModalOpen, setIsSnagModalOpen] = useState(false);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [isProfitabilityModalOpen, setIsProfitabilityModalOpen] = useState(false);
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Closeout statistics
  const [handovers, setHandovers] = useState<ContractingProjectHandover[]>([]);
  const [snags, setSnags] = useState<ContractingSnagItem[]>([]);
  const [, setLoading] = useState(false);

  const loadCloseoutData = useCallback(async () => {
    if (!effectiveProjectId) return;
    try {
      setLoading(true);
      const [handoversData, snagsData] = await Promise.all([
        contractingApi.getProjectHandovers(effectiveProjectId).catch(() => []),
        contractingApi.getSnagItems(effectiveProjectId).catch(() => []),
      ]);
      setHandovers(handoversData);
      setSnags(snagsData);
    } catch (err) {
      console.error('Failed to load closeout data:', err);
    } finally {
      setLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    loadCloseoutData();
  }, [loadCloseoutData]);

  const openSnags = snags.filter((s) => s.status !== 'verified_closed');
  const closedSnags = snags.filter((s) => s.status === 'verified_closed');
  const hasPreliminaryHandover = handovers.some((h) => h.handoverType === 'preliminary');
  const hasFinalHandover = handovers.some((h) => h.handoverType === 'final');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* هيدر الصفحة وأزرار الإجراءات */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            المرحلة 7: التسليم الفني وإغلاق المشروع (Snag List, Handover & Closeout)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            إدارة جولات الفحص والملاحظات المشتركة، محاضر الاستلام الابتدائي والنهائي، والإفراج عن ضمان حسن التنفيذ
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsSnagModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.FileCheck size={15} />
            <span>قائمة الملاحظات (Snag List)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHandoverModalOpen(true)}
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
              fontSize: 'var(--font-body)',
              boxShadow: '0 1px 3px rgba(23, 14, 94, 0.15)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.CheckCircle size={15} />
            <span>محاضر الاستلام والتسليم</span>
          </button>

          <button
            type="button"
            onClick={() => setIsProfitabilityModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.Layers size={15} />
            <span>تحليل الأرباح الختامي</span>
          </button>

          <button
            type="button"
            onClick={() => setIsRetentionModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
          >
            <AppIcons.CheckShield size={15} />
            <span>سجل ضمان حسن التنفيذ</span>
          </button>
        </div>
      </div>

      {/* بطاقات المؤشرات الإغلاقية السريعة متناسقة مع خطوات دورة التسليم */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {/* الخطوة 1: فحص العيوب والملاحظات */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>قائمة العيوب (Snag List)</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: openSnags.length > 0 ? '#b91c1c' : '#15803d' }}>
              {openSnags.length} مفتوحة / {closedSnags.length} مغلقة
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: openSnags.length > 0 ? '#fee2e2' : '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: openSnags.length > 0 ? '#b91c1c' : '#15803d' }}>
            <AppIcons.FileCheck size={22} />
          </div>
        </div>

        {/* الخطوة 2: الاستلام الابتدائي */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>حالة الاستلام الابتدائي</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: hasPreliminaryHandover ? '#15803d' : '#a16207' }}>
              {hasPreliminaryHandover ? 'تم الاستلام رسمياً' : 'قيد الفحص والتجهيز'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: hasPreliminaryHandover ? '#dcfce7' : '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: hasPreliminaryHandover ? '#15803d' : '#a16207' }}>
            <AppIcons.CheckCircle size={22} />
          </div>
        </div>

        {/* الخطوة 3: الاستلام النهائي والضمان */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>حالة الاستلام النهائي</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: hasFinalHandover ? '#15803d' : '#64748b' }}>
              {hasFinalHandover ? 'مسلّم نهائياً' : 'فترة الضمان والصيانة سارية'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
            <AppIcons.CheckShield size={22} />
          </div>
        </div>

        {/* الخطوة 4: ضمان حسن التنفيذ وتصفية الأرباح */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#64748b' }}>ضمان حسن التنفيذ المحتجز</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '4px', color: '#170e5e' }}>
              {effectiveProject ? Number((effectiveProject as any).totalRetentionHeld || 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3730a3' }}>
            <AppIcons.Receipt size={22} />
          </div>
        </div>
      </div>

      {/* خريطة خطوات التسليم والإغلاق القياسية (Global Handover Journey) */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#0f172a', margin: '0 0 14px' }}>
          مسار إجراءات التسليم والإغلاق المعتمدة طبقاً لمواصفات الفيديك (FIDIC Handover Protocol)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                1
              </span>
              <strong style={{ fontSize: 'var(--font-table-head)', color: '#0f172a' }}>جولة فحص العيوب (Snags)</strong>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.5 }}>
              إجراء الجولة الميدانية المشتركة مع الاستشاري لتسجيل أي ملاحظات تشطيب أو عيوب وتعيين المسؤول عن إصلاحها.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                2
              </span>
              <strong style={{ fontSize: 'var(--font-table-head)', color: '#0f172a' }}>محضر الاستلام الابتدائي</strong>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.5 }}>
              تحرير محضر التسليم الابتدائي الرسمي، بدء سريان فترة الضمان والصيانة التعاقدية، واستحقاق الإفراج عن 50% من الضمان المحتجز.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                3
              </span>
              <strong style={{ fontSize: 'var(--font-table-head)', color: '#0f172a' }}>المستخلص الختامي وتصفية الأرباح</strong>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.5 }}>
              تثبيت الكميات المنفذة الفعلية، إصدار المستخلص الختامي، وتسوية حسابات مقاولي الباطن والموردين لحساب صافي الأرباح النهائي.
            </p>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#170e5e', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>
                4
              </span>
              <strong style={{ fontSize: 'var(--font-table-head)', color: '#0f172a' }}>الاستلام النهائي والإفراج الكامل</strong>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--font-micro)', color: '#64748b', lineHeight: 1.5 }}>
              بعد انقضاء فترة الصيانة (سنة عادةً): تحرير محضر الاستلام النهائي والإفراج عن النصف المتبقي من ضمان حسن التنفيذ وإغلاق المشروع.
            </p>
          </div>
        </div>
      </div>

      {/* النوافذ المنبثقة التابعة للمرحلة السابعة */}
      {effectiveProject && (
        <>
          <SnagListModal
            open={isSnagModalOpen}
            onClose={() => {
              setIsSnagModalOpen(false);
              loadCloseoutData();
            }}
            projectId={effectiveProjectId}
            projectName={effectiveProject.name}
          />

          <ProjectHandoverModal
            open={isHandoverModalOpen}
            onClose={() => {
              setIsHandoverModalOpen(false);
              loadCloseoutData();
              reloadProjects();
            }}
            project={effectiveProject}
            onRefreshProject={() => {
              loadCloseoutData();
              reloadProjects();
            }}
          />

          <BoqProfitabilityModal
            isOpen={isProfitabilityModalOpen}
            onClose={() => setIsProfitabilityModalOpen(false)}
            projectId={effectiveProjectId}
            projectName={effectiveProject.name}
          />

          <RetentionLedgerModal
            isOpen={isRetentionModalOpen}
            onClose={() => setIsRetentionModalOpen(false)}
            projectId={effectiveProjectId}
            projectName={effectiveProject.name}
          />
        </>
      )}
    </div>
  );
}
