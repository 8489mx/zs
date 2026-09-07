import { useState, useEffect } from 'react';
import {
  employeePortalApi,
  type PortalEmployeeUser,
  type EmployeeDashboardData,
  type AttendanceRecordItem,
  type EmployeePayslipItem,
  type EmployeeLeavesData,
  type LoansAndCustodyData,
} from '../api/employee-portal.api';
import { formatCurrency } from '@/lib/format';
import {
  UsersIcon,
  ClockIcon,
  ReceiptIcon,
  CalendarIcon,
  CreditCardIcon,
  XIcon,
  AlertTriangleIcon,
  PlusIcon,
  SmartphoneIcon,
  CheckCircleIcon,
} from '@/shared/components/icons/AppIcons';

export default function EmployeePortalPage() {
  const [token, setToken] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('zs_emp_portal_token') : null;
  });

  const [user, setUser] = useState<PortalEmployeeUser | null>(() => {
    return employeePortalApi.getCurrentUser();
  });

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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

  // Modals
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState<number>(1);
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

  const [showAdvanceModal, setShowAdvanceModal] = useState(false);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceReason, setAdvanceReason] = useState('');
  const [advanceMonths, setAdvanceMonths] = useState<number>(1);
  const [advanceSubmitting, setAdvanceSubmitting] = useState(false);

  // Selected payslip details modal
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

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError('');
    if (!identifier.trim() || !pinCode.trim()) {
      setLoginError('يرجى إدخال رقم الهاتف أو كود الموظف ورمز الـ PIN');
      return;
    }

    try {
      setLoginLoading(true);
      const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      const companyCode = urlParams?.get('c') || urlParams?.get('tenant') || (typeof localStorage !== 'undefined' ? localStorage.getItem('zs_last_company_code') : null) || undefined;
      const res = await employeePortalApi.login({
        identifier: identifier.trim(),
        pinCode: pinCode.trim(),
        ...(companyCode ? { companyCode } : {}),
      });
      setToken(res.token);
      setUser(res.employee);
    } catch (err: any) {
      setLoginError(err?.response?.data?.message || err?.message || 'فشل تسجيل الدخول، تأكد من صحة البيانات');
    } finally {
      setLoginLoading(false);
    }
  }

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
      if (data.leaveTypes && data.leaveTypes.length > 0) {
        setLeaveTypeId(data.leaveTypes[0].id);
      }
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

  async function handleSubmitLeave(e: React.FormEvent) {
    e.preventDefault();
    if (!leaveStart || !leaveEnd) {
      alert('يرجى تحديد تاريخ بداية ونهاية الإجازة');
      return;
    }

    try {
      setLeaveSubmitting(true);
      const res = await employeePortalApi.requestLeave({
        leaveTypeId,
        startDate: leaveStart,
        endDate: leaveEnd,
        reason: leaveReason,
      });
      setSuccessMsg(res.message);
      setShowLeaveModal(false);
      setLeaveReason('');
      loadLeaves();
      loadDashboard();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر تقديم طلب الإجازة');
    } finally {
      setLeaveSubmitting(false);
    }
  }

  async function handleSubmitAdvance(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(advanceAmount);
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ سلفة صالح');
      return;
    }

    try {
      setAdvanceSubmitting(true);
      const res = await employeePortalApi.requestAdvance({
        amount: amt,
        reason: advanceReason,
        repaymentMonths: advanceMonths,
      });
      setSuccessMsg(res.message);
      setShowAdvanceModal(false);
      setAdvanceAmount('');
      setAdvanceReason('');
      loadLoans();
      loadDashboard();
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'تعذر تقديم طلب السلفة');
    } finally {
      setAdvanceSubmitting(false);
    }
  }

  // ==========================================
  // LOGIN SCREEN (إذا لم يكن مسجل دخول)
  // ==========================================
  if (!token) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
        }}
      >
        <style>{`
          .portal-login-card {
            max-width: 440px;
            width: 100%;
            background-color: #ffffff;
            border-radius: 20px;
            border: 1px solid #e2e8f0;
            padding: 36px 32px;
            box-shadow: 0 8px 30px -4px rgba(15, 23, 42, 0.08);
            box-sizing: border-box;
          }
          @media (max-width: 480px) {
            .portal-login-card {
              padding: 24px 18px;
              border-radius: 16px;
            }
          }
        `}</style>
        <div className="portal-login-card">
          {/* Logo & Brand Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 18,
                background: 'linear-gradient(135deg, #170e5e 0%, #2563eb 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(23, 14, 94, 0.25)',
                marginBottom: '16px',
              }}
            >
              <UsersIcon size={30} color="#ffffff" strokeWidth={2} />
            </div>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 900, color: '#0f172a' }}>
              بوابة الموظف الذاتية
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Z-Systems Employee Self-Service (ESS)
            </p>
          </div>

          {loginError && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '12px 16px',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <AlertTriangleIcon size={16} color="#991b1b" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم الهاتف أو كود الموظف:
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="مثال: 01012345678 أو EMP-01"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز الدخول السري (PIN):
              </label>
              <input
                type="password"
                maxLength={8}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="الرمز السري المكون من 4 إلى 6 أرقام"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#f8fafc',
                  fontSize: '16px',
                  letterSpacing: '2px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                marginTop: '8px',
                padding: '14px',
                borderRadius: '10px',
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                fontSize: '15px',
                fontWeight: 800,
                cursor: loginLoading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 14px rgba(23, 14, 94, 0.25)',
                transition: 'all 0.15s ease',
              }}
            >
              {loginLoading ? 'جاري التحقق...' : 'تسجيل الدخول إلى حسابي'}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '12px',
              color: '#64748b',
              lineHeight: 1.6,
              textAlign: 'center',
            }}
          >
            لأول تسجيل دخول: يمكنك استخدام رمز PIN الافتراضي <strong style={{ color: '#170e5e' }}>1234</strong> أو التواصل مع قسم الموارد البشرية.
          </div>

          <div style={{ marginTop: '16px', textAlign: 'center' }}>
            <a
              href="/punch"
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#170e5e',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <SmartphoneIcon size={16} color="#170e5e" />
              <span>تسجيل بصمة الحضور بالـ GPS والسيلفي</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN PORTAL VIEW (عند تسجيل الدخول)
  // ==========================================
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
      <style>{`
        .portal-header {
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 14px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          position: sticky;
          top: 0;
          z-index: 30;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .portal-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .portal-nav {
          background-color: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          padding: 0 28px;
          display: flex;
          gap: 8px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .portal-nav::-webkit-scrollbar {
          display: none;
        }
        .portal-alert {
          margin: 16px 28px 0;
          background-color: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
          padding: 12px 18px;
          color: #166534;
          font-size: 13px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .portal-main {
          flex: 1;
          padding: 24px 28px;
          max-width: 1280px;
          width: 100%;
          margin: 0 auto;
          box-sizing: border-box;
        }
        .portal-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
        }
        .portal-kpi-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .portal-kpi-card .kpi-icon-box {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .portal-tab-label-full {
          display: inline;
        }
        .portal-tab-label-short {
          display: none;
        }
        .portal-two-col-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
          gap: 20px;
        }
        .portal-contract-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }
        .portal-contract-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .contract-item {
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 10px 14px;
        }
        .contract-item-label {
          display: block;
          color: #64748b;
          font-weight: 700;
          font-size: 12px;
          margin-bottom: 3px;
        }
        .contract-item-value {
          font-weight: 800;
          color: #0f172a;
          font-size: 13px;
          word-break: break-word;
        }
        .portal-quick-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 18px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.03);
        }
        .portal-payslip-card {
          background-color: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);
        }
        .portal-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .portal-modal-card {
          max-height: 90vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        @media (max-width: 1024px) {
          .portal-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .portal-tab-label-full {
            display: none !important;
          }
          .portal-tab-label-short {
            display: inline !important;
          }
          .portal-header {
            padding: 12px 16px !important;
            gap: 12px !important;
          }
          .portal-header-actions {
            width: 100%;
            display: flex;
            gap: 8px;
          }
          .portal-header-actions > * {
            flex: 1;
            justify-content: center;
            text-align: center;
          }
          .portal-nav {
            padding: 0 4px !important;
            gap: 0 !important;
            overflow-x: hidden !important;
            display: flex !important;
            width: 100% !important;
            box-sizing: border-box !important;
          }
          .portal-nav button {
            flex: 1 1 0px !important;
            min-width: 0 !important;
            padding: 10px 2px !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 4px !important;
            font-size: 11.5px !important;
            white-space: nowrap !important;
            text-align: center !important;
          }
          .portal-nav button svg {
            width: 16px !important;
            height: 16px !important;
          }
          .portal-alert {
            margin: 12px 16px 0 !important;
          }
          .portal-main {
            padding: 16px 14px !important;
          }
          .portal-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 10px !important;
          }
          .portal-kpi-card {
            padding: 14px 12px !important;
            border-radius: 14px !important;
          }
          .portal-kpi-card .kpi-title {
            font-size: 11.5px !important;
          }
          .portal-kpi-card .kpi-value {
            font-size: 17px !important;
          }
          .portal-kpi-card .kpi-sub {
            font-size: 10.5px !important;
            line-height: 1.3 !important;
          }
          .portal-kpi-card .kpi-icon-box {
            width: 30px !important;
            height: 30px !important;
            border-radius: 8px !important;
          }
          .portal-two-col-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
          }
          .portal-contract-card {
            padding: 16px 14px !important;
            border-radius: 14px !important;
          }
          .portal-contract-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 8px !important;
          }
          .contract-item {
            padding: 8px 10px !important;
            border-radius: 9px !important;
          }
          .contract-item-label {
            font-size: 10.5px !important;
          }
          .contract-item-value {
            font-size: 12px !important;
          }
          .portal-quick-card {
            padding: 16px 14px !important;
            border-radius: 14px !important;
          }
          .portal-payslip-card {
            padding: 14px 16px !important;
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .portal-payslip-total {
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding-top: 10px !important;
            border-top: 1px solid #f1f5f9 !important;
            text-align: right !important;
          }
          .portal-section-header {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 12px !important;
          }
          .portal-section-header button {
            width: 100% !important;
            justify-content: center !important;
          }
        }

        @media (max-width: 480px) {
          .portal-nav button {
            padding: 9px 1px !important;
            font-size: 10.5px !important;
            gap: 3px !important;
          }
          .portal-nav button svg {
            width: 15px !important;
            height: 15px !important;
          }
          .portal-kpi-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }
          .portal-kpi-card {
            padding: 12px 10px !important;
            border-radius: 12px !important;
          }
          .portal-kpi-card .kpi-title {
            font-size: 11px !important;
          }
          .portal-kpi-card .kpi-value {
            font-size: 16px !important;
          }
          .portal-kpi-card .kpi-sub {
            font-size: 10px !important;
          }
          .portal-kpi-card .kpi-icon-box {
            width: 28px !important;
            height: 28px !important;
            border-radius: 8px !important;
          }
          .portal-contract-card {
            padding: 14px 10px !important;
          }
          .portal-contract-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          .contract-item {
            padding: 7px 8px !important;
          }
          .contract-item-label {
            font-size: 10px !important;
          }
          .contract-item-value {
            font-size: 11.5px !important;
          }
          .portal-quick-card {
            padding: 14px 10px !important;
          }
          .portal-modal-card {
            padding: 20px 16px !important;
          }
        }
      `}</style>
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
        {/* ==========================================
            TAB 1: OVERVIEW DASHBOARD
            ========================================== */}
        {activeTab === 'overview' && (
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
                    onClick={() => setShowLeaveModal(true)}
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
                    onClick={() => setShowAdvanceModal(true)}
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
        )}

        {/* ==========================================
            TAB 2: PAYSLIPS (مسيرات الرواتب)
            ========================================== */}
        {activeTab === 'payslips' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  مسيرات وقسائم الرواتب الشهرية
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  استعراض تفصيلي لصافي الراتب، البدلات، المكافآت، والاستقطاعات لكل شهر معتمد.
                </p>
              </div>
            </div>

            {payslips.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <ReceiptIcon size={36} color="#94a3b8" />
                <div style={{ fontSize: '16px', fontWeight: 700, marginTop: '12px', color: '#0f172a' }}>
                  لا توجد مسيرات رواتب معتمدة بعد
                </div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>
                  سيتم إدراج قسيمة الراتب هنا فور اعتماد ومراجعة مسير الرواتب الشهري من قسم الحسابات.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {payslips.map((slip) => (
                  <div
                    key={slip.id}
                    className="portal-payslip-card"
                    onClick={() => setSelectedPayslip(slip)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '14px',
                      padding: '18px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <ReceiptIcon size={22} color="#16a34a" />
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          راتب شهر: {slip.period}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          الأساسي: {formatCurrency(slip.baseSalary)} • البدلات: +{formatCurrency(slip.allowances)} • الخصومات: -{formatCurrency(slip.deductions + slip.loanDeductions)}
                        </div>
                      </div>
                    </div>

                    <div className="portal-payslip-total" style={{ textAlign: 'left' }}>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>صافي الراتب المستحق</span>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#16a34a' }}>
                        {formatCurrency(slip.netPay)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==========================================
            TAB 3: LEAVES & REQUESTS (الإجازات)
            ========================================== */}
        {activeTab === 'leaves' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  أرصدة وطلبات الإجازات
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  استعراض رصيدك من الإجازات ومتابعة حالة الطلبات المقدمة للإدارة.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowLeaveModal(true)}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>تقديم طلب إجازة</span>
              </button>
            </div>

            {/* Leave Balances Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              {leavesData?.balances?.map((b) => (
                <div
                  key={b.leaveTypeId}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '18px',
                    boxShadow: '0 2px 6px rgba(15, 23, 42, 0.02)',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>{b.name}</div>
                  <div style={{ fontSize: '26px', fontWeight: 900, color: '#170e5e', margin: '4px 0' }}>
                    {b.remainingDays} <span style={{ fontSize: '14px', fontWeight: 700 }}>يوم متبقي</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    إجمالي الرصيد: {b.totalDays} • المستنفذ: {b.usedDays}
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Requests Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                سجل طلبات الإجازة السابقة
              </h3>

              {!leavesData?.requests || leavesData.requests.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                  لم تقم بتقديم أي طلبات إجازة حتى الآن.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>نوع الإجازة</th>
                        <th style={{ padding: '10px 12px' }}>الفترة</th>
                        <th style={{ padding: '10px 12px' }}>عدد الأيام</th>
                        <th style={{ padding: '10px 12px' }}>السبب</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                        <th style={{ padding: '10px 12px' }}>ملاحظات الإدارة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leavesData.requests.map((r) => {
                        const isApproved = r.status === 'approved';
                        const isRejected = r.status === 'rejected';
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>
                              {r.leaveTypeName}
                            </td>
                            <td style={{ padding: '12px', color: '#334155' }}>
                              {r.startDate} إلى {r.endDate}
                            </td>
                            <td style={{ padding: '12px', fontWeight: 800, color: '#170e5e' }}>
                              {r.daysCount} يوم
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{r.reason || '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#fffbeb',
                                  color: isApproved ? '#166534' : isRejected ? '#991b1b' : '#92400e',
                                  border: `1px solid ${isApproved ? '#bbf7d0' : isRejected ? '#fecaca' : '#fde68a'}`,
                                }}
                              >
                                {isApproved ? 'معتمدة' : isRejected ? 'مرفوضة' : 'قيد المراجعة'}
                              </span>
                            </td>
                            <td style={{ padding: '12px', color: '#64748b' }}>{r.decisionNotes || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 4: ATTENDANCE LOG (الحضور والانصراف)
            ========================================== */}
        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                سجل الحضور والانصراف الشهري
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                كشف تفصيلي بأوقات تسجيل الحضور والانصراف وساعات العمل الفردية.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              {attendance.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '14px' }}>
                  لا توجد سجلات حضور مسجلة لهذا الشهر.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>التاريخ</th>
                        <th style={{ padding: '10px 12px' }}>وقت الحضور</th>
                        <th style={{ padding: '10px 12px' }}>وقت الانصراف</th>
                        <th style={{ padding: '10px 12px' }}>ساعات العمل</th>
                        <th style={{ padding: '10px 12px' }}>التأخير (دقيقة)</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                        <th style={{ padding: '10px 12px' }}>طريقة البصمة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((rec) => (
                        <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{rec.date}</td>
                          <td style={{ padding: '12px', color: '#166534', fontWeight: 700 }}>{rec.checkInTime}</td>
                          <td style={{ padding: '12px', color: '#170e5e', fontWeight: 700 }}>{rec.checkOutTime}</td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>{rec.workHours} س</td>
                          <td style={{ padding: '12px', color: rec.lateMinutes > 0 ? '#dc2626' : '#64748b' }}>
                            {rec.lateMinutes > 0 ? `${rec.lateMinutes} دقيقة` : '-'}
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: rec.status === 'present' ? '#f0fdf4' : '#f8fafc',
                                color: rec.status === 'present' ? '#166534' : '#64748b',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {rec.status === 'present' ? 'حاضر' : rec.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {rec.source === 'mobile_gps' ? 'موبايل GPS' : 'جهاز بصمة الفرع'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==========================================
            TAB 5: LOANS & ASSETS (السلف والعهد)
            ========================================== */}
        {activeTab === 'loans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="portal-section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>
                  السلف النقدية والعهد العينية
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
                  متابعة أرصدة السلف المستحقة والأصول والعهد المسلمة بعهدتك.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAdvanceModal(true)}
                style={{
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                }}
              >
                <PlusIcon size={16} color="#ffffff" />
                <span>طلب سلفة جديدة</span>
              </button>
            </div>

            {/* Loans Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                سجل السلف المالية
              </h3>

              {!loansData?.loans || loansData.loans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  لا توجد أي سلف مالية مسجلة بعهدتك.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>رقم السلفة</th>
                        <th style={{ padding: '10px 12px' }}>المبلغ الإجمالي</th>
                        <th style={{ padding: '10px 12px' }}>المسدد</th>
                        <th style={{ padding: '10px 12px' }}>المتبقي</th>
                        <th style={{ padding: '10px 12px' }}>القسط الشهري</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansData.loans.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{l.loanNo}</td>
                          <td style={{ padding: '12px', fontWeight: 800 }}>{formatCurrency(l.principalAmount)}</td>
                          <td style={{ padding: '12px', color: '#166534' }}>{formatCurrency(l.paidAmount)}</td>
                          <td style={{ padding: '12px', color: '#dc2626', fontWeight: 800 }}>
                            {formatCurrency(l.remainingAmount)}
                          </td>
                          <td style={{ padding: '12px', color: '#64748b' }}>
                            {formatCurrency(l.installmentAmount)} ({l.installmentCount} شهر)
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: l.status === 'paid' ? '#f0fdf4' : '#fffbeb',
                                color: l.status === 'paid' ? '#166534' : '#92400e',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {l.status === 'draft' ? 'قيد المراجعة' : l.status === 'approved' ? 'معتمدة' : l.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Assets & Physical Custody Table */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '20px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.02)',
              }}
            >
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                العهد العينية المسلمة للموظف
              </h3>

              {!loansData?.assets || loansData.assets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '13px' }}>
                  لا توجد أجهزة أو عهد عينية مسجلة باسمك حالياً.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'right' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>اسم العهدة</th>
                        <th style={{ padding: '10px 12px' }}>النوع</th>
                        <th style={{ padding: '10px 12px' }}>كود الأصل / السيريال</th>
                        <th style={{ padding: '10px 12px' }}>تاريخ التسليم</th>
                        <th style={{ padding: '10px 12px' }}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loansData.assets.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{a.assetName}</td>
                          <td style={{ padding: '12px', color: '#64748b' }}>{a.assetType}</td>
                          <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                            {a.serialNo !== '-' ? a.serialNo : a.assetCode}
                          </td>
                          <td style={{ padding: '12px', color: '#334155' }}>{a.assignedAt}</td>
                          <td style={{ padding: '12px' }}>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ==========================================
          MODAL: REQUEST LEAVE
          ========================================== */}
      {showLeaveModal && (
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="portal-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarIcon size={20} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  تقديم طلب إجازة جديد
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLeaveModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  نوع الإجازة:
                </label>
                <select
                  value={leaveTypeId}
                  onChange={(e) => setLeaveTypeId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  {leavesData?.leaveTypes?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.isPaid ? 'مدفوعة الأجر' : 'غير مدفوعة'})
                    </option>
                  )) || <option value={1}>إجازة سنوية</option>}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    تاريخ البداية:
                  </label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    تاريخ النهاية:
                  </label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  سبب الإجازة والملاحظات:
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="اكتب سبب طلب الإجازة باختصار..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={leaveSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: leaveSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {leaveSubmitting ? 'جاري الإرسال...' : 'إرسال طلب الإجازة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: REQUEST ADVANCE
          ========================================== */}
      {showAdvanceModal && (
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="portal-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '18px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCardIcon size={20} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  طلب سلفة مالية من الراتب
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvanceModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitAdvance} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مبلغ السلفة المطلوب (ج.م):
                </label>
                <input
                  type="number"
                  min="100"
                  step="50"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="مثال: 1000"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  مدة السداد (عدد الشهور):
                </label>
                <select
                  value={advanceMonths}
                  onChange={(e) => setAdvanceMonths(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#f8fafc',
                    fontSize: '13px',
                    fontWeight: 700,
                  }}
                >
                  <option value={1}>شهر واحد (خصم كامل من الراتب القادم)</option>
                  <option value={2}>شهران (قسطان متساويان)</option>
                  <option value={3}>3 شهور (3 أقساط)</option>
                  <option value={6}>6 شهور</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  سبب طلب السلفة:
                </label>
                <textarea
                  rows={3}
                  value={advanceReason}
                  onChange={(e) => setAdvanceReason(e.target.value)}
                  placeholder="اكتب سبب طلب السلفة والظروف الخاصة باختصار..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '13px',
                    resize: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="submit"
                  disabled={advanceSubmitting}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: advanceSubmitting ? 'not-allowed' : 'pointer',
                  }}
                >
                  {advanceSubmitting ? 'جاري التسجيل...' : 'إرسال طلب السلفة'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdvanceModal(false)}
                  style={{
                    padding: '12px 18px',
                    borderRadius: '8px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          MODAL: PAYSLIP DETAIL VIEW
          ========================================== */}
      {selectedPayslip && (
        <div
          dir="rtl"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="portal-modal-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <ReceiptIcon size={22} color="#170e5e" />
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                  قسيمة راتب شهر {selectedPayslip.period}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPayslip(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <XIcon size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#64748b', fontWeight: 700 }}>الراتب الأساسي:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>{formatCurrency(selectedPayslip.baseSalary)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>إجمالي البدلات والمكافآت (+):</span>
                <span style={{ fontWeight: 800, color: '#16a34a' }}>+{formatCurrency(selectedPayslip.allowances)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span style={{ color: '#dc2626', fontWeight: 700 }}>الاستقطاعات والخصومات (-):</span>
                <span style={{ fontWeight: 800, color: '#dc2626' }}>-{formatCurrency(selectedPayslip.deductions)}</span>
              </div>

              {selectedPayslip.loanDeductions > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#dc2626', fontWeight: 700 }}>قسط سداد سلفة (-):</span>
                  <span style={{ fontWeight: 800, color: '#dc2626' }}>-{formatCurrency(selectedPayslip.loanDeductions)}</span>
                </div>
              )}

              {/* Adjustments breakdown */}
              {selectedPayslip.adjustments && selectedPayslip.adjustments.length > 0 && (
                <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', marginTop: '6px' }}>
                  <div style={{ fontWeight: 800, color: '#334155', marginBottom: '8px', fontSize: '12px' }}>
                    تفاصيل البنود والبدلات الإضافية:
                  </div>
                  {selectedPayslip.adjustments.map((a, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', margin: '4px 0' }}>
                      <span>{a.label}:</span>
                      <span style={{ fontWeight: 700, color: a.type === 'allowance' ? '#16a34a' : '#dc2626' }}>
                        {a.type === 'allowance' ? '+' : '-'}{formatCurrency(a.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Net Pay Highlight Banner */}
              <div
                style={{
                  marginTop: '12px',
                  backgroundColor: '#f0fdf4',
                  border: '1.5px solid #bbf7d0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>صافي الراتب المستحق للصرف:</div>
                  <div style={{ fontSize: '24px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                    {formatCurrency(selectedPayslip.netPay)}
                  </div>
                </div>
                <span
                  style={{
                    backgroundColor: '#dcfce7',
                    color: '#166534',
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: '1px solid #86efac',
                  }}
                >
                  معتمد ومصروف
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { EmployeePortalPage };
