import { ContractingRfi } from '../contracting.types';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingRfiTabProps {
  rfis: ContractingRfi[];
  loading: boolean;
  projectName?: string;
  onNewRfi: () => void;
  onAnswerRfi: (rfi: ContractingRfi) => void;
}

export function ContractingRfiTab({
  rfis,
  loading,
  projectName,
  onNewRfi,
  onAnswerRfi,
}: ContractingRfiTabProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'closed':
      case 'answered':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0' }}>تم الرد والاعتماد</span>;
      case 'rejected':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: '1px solid #fecaca' }}>مرفوض</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>بانتظار رد الاستشاري</span>;
    }
  };

  const openCount = rfis.filter(r => r.status === 'open').length;
  const answeredCount = rfis.filter(r => r.status === 'answered' || r.status === 'closed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            طلبات الاستفسار الهندسي والمكتب الفني (Requests For Information - RFI)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {projectName ? `المشروع: ${projectName}` : 'إرسال وتوثيق الاستفسارات الفنية وحلول تعارض المخططات مع الاستشاري المشرف'}
          </p>
        </div>
        <button
          type="button"
          onClick={onNewRfi}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            fontWeight: 700,
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            fontSize: 'var(--font-body)',
          }}
        >
          <AppIcons.Plus size={15} />
          <span>طلب استفسار فني جديد (RFI)</span>
        </button>
      </div>

      {/* بطاقات الإحصاء */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الاستفسارات الفنية</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {rfis.length} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>طلب</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>استفسارات بانتظار الرد (مفتوحة)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: openCount > 0 ? '#b91c1c' : '#15803d', marginTop: '2px' }}>
            {openCount} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>طلب معلق</span>
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>استفسارات تم البت والرد فيها</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {answeredCount} <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>طلب معتمد</span>
          </div>
        </div>
      </div>

      {/* جدول أو بطاقات الـ RFIs */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: 'var(--font-body)' }}>
            جاري تحميل طلبات الاستفسار الفني...
          </div>
        ) : rfis.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.FileText size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد استفسارات فنية مسجلة لهذا المشروع
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              عند مواجهة أي تعارض في المخططات أو الحاجة لقرار استشاري رسمي، افتح RFI لتوثيق المسار الهندسي.
            </div>
            <button
              type="button"
              onClick={onNewRfi}
              style={{
                height: '36px',
                padding: '0 16px',
                borderRadius: '8px',
                fontWeight: 700,
                background: '#170e5e',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                fontSize: 'var(--font-body)',
              }}
            >
              فتح طلب استفسار جديد
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rfis.map((rfi) => (
              <div key={rfi.id} style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: 'var(--font-body)', fontWeight: 800, color: '#170e5e' }}>
                      {rfi.rfiNumber}
                    </span>
                    <span style={{ fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                      {rfi.subject}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {getStatusBadge(rfi.status)}
                    <button
                      type="button"
                      onClick={() => onAnswerRfi(rfi)}
                      style={{
                        height: '28px',
                        padding: '0 10px',
                        borderRadius: '6px',
                        fontSize: 'var(--font-badge)',
                        fontWeight: 600,
                        background: rfi.status === 'open' ? '#170e5e' : '#f1f5f9',
                        color: rfi.status === 'open' ? '#ffffff' : '#334155',
                        border: rfi.status === 'open' ? 'none' : '1px solid #cbd5e1',
                        cursor: 'pointer',
                      }}
                    >
                      {rfi.status === 'open' ? 'تسجيل رد الاستشاري' : 'تعديل الرد'}
                    </button>
                  </div>
                </div>

                {/* نص السؤال وتفاصيل الاستفسار */}
                <div style={{ fontSize: 'var(--font-body)', color: '#334155', marginBottom: '8px', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                    الاستفسار الموجه إلى: {rfi.assignedTo || 'المكتب الاستشاري'} | تاريخ التقديم: {rfi.dateRequested} {rfi.dateRequired ? `| موعد الرد المطلوب: ${rfi.dateRequired}` : ''}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{rfi.question}</div>
                </div>

                {/* رد الاستشاري إن وجد */}
                {rfi.answer && (
                  <div style={{ fontSize: 'var(--font-body)', color: '#065f46', background: '#ecfdf5', padding: '10px 14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                    <div style={{ fontSize: 'var(--font-micro)', color: '#047857', fontWeight: 700, marginBottom: '2px' }}>
                      رد واعتماد الاستشاري {rfi.answeredBy ? `(بواسطة: ${rfi.answeredBy})` : ''}:
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{rfi.answer}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
