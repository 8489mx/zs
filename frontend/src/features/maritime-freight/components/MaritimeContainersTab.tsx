import { MaritimeContainer } from '../api/maritime-freight.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface MaritimeContainersTabProps {
  containers: MaritimeContainer[];
  loading: boolean;
  onOpenReturnModal: (container: MaritimeContainer) => void;
}

export function MaritimeContainersTab({
  containers,
  loading,
  onOpenReturnModal,
}: MaritimeContainersTabProps) {
  // Compute KPIs
  const totalContainers = containers.length;
  const overdueCount = containers.filter((c) => c.is_overdue && !c.empty_returned_at).length;
  const depositHeldTotal = containers
    .filter((c) => c.deposit_status === 'held_by_line' || c.deposit_status === 'pending_return_proof')
    .reduce((acc, c) => acc + Number(c.deposit_amount || 0), 0);
  const returnedCount = containers.filter((c) => Boolean(c.empty_returned_at)).length;

  const getDaysBadge = (container: MaritimeContainer) => {
    if (container.empty_returned_at) {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#475569', fontSize: '0.72rem', fontWeight: 700 }}>
          تم الإرجاع بنجاح ✓
        </span>
      );
    }

    const days = container.daysRemaining;
    if (days === null || days === undefined) {
      return <span style={{ color: '#94a3b8' }}>-</span>;
    }

    if (days < 0) {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontSize: '0.72rem', fontWeight: 800 }}>
          متأخرة {Math.abs(days)} يوم (غرامة أرضيات)
        </span>
      );
    }

    if (days <= 3) {
      return (
        <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontSize: '0.72rem', fontWeight: 800 }}>
          متبقي {days} أيام سماح فقط
        </span>
      );
    }

    return (
      <span style={{ padding: '3px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>
        متبقي {days} أيام سماح آمنة
      </span>
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
            {depositHeldTotal.toLocaleString()} <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#c2410c' }}>ج.م</span>
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              رادار الحاويات وتأمين الفارغ (Container Lifecycle & Demurrage Radar)
            </h3>
            <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              متابعة فترات السماح (Free Days)، منع غرامات الأرضيات، وإدارة استرداد مبالغ التأمين
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0', padding: '3px 10px', borderRadius: '12px' }}>
            {containers.length} حاوية
          </span>
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
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري تحميل رادار الحاويات...
                </td>
              </tr>
            ) : containers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  لا توجد حاويات نشطة حالياً في الرادار.
                </td>
              </tr>
            ) : (
              containers.map((c) => (
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
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>{c.customer_name}</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>{c.job_number}</div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.shipping_line_name}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {getDaysBadge(c)}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div>{Number(c.deposit_amount).toLocaleString()} {c.deposit_currency}</div>
                    <div style={{ marginTop: '2px' }}>{getDepositBadge(c.deposit_status)}</div>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => onOpenReturnModal(c)}
                      style={{
                        padding: '5px 12px',
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#1e293b',
                        cursor: 'pointer',
                      }}
                    >
                      إرجاع الفارغ والتأمين
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}
