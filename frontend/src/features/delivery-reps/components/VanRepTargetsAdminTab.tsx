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
  const [collectionTargetInput, setCollectionTargetInput] = useState<string>('');
  const [visitsTargetInput, setVisitsTargetInput] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    data: targets = [],
    isLoading,
    refetch,
  } = useQuery<RepTargetSummary[]>({
    queryKey: ['van-admin-rep-targets', selectedMonth],
    queryFn: () => vanSalesApi.listRepTargets(selectedMonth),
  });

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['van-admin-rep-targets'] }),
        refetch(),
      ]);
      await new Promise((r) => setTimeout(r, 450));
      toast.success('تم تحديث مستهدفات المناديب بنجاح');
    } catch {
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  const totalTargetAmount = targets.reduce((sum, t) => sum + (t.targetAmount || 0), 0);
  const totalActualSales = targets.reduce((sum, t) => sum + (t.actualSales || 0), 0);
  const overallAchievementRate = totalTargetAmount > 0 ? (totalActualSales / totalTargetAmount) * 100 : 0;
  const achievedRepsCount = targets.filter((t) => t.isTargetAchieved).length;

  const setTargetMutation = useMutation({
    mutationFn: ({
      repId,
      month,
      targetAmount,
      collectionTarget,
      visitsTarget,
    }: {
      repId: number;
      month: string;
      targetAmount: number;
      collectionTarget?: number | null;
      visitsTarget?: number | null;
    }) => vanSalesApi.setRepTarget(repId, month, targetAmount, collectionTarget, visitsTarget),
    onSuccess: () => {
      toast.success('تم حفظ وتحديث مستهدفات المندوب بنجاح');
      queryClient.invalidateQueries({ queryKey: ['van-admin-rep-targets'] });
      setEditingTargetRep(null);
      setTargetAmountInput('');
      setCollectionTargetInput('');
      setVisitsTargetInput('');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'فشل حفظ المستهدفات');
    },
  });

  const openSetTargetModal = (rep: RepTargetSummary) => {
    setEditingTargetRep(rep);
    setTargetAmountInput(rep.targetAmount ? String(rep.targetAmount) : '');
    setCollectionTargetInput(rep.collectionTarget ? String(rep.collectionTarget) : '');
    setVisitsTargetInput(rep.visitsTarget ? String(rep.visitsTarget) : '');
  };

  const handleSaveTarget = () => {
    if (!editingTargetRep) return;
    const amount = parseFloat(targetAmountInput);
    if (isNaN(amount) || amount < 0) {
      toast.warning('يرجى إدخال قيمة مستهدف مبيعات صحيحة');
      return;
    }
    const colAmount = collectionTargetInput.trim() !== '' ? parseFloat(collectionTargetInput) : null;
    if (colAmount !== null && (isNaN(colAmount) || colAmount < 0)) {
      toast.warning('يرجى إدخال قيمة مستهدف تحصيل صحيحة أو تركها فارغة');
      return;
    }
    const visAmount = visitsTargetInput.trim() !== '' ? parseInt(visitsTargetInput, 10) : null;
    if (visAmount !== null && (isNaN(visAmount) || visAmount < 0)) {
      toast.warning('يرجى إدخال عدد زيارات صحيح أو تركها فارغة');
      return;
    }

    setTargetMutation.mutate({
      repId: editingTargetRep.repId,
      month: selectedMonth,
      targetAmount: amount,
      collectionTarget: colAmount,
      visitsTarget: visAmount,
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#4338ca', display: 'block' }}>إجمالي مستهدف مبيعات الشهر</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#312e81', display: 'block', marginTop: '4px' }}>
            {Math.round(totalTargetAmount).toLocaleString()} <span style={{ fontSize: '13px', color: '#a5b4fc' }}><CurrencySymbol /></span>
          </span>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'block' }}>المبيعات الفعلية المحققة حتى الآن</span>
          <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d', display: 'block', marginTop: '4px' }}>
            {totalActualSales % 1 === 0 ? Math.round(totalActualSales).toLocaleString() : totalActualSales.toFixed(2)} <span style={{ fontSize: '13px', color: '#86efac' }}><CurrencySymbol /></span>
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
            disabled={isRefreshing}
            style={{
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: isRefreshing ? 'wait' : 'pointer',
              opacity: isRefreshing ? 0.75 : 1,
            }}
            onClick={handleManualRefresh}
            title="تحديث مستهدفات المناديب من السيرفر"
          >
            <RefreshCwIcon
              size={13}
              className={isRefreshing ? 'spin-animation' : undefined}
              style={isRefreshing ? { animation: 'spin 0.75s linear infinite' } : undefined}
            />
            {isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}
          </Button>
        </div>
      </div>

      {/* Targets Table (Zero Horizontal Scroll Standard) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          width: '100%',
          boxSizing: 'border-box',
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
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              textAlign: 'right',
              fontSize: '12px',
              tableLayout: 'fixed',
            }}
          >
            <colgroup>
              <col style={{ width: '16%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>مندوب التوزيع</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, fontSize: '11.5px' }}>المركبة</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>مستهدف الشهر</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المبيعات</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>نسبة الإنجاز</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المتبقي</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>أيام متبقية</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>المطلوب يومياً</th>
                <th style={{ padding: '9px 6px', fontWeight: 700, textAlign: 'center', fontSize: '11.5px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {targets.map((t) => {
                const rate = t.achievementRate;
                const progressColor =
                  rate >= 100 ? '#16a34a' : rate >= 70 ? '#2563eb' : rate >= 40 ? '#d97706' : '#dc2626';

                return (
                  <tr key={t.repId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 6px' }}>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.repName}</div>
                      {t.phone && (
                        <div style={{ fontSize: '10.5px', color: '#64748b', direction: 'ltr', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {t.phone}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px' }}>
                      {t.vehiclePlate ? (
                        <span style={{ fontSize: '10.5px', background: '#f1f5f9', color: '#334155', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e2e8f0', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          لوحة: {t.vehiclePlate}
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>بدون سيارة</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {t.targetAmount > 0 ? (
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>
                          {Math.round(t.targetAmount).toLocaleString()} <CurrencySymbol />
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>غير محدد</span>
                      )}
                      {t.collectionTarget && t.collectionTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '2px', fontWeight: 600 }}>
                          تحصيل: {Math.round(t.collectionTarget).toLocaleString()} <CurrencySymbol />
                        </div>
                      ) : null}
                      {t.visitsTarget && t.visitsTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px', fontWeight: 600 }}>
                          زيارات: {t.visitsTarget.toLocaleString()}
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 800, color: '#15803d' }}>
                        {t.actualSales % 1 === 0 ? Math.round(t.actualSales).toLocaleString() : t.actualSales.toFixed(2)} <CurrencySymbol />
                      </div>
                      {t.collectionTarget && t.collectionTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#0284c7', marginTop: '2px', fontWeight: 600 }}>
                          محصل: {Math.round(t.actualCollections || 0).toLocaleString()} ({t.collectionAchievementRate ?? 0}%)
                        </div>
                      ) : null}
                      {t.visitsTarget && t.visitsTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#6d28d9', marginTop: '1px', fontWeight: 600 }}>
                          زار: {(t.actualVisits || 0).toLocaleString()} ({t.visitsAchievementRate ?? 0}%)
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      {t.targetAmount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10.5px', fontWeight: 700, color: progressColor }}>
                            <span>{rate.toFixed(1)}%</span>
                            {t.isTargetAchieved && <span>تم الإنجاز</span>}
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
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
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {t.targetAmount > 0 ? (
                        <>
                          {t.isTargetAchieved ? (
                            <span style={{ fontSize: '10.5px', color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '1px 6px', borderRadius: '4px', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                              تم الإنجاز
                            </span>
                          ) : (
                            <div style={{ color: '#b91c1c', fontWeight: 700 }}>
                              {Math.round(t.remainingTarget).toLocaleString()} <CurrencySymbol />
                            </div>
                          )}
                          {t.collectionTarget && t.collectionTarget > 0 ? (
                            <div style={{ fontSize: '10px', color: t.isCollectionAchieved ? '#16a34a' : '#c2410c', marginTop: '2px', fontWeight: 600 }}>
                              {t.isCollectionAchieved ? 'تحصيل مكتمل' : `متبقي تحصيل: ${Math.round(t.remainingCollection || 0).toLocaleString()}`}
                            </div>
                          ) : null}
                          {t.visitsTarget && t.visitsTarget > 0 ? (
                            <div style={{ fontSize: '10px', color: t.isVisitsAchieved ? '#16a34a' : '#6d28d9', marginTop: '1px', fontWeight: 600 }}>
                              {t.isVisitsAchieved ? 'زيارات مكتملة' : `متبقي زيارات: ${(t.remainingVisits || 0).toLocaleString()}`}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#475569', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {t.remainingWorkingDays} <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>يوم</span>
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                      {t.isTargetAchieved ? (
                        <div style={{ color: '#16a34a', fontWeight: 800 }}>0</div>
                      ) : t.requiredDailyTarget > 0 ? (
                        <div style={{ color: '#2563eb', fontWeight: 800 }}>
                          {Math.ceil(t.requiredDailyTarget).toLocaleString()} <CurrencySymbol />
                        </div>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>—</span>
                      )}
                      {t.collectionTarget && t.collectionTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#0369a1', marginTop: '2px', fontWeight: 600 }}>
                          تحصيل: {Math.ceil(t.requiredDailyCollection || 0).toLocaleString()} <CurrencySymbol />/يوم
                        </div>
                      ) : null}
                      {t.visitsTarget && t.visitsTarget > 0 ? (
                        <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '1px', fontWeight: 600 }}>
                          زيارات: {(t.requiredDailyVisits || 0).toLocaleString()} زيارة/يوم
                        </div>
                      ) : null}
                    </td>
                    <td style={{ padding: '8px 6px', textAlign: 'center' }}>
                      <Button
                        variant="secondary"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}
                        onClick={() => openSetTargetModal(t)}
                      >
                        <SlidersIcon size={11} />
                        ضبط التارجت
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
          title={`تحديد مستهدفات المندوب (المبيعات والتحصيل والزيارات)`}
          subtitle={`المندوب: ${editingTargetRep.repName} • شهر: ${selectedMonth}`}
          maxWidth="480px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '12.5px', color: '#334155' }}>
                <strong>المبيعات الفعلية حتى اليوم:</strong> {editingTargetRep.actualSales.toFixed(2)} <CurrencySymbol />
              </div>
              {editingTargetRep.actualCollections !== undefined && editingTargetRep.actualCollections > 0 && (
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  <strong>التحصيل النقدي الفعلي:</strong> {editingTargetRep.actualCollections.toFixed(2)} <CurrencySymbol />
                </div>
              )}
              {editingTargetRep.actualVisits !== undefined && editingTargetRep.actualVisits > 0 && (
                <div style={{ fontSize: '12.5px', color: '#334155' }}>
                  <strong>الزيارات الميدانية الفعلية:</strong> {editingTargetRep.actualVisits} زيارة
                </div>
              )}
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                أيام العمل المتبقية بالشهر (باستثناء الجمع والعطلات): <strong>{editingTargetRep.remainingWorkingDays} يوم</strong>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                مستهدف المبيعات الشهري ({selectedMonth}) <span style={{ color: '#dc2626' }}>*</span>
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

            {/* Optional Field: Collection Target */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مستهدف التحصيل النقدي <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(اختياري - ج.م)</span>
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="اختياري - مثلاً: 40000"
                value={collectionTargetInput}
                onChange={(e) => setCollectionTargetInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                إجمالي النقدية المستهدف تحصيلها من المبيعات وسندات القبض الميدانية
              </span>
            </div>

            {/* Optional Field: Visits Target */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                مستهدف الزيارات الميدانية <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>(اختياري - زيارة)</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="اختياري - مثلاً: 150"
                value={visitsTargetInput}
                onChange={(e) => setVisitsTargetInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  boxSizing: 'border-box',
                }}
              />
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '3px' }}>
                إجمالي الزيارات الميدانية المستهدفة للعملاء خلال الشهر
              </span>
            </div>

            {/* Live Required Daily Pacing Preview (Sales, Collection, Visits) */}
            {editingTargetRep.remainingWorkingDays > 0 && (
              parseFloat(targetAmountInput) > 0 ||
              parseFloat(collectionTargetInput) > 0 ||
              parseFloat(visitsTargetInput) > 0
            ) && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 800, color: '#170e5e', marginBottom: '8px' }}>
                  المطلوب تحقيقه يومياً للمندوب خلال الأيام المتبقية ({editingTargetRep.remainingWorkingDays} يوم عمل):
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: '8px',
                  }}
                >
                  {parseFloat(targetAmountInput) > 0 && (
                    <div style={{ backgroundColor: '#eff6ff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '11px', color: '#1e40af', display: 'block', fontWeight: 600 }}>مبيعات يومية:</span>
                      <strong style={{ fontSize: '13px', color: '#1d4ed8' }}>
                        {Math.ceil(
                          Math.max(
                            0,
                            (parseFloat(targetAmountInput) - (editingTargetRep.actualSales || 0)) / editingTargetRep.remainingWorkingDays,
                          ),
                        ).toLocaleString()}{' '}
                        <CurrencySymbol /> / يوم
                      </strong>
                    </div>
                  )}

                  {parseFloat(collectionTargetInput) > 0 && (
                    <div style={{ backgroundColor: '#f0fdf4', padding: '8px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                      <span style={{ fontSize: '11px', color: '#166534', display: 'block', fontWeight: 600 }}>تحصيل يومي:</span>
                      <strong style={{ fontSize: '13px', color: '#15803d' }}>
                        {Math.ceil(
                          Math.max(
                            0,
                            (parseFloat(collectionTargetInput) - (editingTargetRep.actualCollections || 0)) / editingTargetRep.remainingWorkingDays,
                          ),
                        ).toLocaleString()}{' '}
                        <CurrencySymbol /> / يوم
                      </strong>
                    </div>
                  )}

                  {parseFloat(visitsTargetInput) > 0 && (
                    <div style={{ backgroundColor: '#faf5ff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
                      <span style={{ fontSize: '11px', color: '#6b21a8', display: 'block', fontWeight: 600 }}>زيارات يومية:</span>
                      <strong style={{ fontSize: '13px', color: '#7c3aed' }}>
                        {Math.ceil(
                          Math.max(
                            0,
                            (parseFloat(visitsTargetInput) - (editingTargetRep.actualVisits || 0)) / editingTargetRep.remainingWorkingDays,
                          ),
                        ).toLocaleString()}{' '}
                        زيارة / يوم
                      </strong>
                    </div>
                  )}
                </div>
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
                {setTargetMutation.isPending ? 'جاري الحفظ...' : 'حفظ المستهدفات'}
              </Button>
            </div>
          </div>
        </StandardDialog>
      )}
    </div>
  );
}
