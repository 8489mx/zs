import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { fallbackText, statusLabel, normalizeText, money } from '@/features/hr/utils/employee-profile.helpers';
import type { HrEmployee } from '@/types/domain';

interface EmployeeOverviewTabProps {
  employee?: HrEmployee;
  primaryPhone: string;
  canManageEmployees: boolean;
  canViewLoans: boolean;
  onOpenPinModal: () => void;
  reviewAlerts: string[];
  documentsCount: number;
  expiredOrNearDocumentsCount: number;
  openAssetsCount: number;
  pendingLeavesCount: number;
  unpaidLeavesCount: number;
  openLoansCount: number;
  openLoansRemaining: number;
  completenessText: string;
  onNavigateSection: (section: any) => void;
}

export function EmployeeOverviewTab({
  employee,
  primaryPhone,
  canManageEmployees,
  canViewLoans,
  onOpenPinModal,
  reviewAlerts,
  documentsCount,
  expiredOrNearDocumentsCount,
  openAssetsCount,
  pendingLeavesCount,
  unpaidLeavesCount,
  openLoansCount,
  openLoansRemaining,
  completenessText,
  onNavigateSection,
}: EmployeeOverviewTabProps) {
  const { t } = useTranslation();
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '12px', alignItems: 'stretch', marginBottom: '14px' }}>
        {/* Right Card: Quick Summary */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <strong style={{ fontSize: '0.85rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{t('hr.employee_profile.employee_overview_tab.s0', "ملخص الموظف والتشغيل")}</strong>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', flex: 1 }}>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s1', "كود الموظف")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.employeeNo)}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s2', "الحالة")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{statusLabel(employee?.status)}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s3', "القسم")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.departmentName)}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s4', "المسمى الوظيفي")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.jobTitleName)}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s5', "نوع الأجر")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{normalizeText(employee?.compensationType) === 'hourly' ? t('hr.employee_profile.employee_overview_tab.s6', "أجر بالساعة") : t('hr.employee_profile.employee_overview_tab.s7', "راتب شهري")}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s8', "الموبايل الأساسي")}</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{primaryPhone}</strong>
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 10px', gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s9', "رمز الدخول السريع (PIN) للبوابة والبصمة")}</span>
                  <strong style={{ fontSize: '0.85rem', color: '#0f172a', fontFamily: 'monospace', letterSpacing: '1px' }}>
                    {employee?.hasPinCode ? t('hr.employee_profile.employee_overview_tab.s10', "تم تعيينه") : t('hr.employee_profile.employee_overview_tab.s11', "غير محدد حتى الآن")}
                  </strong>
                </div>
                {canManageEmployees && (
                  <Button
                    variant="secondary"
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={onOpenPinModal}
                  >
                    {t('hr.employee_profile.employee_overview_tab.s12', "تعديل الـ PIN")}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Left Card: Review Alerts */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <strong style={{ fontSize: '0.85rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px' }}>{t('hr.employee_profile.employee_overview_tab.s13', "تنبيهات المراجعة والمتابعة")}</strong>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: reviewAlerts.length ? 'flex-start' : 'center' }}>
            {reviewAlerts.length ? (
              reviewAlerts.map((alert) => (
                <div key={alert} style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', padding: '6px 10px', fontSize: '0.8rem', color: '#92400e', fontWeight: 600 }}>
                  {alert}
                </div>
              ))
            ) : (
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
                {t('hr.employee_profile.employee_overview_tab.s14', "جميع البيانات الأساسية مستوفاة ولا توجد تنبيهات عاجلة")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compact Single-Row KPI Operational Summary Bar */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>{t('hr.employee_profile.employee_overview_tab.s15', "ملخص العمليات والتشغيل")}</span>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{t('hr.employee_profile.employee_overview_tab.s16', "اضغط على أي مؤشر للانتقال للقسم الخاص به")}</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gap: '8px' }}>
          {[
            { label: t('hr.employee_profile.employee_overview_tab.s17', "مستندات"), value: documentsCount, onClick: () => onNavigateSection('documents'), isAlert: false },
            { label: t('hr.employee_profile.employee_overview_tab.s18', "قريبة الانتهاء"), value: expiredOrNearDocumentsCount, onClick: () => onNavigateSection('documents'), isAlert: expiredOrNearDocumentsCount > 0 },
            { label: t('hr.employee_profile.employee_overview_tab.s19', "عُهد مفتوحة"), value: openAssetsCount, onClick: () => onNavigateSection('assets'), isAlert: false },
            { label: t('hr.employee_profile.employee_overview_tab.s20', "إجازات للمراجعة"), value: pendingLeavesCount, onClick: () => onNavigateSection('leaves'), isAlert: pendingLeavesCount > 0 },
            { label: t('hr.employee_profile.employee_overview_tab.s21', "إجازات غير مدفوعة"), value: unpaidLeavesCount, onClick: () => onNavigateSection('leaves'), isAlert: false },
            { label: t('hr.employee_profile.employee_overview_tab.s22', "سلف مفتوحة"), value: openLoansCount, onClick: () => onNavigateSection('payroll'), isAlert: false },
            { label: t('hr.employee_profile.employee_overview_tab.s23', "متبقي سلف"), value: canViewLoans ? money(openLoansRemaining) : '—', onClick: () => onNavigateSection('payroll'), isAlert: false },
            { label: t('hr.employee_profile.employee_overview_tab.s24', "اكتمال الملف"), value: completenessText, onClick: () => onNavigateSection('details'), isAlert: false },
          ].map((stat, idx) => (
            <div
              key={idx}
              onClick={stat.onClick}
              style={{
                background: '#ffffff',
                border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '6px',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                minWidth: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#94a3b8')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.isAlert ? '#fca5a5' : '#e2e8f0')}
            >
              <span style={{ fontSize: '0.725rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                {stat.label}
              </span>
              <strong style={{ fontSize: '1.05rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
