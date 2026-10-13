import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vanSalesApi, type VanFraudRadarEvent, type VanRepRiskProfile } from '../api/van-sales.api';
import { CustomSelect } from '@/shared/components/CustomSelect';
import { Button } from '@/shared/ui/button';
import {
  CheckShieldIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
  SearchIcon,
  ClockIcon,
  UsersIcon,
} from '@/shared/components/icons/AppIcons';

const EVENT_CODE_OPTIONS = [
  { value: 'all', label: 'جميع أنواع الشبهات والمخالفات' },
  { value: 'VAN_SUSPICION_PRICE_MANIPULATION', label: 'تلاعب بالأسعار أو البيع بأقل من التكلفة' },
  { value: 'VAN_SUSPICION_UNAUTHORIZED_BONUS', label: 'منح بونص مجاني بدون صلاحية' },
  { value: 'VAN_SUSPICION_CREDIT_BYPASS', label: 'محاولة كسر سقف الائتمان أو البيع الآجل الممنوع' },
  { value: 'VAN_SUSPICION_CROSS_REP_COLLECTION', label: 'محاولة تحصيل مديونية مندوب آخر (عميل مشترك)' },
  { value: 'VAN_SUSPICION_FRAUDULENT_RETURN', label: 'محاولة تمرير مرتجع وهمي أو مكرر أو بسعر مضخم' },
  { value: 'VAN_SUSPICION_FAKE_CARD_PAYMENT', label: 'محاولة تسجيل دفع بطاقة/شبكة وهمي بدون مرجع' },
  { value: 'VAN_SUSPICION_EXPENSE_ABUSE', label: 'تجاوز سقف مصروفات الطريق المعتمدة' },
  { value: 'VAN_SUSPICION_ODOMETER_ROLLBACK', label: 'تلاعب في قراءة عداد الكيلومترات' },
  { value: 'VAN_SUSPICION_GEOFENCE_VIOLATION', label: 'تسجيل زيارة خارج النطاق الجغرافي للعميل (GPS)' },
  { value: 'VAN_SUSPICION_SELF_APPROVAL', label: 'محاولة اعتماد عملية ذاتياً برمز المندوب' },
  { value: 'VAN_SUSPICION_INVALID_PIN', label: 'إدخال رمز اعتماد مشرف غير صحيح (تخمين PIN)' },
  { value: 'VAN_SUSPICION_UNAUTHORIZED_LOAD_OR_SETTLE', label: 'محاولة سحب بضاعة أو تصفية رحلة بدون مشرف' },
  { value: 'VAN_SUSPICION_SETTLEMENT_SHORTAGE', label: 'عجز نقدي أو مخزني فعلي عند تصفية الرحلة' },
];

const PERIOD_OPTIONS = [
  { value: '7', label: 'آخر 7 أيام' },
  { value: '30', label: 'آخر 30 يوماً' },
  { value: '90', label: 'آخر 90 يوماً' },
];

function formatMoney(val: number): string {
  return Number(val || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTimeAr(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function VanFraudRadarAdminTab() {
  const [periodDays, setPeriodDays] = useState<string>('30');
  const [selectedRepId, setSelectedRepId] = useState<string>('all');
  const [selectedEventCode, setSelectedEventCode] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    data: radarData,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['van-fraud-radar-summary', periodDays, selectedRepId],
    queryFn: () =>
      vanSalesApi.getFraudRadarSummary({
        days: Number(periodDays) || 30,
        repId: selectedRepId !== 'all' ? Number(selectedRepId) : undefined,
      }),
    staleTime: 15_000,
  });

  const repOptions = useMemo(() => {
    const base = [{ value: 'all', label: 'جميع مناديب التوزيع' }];
    if (!radarData?.repProfiles) return base;
    for (const p of radarData.repProfiles) {
      base.push({
        value: String(p.repId),
        label: `${p.repName}${p.totalSuspicionEvents > 0 ? ` (${p.totalSuspicionEvents} شبهة)` : ''}`,
      });
    }
    return base;
  }, [radarData?.repProfiles]);

  const filteredProfiles = useMemo(() => {
    const profiles = radarData?.repProfiles || [];
    if (!searchQuery.trim()) return profiles;
    const q = searchQuery.toLowerCase().trim();
    return profiles.filter(
      (p) =>
        p.repName.toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        p.flags.some((f) => f.toLowerCase().includes(q)),
    );
  }, [radarData?.repProfiles, searchQuery]);

  const filteredEvents = useMemo(() => {
    const events = radarData?.recentEvents || [];
    return events.filter((ev) => {
      if (selectedEventCode !== 'all' && ev.eventCode !== selectedEventCode) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchRep = (ev.repName || '').toLowerCase().includes(q);
        const matchCust = (ev.customerName || '').toLowerCase().includes(q);
        const matchTitle = (ev.titleAr || '').toLowerCase().includes(q);
        const matchDetails = (ev.detailsAr || '').toLowerCase().includes(q);
        return matchRep || matchCust || matchTitle || matchDetails;
      }
      return true;
    });
  }, [radarData?.recentEvents, selectedEventCode, searchQuery]);

  const kpis = radarData?.kpis;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Institutional Header Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckShieldIcon size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '3px',
                  height: '14px',
                  backgroundColor: '#170e5e',
                  borderRadius: '2px',
                  display: 'inline-block',
                }}
              />
              <h3 style={{ margin: 0, fontSize: '15.6px', fontWeight: 800, color: '#0f172a' }}>
                رادار الشبهات ومكافحة التلاعب الميداني (Van Anti-Theft & Fraud Radar)
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              رصد لحظي لكافة محاولات التلاعب المصدودة (الأسعار، البونص، التحصيل المتقاطع، المرتجعات الوهمية، العداد، والـ GPS) مع إشعار فوري لصاحب المنشأة والمشرف.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          disabled={isFetching}
          onClick={() => refetch()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12.5px',
            fontWeight: 700,
            padding: '7px 14px',
          }}
        >
          <RefreshCwIcon size={14} />
          {isFetching ? 'جارٍ الفحص...' : 'تحديث الرادار الآن'}
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            محاولات التلاعب المصدودة آلياً
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>
            {isLoading ? '—' : kpis?.blockedTamperAttemptsCount ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            تم إحباطها ومنع تأثيرها المالي فوراً
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            مناديب في دائرة الخطر العالي
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: (kpis?.highRiskRepsCount || 0) > 0 ? '#b91c1c' : '#0f172a',
            }}
          >
            {isLoading ? '—' : kpis?.highRiskRepsCount ?? 0}
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '6px' }}>
              من أصل {isLoading ? '—' : kpis?.totalRepsMonitored ?? 0} مندوب
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            تحت المراقبة المتوسطة: {isLoading ? '—' : kpis?.watchRepsCount ?? 0}
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            وقائع عجز التصفية (نقدية / بضاعة)
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: (kpis?.settlementShortageEventsCount || 0) > 0 ? '#d97706' : '#0f172a',
            }}
          >
            {isLoading ? '—' : kpis?.settlementShortageEventsCount ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            تم قيدها محاسبياً على ذمة المناديب
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '14px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
            إجمالي المبالغ محل الشبهة أو العجز
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e' }}>
            {isLoading ? '—' : `${formatMoney(kpis?.totalAmountAtRisk || 0)} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            شبهات حرجة: {isLoading ? '—' : kpis?.criticalEventsCount ?? 0} واقعة
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            الفترة الزمنية للفحص
          </label>
          <CustomSelect
            value={periodDays}
            onChange={(val) => setPeriodDays(val)}
            options={PERIOD_OPTIONS}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            تصفية حسب المندوب
          </label>
          <CustomSelect
            value={selectedRepId}
            onChange={(val) => setSelectedRepId(val)}
            options={repOptions}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            تصفية حسب نوع المخالفة
          </label>
          <CustomSelect
            value={selectedEventCode}
            onChange={(val) => setSelectedEventCode(val)}
            options={EVENT_CODE_OPTIONS}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            بحث سريع (مندوب، عميل، تفاصيل)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم المندوب أو العميل..."
              style={{
                width: '100%',
                height: '36px',
                padding: '6px 12px 6px 32px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                boxSizing: 'border-box',
              }}
            />
            <span style={{ position: 'absolute', left: '10px', top: '9px', color: '#94a3b8' }}>
              <SearchIcon size={15} />
            </span>
          </div>
        </div>
      </div>

      {/* Section 1: Rep Risk Matrix Table */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UsersIcon size={16} color="#170e5e" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              مصفوفة تقييم المخاطر والانضباط لمناديب التوزيع
            </h4>
          </div>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
            إجمالي المناديب: {filteredProfiles.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              جارٍ تحليل سجلات الرقابة الميدانية...
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              لا توجد بيانات مطابقة لمعايير البحث.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المندوب</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>مؤشر المخاطرة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>إجمالي الشبهات</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>تلاعب أسعار/بونص</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>تحصيل مشترك/ائتمان</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>مرتجعات/كارت وهمي</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>مصروفات/عداد/GPS</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700, textAlign: 'center' }}>عجز تصفية</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المبلغ محل الشبهة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>أبرز المؤشرات الرقابية</th>
                </tr>
              </thead>
              <tbody>
                {filteredProfiles.map((p: VanRepRiskProfile) => {
                  const isHigh = p.riskLevel === 'high_risk';
                  const isWatch = p.riskLevel === 'watch';
                  const badgeBg = isHigh ? '#fef2f2' : isWatch ? '#fffbeb' : '#ecfdf5';
                  const badgeBorder = isHigh ? '#fecaca' : isWatch ? '#fde68a' : '#a7f3d0';
                  const badgeColor = isHigh ? '#dc2626' : isWatch ? '#b45309' : '#047857';
                  const badgeLabel = isHigh
                    ? `خطر مرتفع (${p.riskScore}/100)`
                    : isWatch
                    ? `تحت المراقبة (${p.riskScore}/100)`
                    : `منضبط (${p.riskScore}/100)`;

                  return (
                    <tr
                      key={p.repId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isHigh ? '#fffafa' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a' }}>{p.repName}</div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                          {p.phone || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            background: badgeBg,
                            border: `1px solid ${badgeBorder}`,
                            color: badgeColor,
                          }}
                        >
                          {badgeLabel}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: p.totalSuspicionEvents > 0 ? '#dc2626' : '#64748b' }}>
                        {p.totalSuspicionEvents}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {p.priceManipulationCount + p.unauthorizedBonusCount || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {p.crossRepCollectionCount + p.creditBypassCount || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {p.fraudulentReturnCount + p.fakeCardCount || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {p.expenseAbuseCount + p.odometerRollbackCount + p.geofenceViolationCount + p.selfApprovalCount + p.invalidPinCount + p.unauthorizedLoadOrSettleCount || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: p.settlementShortageCount > 0 ? '#b45309' : '#64748b' }}>
                        {p.settlementShortageCount || '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: p.totalAmountAtRisk > 0 ? '#dc2626' : '#0f172a' }}>
                        {p.totalAmountAtRisk > 0 ? `${formatMoney(p.totalAmountAtRisk)} ج.م` : '0.00'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.flags.length === 0 ? (
                          <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                            سجل نظيف ومطابق للحوكمة
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.flags.map((flag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                }}
                              >
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Section 2: Chronological Suspicion Events Feed */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockIcon size={16} color="#dc2626" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              السجل الزمني التفصيلي للوقائع ومحاولات التلاعب المصدودة
            </h4>
          </div>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b' }}>
            عدد الوقائع المسجلة: {filteredEvents.length}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              جارٍ تحميل السجل الزمني للشبهات...
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
              <CheckShieldIcon size={32} color="#10b981" />
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginTop: '8px' }}>
                لا توجد أي محاولات تلاعب أو شبهات مسجلة في هذه الفترة
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                جميع عمليات البيع والتحصيل والمرتجعات الميدانية تسير وفق الضوابط المعتمدة.
              </div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>التوقيت</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>المندوب</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>الخطورة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>نوع المخالفة المرصودة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>التفاصيل الكاملة للواقعة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>العميل / الرحلة</th>
                  <th style={{ padding: '10px 14px', fontWeight: 700 }}>القيمة المالية</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev: VanFraudRadarEvent) => {
                  const isCrit = ev.severity === 'critical';
                  const isHigh = ev.severity === 'high';
                  return (
                    <tr key={ev.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', fontSize: '11.5px', color: '#475569' }}>
                        {formatDateTimeAr(ev.createdAt)}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>
                        {ev.repName}
                      </td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isCrit ? '#fef2f2' : isHigh ? '#fff7ed' : '#fefce8',
                            color: isCrit ? '#dc2626' : isHigh ? '#c2410c' : '#a16207',
                            border: `1px solid ${isCrit ? '#fecaca' : isHigh ? '#fed7aa' : '#fef08a'}`,
                          }}
                        >
                          <AlertTriangleIcon size={12} />
                          {isCrit ? 'حرجة جداً' : isHigh ? 'خطورة عالية' : 'متوسطة'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#991b1b' }}>
                        {ev.titleAr}
                      </td>
                      <td
                        style={{
                          padding: '10px 14px',
                          color: '#334155',
                          maxWidth: '420px',
                          lineHeight: 1.55,
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: 'start',
                        }}
                      >
                        {ev.detailsAr}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11.5px', color: '#475569', whiteSpace: 'nowrap' }}>
                        {ev.customerName ? <div>العميل: <strong>{ev.customerName}</strong></div> : null}
                        {ev.tripId ? <div>رحلة #{ev.tripId}</div> : null}
                        {!ev.customerName && !ev.tripId ? '—' : null}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 800, color: ev.amountInvolved > 0 ? '#dc2626' : '#64748b', whiteSpace: 'nowrap' }}>
                        {ev.amountInvolved > 0 ? `${formatMoney(ev.amountInvolved)} ج.م` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
