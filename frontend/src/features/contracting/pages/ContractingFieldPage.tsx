import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useContracting } from '../context/ContractingContext';
import { contractingApi } from '../api/contracting.api';
import { toast } from '@/shared/components/system-alert';
import type {
  ContractingSiteDailyLog,
  ContractingRfi,
} from '../contracting.types';
import { ContractingDailyLogsTab } from '../components/ContractingDailyLogsTab';
import { ContractingRfiTab } from '../components/ContractingRfiTab';
import { CreateDailyLogModal } from '../components/CreateDailyLogModal';
import { CreateRfiModal } from '../components/CreateRfiModal';
import { AnswerRfiModal } from '../components/AnswerRfiModal';
import { WorkInspectionModal } from '../components/WorkInspectionModal';
import { EquipmentTrackingModal } from '../components/EquipmentTrackingModal';
import { EquipmentFuelLogsModal } from '../components/EquipmentFuelLogsModal';
import { LaborAttendanceModal } from '../components/LaborAttendanceModal';
import { PettyCashModal } from '../components/PettyCashModal';
import { DocumentRegisterModal } from '../components/DocumentRegisterModal';
import { MeetingMinutesModal } from '../components/MeetingMinutesModal';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingFieldPageProps {
  initialSubTab?: 'daily-logs' | 'rfis';
}

export function ContractingFieldPage({ initialSubTab }: ContractingFieldPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subParam = (searchParams.get('sub') as 'daily-logs' | 'rfis') || initialSubTab || 'daily-logs';
  const [activeSubTab, setActiveSubTab] = useState<'daily-logs' | 'rfis'>(subParam === 'rfis' ? 'rfis' : 'daily-logs');

  const { projects, selectedProjectId, setSelectedProjectId, activeProject, setIsCreateProjectOpen } = useContracting();

  useEffect(() => {
    if (initialSubTab && initialSubTab !== activeSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Daily logs state
  const [dailyLogs, setDailyLogs] = useState<ContractingSiteDailyLog[]>([]);
  const [dailyLogsLoading, setDailyLogsLoading] = useState(false);
  const [isCreateDailyLogOpen, setIsCreateDailyLogOpen] = useState(false);

  // RFIs state
  const [rfis, setRfis] = useState<ContractingRfi[]>([]);
  const [rfisLoading, setRfisLoading] = useState(false);
  const [isCreateRfiOpen, setIsCreateRfiOpen] = useState(false);
  const [selectedRfiForAnswer, setSelectedRfiForAnswer] = useState<ContractingRfi | null>(null);

  // Field Tools Modals
  const [isWirModalOpen, setIsWirModalOpen] = useState(false);
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [isFuelLogsModalOpen, setIsFuelLogsModalOpen] = useState(false);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [isPettyCashModalOpen, setIsPettyCashModalOpen] = useState(false);
  const [isDocumentRegisterOpen, setIsDocumentRegisterOpen] = useState(false);
  const [isMeetingMinutesOpen, setIsMeetingMinutesOpen] = useState(false);

  const handleSubTabChange = (tab: 'daily-logs' | 'rfis') => {
    setActiveSubTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('sub', tab);
    setSearchParams(newParams, { replace: true });
  };

  const effectiveProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : '');
  const effectiveProject = activeProject || (projects.length > 0 ? (projects.find((p) => p.id === effectiveProjectId) || projects[0]) : null);

  const loadDailyLogs = useCallback(async () => {
    if (!effectiveProjectId) {
      setDailyLogs([]);
      return;
    }
    try {
      setDailyLogsLoading(true);
      const data = await contractingApi.getDailyLogs(effectiveProjectId);
      setDailyLogs(data);
    } catch (err) {
      console.error('Failed to load daily logs:', err);
    } finally {
      setDailyLogsLoading(false);
    }
  }, [effectiveProjectId]);

  const loadRfis = useCallback(async () => {
    if (!effectiveProjectId) {
      setRfis([]);
      return;
    }
    try {
      setRfisLoading(true);
      const data = await contractingApi.getRfiList(effectiveProjectId);
      setRfis(data);
    } catch (err) {
      console.error('Failed to load RFIs:', err);
    } finally {
      setRfisLoading(false);
    }
  }, [effectiveProjectId]);

  useEffect(() => {
    if (activeSubTab === 'daily-logs') {
      loadDailyLogs();
    } else {
      loadRfis();
    }
  }, [activeSubTab, loadDailyLogs, loadRfis]);

  const handleOpenNewLog = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لتسجيل يومية موقع.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateDailyLogOpen(true);
  };

  const handleOpenNewRfi = () => {
    if (projects.length === 0) {
      toast.warning('يرجى تأسيس مشروع إنشائي وعقد مقاولة أولاً لإرسال استفسار فني.');
      setIsCreateProjectOpen(true);
      return;
    }
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
    setIsCreateRfiOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }} dir="rtl">
      {/* شريط التبديل الفرعي وأدوات الجودة والميدان */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '6px',
            background: '#f1f5f9',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={() => handleSubTabChange('daily-logs')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: 'var(--font-body)',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'daily-logs' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'daily-logs' ? '#170e5e' : '#64748b',
              boxShadow: activeSubTab === 'daily-logs' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            يوميات الموقع وتقارير التنفيذ
          </button>

          <button
            type="button"
            onClick={() => handleSubTabChange('rfis')}
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              fontSize: 'var(--font-body)',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: activeSubTab === 'rfis' ? '#ffffff' : 'transparent',
              color: activeSubTab === 'rfis' ? '#170e5e' : '#64748b',
              boxShadow: activeSubTab === 'rfis' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            الاستفسارات الهندسية (RFI)
          </button>
        </div>

        {/* أزرار ضبط الجودة والوقود والعمالة والمعدات بالموقع */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsWirModalOpen(true)}
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
            <AppIcons.CheckCircle size={15} />
            <span>استلام الأعمال (WIR)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDocumentRegisterOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.FileText size={15} />
            <span>سجل المخططات والمستندات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsMeetingMinutesOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.Users size={15} />
            <span>محاضر الاجتماعات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsLaborModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.Users size={15} />
            <span>حضور العمالة</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPettyCashModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.DollarSign size={15} />
            <span>العهدة النقدية</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFuelLogsModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.Truck size={15} />
            <span>سجل الوقود والمعدات</span>
          </button>

          <button
            type="button"
            onClick={() => setIsEquipmentModalOpen(true)}
            style={{
              height: '36px',
              padding: '0 12px',
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
            <AppIcons.Tool size={15} />
            <span>تتبع المعدات</span>
          </button>
        </div>
      </div>

      {/* محتوى التبويب النشط */}
      {activeSubTab === 'daily-logs' && (
        <>
          <ContractingDailyLogsTab
            dailyLogs={dailyLogs}
            loading={dailyLogsLoading}
            projectId={effectiveProjectId || undefined}
            projectName={effectiveProject?.name}
            onNewLog={handleOpenNewLog}
          />

          {effectiveProjectId && (
            <CreateDailyLogModal
              open={isCreateDailyLogOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              onClose={() => setIsCreateDailyLogOpen(false)}
              onCreated={loadDailyLogs}
            />
          )}
        </>
      )}

      {activeSubTab === 'rfis' && (
        <>
          <ContractingRfiTab
            rfis={rfis}
            loading={rfisLoading}
            projectName={effectiveProject?.name}
            onNewRfi={handleOpenNewRfi}
            onAnswerRfi={(rfi) => setSelectedRfiForAnswer(rfi)}
          />

          {effectiveProjectId && (
            <CreateRfiModal
              open={isCreateRfiOpen}
              projectId={effectiveProjectId}
              projectName={effectiveProject?.name}
              onClose={() => setIsCreateRfiOpen(false)}
              onCreated={loadRfis}
            />
          )}

          {selectedRfiForAnswer && (
            <AnswerRfiModal
              open={Boolean(selectedRfiForAnswer)}
              rfi={selectedRfiForAnswer}
              onClose={() => setSelectedRfiForAnswer(null)}
              onAnswered={loadRfis}
            />
          )}
        </>
      )}

      {/* مودال سجل استهلاك الوقود وساعات تشغيل المعدات */}
      {isFuelLogsModalOpen && effectiveProjectId && (
        <EquipmentFuelLogsModal
          open={isFuelLogsModalOpen}
          onClose={() => setIsFuelLogsModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال طلبات استلام الأعمال وضبط الجودة (WIR) */}
      {isWirModalOpen && effectiveProjectId && (
        <WorkInspectionModal
          open={isWirModalOpen}
          onClose={() => setIsWirModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال سجل المخططات والمستندات ومراجعاتها */}
      {isDocumentRegisterOpen && effectiveProjectId && (
        <DocumentRegisterModal
          open={isDocumentRegisterOpen}
          onClose={() => setIsDocumentRegisterOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال محاضر الاجتماعات وبنود المتابعة */}
      {isMeetingMinutesOpen && effectiveProjectId && (
        <MeetingMinutesModal
          open={isMeetingMinutesOpen}
          onClose={() => setIsMeetingMinutesOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال تتبع المعدات والآليات الميدانية */}
      {isEquipmentModalOpen && (
        <EquipmentTrackingModal
          open={isEquipmentModalOpen}
          onClose={() => setIsEquipmentModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}

      {/* مودال حضور وسجلات عمالة الموقع */}
      {isLaborModalOpen && (
        <LaborAttendanceModal
          isOpen={isLaborModalOpen}
          onClose={() => setIsLaborModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
          boqItems={[]}
        />
      )}

      {/* مودال العهد النقدية للموقع والمصاريف النثرية */}
      {isPettyCashModalOpen && (
        <PettyCashModal
          isOpen={isPettyCashModalOpen}
          onClose={() => setIsPettyCashModalOpen(false)}
          projectId={effectiveProjectId}
          projectName={effectiveProject?.name}
        />
      )}
    </div>
  );
}
