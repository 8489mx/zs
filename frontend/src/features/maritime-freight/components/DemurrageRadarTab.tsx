import { useState, useMemo } from 'react';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { MaritimeContainer } from '../api/maritime-freight.api';
import { ContainerMilestoneModal } from './ContainerMilestoneModal';

interface DemurrageRadarTabProps {
  containers: MaritimeContainer[];
  loading: boolean;
  onOpenReturnModal: (container: MaritimeContainer) => void;
  onRefresh?: () => void;
}

type RadarFilterType = 'all' | 'critical' | 'overdue' | 'held_deposit' | 'returned';

export function DemurrageRadarTab({
  containers,
  loading,
  onOpenReturnModal,
  onRefresh,
}: DemurrageRadarTabProps) {
  const [filterType, setFilterType] = useState<RadarFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMilestoneContainer, setSelectedMilestoneContainer] = useState<MaritimeContainer | null>(null);

  // Computed Radar KPIs
  const totalContainers = containers.length;
  const overdueContainers = containers.filter(
    (c) => !c.empty_returned_at && (c.is_overdue || (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0))
  );
  const overdueCount = overdueContainers.length;

  const criticalContainers = containers.filter(
    (c) => !c.empty_returned_at && c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining >= 0 && c.daysRemaining <= 3
  );
  const criticalCount = criticalContainers.length;

  const depositHeldContainers = containers.filter(
    (c) => c.deposit_status === 'held_by_line' || c.deposit_status === 'pending_return_proof'
  );
  const depositHeldCount = depositHeldContainers.length;
  const depositHeldTotal = depositHeldContainers.reduce((acc, c) => acc + Number(c.deposit_amount || 0), 0);

  const returnedCount = containers.filter((c) => Boolean(c.empty_returned_at)).length;

  // Total accrued demurrage fines across all overdue containers
  const totalAccruedDemurrage = overdueContainers.reduce((sum, c) => {
    if (c.demurrage_amount) return sum + Number(c.demurrage_amount);
    const overdueDays = Math.abs(Number(c.daysRemaining || 0));
    const rate = Number(c.demurrage_rate_per_day || 50);
    return sum + (overdueDays * rate);
  }, 0);

  // Filtered List
  const filteredContainers = useMemo(() => {
    return containers.filter((c) => {
      if (filterType === 'critical') {
        const isCrit = !c.empty_returned_at && c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining >= 0 && c.daysRemaining <= 3;
        if (!isCrit) return false;
      } else if (filterType === 'overdue') {
        const isOver = !c.empty_returned_at && (c.is_overdue || (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0));
        if (!isOver) return false;
      } else if (filterType === 'held_deposit') {
        const hasHeld = c.deposit_status === 'held_by_line' || c.deposit_status === 'pending_return_proof';
        if (!hasHeld) return false;
      } else if (filterType === 'returned') {
        if (!c.empty_returned_at) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = c.container_number?.toLowerCase().includes(q);
        const matchType = c.container_type?.toLowerCase().includes(q);
        const matchSeal = c.seal_number?.toLowerCase().includes(q);
        const matchJob = c.job_number?.toLowerCase().includes(q);
        const matchCust = c.customer_name?.toLowerCase().includes(q);
        const matchLine = c.shipping_line_name?.toLowerCase().includes(q);
        if (!matchNumber && !matchType && !matchSeal && !matchJob && !matchCust && !matchLine) {
          return false;
        }
      }

      return true;
    });
  }, [containers, filterType, searchQuery]);

  const handleSendWhatsAppAlert = (c: MaritimeContainer) => {
    const days = c.daysRemaining;
    const isOverdue = days !== null && days !== undefined && days < 0;
    const message = isOverdue
      ? `تحذير عاجل بخصوص شحنتكم [${c.job_number}]:\nالحاوية رقم (${c.container_number}) متأخرة عن موعد الإعادة بـ [${Math.abs(days!)}] يوم، وتترتب عليها غرامات أرضيات يومية للخط الملاحي (${c.shipping_line_name}). يرجى سرعة إعادة الحاوية الفارغة فوراً.`
      : `تنبيه هام بخصوص شحنتكم [${c.job_number}]:\nالحاوية رقم (${c.container_number}) متبقي عليها [${days}] أيام فقط قبل انتهاء مهلة السماح المجانية للخط (${c.shipping_line_name}). يرجى سرعة التفريغ والإرجاع لتجنب احتساب غرامات.`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getCountdownProgress = (container: MaritimeContainer) => {
    if (container.empty_returned_at) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700, width: 'fit-content' }}>
            تم الإرجاع بنجاح
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            تاريخ الإرجاع: {String(container.empty_returned_at).split('T')[0]}
          </span>
        </div>
      );
    }

    const days = container.daysRemaining;
    const totalDays = container.free_days || 14;

    if (days === null || days === undefined) {
      return <span style={{ color: '#94a3b8' }}>غير محدد</span>;
    }

    const elapsed = Math.max(0, totalDays - days);
    const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalDays) * 100)));

    let barColor = '#16a34a';
    let badgeBg = '#dcfce7';
    let badgeColor = '#15803d';
    let badgeText = `متبقي ${days} من ${totalDays} يوم`;

    if (days < 0) {
      barColor = '#dc2626';
      badgeBg = '#fee2e2';
      badgeColor = '#b91c1c';
      badgeText = `متأخرة ${Math.abs(days)} يوم (غرامات سارية)`;
    } else if (days <= 3) {
      barColor = '#f59e0b';
      badgeBg = '#fef3c7';
      badgeColor = '#b45309';
      badgeText = `حرج: متبقي ${days} أيام فقط`;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ padding: '2px 8px', borderRadius: '6px', background: badgeBg, color: badgeColor, fontSize: '0.7rem', fontWeight: 700 }}>
            {badgeText}
          </span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div
            style={{
              width: days < 0 ? '100%' : `${percent}%`,
              height: '100%',
              background: barColor,
              borderRadius: '3px',
              transition: 'none',
            }}
          />
        </div>
        <div style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
          <span>مهلة الإعادة: {container.return_deadline ? String(container.return_deadline).split('T')[0] : '—'}</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }} dir="rtl">
      {/* 1. بطاقات المؤشرات التشغيلية لرادار الغرامات والسماح */}
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
            padding: '12px 16px',
            minHeight: '88px',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
              حاويات متأخرة تحت الغرامة (Overdue)
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              {overdueCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: overdueCount > 0 ? '#b91c1c' : '#64748b', fontWeight: overdueCount > 0 ? 700 : 500, marginTop: '3px' }}>
              غرامات متراكمة: ${totalAccruedDemurrage.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              flexShrink: 0,
            }}
          >
            <AppIcons.AlertTriangle size={18} />
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            minHeight: '88px',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
              حاويات حرجة (Critical &le; 3 أيام)
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              {criticalCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
              مهلة السماح توشك على النفاد
            </div>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
              flexShrink: 0,
            }}
          >
            <AppIcons.Clock size={18} />
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            minHeight: '88px',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
              أمانات محتجزة لدى الخطوط (Deposits)
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              {depositHeldCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
              قيمة التأمينات: ${depositHeldTotal.toLocaleString()}
            </div>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1e40af',
              flexShrink: 0,
            }}
          >
            <AppIcons.Shield size={18} />
          </div>
        </div>

        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 16px',
            minHeight: '88px',
            boxSizing: 'border-box',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#64748b' }}>
              حاويات أعيدت بسلام (Returned)
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', marginTop: '3px', lineHeight: 1.2 }}>
              {returnedCount} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>من {totalContainers}</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px' }}>
              {totalContainers > 0 ? `${Math.round((returnedCount / totalContainers) * 100)}% معدل الإعادة المكتملة` : '0%'}
            </div>
          </div>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#f0fdf4',
              border: '1px solid #dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#15803d',
              flexShrink: 0,
            }}
          >
            <AppIcons.CheckCircle size={18} />
          </div>
        </div>
      </div>

      {/* 2. شريط التنبيهات الإدارية العاجلة إذا كانت هناك حاويات حرجة أو متأخرة */}
      {(overdueCount > 0 || criticalCount > 0) && (
        <div
          style={{
            background: overdueCount > 0 ? '#fef2f2' : '#fffbeb',
            border: overdueCount > 0 ? '1px solid #fecaca' : '1px solid #fde68a',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ color: overdueCount > 0 ? '#dc2626' : '#d97706' }}>
              <AppIcons.AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.84rem', fontWeight: 800, color: overdueCount > 0 ? '#991b1b' : '#92400e' }}>
                تنبيه رادار الغرامات التشغيلي: يوجد ({overdueCount}) حاوية متأخرة تحت الغرامات، و({criticalCount}) حاوية حرجة توشك فترات سماحها على النفاد!
              </div>
              <div style={{ fontSize: '0.74rem', color: overdueCount > 0 ? '#b91c1c' : '#b45309', marginTop: '2px' }}>
                إجمالي الغرامات اليومية المقدرة يتصاعد. يرجى التنسيق الفوري مع سائقي الشاحنات والمخلصين لإرجاع الحاويات الفارغة إلى ساحات الخطوط.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFilterType('overdue')}
            style={{
              padding: '6px 14px',
              background: overdueCount > 0 ? '#dc2626' : '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            عرض الحاويات المتأخرة فوراً
          </button>
        </div>
      )}

      {/* 3. شريط الفلاتر والبحث */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { id: 'all', label: 'كافة الحاويات' },
            { id: 'critical', label: `حرجة (${criticalCount})` },
            { id: 'overdue', label: `متأخرة تحت الغرامة (${overdueCount})` },
            { id: 'held_deposit', label: `أمانات محتجزة (${depositHeldCount})` },
            { id: 'returned', label: `معادة بسلام (${returnedCount})` },
          ].map((item) => {
            const isActive = filterType === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterType(item.id as any)}
                style={{
                  height: '32px',
                  padding: '0 12px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #170e5e' : '1px solid #e2e8f0',
                  background: isActive ? '#170e5e' : '#f8fafc',
                  color: isActive ? '#ffffff' : '#334155',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'none',
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="بحث برقم الحاوية، الشحنة، العميل، الخط..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              height: '34px',
              width: '260px',
              padding: '0 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              style={{
                height: '34px',
                padding: '0 10px',
                borderRadius: '6px',
                background: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                cursor: loading ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
              }}
              title="تحديث بيانات الرادار"
            >
              <AppIcons.RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. جدول رادار فترات السماح والغرامات التفاعلي */}
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
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              رادار تتبع الحاويات وفترات السماح وغرامات الأرضيات (Demurrage & Detention Radar)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              رصد حي للحاويات المفرغة بالموانئ، عداد تنازلي لمهلة السماح المجانية، واحتساب آلي للغرامات المتراكمة لحماية المنشأة والعميل
            </p>
          </div>
          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#ffffff',
              color: '#475569',
              border: '1px solid #e2e8f0',
              padding: '3px 10px',
              borderRadius: '12px',
            }}
          >
            {filteredContainers.length} حاوية
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '10px 14px' }}>رقم الحاوية ونوعها</th>
                <th style={{ padding: '10px 14px' }}>أمر التشغيل والعميل</th>
                <th style={{ padding: '10px 14px' }}>الخط الملاحي والرصاصة</th>
                <th style={{ padding: '10px 14px', minWidth: '160px' }}>عداد السماح والرادار</th>
                <th style={{ padding: '10px 14px' }}>معدل الغرامة اليومية</th>
                <th style={{ padding: '10px 14px' }}>تأمين الحاوية</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    جاري فحص رادار فترات السماح والغرامات...
                  </td>
                </tr>
              ) : filteredContainers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد حاويات مطابقة لمعايير التصفية.
                  </td>
                </tr>
              ) : (
                filteredContainers.map((c) => {
                  const isOverdue = !c.empty_returned_at && (c.is_overdue || (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0));
                  const isCritical = !c.empty_returned_at && c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining >= 0 && c.daysRemaining <= 3;
                  const ratePerDay = Number(c.demurrage_rate_per_day || 50);

                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isOverdue ? '#fffdfd' : isCritical ? '#fffdf7' : '#ffffff',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 800, fontFamily: 'monospace', color: '#0f172a', fontSize: '0.85rem' }}>
                          {c.container_number}
                        </div>
                        <div style={{ marginTop: '2px' }}>
                          <span style={{ padding: '1px 6px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontSize: '0.68rem', fontWeight: 700 }}>
                            {c.container_type || '40HC'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#170e5e' }}>{c.job_number}</div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>{c.customer_name}</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.shipping_line_name || 'غير محدد'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                          رقم الرصاصة: <span style={{ fontFamily: 'monospace' }}>{c.seal_number || '—'}</span>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {getCountdownProgress(c)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, color: isOverdue ? '#dc2626' : '#475569' }}>
                          ${ratePerDay} / يوم
                        </div>
                        {isOverdue && (
                          <div style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 800, marginTop: '2px' }}>
                            إجمالي الغرامة: ${((Math.abs(Number(c.daysRemaining || 0))) * ratePerDay).toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {c.deposit_amount ? (
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              ${Number(c.deposit_amount).toLocaleString()}
                            </div>
                            <div style={{ marginTop: '2px' }}>
                              <span
                                style={{
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: c.deposit_status === 'refunded_to_treasury' ? '#dcfce7' : '#fef3c7',
                                  color: c.deposit_status === 'refunded_to_treasury' ? '#15803d' : '#b45309',
                                }}
                              >
                                {c.deposit_status === 'refunded_to_treasury' ? 'مسترد بالكامل' : 'محتجز لدى الخط'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>بدون تأمين</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          {!c.empty_returned_at ? (
                            <button
                              type="button"
                              onClick={() => onOpenReturnModal(c)}
                              style={{
                                padding: '3px 8px',
                                background: '#166534',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              إرجاع فارغ
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <AppIcons.CheckCircle size={12} /> تم الإرجاع
                            </span>
                          )}

                          {!c.empty_returned_at && (
                            <button
                              type="button"
                              onClick={() => handleSendWhatsAppAlert(c)}
                              style={{
                                padding: '3px 8px',
                                background: '#16a34a',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="إرسال تنبيه واتساب مباشر للعميل"
                            >
                              واتساب
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedMilestoneContainer(c)}
                            style={{
                              padding: '3px 8px',
                              background: '#f8fafc',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            تحديث المحطة
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal تحديث المحطات الميدانية للحاوية */}
      {selectedMilestoneContainer && (
        <ContainerMilestoneModal
          open={Boolean(selectedMilestoneContainer)}
          container={selectedMilestoneContainer}
          onClose={() => setSelectedMilestoneContainer(null)}
          onUpdated={() => {
            setSelectedMilestoneContainer(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}
