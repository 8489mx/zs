import { useState, useEffect } from 'react';
import '@/styles/partials/employee-portal.css';
import {
  employeePortalApi,
  type PortalEmployeeUser,
  type EmployeeDashboardData,
  type AttendanceRecordItem,
  type EmployeePayslipItem,
  type EmployeeLeavesData,
  type LoansAndCustodyData,
} from '../api/employee-portal.api';
import {
  UsersIcon,
  ClockIcon,
  ReceiptIcon,
  CalendarIcon,
  CreditCardIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';
import { EmployeePortalLogin } from '../components/portal/EmployeePortalLogin';
import { PortalLeaveModal } from '../components/portal/PortalLeaveModal';
import { PortalAdvanceModal } from '../components/portal/PortalAdvanceModal';
import { PortalPayslipModal } from '../components/portal/PortalPayslipModal';
import { PortalOverviewTab } from '../components/portal/PortalOverviewTab';
import { PortalPayslipsTab } from '../components/portal/PortalPayslipsTab';
import { PortalLeavesTab } from '../components/portal/PortalLeavesTab';
import { PortalAttendanceTab } from '../components/portal/PortalAttendanceTab';
import { PortalLoansTab } from '../components/portal/PortalLoansTab';

export default function EmployeePortalPage() {
  const [token, setToken] = useState<string | null>(() => {
    return employeePortalApi.getStoredToken();
  });

  const [user, setUser] = useState<PortalEmployeeUser | null>(() => {
    return employeePortalApi.getCurrentUser();
  });

  // Active Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'payslips' | 'leaves' | 'attendance' | 'loans'>('overview');

  // Dashboard & Tab Data
  const [dashboard, setDashboard] = useState<EmployeeDashboardData | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecordItem[]>([]);
  const [payslips, setPayslips] = useState<EmployeePayslipItem[]>([]);
  const [leavesData, setLeavesData] = useState<EmployeeLeavesData | null>(null);
  const [loansData, setLoansData] = useState<LoansAndCustodyData | null>(null);

  const [, setLoading] = useState(false);
  const [, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modals state
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<EmployeePayslipItem | null>(null);

  // Load data when logged in
  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    if (activeTab === 'attendance' && attendance.length === 0) loadAttendance();
    if (activeTab === 'payslips' && payslips.length === 0) loadPayslips();
    if (activeTab === 'leaves' && !leavesData) loadLeaves();
    if (activeTab === 'loans' && !loansData) loadLoans();
  }, [token, activeTab]);

  function handleLogout() {
    employeePortalApi.logout();
    setToken(null);
    setUser(null);
    setDashboard(null);
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setErrorMsg('');
      const data = await employeePortalApi.getDashboard();
      setDashboard(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        handleLogout();
      } else {
        setErrorMsg('تعذر تحميل بيانات لوحة الموظف');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadAttendance() {
    try {
      setLoading(true);
      const data = await employeePortalApi.getAttendance();
      setAttendance(data);
    } catch {
      setErrorMsg('تعذر تحميل سجل الحضور');
    } finally {
      setLoading(false);
    }
  }

  async function loadPayslips() {
    try {
      setLoading(true);
      const data = await employeePortalApi.getPayslips();
      setPayslips(data);
    } catch {
      setErrorMsg('تعذر تحميل مسيرات الرواتب');
    } finally {
      setLoading(false);
    }
  }

  async function loadLeaves() {
    try {
      setLoading(true);
      const data = await employeePortalApi.getLeaves();
      setLeavesData(data);
    } catch {
      setErrorMsg('تعذر تحميل بيانات الإجازات');
    } finally {
      setLoading(false);
    }
  }

  async function loadLoans() {
    try {
      setLoading(true);
      const data = await employeePortalApi.getLoansAndCustody();
      setLoansData(data);
    } catch {
      setErrorMsg('تعذر تحميل السلف والعهد');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <EmployeePortalLogin
        onLoginSuccess={(tok, u) => {
          setToken(tok);
          setUser(u);
        }}
      />
    );
  }

  return (
    <div
      dir="rtl"
      className="portal-root"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 1. Header Bar */}
      <header className="portal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(23, 14, 94, 0.2)',
            }}
          >
            <UsersIcon size={22} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                {user?.name || dashboard?.profile?.name || 'حساب الموظف'}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  backgroundColor: '#f0fdf4',
                  color: '#166534',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                {dashboard?.profile?.positionName || user?.positionName || 'موظف'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
              كود الموظف: {user?.employeeNo} • {dashboard?.profile?.branchName || user?.branchName}
            </div>
          </div>
        </div>

        <div className="portal-header-actions">
          <a
            href="/punch"
            style={{
              backgroundColor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 800,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <SmartphoneIcon size={16} color="#166534" />
            <span>بصمة الموبايل (GPS)</span>
          </a>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              backgroundColor: '#f8fafc',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              padding: '8px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            تسجيل الخروج
          </button>
        </div>
      </header>

      {/* 2. Navigation Tabs */}
      <nav className="portal-nav">
        {[
          { key: 'overview', label: 'نظرة عامة', shortLabel: 'نظرة عامة', icon: <UsersIcon size={16} /> },
          { key: 'payslips', label: 'مسيرات الرواتب', shortLabel: 'الرواتب', icon: <ReceiptIcon size={16} /> },
          { key: 'leaves', label: 'الإجازات والأذونات', shortLabel: 'الإجازات', icon: <CalendarIcon size={16} /> },
          { key: 'attendance', label: 'سجل الحضور', shortLabel: 'الحضور', icon: <ClockIcon size={16} /> },
          { key: 'loans', label: 'السلف والعهد', shortLabel: 'السلف', icon: <CreditCardIcon size={16} /> },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 18px',
                border: 'none',
                background: isActive ? 'rgba(23, 14, 94, 0.04)' : 'transparent',
                borderBottom: isActive ? '3px solid #170e5e' : '3px solid transparent',
                borderRadius: '8px 8px 0 0',
                color: isActive ? '#170e5e' : '#64748b',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
              }}
            >
              <span style={{ color: isActive ? '#170e5e' : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                {tab.icon}
              </span>
              <span className="portal-tab-label-full">{tab.label}</span>
              <span className="portal-tab-label-short">{tab.shortLabel}</span>
            </button>
          );
        })}
      </nav>

      {/* Success Alert Banner */}
      {successMsg && (
        <div className="portal-alert">
          <CheckCircleIcon size={18} color="#166534" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="portal-main">

        {activeTab === 'overview' && (
          <PortalOverviewTab
            dashboard={dashboard}
            onRequestLeave={() => setShowLeaveModal(true)}
            onRequestAdvance={() => setShowAdvanceModal(true)}
          />
        )}

        {activeTab === 'payslips' && (
          <PortalPayslipsTab
            payslips={payslips}
            onSelectPayslip={(slip) => setSelectedPayslip(slip)}
          />
        )}

        {activeTab === 'leaves' && (
          <PortalLeavesTab
            leavesData={leavesData}
            onRequestLeave={() => setShowLeaveModal(true)}
          />
        )}

        {activeTab === 'attendance' && (
          <PortalAttendanceTab attendance={attendance} />
        )}

        {activeTab === 'loans' && (
          <PortalLoansTab
            loansData={loansData}
            onRequestAdvance={() => setShowAdvanceModal(true)}
          />
        )}
      </main>

      <PortalLeaveModal
        open={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        leaveTypes={leavesData?.leaveTypes}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          loadLeaves();
          loadDashboard();
          setTimeout(() => setSuccessMsg(''), 5000);
        }}
      />

      <PortalAdvanceModal
        open={showAdvanceModal}
        onClose={() => setShowAdvanceModal(false)}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          loadLoans();
          loadDashboard();
          setTimeout(() => setSuccessMsg(''), 5000);
        }}
      />

      <PortalPayslipModal
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />
    </div>
  );
}

export { EmployeePortalPage };
