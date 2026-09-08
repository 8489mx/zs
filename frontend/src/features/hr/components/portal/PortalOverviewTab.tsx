import React from 'react';
import { formatCurrency } from '@/lib/format';
import type { EmployeeDashboardData } from '../../api/employee-portal.api';
import {
  ClockIcon,
  CalendarIcon,
  ReceiptIcon,
  PlusIcon,
  CreditCardIcon,
  SmartphoneIcon,
} from '@/shared/components/icons/AppIcons';

export interface PortalOverviewTabProps {
  dashboard: EmployeeDashboardData | null;
  onRequestLeave: () => void;
  onRequestAdvance: () => void;
}

export function PortalOverviewTab({
  dashboard,
  onRequestLeave,
  onRequestAdvance,
}: PortalOverviewTabProps) {
  return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* KPI Metric Cards */}
            <div className="portal-kpi-grid">
              {/* Today's Punch */}
              <div className="portal-kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>بصمة اليوم</span>
                  <div
                    className="kpi-icon-box"
                    style={{
                      backgroundColor: dashboard?.todayAttendance?.hasCheckedIn ? '#f0fdf4' : '#fffbeb',
                    }}
                  >
                    <ClockIcon size={16} color={dashboard?.todayAttendance?.hasCheckedIn ? '#16a34a' : '#d97706'} />
                  </div>
                </div>
                <div className="kpi-value" style={{ display: 'flex', alignItems: 'center' }}>
                  {dashboard?.todayAttendance?.hasCheckedIn ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '13px',
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a' }} />
                      حضور: {dashboard.todayAttendance.checkInTime}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#fffbeb',
                        color: '#92400e',
                        border: '1px solid #fde68a',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                      لم تسجل اليوم
                    </span>
                  )}
                </div>
                <div className="kpi-sub" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px' }}>
                  {dashboard?.todayAttendance?.hasCheckedOut
                    ? `انصراف: ${dashboard.todayAttendance.checkOutTime}`
                    : dashboard?.todayAttendance?.hasCheckedIn
                    ? 'تسجيل الانصراف بنهاية اليوم'
                    : 'تسجيل الحضور عبر GPS'}
                </div>
              </div>

              {/* Leave Balance */}
              <div className="portal-kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>رصيد الإجازات</span>
                  <div
                    className="kpi-icon-box"
                    style={{
                      backgroundColor: '#eff6ff',
                    }}
                  >
                    <CalendarIcon size={16} color="#2563eb" />
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: '22px', fontWeight: 900, color: '#170e5e', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span>{dashboard?.leaveBalances?.[0]?.remainingDays ?? 21}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>يوم</span>
                </div>
                <div className="kpi-sub" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  إجازة سنوية واعتيادية
                </div>
              </div>

              {/* Latest Net Salary */}
              <div className="portal-kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>آخر راتب شهري</span>
                  <div
                    className="kpi-icon-box"
                    style={{
                      backgroundColor: '#f0fdf4',
                    }}
                  >
                    <ReceiptIcon size={16} color="#16a34a" />
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>
                  {dashboard?.latestPayslip ? formatCurrency(dashboard.latestPayslip.netPay) : 'قيد المعالجة'}
                </div>
                <div className="kpi-sub" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  {dashboard?.latestPayslip ? `مستحق شهر ${dashboard.latestPayslip.period}` : 'مسير الرواتب المعتمد'}
                </div>
              </div>

              {/* Month Work Hours */}
              <div className="portal-kpi-card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="kpi-title" style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>ساعات هذا الشهر</span>
                  <div
                    className="kpi-icon-box"
                    style={{
                      backgroundColor: '#f1f5f9',
                    }}
                  >
                    <ClockIcon size={16} color="#170e5e" />
                  </div>
                </div>
                <div className="kpi-value" style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span>{dashboard?.monthSummary?.totalWorkHours || 0}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>ساعة</span>
                </div>
                <div className="kpi-sub" style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                  خلال {dashboard?.monthSummary?.daysPresent || 0} يوم حضور
                </div>
              </div>
            </div>

            {/* Profile & Quick Actions Section */}
            <div className="portal-two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '20px' }}>
              {/* Employee Contract & Details Card */}
              <div className="portal-contract-card">
                <h3 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  بيانات العقد والوظيفة الرسمية
                </h3>

                <div className="portal-contract-grid">
                  <div className="contract-item">
                    <span className="contract-item-label">القسم / الإدارة:</span>
                    <div className="contract-item-value">
                      {dashboard?.profile?.departmentName || 'غير محدد'}
                    </div>
                  </div>

                  <div className="contract-item">
                    <span className="contract-item-label">المسمى الوظيفي:</span>
                    <div className="contract-item-value">
                      {dashboard?.profile?.positionName || 'غير محدد'}
                    </div>
                  </div>

                  <div className="contract-item">
                    <span className="contract-item-label">فرع العمل:</span>
                    <div className="contract-item-value">
                      {dashboard?.profile?.branchName || 'الفرع الرئيسي'}
                    </div>
                  </div>

                  <div className="contract-item">
                    <span className="contract-item-label">تاريخ التعيين:</span>
                    <div className="contract-item-value">
                      {dashboard?.profile?.hireDate || 'مسجل بالنظام'}
                    </div>
                  </div>

                  <div className="contract-item">
                    <span className="contract-item-label">الراتب التعاقدي:</span>
                    <div className="contract-item-value" style={{ color: '#170e5e', fontWeight: 900 }}>
                      {dashboard?.profile?.baseSalary ? formatCurrency(dashboard.profile.baseSalary) : 'محدد بالمسير'}
                    </div>
                  </div>

                  <div className="contract-item">
                    <span className="contract-item-label">بدل السكن والانتقال:</span>
                    <div className="contract-item-value" style={{ fontWeight: 800 }}>
                      {formatCurrency((dashboard?.profile?.housingAllowance || 0) + (dashboard?.profile?.transportAllowance || 0))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Self-Service Actions */}
              <div className="portal-quick-card">
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                    خدمات الموظف السريعة
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#64748b', lineHeight: 1.5 }}>
                    يمكنك تقديم طلباتك مباشرة لإدارة الموارد البشرية ومتابعة حالتها فورياً.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => onRequestLeave()}
                    style={{
                      padding: '12px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 6px rgba(23, 14, 94, 0.15)',
                    }}
                  >
                    <PlusIcon size={16} color="#ffffff" />
                    <span>تقديم طلب إجازة أو إذن غياب</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRequestAdvance()}
                    style={{
                      padding: '12px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#ffffff',
                      color: '#1e293b',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <CreditCardIcon size={16} color="#170e5e" />
                    <span>طلب سلفة مالية من الراتب</span>
                  </button>

                  <a
                    href="/punch"
                    style={{
                      padding: '12px',
                      minHeight: '44px',
                      borderRadius: '10px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1.5px solid #bfdbfe',
                      fontSize: '13px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(37, 99, 235, 0.06)',
                    }}
                  >
                    <SmartphoneIcon size={16} color="#1d4ed8" />
                    <span>تسجيل بصمة الحضور الآن</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
  );
}
