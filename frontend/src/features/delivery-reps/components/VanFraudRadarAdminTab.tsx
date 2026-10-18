import { useTranslation } from 'react-i18next';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vanSalesApi, type VanFraudRadarEvent, type VanRepRiskProfile } from '../api/van-sales.api';
import { CustomSelect } from '@/shared/ui/custom-select';
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

function formatEventDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: iso, time: '' };
  const dateStr = d.toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = d.toLocaleTimeString('ar-EG', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: dateStr, time: timeStr };
}

const EVENT_CODE_META: Record<
  string,
  { label: string; bg: string; color: string; border: string }
> = {
  VAN_SUSPICION_PRICE_MANIPULATION: {
    label: 'تلاعب بالأسعار',
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca',
  },
  VAN_SUSPICION_UNAUTHORIZED_BONUS: {
    label: 'بونص غير مصرح',
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa',
  },
  VAN_SUSPICION_CREDIT_BYPASS: {
    label: 'كسر سقف الائتمان',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fca5a5',
  },
  VAN_SUSPICION_CROSS_REP_COLLECTION: {
    label: 'تحصيل متقاطع',
    bg: '#eff6ff',
    color: '#1d4ed8',
    border: '#bfdbfe',
  },
  VAN_SUSPICION_FRAUDULENT_RETURN: {
    label: 'مرتجع مشبوه',
    bg: '#fdf2f8',
    color: '#be185d',
    border: '#fbcfe8',
  },
  VAN_SUSPICION_FAKE_CARD_PAYMENT: {
    label: 'دفع وهمي بالبطاقة',
    bg: '#f5f3ff',
    color: '#6d28d9',
    border: '#ddd6fe',
  },
  VAN_SUSPICION_EXPENSE_ABUSE: {
    label: 'مصروفات طريق',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
  VAN_SUSPICION_ODOMETER_ROLLBACK: {
    label: 'تلاعب بالعداد',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fca5a5',
  },
  VAN_SUSPICION_GEOFENCE_VIOLATION: {
    label: 'خارج النطاق GPS',
    bg: '#ecfeff',
    color: '#0e7490',
    border: '#a5f3fc',
  },
  VAN_SUSPICION_SELF_APPROVAL: {
    label: 'اعتماد ذاتي',
    bg: '#fff1f2',
    color: '#e11d48',
    border: '#fecdd3',
  },
  VAN_SUSPICION_INVALID_PIN: {
    label: 'تخمين رمز PIN',
    bg: '#fff7ed',
    color: '#ea580c',
    border: '#ffedd5',
  },
  VAN_SUSPICION_UNAUTHORIZED_LOAD_OR_SETTLE: {
    label: 'سحب/تصفية غير مصرح',
    bg: '#fef2f2',
    color: '#b91c1c',
    border: '#fecaca',
  },
  VAN_SUSPICION_SETTLEMENT_SHORTAGE: {
    label: 'عجز تصفية رحلة',
    bg: '#fffbeb',
    color: '#b45309',
    border: '#fde68a',
  },
};

function getEventCodeMeta(code: string) {
  return (
    EVENT_CODE_META[code] || {
      label: 'شبهة تشغيلية',
      bg: '#f1f5f9',
      color: '#475569',
      border: '#cbd5e1',
    }
  );
}

export function VanFraudRadarAdminTab() {
  const { t } = useTranslation();
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
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
                {t('delivery_reps.van_fraud_radar_admin_tab.s0', "رادار الشبهات ومكافحة التلاعب الميداني (Van Anti-Theft & Fraud Radar)")}
              </h3>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: '#64748b' }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s1', "رصد لحظي لكافة محاولات التلاعب المصدودة (الأسعار، البونص، التحصيل المتقاطع، المرتجعات الوهمية، العداد، والـ GPS) مع إشعار فوري لصاحب المنشأة والمشرف.")}
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
          {isFetching ? t('delivery_reps.van_fraud_radar_admin_tab.s2', "جارٍ الفحص...") : t('delivery_reps.van_fraud_radar_admin_tab.s3', "تحديث الرادار الآن")}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s4', "محاولات التلاعب المصدودة آلياً")}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626' }}>
            {isLoading ? '—' : kpis?.blockedTamperAttemptsCount ?? 0}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s5', "تم إحباطها ومنع تأثيرها المالي فوراً")}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s6', "مناديب في دائرة الخطر العالي")}
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
              {t('delivery_reps.van_fraud_radar_admin_tab.s7', "من أصل")} {isLoading ? '—' : kpis?.totalRepsMonitored ?? 0} {t('delivery_reps.van_fraud_radar_admin_tab.s8', "مندوب")}
            </span>
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s9', "تحت المراقبة المتوسطة:")} {isLoading ? '—' : kpis?.watchRepsCount ?? 0}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s10', "وقائع عجز التصفية (نقدية / بضاعة)")}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s11', "تم قيدها محاسبياً على ذمة المناديب")}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s12', "إجمالي المبالغ محل الشبهة أو العجز")}
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#170e5e' }}>
            {isLoading ? '—' : `${formatMoney(kpis?.totalAmountAtRisk || 0)} ج.م`}
          </div>
          <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s13', "شبهات حرجة:")} {isLoading ? '—' : kpis?.criticalEventsCount ?? 0} {t('delivery_reps.van_fraud_radar_admin_tab.s14', "واقعة")}
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
            {t('delivery_reps.van_fraud_radar_admin_tab.s15', "الفترة الزمنية للفحص")}
          </label>
          <CustomSelect
            value={periodDays}
            onChange={(val: any) => setPeriodDays(val)}
            options={PERIOD_OPTIONS}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s16', "تصفية حسب المندوب")}
          </label>
          <CustomSelect
            value={selectedRepId}
            onChange={(val: any) => setSelectedRepId(val)}
            options={repOptions}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s17', "تصفية حسب نوع المخالفة")}
          </label>
          <CustomSelect
            value={selectedEventCode}
            onChange={(val: any) => setSelectedEventCode(val)}
            options={EVENT_CODE_OPTIONS}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
            {t('delivery_reps.van_fraud_radar_admin_tab.s18', "بحث سريع (مندوب، عميل، تفاصيل)")}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('delivery_reps.van_fraud_radar_admin_tab.s19', "ابحث باسم المندوب أو العميل...")}
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
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
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
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UsersIcon size={16} color="#170e5e" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s20', "مصفوفة تقييم المخاطر والانضباط لمناديب التوزيع")}
            </h4>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '20px',
            }}
          >
            {t('delivery_reps.van_fraud_radar_admin_tab.s21', "إجمالي المناديب:")} {filteredProfiles.length}
          </span>
        </div>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s22', "جارٍ تحليل سجلات الرقابة الميدانية...")}
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s23', "لا توجد بيانات مطابقة لمعايير البحث.")}
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                minWidth: '980px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '12px',
              }}
            >
              <colgroup>
                <col style={{ width: '14%' }} /> {/* المندوب */}
                <col style={{ width: '12%' }} /> {/* مؤشر المخاطرة */}
                <col style={{ width: '7%' }} />  {/* إجمالي الشبهات */}
                <col style={{ width: '9%' }} />  {/* تلاعب أسعار/بونص */}
                <col style={{ width: '9%' }} />  {/* تحصيل مشترك/ائتمان */}
                <col style={{ width: '9%' }} />  {/* مرتجعات/كارت وهمي */}
                <col style={{ width: '9%' }} />  {/* مصروفات/عداد/GPS */}
                <col style={{ width: '7%' }} />  {/* عجز تصفية */}
                <col style={{ width: '10%' }} /> {/* المبلغ محل الشبهة */}
                <col style={{ width: '14%' }} /> {/* أبرز المؤشرات الرقابية */}
              </colgroup>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '10px 14px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s24', "المندوب")}</th>
                  <th style={{ padding: '10px 14px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s25', "مؤشر المخاطرة")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s26', "إجمالي الشبهات")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s27', "تلاعب أسعار/بونص")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s28', "تحصيل مشترك/ائتمان")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s29', "مرتجعات/كارت وهمي")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s30', "مصروفات/عداد/GPS")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s31', "عجز تصفية")}</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s32', "المبلغ محل الشبهة")}</th>
                  <th style={{ padding: '10px 14px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s33', "أبرز المؤشرات الرقابية")}</th>
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
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isHigh) e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        if (!isHigh) e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '12.5px' }}>{p.repName}</div>
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
                            fontSize: '11px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
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
                      <td style={{ padding: '10px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {p.totalAmountAtRisk > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: '3px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                              {formatMoney(p.totalAmountAtRisk)}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#991b1b' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s34', "ج.م")}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>0.00</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {p.flags.length === 0 ? (
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                            {t('delivery_reps.van_fraud_radar_admin_tab.s35', "سجل نظيف ومطابق للحوكمة")}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {p.flags.map((flag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  fontSize: '10.5px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  background: '#fef2f2',
                                  color: '#991b1b',
                                  border: '1px solid #fecaca',
                                  whiteSpace: 'nowrap',
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
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
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
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClockIcon size={16} color="#dc2626" />
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s36', "السجل الزمني التفصيلي للوقائع ومحاولات التلاعب المصدودة")}
            </h4>
          </div>
          <span
            style={{
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '20px',
            }}
          >
            {t('delivery_reps.van_fraud_radar_admin_tab.s37', "عدد الوقائع المسجلة:")} {filteredEvents.length}
          </span>
        </div>

        <div
          style={{
            width: '100%',
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              {t('delivery_reps.van_fraud_radar_admin_tab.s38', "جارٍ تحميل السجل الزمني للشبهات...")}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: '#64748b' }}>
              <CheckShieldIcon size={32} color="#10b981" />
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a', marginTop: '8px' }}>
                {t('delivery_reps.van_fraud_radar_admin_tab.s39', "لا توجد أي محاولات تلاعب أو شبهات مسجلة في هذه الفترة")}
              </div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                {t('delivery_reps.van_fraud_radar_admin_tab.s40', "جميع عمليات البيع والتحصيل والمرتجعات الميدانية تسير وفق الضوابط المعتمدة.")}
              </div>
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                minWidth: '980px',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                textAlign: 'right',
                fontSize: '12px',
              }}
            >
              <colgroup>
                <col style={{ width: '12%' }} /> {/* 1. التوقيت */}
                <col style={{ width: '12%' }} /> {/* 2. المندوب */}
                <col style={{ width: '9%' }} />  {/* 3. الخطورة */}
                <col style={{ width: '17%' }} /> {/* 4. نوع المخالفة */}
                <col style={{ width: '29%' }} /> {/* 5. التفاصيل الكاملة */}
                <col style={{ width: '11%' }} /> {/* 6. العميل / الرحلة */}
                <col style={{ width: '10%' }} /> {/* 7. القيمة المالية */}
              </colgroup>
              <thead>
                <tr
                  style={{
                    background: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    color: '#475569',
                    fontSize: '11.5px',
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '8px 10px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s41', "التوقيت")}</th>
                  <th style={{ padding: '8px 10px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s42', "المندوب")}</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s43', "الخطورة")}</th>
                  <th style={{ padding: '8px 10px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s44', "نوع المخالفة المرصودة")}</th>
                  <th style={{ padding: '8px 10px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s45', "التفاصيل الكاملة للواقعة")}</th>
                  <th style={{ padding: '8px 10px' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s46', "العميل / الرحلة")}</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s47', "القيمة المالية")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((ev: VanFraudRadarEvent) => {
                  const isCrit = ev.severity === 'critical';
                  const isHigh = ev.severity === 'high';
                  const dt = formatEventDateTime(ev.createdAt);
                  const meta = getEventCodeMeta(ev.eventCode);

                  return (
                    <tr
                      key={ev.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* 1. التوقيت */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '11.5px', whiteSpace: 'nowrap' }}>
                          {dt.date}
                        </div>
                        {dt.time && (
                          <div
                            style={{
                              fontSize: '10px',
                              color: '#64748b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '2px',
                              fontFamily: 'monospace',
                              direction: 'ltr',
                            }}
                          >
                            <span>{dt.time}</span>
                            <ClockIcon size={10} color="#94a3b8" />
                          </div>
                        )}
                      </td>

                      {/* 2. المندوب */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div
                          style={{
                            fontWeight: 800,
                            color: '#0f172a',
                            fontSize: '12px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={ev.repName}
                        >
                          {ev.repName}
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                          {t('delivery_reps.van_fraud_radar_admin_tab.s48', "مندوب فان #")}{ev.repId}
                        </div>
                      </td>

                      {/* 3. الخطورة */}
                      <td style={{ padding: '8px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: '5px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            background: isCrit ? '#fef2f2' : isHigh ? '#fff7ed' : '#fefce8',
                            color: isCrit ? '#dc2626' : isHigh ? '#c2410c' : '#a16207',
                            border: `1px solid ${isCrit ? '#fecaca' : isHigh ? '#fed7aa' : '#fef08a'}`,
                          }}
                        >
                          <AlertTriangleIcon size={11} />
                          {isCrit ? t('delivery_reps.van_fraud_radar_admin_tab.s49', "حرجة جداً") : isHigh ? t('delivery_reps.van_fraud_radar_admin_tab.s50', "خطورة عالية") : t('delivery_reps.van_fraud_radar_admin_tab.s51', "متوسطة")}
                        </span>
                      </td>

                      {/* 4. نوع المخالفة المرصودة */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            style={{
                              alignSelf: 'flex-start',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: meta.bg,
                              color: meta.color,
                              border: `1px solid ${meta.border}`,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {meta.label}
                          </span>
                          <div
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              color: '#0f172a',
                              lineHeight: 1.35,
                              wordBreak: 'break-word',
                              whiteSpace: 'normal',
                            }}
                          >
                            {ev.titleAr}
                          </div>
                        </div>
                      </td>

                      {/* 5. التفاصيل الكاملة للواقعة */}
                      <td
                        style={{
                          padding: '8px 10px',
                          color: '#334155',
                          fontSize: '11px',
                          lineHeight: 1.5,
                          textAlign: 'justify',
                          textJustify: 'inter-word',
                          textAlignLast: 'start',
                          wordBreak: 'break-word',
                          whiteSpace: 'normal',
                          overflowWrap: 'break-word',
                          verticalAlign: 'middle',
                        }}
                      >
                        {ev.detailsAr}
                      </td>

                      {/* 6. العميل / الرحلة */}
                      <td style={{ padding: '8px 10px', verticalAlign: 'middle', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '100%' }}>
                          {ev.customerName ? (
                            <div
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#1e293b',
                                lineHeight: 1.25,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                overflow: 'hidden',
                              }}
                              title={ev.customerName}
                            >
                              <UsersIcon size={11} color="#64748b" style={{ flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ev.customerName}
                              </span>
                            </div>
                          ) : null}
                          {ev.tripId ? (
                            <span
                              style={{
                                alignSelf: 'flex-start',
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                                fontFamily: 'monospace',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {t('delivery_reps.van_fraud_radar_admin_tab.s52', "رحلة #")}{ev.tripId}
                            </span>
                          ) : null}
                          {!ev.customerName && !ev.tripId ? (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          ) : null}
                        </div>
                      </td>

                      {/* 7. القيمة المالية */}
                      <td style={{ padding: '8px 10px', textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {ev.amountInvolved > 0 ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'baseline',
                              gap: '2px',
                              padding: '2px 7px',
                              borderRadius: '5px',
                              background: '#fef2f2',
                              border: '1px solid #fecaca',
                            }}
                          >
                            <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', fontFamily: 'monospace' }}>
                              {formatMoney(ev.amountInvolved)}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#991b1b' }}>{t('delivery_reps.van_fraud_radar_admin_tab.s53', "ج.م")}</span>
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>—</span>
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
    </div>
  );
}
