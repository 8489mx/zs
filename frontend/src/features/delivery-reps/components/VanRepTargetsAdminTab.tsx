import { useState } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/shared/ui/button';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { toast } from '@/shared/components/system-alert';
import { vanSalesApi, type RepTargetSummary } from '../api/van-sales.api';
import {
  RefreshCwIcon,
  SlidersIcon,
} from '@/shared/components/icons/AppIcons';

function getCurrentMonthString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function VanRepTargetsAdminTab() {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [editingTargetRep, setEditingTargetRep] = useState<RepTargetSummary | null>(null);
  const [targetAmountInput, setTargetAmountInput] = useState<string>('');

  const {
    data: targets = [],
    isLoading,
    refetch,
  } = useQuery<RepTargetSummary[]>({
    queryKey: ['van-admin-rep-targets', selectedMonth],
    queryFn: () => vanSalesApi.listRepTargets(selectedMonth),
  });

  const totalTargetAmount = targets.reduce((sum, t) => sum + (t.targetAmount || 0), 0);
  const totalActualSales = targets.reduce((sum, t) => sum + (t.actualSales || 0), 0);
  const overallAchievementRate = totalTargetAmount > 0 ? (totalActualSales / totalTargetAmount) * 100 : 0;
  const achievedRepsCount = targets.filter((t) => t.isTargetAchieved).length;

  const setTargetMutation = useMutation({
    mutationFn: ({ repId, month, targetAmount }: { repId: number; month: string; targetAmount: number }) =>
      vanSalesApi.setRepTarget(repId, month, targetAmount),
    onSuccess: () => {
      toast.success('تم حفظ وتحديث المستهدف البيعي للمندوب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['van-admin-rep-targets'] });
      setEditingTargetRep(null);
      setTargetAmountInput('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل حفظ المستهدف البيعي');
    },
  });

  const openSetTargetModal = (rep: RepTargetSummary) => {
    setEditingTargetRep(rep);
    setTargetAmountInput(rep.targetAmount ? String(rep.targetAmount) : '');
  };

  const handleSaveTarget = () => {
    if (!editingTargetRep) return;
    const amount = parseFloat(targetAmountInput);
    if (isNaN(amount) || amount < 0) {
      toast.warning('يرجى إدخال قيمة مستهدف صحيحة');
      return;
    }
    setTargetMutation.mutate({
      repId: editingTargetRep.repId,
      month: selectedMonth,
      targetAmount: amount,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'block' }}>إجمالي مستهدف مبيعات الشهر</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', display: 'block', marginTop: '4px' }}>
            {totalTargetAmount.toFixed(2)} <span style={{ fontSize: '13px', color: '#a5b4fc' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>المبيعات الفعلية المحققة حتى الآن</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {totalActualSales.toFixed(2)} <span style={{ fontSize: '13px', color: '#86efac' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#0284c7', display: 'block' }}>نسبة تحقيق المستهدف العام</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#0369a1', display: 'block', marginTop: '4px' }}>
            {overallAchievementRate.toFixed(1)}%
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', display: 'block' }}>المناديب المحققين للتارجت</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', display: 'block', marginTop: '4px' }}>
            {achievedRepsCount} <span style={{ fontSize: '13px', color: '#f59e0b' }}>من أصل {targets.length}</span>
          </span>
        </div>
      </div>

      {/* Control Bar: Month Picker */}
      <div
        style={{
          background: '#ffffff',
          padding: '12px 16px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
            شهر التارجت والمبيعات:
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              fontWeight: 700,
              color: '#1e293b',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            (الحسابات اليومية تستبعد أيام الجمعة والعطلات الرسمية تلقائياً)
          </span>
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            إجمالي المناديب: {targets.length}
          </span>
          <Button
            variant="secondary"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => refetch()}
          >
            <RefreshCwIcon size={13} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Targets Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflowX: 'auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
            جاري احتساب مستهدفات ومبيعات المناديب...
          </div>
        ) : targets.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
            لا يوجد مناديب مسجلين بالنظام حالياً.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>مندوب التوزيع</th>
                <th style={{ padding: '10px 14px', fontWeight: 700 }}>المركبة</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>مستهدف الشهر</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المبيعات الفعلية</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center', minWidth: '150px' }}>نسبة الإنجاز</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المتبقي للتارجت</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>أيام العمل المتبقية</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>المطلوب بيعه يومياً</th>
                <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => {
                const rate = t.achievementRate;
                const progressColor =
                  rate >= 100 ? '#16a34a' : rate >= 70 ? '#2563eb' : rate >= 40 ? '#d97706' : '#dc2626';

                return (
                  <tr key={t.repId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px' }}>{t.repName}</div>
                      {t.phone && (
                        <div style={{ fontSize: '11px', color: '#64748b', direction: 'ltr', textAlign: 'right' }}>
                          {t.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {t.vehiclePlate ? (
                        <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#334155', padding: '2px 7px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                          لوحة: {t.vehiclePlate}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>بدون سيارة</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                      {t.targetAmount > 0 ? (
                        <>
                          {t.targetAmount.toFixed(2)} <CurrencySymbol />
                        </>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>غير محدد</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#15803d' }}>
                      {t.actualSales.toFixed(2)} <CurrencySymbol />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '11px', fontWeight: 700, color: progressColor }}>
                          <span>{rate.toFixed(1)}%</span>
                          {t.isTargetAchieved && <span>تم الإنجاز</span>}
                        </div>
                        <div style={{ width: '100%', height: '7px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.min(100, rate)}%`,
                              height: '100%',
                              backgroundColor: progressColor,
                              borderRadius: '4px',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                      {t.isTargetAchieved ? (
                        <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                          تم تحقيق المستهدف
                        </span>
                      ) : (
                        <span style={{ color: '#b91c1c' }}>
                          {t.remainingTarget.toFixed(2)} <CurrencySymbol />
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#475569' }}>
                      {t.remainingWorkingDays} <span style={{ fontSize: '11px', color: '#94a3b8' }}>يوم عمل</span>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800 }}>
                      {t.isTargetAchieved ? (
                        <span style={{ color: '#16a34a' }}>0.00</span>
                      ) : t.requiredDailyTarget > 0 ? (
                        <span style={{ color: '#2563eb' }}>
                          {t.requiredDailyTarget.toFixed(2)} <CurrencySymbol />
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        style={{ fontSize: '11.5px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => openSetTargetModal(t)}
                      >
                        <SlidersIcon size={12} />
                        تعديل التارجت
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Set Target Modal */}
      {editingTargetRep && (
        <StandardDialog
          open={Boolean(editingTargetRep)}
          onClose={() => setEditingTargetRep(null)}
          title={`تحديد مستهدف المبيعات الشهري للمندوب`}
          subtitle={`المندوب: ${editingTargetRep.repName} • شهر: ${selectedMonth}`}
          maxWidth="460px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12.5px', color: '#334155' }}>
                <strong>المبيعات الفعلية حتى اليوم:</strong> {editingTargetRep.actualSales.toFixed(2)} <CurrencySymbol />
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                أيام العمل المتبقية بالشهر (باستثناء الجمع والعطلات): <strong>{editingTargetRep.remainingWorkingDays} يوم</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                قيمة المستهدف البيعي للشهر ({selectedMonth}) <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="مثال: 50000"
                  value={targetAmountInput}
                  onChange={(e) => setTargetAmountInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: 800,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Live Required Daily Sales Preview */}
            {parseFloat(targetAmountInput) > 0 && editingTargetRep.remainingWorkingDays > 0 && (
              <div style={{ backgroundColor: '#eff6ff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1e40af' }}>
                المطلوب تحقيقه يومياً للمندوب خلال الأيام المتبقية:
                <strong style={{ display: 'block', fontSize: '14px', color: '#1d4ed8', marginTop: '2px' }}>
                  {Math.max(
                    0,
                    (parseFloat(targetAmountInput) - editingTargetRep.actualSales) / editingTargetRep.remainingWorkingDays,
                  ).toFixed(2)}{' '}
                  <CurrencySymbol /> / يوم
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <Button variant="secondary" onClick={() => setEditingTargetRep(null)}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                disabled={setTargetMutation.isPending}
                onClick={handleSaveTarget}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {setTargetMutation.isPending ? 'جاري الحفظ...' : 'حفظ المستهدف البيعي'}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
