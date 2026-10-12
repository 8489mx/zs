import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { toast } from '@/shared/components/system-alert';
import { PlusCircleIcon, TrashIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';
import { formatCurrency } from '@/lib/format';

interface PosTipPoolModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: number | null;
  currency?: string;
  initialCashTips?: number;
  initialCardTips?: number;
}

interface StaffMember {
  employeeId: number;
  employeeName: string;
  roleName: string;
  hoursWorked: number;
  pointWeight: number;
}

export function PosTipPoolModal({
  open,
  onClose,
  branchId: _branchId,
  currency = 'ج.م',
  initialCashTips = 0,
  initialCardTips = 0,
}: PosTipPoolModalProps) {
  const queryClient = useQueryClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [shiftDate] = useState(todayStr);
  const [shiftName] = useState('وردية اليوم');
  const [cashTips, setCashTips] = useState<number>(initialCashTips || 250);
  const [cardTips, setCardTips] = useState<number>(initialCardTips || 450);
  const [distributionMethod, setDistributionMethod] = useState<'roles' | 'hours' | 'equal'>('roles');
  const [notes] = useState('');

  // Default team members
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { employeeId: 1, employeeName: 'أحمد محمود', roleName: 'waiter', hoursWorked: 8, pointWeight: 1.2 },
    { employeeId: 2, employeeName: 'محمد سعيد', roleName: 'waiter', hoursWorked: 8, pointWeight: 1.2 },
    { employeeId: 3, employeeName: 'كريم عادل', roleName: 'captain', hoursWorked: 8, pointWeight: 1.5 },
    { employeeId: 4, employeeName: 'عمر ياسين', roleName: 'barista', hoursWorked: 8, pointWeight: 1.0 },
    { employeeId: 5, employeeName: 'الشيف إبراهيم', roleName: 'kitchen', hoursWorked: 8, pointWeight: 0.8 },
  ]);

  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('waiter');
  const [newStaffHours] = useState(8);

  const totalTips = Number((cashTips + cardTips).toFixed(2));

  // Compute live preview of allocations
  const roleWeights: Record<string, number> = {
    waiter: 1.2,
    captain: 1.5,
    barista: 1.0,
    kitchen: 0.8,
    cashier: 0.8,
  };

  let totalScore = 0;
  const computedStaff = staffList.map((s) => {
    let weight = s.pointWeight || 1;
    if (distributionMethod === 'roles') {
      weight = roleWeights[s.roleName] || 1;
    } else if (distributionMethod === 'equal') {
      weight = 1;
    }

    const score = distributionMethod === 'equal' ? 1 : weight * (distributionMethod === 'hours' ? s.hoursWorked : 1);
    totalScore += score;
    return { ...s, weight, score };
  });

  const previewAllocations = computedStaff.map((s) => {
    const amount = totalScore > 0 ? (s.score / totalScore) * totalTips : 0;
    return {
      ...s,
      allocatedAmount: Number(amount.toFixed(2)),
    };
  });

  const calculateMutation = useMutation({
    mutationFn: () =>
      restaurantAdvancedFnbApi.calculateTipPool({
        shiftDate,
        shiftName,
        totalCashTips: cashTips,
        totalCardTips: cardTips,
        distributionMethod,
        notes,
        staff: staffList.map((s) => ({
          employeeId: s.employeeId,
          employeeName: s.employeeName,
          roleName: s.roleName,
          hoursWorked: s.hoursWorked,
          pointWeight: s.pointWeight,
        })),
      }),
    onSuccess: async (res) => {
      toast.success(`تم حفظ مجمع الإكراميات (${formatCurrency(res.totalTips, currency)}) واعتماد حصص الطاقم`);
      // Auto confirm distribution
      if (res.pool?.id) {
        await restaurantAdvancedFnbApi.confirmTipDistribution(res.pool.id);
      }
      queryClient.invalidateQueries({ queryKey: ['restaurant-tip-pools'] });
      onClose();
    },
    onError: () => {
      toast.error('تعذر حفظ وتوزيع مجمع الإكراميات');
    },
  });

  const handleAddStaff = () => {
    if (!newStaffName.trim()) {
      toast.warning('يرجى إدخال اسم الموظف');
      return;
    }
    const newId = Date.now();
    setStaffList([
      ...staffList,
      {
        employeeId: newId,
        employeeName: newStaffName.trim(),
        roleName: newStaffRole,
        hoursWorked: Number(newStaffHours) || 8,
        pointWeight: roleWeights[newStaffRole] || 1,
      },
    ]);
    setNewStaffName('');
  };

  const handleRemoveStaff = (id: number) => {
    setStaffList(staffList.filter((s) => s.employeeId !== id));
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title="مجمع الإكراميات وتوزيع حصص الوردية (Tip Pooling & Distribution Engine)"
      subtitle="حساب وتوزيع إكراميات الكاشير والبطاقات على طاقم الصالة والمطبخ وفق معايير Toast و Foodics العالمية"
      width="min(1040px, 96vw)"
      compact
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Top Summary Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
          }}
        >
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إكراميات نقدية (Cash Tips)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <input
                type="number"
                value={cashTips}
                onChange={(e) => setCashTips(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#16a34a',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>{currency}</span>
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>إكراميات البطاقات والـ QR</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <input
                type="number"
                value={cardTips}
                onChange={(e) => setCardTips(Math.max(0, Number(e.target.value)))}
                style={{
                  width: '100%',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#2563eb',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 8px',
                }}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>{currency}</span>
            </div>
          </div>

          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>إجمالي مجمع الوردية للتقسيم</div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#170e5e', marginTop: '4px' }}>
              {formatCurrency(totalTips, currency)}
            </div>
          </div>

          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
            <div style={{ fontSize: '11px', color: '#475569', fontWeight: 700, marginBottom: '4px' }}>نموذج التوزيع:</div>
            <select
              value={distributionMethod}
              onChange={(e) => setDistributionMethod(e.target.value as any)}
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '12px',
                fontWeight: 700,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
              }}
            >
              <option value="roles">أوزان الأدوار الوظيفية (Role-Based Points)</option>
              <option value="hours">ساعات العمل الفعلية (Hours Worked)</option>
              <option value="equal">التساوي بين الجميع (Equal Split)</option>
            </select>
          </div>
        </div>

        {/* Staff Table & Fast Add */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
          <div
            style={{
              padding: '8px 12px',
              background: '#f1f5f9',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
              طاقم الوردية المستحق للإكرامية ({staffList.length} موظف)
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="اسم الموظف..."
                value={newStaffName}
                onChange={(e) => setNewStaffName(e.target.value)}
                style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', width: '130px' }}
              />
              <select
                value={newStaffRole}
                onChange={(e) => setNewStaffRole(e.target.value)}
                style={{ padding: '4px 6px', fontSize: '12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="waiter">ويتر صالة</option>
                <option value="captain">كابتن صالة</option>
                <option value="barista">باريستا</option>
                <option value="kitchen">طاقم المطبخ</option>
                <option value="cashier">كاشير</option>
              </select>
              <button
                type="button"
                onClick={handleAddStaff}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  background: '#170e5e',
                  color: '#fff',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <PlusCircleIcon size={13} />
                <span>إضافة</span>
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '8px 12px' }}>اسم الموظف</th>
                  <th style={{ padding: '8px 12px' }}>الدور الوظيفي</th>
                  <th style={{ padding: '8px 12px' }}>ساعات الوردية</th>
                  <th style={{ padding: '8px 12px' }}>الوزن النسبي</th>
                  <th style={{ padding: '8px 12px' }}>الحصة المحسوبة</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {previewAllocations.map((staff, idx) => (
                  <tr key={staff.employeeId} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fcfcfd' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#0f172a' }}>{staff.employeeName}</td>
                    <td style={{ padding: '8px 12px', color: '#475569' }}>
                      {staff.roleName === 'captain' && 'كابتن صالة'}
                      {staff.roleName === 'waiter' && 'ويتر صالة'}
                      {staff.roleName === 'barista' && 'باريستا'}
                      {staff.roleName === 'kitchen' && 'شيف / مطبخ'}
                      {staff.roleName === 'cashier' && 'كاشير'}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#0f172a' }}>{staff.hoursWorked} س</td>
                    <td style={{ padding: '8px 12px', color: '#64748b' }}>{staff.weight}x</td>
                    <td style={{ padding: '8px 12px', fontWeight: 800, color: '#16a34a' }}>
                      {formatCurrency(staff.allocatedAmount, currency)}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(staff.employeeId)}
                        style={{ border: 'none', background: 'transparent', color: '#dc2626', cursor: 'pointer', padding: '2px' }}
                        title="حذف"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            سيتم ترحيل مستحقات كل موظف وإمكانية طباعة إيصالات الصرف الحرارية فور الاعتماد.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => calculateMutation.mutate()}
              disabled={calculateMutation.isPending || totalTips <= 0 || staffList.length === 0}
              style={{
                padding: '7px 20px',
                borderRadius: '8px',
                background: '#170e5e',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckCircleIcon size={15} />
              <span>اعتماد وصرف الإكراميات</span>
            </button>
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
