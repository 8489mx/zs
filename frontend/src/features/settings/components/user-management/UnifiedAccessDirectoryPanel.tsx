import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deliveryRepsApi, type DeliveryRep } from '@/shared/api/delivery-reps.api';
import { hrApi } from '@/features/hr/api/hr.api';
import { mobilePunchApi } from '@/features/hr/api/mobile-punch.api';
import { Button } from '@/shared/ui/button';
import { DialogShell } from '@/shared/components/dialog-shell';
import { systemAlert } from '@/shared/components/system-alert';
import {
  TruckIcon,
  SmartphoneIcon,
  SearchIcon,
  CheckCircleIcon,
  XCircleIcon,
  CopyIcon,
} from '@/shared/components/icons/AppIcons';
import type { HrEmployee } from '@/types/domain';

// ----------------------------------------------------------------------
// 1. Delivery Reps & Van Sales Access Panel
// ----------------------------------------------------------------------

export function DeliveryRepsAccessPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Edit Credentials Modal
  const [editingRep, setEditingRep] = useState<DeliveryRep | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');

  // Primary Source Query (Shares cache key with /delivery-reps)
  const repsQuery = useQuery({
    queryKey: ['delivery-reps'],
    queryFn: deliveryRepsApi.list,
  });

  const repsList = repsQuery.data || [];

  // Filtered List
  const filteredReps = useMemo(() => {
    return repsList.filter((rep) => {
      if (statusFilter === 'active' && !rep.is_active) return false;
      if (statusFilter === 'inactive' && rep.is_active) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = (rep.name || '').toLowerCase().includes(q);
        const matchesFull = (rep.full_name || '').toLowerCase().includes(q);
        const matchesPhone = (rep.phone || '').toLowerCase().includes(q);
        return matchesName || matchesFull || matchesPhone;
      }
      return true;
    });
  }, [repsList, searchTerm, statusFilter]);

  // Primary Source Mutations
  const updateMutation = useMutation({
    mutationFn: (data: { id: number; payload: Partial<DeliveryRep> & { pinCode?: string } }) =>
      deliveryRepsApi.update(data.id, data.payload as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-reps'] });
      setEditingRep(null);
      systemAlert('تم تحديث بيانات الدخول للمندوب بنجاح');
    },
    onError: (error: any) => {
      systemAlert(error.message || 'حدث خطأ أثناء التحديث');
    },
  });

  const toggleActive = (rep: DeliveryRep) => {
    updateMutation.mutate({
      id: rep.id,
      payload: {
        name: rep.name,
        isActive: !rep.is_active,
      } as any,
    });
  };

  const handleSaveCredentials = () => {
    if (!editingRep) return;
    updateMutation.mutate({
      id: editingRep.id,
      payload: {
        name: editingRep.name,
        phone: phoneInput.trim() || undefined,
        pinCode: pinInput.trim() || undefined,
      },
    });
  };

  const copyUrl = (path: string, label: string) => {
    const url = window.location.origin + path;
    navigator.clipboard.writeText(url);
    systemAlert(`تم نسخ رابط ${label} إلى الحافظة:\n${url}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* Header Info Banner */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TruckIcon size={22} color="#ea580c" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              إدارة وصول طياري الدليفري وموزعي الفان
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              تعديل أرقام الهواتف، رموز الدخول السريع (PIN)، وتجميد الحسابات الميدانية فوراً.
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => navigate('/delivery-reps')}
          >
            فتح إدارة المناديب الكاملة ↗
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="بحث باسم المندوب أو رقم الهاتف..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
            <SearchIcon size={16} />
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {(
            [
              { key: 'all', label: `الكل (${repsList.length})` },
              { key: 'active', label: `نشط (${repsList.filter((r) => r.is_active).length})` },
              { key: 'inactive', label: `موقوف (${repsList.filter((r) => !r.is_active).length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              style={{
                border: 'none',
                background: statusFilter === t.key ? '#170e5e' : 'transparent',
                color: statusFilter === t.key ? '#ffffff' : '#475569',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reps Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>المندوب</th>
              <th style={{ padding: '10px 10px', fontWeight: 700 }}>رقم الهاتف</th>
              <th style={{ padding: '10px 10px', fontWeight: 700 }}>رمز الـ PIN</th>
              <th style={{ padding: '10px 8px', fontWeight: 700 }}>البوابات</th>
              <th style={{ padding: '10px 8px', fontWeight: 700 }}>الحالة</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {repsQuery.isLoading ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل بيانات المناديب...
                </td>
              </tr>
            ) : filteredReps.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد سجلات مناديب مطابقة للفلاتر.
                </td>
              </tr>
            ) : (
              filteredReps.map((rep) => (
                <tr key={rep.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{rep.name}</div>
                    {rep.full_name && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{rep.full_name}</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 10px', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                    {rep.phone || <span style={{ color: '#dc2626', fontSize: '11px' }}>غير محدد</span>}
                  </td>
                  <td style={{ padding: '10px 10px' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '2px 7px',
                        background: rep.pin_code ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${rep.pin_code ? '#bbf7d0' : '#fecaca'}`,
                        color: rep.pin_code ? '#15803d' : '#b91c1c',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        fontSize: '11.5px',
                      }}
                    >
                      {rep.pin_code ? `•••• (${rep.pin_code})` : 'بدون رمز'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <span
                        onClick={() => copyUrl('/driver', 'بوابة الدليفري')}
                        title="انقر لنسخ رابط بوابة الدليفري (/driver)"
                        style={{
                          fontSize: '10.5px',
                          background: '#fff7ed',
                          color: '#c2410c',
                          border: '1px solid #ffedd5',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CopyIcon size={10} /> دليفري
                      </span>
                      <span
                        onClick={() => copyUrl('/van-sales', 'مبيعات الفان')}
                        title="انقر لنسخ رابط مبيعات الفان (/van-sales)"
                        style={{
                          fontSize: '10.5px',
                          background: '#f0f9ff',
                          color: '#0369a1',
                          border: '1px solid #e0f2fe',
                          borderRadius: '4px',
                          padding: '2px 5px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <CopyIcon size={10} /> فان
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: rep.is_active ? '#ecfdf5' : '#fef2f2',
                        color: rep.is_active ? '#065f46' : '#991b1b',
                        border: `1px solid ${rep.is_active ? '#a7f3d0' : '#fecaca'}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rep.is_active ? <CheckCircleIcon size={11} /> : <XCircleIcon size={11} />}
                      {rep.is_active ? 'نشط' : 'موقوف'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                      <Button
                        variant="secondary"
                        style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                        onClick={() => {
                          setEditingRep(rep);
                          setPhoneInput(rep.phone || '');
                          setPinInput(rep.pin_code || '');
                        }}
                      >
                        تعديل الـ PIN والهاتف
                      </Button>
                      <Button
                        variant={rep.is_active ? 'danger' : 'secondary'}
                        style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                        onClick={() => toggleActive(rep)}
                        disabled={updateMutation.isPending}
                      >
                        {rep.is_active ? 'إيقاف' : 'تفعيل'}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Credentials Modal */}
      {editingRep && (
        <DialogShell
          open={Boolean(editingRep)}
          onClose={() => setEditingRep(null)}
          width="min(500px, 95vw)"
          ariaLabel="تعديل بيانات الدخول للمندوب"
        >
          <div
            className="dialog-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px 28px',
              boxSizing: 'border-box',
            }}
            dir="rtl"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                تعديل بيانات الدخول: {editingRep.name}
              </h3>
              <button
                type="button"
                onClick={() => setEditingRep(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#94a3b8',
                  lineHeight: 1,
                  padding: '4px',
                }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              يستخدم المندوب رقم الهاتف والرمز السري (PIN) للدخول إلى تطبيق المندوب أو نقطة بيع الفان.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم الهاتف المحمول (معرف تسجيل الدخول)
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="مثال: 01012345678"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  direction: 'ltr',
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز الدخول السريع (PIN - من 4 إلى 6 أرقام)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="مثال: 1234"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '16px',
                  direction: 'ltr',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setEditingRep(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                style={{ background: '#170e5e', borderColor: '#170e5e' }}
                onClick={handleSaveCredentials}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// 2. Self-Service Employees & Mobile Punch Access Panel
// ----------------------------------------------------------------------

export function EmployeeSelfServiceAccessPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal State
  const [editingEmployee, setEditingEmployee] = useState<HrEmployee | null>(null);
  const [phoneInput, setPhoneInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Primary Source Query (Shares cache key with HR module)
  const employeesQuery = useQuery({
    queryKey: ['hr', 'employees', 'access-directory'],
    queryFn: () => hrApi.employees({ page: 1, pageSize: 200 }),
  });

  const rawEmployees = employeesQuery.data?.employees || [];

  // Filtered List
  const filteredEmployees = useMemo(() => {
    return rawEmployees.filter((emp) => {
      const isEmpActive = String(emp.status || '') === 'active';
      if (statusFilter === 'active' && !isEmpActive) return false;
      if (statusFilter === 'inactive' && isEmpActive) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const name = `${emp.displayName || ''} ${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const empNo = String(emp.employeeNo || '').toLowerCase();
        const phone = String(emp.mobile || emp.phone || '').toLowerCase();
        return name.includes(q) || empNo.includes(q) || phone.includes(q);
      }
      return true;
    });
  }, [rawEmployees, searchTerm, statusFilter]);

  // Primary Source Mutation: Set Employee Credentials (Phone & PIN)
  const handleSaveCredentials = async () => {
    if (!editingEmployee || !editingEmployee.id) return;
    const cleanPin = pinInput.trim();
    const cleanPhone = phoneInput.trim();

    if (cleanPin && cleanPin.length < 4) {
      systemAlert('يرجى إدخال رمز PIN لا يقل عن 4 أرقام');
      return;
    }

    if (!cleanPhone && !cleanPin) {
      systemAlert('يرجى إدخال رقم الهاتف أو رمز الـ PIN على الأقل');
      return;
    }

    setIsSubmitting(true);
    try {
      await hrApi.updateEmployeeCredentials(String(editingEmployee.id), {
        phone: cleanPhone || undefined,
        pinCode: cleanPin || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['hr'] });
      systemAlert(`تم تحديث بيانات وصول الموظف ${editingEmployee.displayName || editingEmployee.firstName} بنجاح`);
      setEditingEmployee(null);
    } catch (err: any) {
      systemAlert(err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Primary Source Mutation: Toggle Employee Status (active / deactivated)
  const toggleEmployeeStatus = async (emp: HrEmployee) => {
    const isCurrentlyActive = String(emp.status || '') === 'active';
    const nextStatus = isCurrentlyActive ? 'deactivated' : 'active';
    try {
      await hrApi.updateEmployeeStatus(String(emp.id), nextStatus);
      await queryClient.invalidateQueries({ queryKey: ['hr'] });
      systemAlert(`تم ${isCurrentlyActive ? 'إيقاف حساب' : 'تفعيل'} الموظف بنجاح`);
    } catch (err: any) {
      systemAlert(err.message || 'حدث خطأ أثناء تعديل حالة الموظف');
    }
  };

  const copyUrl = (path: string, label: string) => {
    const url = window.location.origin + path;
    navigator.clipboard.writeText(url);
    systemAlert(`تم نسخ رابط ${label} إلى الحافظة:\n${url}`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* Header Info Banner */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#170e5e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SmartphoneIcon size={22} color="#170e5e" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              إدارة وصول موظفي الخدمة الذاتية وبصمة الموبايل
            </h4>
            <span style={{ fontSize: '12px', color: '#64748b' }}>
              تعيين وتغيير رموز الـ PIN السريعة لبصمة الموبايل الذكية (GPS) وبوابة الموظف الذاتية (ESS).
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            variant="secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => navigate('/hr/employees')}
          >
            سجل الموظفين في الموارد البشرية ↗
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          background: '#ffffff',
          padding: '12px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <input
            type="text"
            placeholder="بحث بالاسم أو كود الموظف أو الموبايل..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              boxSizing: 'border-box',
            }}
          />
          <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#94a3b8' }}>
            <SearchIcon size={16} />
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
          {(
            [
              { key: 'all', label: `الكل (${rawEmployees.length})` },
              { key: 'active', label: `نشط (${rawEmployees.filter((e) => String(e.status || '') === 'active').length})` },
              { key: 'inactive', label: `موقوف (${rawEmployees.filter((e) => String(e.status || '') !== 'active').length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              style={{
                border: 'none',
                background: statusFilter === t.key ? '#170e5e' : 'transparent',
                color: statusFilter === t.key ? '#ffffff' : '#475569',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employees Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>الموظف</th>
              <th style={{ padding: '10px 10px', fontWeight: 700 }}>القسم والوظيفة</th>
              <th style={{ padding: '10px 10px', fontWeight: 700 }}>الموبايل</th>
              <th style={{ padding: '10px 10px', fontWeight: 700 }}>رمز الـ PIN</th>
              <th style={{ padding: '10px 8px', fontWeight: 700 }}>البوابات</th>
              <th style={{ padding: '10px 8px', fontWeight: 700 }}>الحالة</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {employeesQuery.isLoading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل بيانات الموظفين...
                </td>
              </tr>
            ) : filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا يوجد موظفون مطابقون للفلاتر.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => {
                const isActive = String(emp.status || '') === 'active';
                const phone = emp.mobile || emp.phone;
                const empName = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'موظف';

                return (
                  <tr key={emp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13px' }}>{empName}</div>
                      {emp.employeeNo && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          كود: {emp.employeeNo}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <div style={{ color: '#334155', fontWeight: 600, fontSize: '12px' }}>{emp.departmentName || '—'}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{emp.jobTitleName || emp.positionName || '—'}</div>
                    </td>
                    <td style={{ padding: '10px 10px', direction: 'ltr', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px' }}>
                      {phone || <span style={{ color: '#dc2626', fontSize: '11px' }}>ناقص موبايل</span>}
                    </td>
                    <td style={{ padding: '10px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 7px',
                          background: emp.pinCode || emp.pin_code ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${emp.pinCode || emp.pin_code ? '#bbf7d0' : '#fecaca'}`,
                          color: emp.pinCode || emp.pin_code ? '#15803d' : '#b91c1c',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          letterSpacing: '1px',
                          fontSize: '11.5px',
                        }}
                      >
                        {emp.pinCode || emp.pin_code ? `•••• (${emp.pinCode || emp.pin_code})` : 'لم يعين PIN'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        <span
                          onClick={() => copyUrl('/portal', 'بوابة الموظف الذاتية')}
                          title="انقر لنسخ رابط بوابة الموظف (/portal)"
                          style={{
                            fontSize: '10.5px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #dbeafe',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CopyIcon size={10} /> بوابة
                        </span>
                        <span
                          onClick={() => copyUrl('/punch', 'بصمة الموبايل الذكية')}
                          title="انقر لنسخ رابط بصمة الموبايل (/punch)"
                          style={{
                            fontSize: '10.5px',
                            background: '#f0fdf4',
                            color: '#15803d',
                            border: '1px solid #dcfce7',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <CopyIcon size={10} /> بصمة
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isActive ? '#ecfdf5' : '#fef2f2',
                          color: isActive ? '#065f46' : '#991b1b',
                          border: `1px solid ${isActive ? '#a7f3d0' : '#fecaca'}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {isActive ? <CheckCircleIcon size={11} /> : <XCircleIcon size={11} />}
                        {isActive ? 'نشط' : 'موقوف'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
                        <Button
                          variant="secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                          onClick={() => {
                            setEditingEmployee(emp);
                            setPhoneInput(emp.phone || emp.mobile || '');
                            setPinInput(emp.pinCode || emp.pin_code || '');
                          }}
                        >
                          تعديل الـ PIN والهاتف
                        </Button>
                        <Button
                          variant={isActive ? 'danger' : 'secondary'}
                          style={{ fontSize: '11px', padding: '3px 8px', whiteSpace: 'nowrap' }}
                          onClick={() => toggleEmployeeStatus(emp)}
                        >
                          {isActive ? 'إيقاف' : 'تفعيل'}
                        </Button>
                        <Button
                          variant="secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', color: '#170e5e', fontWeight: 700, whiteSpace: 'nowrap' }}
                          onClick={() => navigate(`/hr/employees/${emp.id}`)}
                          title="فتح ملف الموظف الكامل في الموارد البشرية"
                        >
                          الملف ↗
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Credentials Modal */}
      {editingEmployee && (
        <DialogShell
          open={Boolean(editingEmployee)}
          onClose={() => setEditingEmployee(null)}
          width="min(500px, 95vw)"
          ariaLabel="تعديل بيانات الدخول للموظف"
        >
          <div
            className="dialog-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px 28px',
              boxSizing: 'border-box',
            }}
            dir="rtl"
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
              }}
            >
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>
                تعديل بيانات الدخول: {editingEmployee.displayName || editingEmployee.firstName}
              </h3>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '18px',
                  color: '#94a3b8',
                  lineHeight: 1,
                  padding: '4px',
                }}
                title="إغلاق"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px',
                color: '#475569',
                lineHeight: 1.5,
              }}
            >
              يستخدم الموظف رقم الهاتف المحمول والرمز السري (PIN) لتسجيل بصمة الحضور والانصراف الذكية (GPS) وللدخول إلى بوابة الموظف الذاتية (ESS).
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رقم الهاتف المحمول (معرف تسجيل الدخول للبوابات الذاتية)
              </label>
              <input
                type="text"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="مثال: 01012345678"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  direction: 'ltr',
                  textAlign: 'right',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                رمز الدخول السريع (PIN - من 4 إلى 6 أرقام)
              </label>
              <input
                type="text"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="مثال: 1234"
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  fontSize: '16px',
                  direction: 'ltr',
                  textAlign: 'center',
                  fontFamily: 'monospace',
                  letterSpacing: '3px',
                  fontWeight: 800,
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setEditingEmployee(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                style={{ background: '#170e5e', borderColor: '#170e5e' }}
                onClick={handleSaveCredentials}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </Button>
            </div>
          </div>
        </DialogShell>
      )}
    </div>
  );
}
