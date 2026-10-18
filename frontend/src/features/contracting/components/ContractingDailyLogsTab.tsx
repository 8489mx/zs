import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { ContractingSiteDailyLog } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { LaborAttendanceModal } from './LaborAttendanceModal';
import { PettyCashModal } from './PettyCashModal';
import { getTextDirection } from '@/lib/arabic-normalization';

interface ContractingDailyLogsTabProps {
  dailyLogs: ContractingSiteDailyLog[];
  loading: boolean;
  projectId?: string;
  projectName?: string;
  onNewLog: () => void;
}

export function ContractingDailyLogsTab({
  dailyLogs,
  loading,
  projectId,
  projectName,
  onNewLog,
}: ContractingDailyLogsTabProps) {
  const { t } = useTranslation();
  const [isLaborAttendanceOpen, setIsLaborAttendanceOpen] = useState(false);
  const [isPettyCashOpen, setIsPettyCashOpen] = useState(false);
  const totalLaborToday = dailyLogs.length > 0
    ? Number(dailyLogs[0].laborCount || 0) + Number(dailyLogs[0].subcontractorLaborCount || 0)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          width: '100%',
        }}
      >
        <div style={{ minWidth: '280px', flex: '1 1 auto' }}>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {t('contracting.contracting_daily_logs_tab.s0', "يوميات وتقارير الموقع الميدانية (Site Daily Diary Logs)")}
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : t('contracting.contracting_daily_logs_tab.s1', "توثيق العمالة الميدانية، المعدات، التوريدات، والإنجاز اليومي للأعمال")}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* يوميات العمالة الميدانية */}
          <button
            type="button"
            onClick={() => setIsLaborAttendanceOpen(true)}
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
            <AppIcons.Users size={15} />
            <span>{t('contracting.contracting_daily_logs_tab.s2', "يوميات وتوزيع العمالة (Labor Shifts)")}</span>
          </button>

          {/* العهد النقدية للموقع */}
          <button
            type="button"
            onClick={() => setIsPettyCashOpen(true)}
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
            <AppIcons.DollarSign size={15} />
            <span>{t('contracting.contracting_daily_logs_tab.s3', "العهد النقدية للموقع (Petty Cash)")}</span>
          </button>

          {/* تسجيل يومية موقع */}
          <button
            type="button"
            onClick={onNewLog}
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
            <span>{t('contracting.contracting_daily_logs_tab.s4', "تسجيل يومية موقع جديدة")}</span>
          </button>
        </div>
      </div>

      {/* بطاقات المؤشرات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>{t('contracting.contracting_daily_logs_tab.s5', "إجمالي التقارير الموثقة")}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {dailyLogs.length} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>{t('contracting.contracting_daily_logs_tab.s6', "يومية")}</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>{t('contracting.contracting_daily_logs_tab.s7', "عمالة الموقع في آخر تقرير")}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
            {totalLaborToday} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>{t('contracting.contracting_daily_logs_tab.s8', "عامل وفني")}</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>{t('contracting.contracting_daily_logs_tab.s9', "تاريخ آخر يومية مسجلة")}</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {dailyLogs.length > 0 ? dailyLogs[0].logDate : t('contracting.contracting_daily_logs_tab.s10', "لا يوجد")}
          </div>
        </div>
      </div>

      {/* بطاقات اليوميات أو الجدول */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            {t('contracting.contracting_daily_logs_tab.s11', "جاري تحميل يوميات الموقع...")}
          </div>
        ) : dailyLogs.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.Calendar size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              {t('contracting.contracting_daily_logs_tab.s12', "لا توجد يوميات موقع مسجلة حتى الآن")}
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              {t('contracting.contracting_daily_logs_tab.s13', "وثق حضور العمالة والمعدات والأعمال المنجزة يومياً لحفظ السجل التاريخي وإثبات تقدم العمل.")}
            </div>
            <button
              type="button"
              onClick={onNewLog}
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
              {t('contracting.contracting_daily_logs_tab.s14', "تسجيل أول يومية موقع")}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {dailyLogs.map((log) => {
              const totalWorkers = Number(log.laborCount || 0) + Number(log.subcontractorLaborCount || 0);
              return (
                <div key={log.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                  {/* رأس اليومية */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: 'var(--font-body)', fontWeight: 800, color: '#1e293b' }}>
                        {log.logDate}
                      </span>
                      {log.weatherConditions && (
                        <span style={{ fontSize: 'var(--font-micro)', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '2px 8px', borderRadius: '4px', color: '#475569' }}>
                          {log.weatherConditions}
                        </span>
                      )}
                      {log.loggedBy && (
                        <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>
                          {t('contracting.contracting_daily_logs_tab.s15', "بواسطة:")} {log.loggedBy}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '6px' }}>
                        {t('contracting.contracting_daily_logs_tab.s16', "عمالة الشركة:")} {log.laborCount}
                      </span>
                      <span style={{ fontSize: 'var(--font-micro)', fontWeight: 600, background: '#f0fdf4', color: '#15803d', padding: '3px 8px', borderRadius: '6px' }}>
                        {t('contracting.contracting_daily_logs_tab.s17', "مقاولو الباطن:")} {log.subcontractorLaborCount}
                      </span>
                      <span style={{ fontSize: 'var(--font-micro)', fontWeight: 700, background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '6px' }}>
                        {t('contracting.contracting_daily_logs_tab.s18', "الإجمالي:")} {totalWorkers}
                      </span>
                    </div>
                  </div>

                  {/* الأعمال المنفذة */}
                  {(() => {
                    const dir = getTextDirection(log.workPerformed);
                    const isRtl = dir === 'rtl';
                    return (
                      <div
                        dir={dir}
                        className="text-justify spec-description"
                        style={{
                          fontSize: 'var(--font-body)',
                          color: '#0f172a',
                          lineHeight: 1.55,
                          marginBottom: '8px',
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: isRtl ? 'right' : 'left',
                          wordBreak: 'break-word',
                          direction: dir,
                        }}
                      >
                        <strong>{t('contracting.contracting_daily_logs_tab.s19', "الأعمال المنفذة:")}</strong> {log.workPerformed}
                      </div>
                    );
                  })()}

                  {/* تفاصيل إضافية: معدات، مواد، معوقات */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', fontSize: 'var(--font-micro)', color: '#475569', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ color: '#1e293b' }}>{t('contracting.contracting_daily_logs_tab.s20', "المعدات بالموقع:")}</strong> {log.equipmentOnSite || t('contracting.contracting_daily_logs_tab.s21', "لا يوجد")}
                    </div>
                    <div>
                      <strong style={{ color: '#1e293b' }}>{t('contracting.contracting_daily_logs_tab.s22', "المواد المستلمة:")}</strong> {log.materialsReceived || t('contracting.contracting_daily_logs_tab.s23', "لا يوجد")}
                    </div>
                    <div>
                      <strong style={{ color: log.delaysOrObstacles ? '#b91c1c' : '#1e293b' }}>{t('contracting.contracting_daily_logs_tab.s24', "المعوقات:")}</strong> {log.delaysOrObstacles || t('contracting.contracting_daily_logs_tab.s25', "لا توجد")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* مودال يوميات وتوزيع العمالة */}
      {isLaborAttendanceOpen && (
        <LaborAttendanceModal
          isOpen={isLaborAttendanceOpen}
          onClose={() => setIsLaborAttendanceOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}

      {/* مودال العهد النقدية للموقع */}
      {isPettyCashOpen && (
        <PettyCashModal
          isOpen={isPettyCashOpen}
          onClose={() => setIsPettyCashOpen(false)}
          projectId={projectId}
          projectName={projectName}
        />
      )}
    </div>
  );
}
