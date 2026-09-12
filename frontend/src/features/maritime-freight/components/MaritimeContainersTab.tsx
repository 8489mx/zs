import { useState, useMemo } from 'react';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { MaritimeContainer } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { ContainerMilestoneModal } from './ContainerMilestoneModal';
import { toast } from '@/shared/components/system-alert';

interface MaritimeContainersTabProps {
  containers: MaritimeContainer[];
  loading: boolean;
  onOpenReturnModal: (container: MaritimeContainer) => void;
  onRefresh?: () => void;
}

type ContainerFilterType = 'all' | 'critical' | 'overdue' | 'held_deposit' | 'returned';

export function MaritimeContainersTab({
  containers,
  loading,
  onOpenReturnModal,
  onRefresh,
}: MaritimeContainersTabProps) {
  const [filterType, setFilterType] = useState<ContainerFilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [selectedMilestoneContainer, setSelectedMilestoneContainer] = useState<MaritimeContainer | null>(null);

  // Compute KPIs & Counts
  const totalContainers = containers.length;
  const overdueCount = containers.filter(
    (c) => !c.empty_returned_at && (c.is_overdue || (c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining < 0))
  ).length;
  const criticalCount = containers.filter(
    (c) => !c.empty_returned_at && c.daysRemaining !== null && c.daysRemaining !== undefined && c.daysRemaining >= 0 && c.daysRemaining <= 3
  ).length;
  const depositHeldCount = containers.filter(
    (c) => c.deposit_status === 'held_by_line' || c.deposit_status === 'pending_return_proof'
  ).length;
  const depositHeldTotal = containers
    .filter((c) => c.deposit_status === 'held_by_line' || c.deposit_status === 'pending_return_proof')
    .reduce((acc, c) => acc + Number(c.deposit_amount || 0), 0);
  const returnedCount = containers.filter((c) => Boolean(c.empty_returned_at)).length;

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

  const getDaysRadar = (container: MaritimeContainer) => {
    if (container.empty_returned_at) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700, width: 'fit-content' }}>
            تم الإرجاع بنجاح ✓
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            أرجع في: {container.empty_returned_at.split('T')[0]}
          </span>
        </div>
      );
    }

    const days = container.daysRemaining;
    const totalDays = container.free_days || 14;

    if (days === null || days === undefined) {
      return <span style={{ color: '#94a3b8' }}>-</span>;
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
      badgeText = `متأخرة ${Math.abs(days)} يوم (غرامات)`;
    } else if (days <= 3) {
      barColor = '#f59e0b';
      badgeBg = '#fef3c7';
      badgeColor = '#b45309';
      badgeText = `حرجة: متبقي ${days} أيام فقط`;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '130px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ padding: '2px 7px', borderRadius: '10px', background: badgeBg, color: badgeColor, fontSize: '0.7rem', fontWeight: 800 }}>
            {badgeText}
          </span>
        </div>
        <div style={{ width: '100%', height: '5px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${days < 0 ? 100 : percent}%`, height: '100%', background: barColor, borderRadius: '3px', transition: 'width 0.3s ease' }} />
        </div>
        {container.return_deadline && (
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            الموعد الأقصى: {container.return_deadline.split('T')[0]}
          </span>
        )}
      </div>
    );
  };

  const getDepositBadge = (status: string) => {
    switch (status) {
      case 'refunded_to_treasury':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>مسترد للخزينة</span>;
      case 'pending_return_proof':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 700 }}>بانتظار إشعار الرد</span>;
      case 'held_by_line':
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 700 }}>محتجز لدى التوكيل</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', fontWeight: 600 }}>غير مطلوب</span>;
    }
  };

  const exportContainersCsv = () => {
    if (filteredContainers.length === 0) {
      toast.warning('لا توجد بيانات حاويات للتصدير.');
      return;
    }
    const headers = [
      'رقم الحاوية',
      'نوع الحاوية',
      'رقم الختم (Seal)',
      'العميل',
      'أمر الشغل',
      'الخط الملاحي',
      'تاريخ التفريغ بالميناء',
      'تاريخ خروج البوابة',
      'تاريخ الإرجاع الفعلي',
      'إجمالي فترة السماح',
      'الأيام المتبقية',
      'حالة التأخير',
      'مبلغ الغرامة',
      'مبلغ التأمين',
      'حالة التأمين'
    ];

    const rows = filteredContainers.map((c) => [
      `"${c.container_number || ''}"` ,
      `"${c.container_type || ''}"` ,
      `"${c.seal_number || ''}"` ,
      `"${c.customer_name || ''}"` ,
      `"${c.job_number || ''}"` ,
      `"${c.shipping_line_name || ''}"` ,
      `"${c.discharged_at ? c.discharged_at.split('T')[0] : ''}"` ,
      `"${c.gated_out_at ? c.gated_out_at.split('T')[0] : ''}"` ,
      `"${c.empty_returned_at ? c.empty_returned_at.split('T')[0] : ''}"` ,
      c.free_days || 14,
      c.daysRemaining !== null && c.daysRemaining !== undefined ? c.daysRemaining : '',
      c.is_overdue ? 'متأخرة' : 'سليمة',
      c.demurrage_amount || 0,
      c.deposit_amount || 0,
      `"${c.deposit_status || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `maritime_containers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('تم تصدير تقرير الحاويات بنجاح.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* بطاقات المؤشرات اللوجستية ورادار الأرضيات */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>إجمالي الحاويات المتداولة</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#170e5e', marginTop: '4px' }}>
            {totalContainers} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>حاوية</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #fecaca', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600 }}>حاويات تجاوزت السماح (غرامات)</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
            {overdueCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#b91c1c' }}>حاوية</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #fed7aa', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.78rem', color: '#c2410c', fontWeight: 600 }}>تأمينات محتجزة لدى التوكيلات</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ea580c', marginTop: '4px' }}>
            {depositHeldTotal.toLocaleString()} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c2410c' }}><CurrencySymbol /></span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.78rem', color: '#15803d', fontWeight: 600 }}>حاويات تم إرجاعها بنجاح</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', marginTop: '4px' }}>
            {returnedCount} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#15803d' }}>حاوية</span>
          </div>
        </div>
      </div>

      {/* جدول تتبع الحاويات داخل كارت موحد */}
      <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              رادار الحاويات وتأمين الفارغ (Container Lifecycle & Demurrage Radar)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              متابعة فترات السماح (Free Days)، منع غرامات الأرضيات، وإدارة استرداد مبالغ التأمين
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={exportContainersCsv}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 13px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
                cursor: 'pointer',
              }}
            >
              <span>تصدير تقرير الحاويات (CSV)</span>
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '5px 10px', borderRadius: '8px' }}>
              {filteredContainers.length} من {containers.length} حاوية
            </span>
          </div>
        </div>

        {/* شريط الفلاتر السريعة والبحث */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', background: '#ffffff', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          {/* كبسولات التصفية */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setFilterType('all')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: filterType === 'all' ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                background: filterType === 'all' ? '#f0f4ff' : '#ffffff',
                color: filterType === 'all' ? '#170e5e' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              الكل ({totalContainers})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('critical')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: filterType === 'critical' ? '1.5px solid #f59e0b' : '1px solid #e2e8f0',
                background: filterType === 'critical' ? '#fef3c7' : '#ffffff',
                color: filterType === 'critical' ? '#b45309' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              حرجة (≤ 3 أيام) ({criticalCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('overdue')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: filterType === 'overdue' ? '1.5px solid #dc2626' : '1px solid #e2e8f0',
                background: filterType === 'overdue' ? '#fee2e2' : '#ffffff',
                color: filterType === 'overdue' ? '#b91c1c' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              متأخرة بغرامات ({overdueCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('held_deposit')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: filterType === 'held_deposit' ? '1.5px solid #ea580c' : '1px solid #e2e8f0',
                background: filterType === 'held_deposit' ? '#ffedd5' : '#ffffff',
                color: filterType === 'held_deposit' ? '#c2410c' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              تأمينات محتجزة ({depositHeldCount})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('returned')}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: filterType === 'returned' ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                background: filterType === 'returned' ? '#dcfce7' : '#ffffff',
                color: filterType === 'returned' ? '#15803d' : '#64748b',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              تم إرجاعها ({returnedCount})
            </button>
          </div>

          {/* حقل البحث السريع */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الحاوية، الختم، العميل، الخط..."
              style={{
                width: '260px',
                padding: '6px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  padding: '5px 10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                مسح
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.825rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '12px 14px' }}>رقم الحاوية</th>
                <th style={{ padding: '12px 14px' }}>النوع والختم</th>
                <th style={{ padding: '12px 14px' }}>أمر التشغيل والعميل</th>
                <th style={{ padding: '12px 14px' }}>الخط الملاحي</th>
                <th style={{ padding: '12px 14px' }}>رادار أيام السماح (Free Days)</th>
                <th style={{ padding: '12px 14px' }}>تأمين الحاوية</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات التشغيلية</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    جاري تحميل رادار الحاويات...
                  </td>
                </tr>
              ) : filteredContainers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    لا توجد حاويات مطابقة للفلتر المحدد.
                  </td>
                </tr>
              ) : (
                filteredContainers.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 800, color: '#170e5e' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <AppIcons.Container size={16} />
                        <span>{c.container_number}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700 }}>{c.container_type}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>ختم: {c.seal_number || 'بدون'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customer_name || '—'}</div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{c.job_number || '—'}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {c.shipping_line_name || '—'}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getDaysRadar(c)}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>{Number(c.deposit_amount || 0).toLocaleString()} {c.deposit_currency}</div>
                      <div style={{ marginTop: '2px' }}>{getDepositBadge(c.deposit_status)}</div>
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMilestoneContainer(c);
                            setMilestoneModalOpen(true);
                          }}
                          style={{
                            padding: '4px 9px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: '#1d4ed8',
                            cursor: 'pointer',
                          }}
                          title="تحديث تاريخ التفريغ أو خروج البوابة"
                        >
                          تحديث المحطات
                        </button>

                        <button
                          type="button"
                          onClick={() => onOpenReturnModal(c)}
                          style={{
                            padding: '4px 10px',
                            background: c.empty_returned_at ? '#f8fafc' : '#f0fdf4',
                            border: `1px solid ${c.empty_returned_at ? '#cbd5e1' : '#bbf7d0'}`,
                            borderRadius: '5px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            color: c.empty_returned_at ? '#475569' : '#15803d',
                            cursor: 'pointer',
                          }}
                        >
                          {c.empty_returned_at ? 'تعديل الإرجاع' : 'إرجاع الفارغ والتأمين'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* نافذة تحديث المحطات الميدانية */}
      <ContainerMilestoneModal
        open={milestoneModalOpen}
        container={selectedMilestoneContainer}
        onClose={() => {
          setMilestoneModalOpen(false);
          setSelectedMilestoneContainer(null);
        }}
        onUpdated={() => {
          if (onRefresh) onRefresh();
        }}
      />
    </div>
  );
}
