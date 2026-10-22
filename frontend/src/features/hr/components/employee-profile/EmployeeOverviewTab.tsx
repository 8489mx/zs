import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/button';
import { fallbackText, normalizeText, money } from '@/features/hr/utils/employee-profile.helpers';
import type { HrEmployee } from '@/types/domain';
import type { ProfileSection } from './employee-profile-page.helpers';
import {
  ClockIcon,
  DollarSignIcon,
  CreditCardIcon,
  CalendarIcon,
  PackageIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BriefcaseIcon,
  UsersIcon,
} from '@/shared/components/icons/AppIcons';

interface EmployeeOverviewTabProps {
  employee?: HrEmployee;
  primaryPhone: string;
  canManageEmployees: boolean;
  canViewLoans: boolean;
  canViewSalary: boolean;
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
  onNavigateSection: (section: ProfileSection) => void;
}

export function EmployeeOverviewTab({
  employee,
  primaryPhone,
  canManageEmployees,
  canViewLoans,
  canViewSalary,
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

  const annualBalance = Number(employee?.annualLeaveBalance || 21);
  const usedLeaves = Number(employee?.usedAnnualLeaves || 0);
  const remainingLeaves = Math.max(0, annualBalance - usedLeaves);

  const quickLaunchpad = [
    {
      title: 'الحضور والانصراف',
      subtitle: 'ساعات العمل وسجل البصمات',
      icon: ClockIcon,
      iconBg: '#eef2ff',
      iconColor: '#170e5e',
      section: 'attendance' as ProfileSection,
      badgeText: employee?.expectedDailyHours ? `${employee.expectedDailyHours} س/يوم` : undefined,
    },
    {
      title: 'المرتبات والبدلات',
      subtitle: canViewSalary && employee?.baseSalary ? `${money(employee.baseSalary)}` : 'المسير والبدلات المعتمدة',
      icon: DollarSignIcon,
      iconBg: '#f0fdf4',
      iconColor: '#15803d',
      section: 'payroll' as ProfileSection,
      badgeText: normalizeText(employee?.compensationType) === 'hourly' ? 'بالساعة' : 'شهري',
    },
    {
      title: 'السلف والمديونيات',
      subtitle: canViewLoans && openLoansRemaining > 0 ? `متبقي: ${money(openLoansRemaining)}` : 'سداد وأقساط السلف',
      icon: CreditCardIcon,
      iconBg: '#ffedd5',
      iconColor: '#c2410c',
      section: 'loans' as ProfileSection,
      badgeText: openLoansCount > 0 ? `${openLoansCount} سلفة` : undefined,
      badgeAlert: openLoansRemaining > 0,
    },
    {
      title: 'الإجازات والأذونات',
      subtitle: `رصيد متبقي: ${remainingLeaves} يوم`,
      icon: CalendarIcon,
      iconBg: '#fef3c7',
      iconColor: '#b45309',
      section: 'leaves' as ProfileSection,
      badgeText: pendingLeavesCount > 0 ? `${pendingLeavesCount} معلق` : undefined,
      badgeAlert: pendingLeavesCount > 0,
    },
    {
      title: 'العُهد والأصول',
      subtitle: openAssetsCount > 0 ? `${openAssetsCount} عهدة بالاستلام` : 'الأجهزة والمعدات',
      icon: PackageIcon,
      iconBg: '#f1f5f9',
      iconColor: '#334155',
      section: 'assets' as ProfileSection,
      badgeText: openAssetsCount > 0 ? `${openAssetsCount}` : undefined,
    },
    {
      title: 'المستندات والوثائق',
      subtitle: expiredOrNearDocumentsCount > 0 ? `${expiredOrNearDocumentsCount} تحتاج تجديد` : `${documentsCount} مستند مسجل`,
      icon: FileTextIcon,
      iconBg: '#ede9fe',
      iconColor: '#6d28d9',
      section: 'documents' as ProfileSection,
      badgeText: expiredOrNearDocumentsCount > 0 ? 'تنبيه' : undefined,
      badgeAlert: expiredOrNearDocumentsCount > 0,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 1. Quick HR Launchpad (منصة العمليات والإجراءات السريعة للموظف) */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
              منصة العمليات والإجراءات السريعة
            </strong>
            <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
              انتقل مباشرة إلى سجلات الموظف وأقسام التشغيل بنقرة واحدة
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#170e5e', background: '#f8fafc', padding: '4px 10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            اكتمال الملف: {completenessText}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
          {quickLaunchpad.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigateSection(item.section)}
                style={{
                  background: '#ffffff',
                  border: `1px solid ${item.badgeAlert ? '#fca5a5' : '#e2e8f0'}`,
                  borderRadius: '10px',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                  transition: 'border-color 0.15s ease, transform 0.1s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#170e5e';
                  e.currentTarget.style.boxShadow = '0 2px 6px rgba(23, 14, 94, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = item.badgeAlert ? '#fca5a5' : '#e2e8f0';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.02)';
                }}
              >
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: item.iconBg,
                  color: item.iconColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon size={20} color={item.iconColor} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </span>
                    {item.badgeText ? (
                      <span style={{
                        fontSize: '0.68rem',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        backgroundColor: item.badgeAlert ? '#fee2e2' : '#f1f5f9',
                        color: item.badgeAlert ? '#b91c1c' : '#334155',
                        flexShrink: 0,
                      }}>
                        {item.badgeText}
                      </span>
                    ) : null}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                    {item.subtitle}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Balanced 2-Column Symmetrical Operational Info Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px', alignItems: 'stretch' }}>
        {/* Right Card: بيانات التشغيل وجدول الدوام التعاقدي */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                بيانات التشغيل والدوام التعاقدي
              </strong>
            </div>
            <Button
              variant="secondary"
              onClick={() => onNavigateSection('details')}
              style={{ fontSize: '0.75rem', padding: '2px 8px' }}
            >
              عرض التفاصيل
            </Button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', flex: 1 }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>تاريخ التعيين</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.hireDate)}</strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>الفرع والموقع</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.branchName || employee?.locationName)}</strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>ساعات العمل اليومية</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                {employee?.expectedDailyHours ? `${employee.expectedDailyHours} ساعات` : 'غير محدد'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>فترة السماح للتأخير</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                {employee?.graceMinutes != null ? `${employee.graceMinutes} دقيقة` : 'غير محدد'}
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>موعد الحضور المقرر</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.scheduledCheckInTime)}</strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>موعد الانصراف المقرر</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>{fallbackText(employee?.scheduledCheckOutTime)}</strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>رصيد الإجازات السنوية</span>
              <strong style={{ fontSize: '0.825rem', color: '#15803d' }}>
                {remainingLeaves} يوم متبقي <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 500 }}>(من {annualBalance})</span>
              </strong>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b' }}>سياسة الحضور</span>
              <strong style={{ fontSize: '0.825rem', color: '#0f172a' }}>
                {employee?.attendancePolicy === 'flexible' ? 'حضور مرن' : 'دوام صارم'}
              </strong>
            </div>
          </div>
        </div>

        {/* Left Card: مؤشرات المتابعة والجاهزية الوظيفية */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
              <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>
                تنبيهات المتابعة والجاهزية الوظيفية
              </strong>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
              {reviewAlerts.length ? `${reviewAlerts.length} تنبيه نشط` : 'الحالة منتظمة'}
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: (reviewAlerts.length || openLoansRemaining > 0 || pendingLeavesCount > 0 || expiredOrNearDocumentsCount > 0 || !employee?.hasPinCode) ? 'flex-start' : 'center' }}>
            {/* Dynamic Alert 1: Unsettled Loans */}
            {openLoansRemaining > 0 ? (
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircleIcon size={16} color="#c2410c" />
                  <span style={{ fontSize: '0.8rem', color: '#9a3412', fontWeight: 600 }}>
                    سلف قائمة بذمة الموظف: <strong>{money(openLoansRemaining)}</strong>
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onNavigateSection('loans')}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  عرض الأقساط
                </Button>
              </div>
            ) : null}

            {/* Dynamic Alert 2: Pending Leaves */}
            {pendingLeavesCount > 0 ? (
              <div style={{
                background: '#fefce8',
                border: '1px solid #fef08a',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircleIcon size={16} color="#b45309" />
                  <span style={{ fontSize: '0.8rem', color: '#854d0e', fontWeight: 600 }}>
                    يوجد <strong>{pendingLeavesCount}</strong> طلب إجازة قيد الاعتماد والمراجعة
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onNavigateSection('leaves')}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  مراجعة الطلبات
                </Button>
              </div>
            ) : null}

            {/* Dynamic Alert 3: Expired or Near-Expiry Documents */}
            {expiredOrNearDocumentsCount > 0 ? (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircleIcon size={16} color="#b91c1c" />
                  <span style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 600 }}>
                    يوجد <strong>{expiredOrNearDocumentsCount}</strong> مستند منتهي أو قارب على الانتهاء
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => onNavigateSection('documents')}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  تحديث المستند
                </Button>
              </div>
            ) : null}

            {/* Dynamic Alert 4: Missing PIN code */}
            {!employee?.hasPinCode && canManageEmployees ? (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircleIcon size={16} color="#64748b" />
                  <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>
                    لم يتم تعيين رمز الدخول السريع (PIN) للبصمة والبوابة
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={onOpenPinModal}
                  style={{ fontSize: '0.72rem', padding: '2px 8px' }}
                >
                  تعيين الـ PIN
                </Button>
              </div>
            ) : null}

            {/* Other review alerts */}
            {reviewAlerts.map((alert) => (
              <div key={alert} style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.8rem',
                color: '#92400e',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircleIcon size={16} color="#b45309" />
                <span>{alert}</span>
              </div>
            ))}

            {/* Clean empty state when everything is optimal */}
            {!reviewAlerts.length && openLoansRemaining <= 0 && pendingLeavesCount <= 0 && expiredOrNearDocumentsCount <= 0 && employee?.hasPinCode ? (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                color: '#15803d',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}>
                <CheckCircleIcon size={24} color="#15803d" />
                <strong style={{ fontSize: '0.85rem' }}>جميع البيانات والمتطلبات الوظيفية مستوفاة</strong>
                <span style={{ fontSize: '0.75rem', color: '#166534' }}>لا توجد تنبيهات عاجلة أو إجراءات معلقة بخصوص هذا الموظف</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 3. Compact Single-Row KPI Operational Summary Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.825rem', fontWeight: 800, color: '#0f172a' }}>
            المؤشرات التشغيلية للملف الوظيفي
          </span>
          <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
            اضغط على أي بطاقة للانتقال الفوري إلى السجل الكامل
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
          {[
            { label: 'المستندات', value: documentsCount, onClick: () => onNavigateSection('documents'), isAlert: false },
            { label: 'قريبة الانتهاء', value: expiredOrNearDocumentsCount, onClick: () => onNavigateSection('documents'), isAlert: expiredOrNearDocumentsCount > 0 },
            { label: 'العُهد المسلمة', value: openAssetsCount, onClick: () => onNavigateSection('assets'), isAlert: false },
            { label: 'إجازات معلقة', value: pendingLeavesCount, onClick: () => onNavigateSection('leaves'), isAlert: pendingLeavesCount > 0 },
            { label: 'إجازات غير مدفوعة', value: unpaidLeavesCount, onClick: () => onNavigateSection('leaves'), isAlert: false },
            { label: 'سلف مفتوحة', value: openLoansCount, onClick: () => onNavigateSection('loans'), isAlert: false },
            { label: 'متبقي السلف', value: canViewLoans ? money(openLoansRemaining) : '—', onClick: () => onNavigateSection('loans'), isAlert: openLoansRemaining > 0 },
            { label: 'اكتمال الملف', value: completenessText, onClick: () => onNavigateSection('details'), isAlert: false },
          ].map((stat, idx) => (
            <div
              key={idx}
              onClick={stat.onClick}
              style={{
                background: '#f8fafc',
                border: `1px solid ${stat.isAlert ? '#fca5a5' : '#e2e8f0'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.01)',
                minWidth: 0,
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#170e5e')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = stat.isAlert ? '#fca5a5' : '#e2e8f0')}
            >
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stat.label}>
                {stat.label}
              </span>
              <strong style={{ fontSize: '1rem', fontWeight: 800, color: stat.isAlert ? '#dc2626' : '#0f172a', lineHeight: 1.2 }}>
                {stat.value}
              </strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
