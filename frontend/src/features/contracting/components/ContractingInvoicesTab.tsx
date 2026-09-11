import { useState } from 'react';
import { ContractingInvoice, ContractingProject } from '../contracting.types';
import { contractingApi } from '../api/contracting.api';
import { AppIcons } from '@/shared/components/icons/AppIcons';

interface ContractingInvoicesTabProps {
  invoices: ContractingInvoice[];
  loading: boolean;
  project?: ContractingProject | null;
  onNewInvoice: () => void;
  onPrintCertificate: (invoice: ContractingInvoice) => void;
  onRefresh: () => void;
  ipcFilter: 'client' | 'subcontractor';
  onFilterChange: (filter: 'client' | 'subcontractor') => void;
}

export function ContractingInvoicesTab({
  invoices,
  loading,
  project,
  onNewInvoice,
  onPrintCertificate,
  onRefresh,
  ipcFilter,
  onFilterChange,
}: ContractingInvoicesTabProps) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [postingJournalId, setPostingJournalId] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في اعتماد هذا المستخلص رسمياً؟')) return;
    setApprovingId(id);
    try {
      await contractingApi.approveInvoice(id);
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل اعتماد المستخلص');
    } finally {
      setApprovingId(null);
    }
  };

  const handlePostJournal = async (id: string) => {
    setPostingJournalId(id);
    try {
      const res = await contractingApi.postInvoiceJournal(id);
      alert(res.message || 'تم ترحيل القيد المحاسبي لدفتر الأستاذ العام بنجاح');
      onRefresh();
    } catch (err: any) {
      alert(err?.message || 'فشل ترحيل القيد المحاسبي');
    } finally {
      setPostingJournalId(null);
    }
  };

  const getStatusBadge = (status: string, journalEntryId?: number | null) => {
    switch (status) {
      case 'approved':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#dcfce7', color: '#15803d', border: '1px solid #bbf7d0', width: 'fit-content' }}>
              معتمد
            </span>
            {journalEntryId ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-micro)', fontWeight: 700, color: '#047857' }}>
                <AppIcons.FileCheck size={11} />
                قيد #{journalEntryId}
              </span>
            ) : (
              <span style={{ fontSize: 'var(--font-micro)', color: '#d97706', fontWeight: 600 }}>
                غير مرحل دفترياً
              </span>
            )}
          </div>
        );
      case 'paid':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', width: 'fit-content' }}>
              تم الصرف والتحصيل
            </span>
            {journalEntryId && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: 'var(--font-micro)', fontWeight: 700, color: '#4338ca' }}>
                <AppIcons.FileCheck size={11} />
                قيد #{journalEntryId}
              </span>
            )}
          </div>
        );
      case 'submitted':
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>مقدم للاستشاري</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: 'var(--font-badge)', fontWeight: 600, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>مسودة داخلية</span>;
    }
  };

  const totalCumulativeAmount = invoices.filter(i => i.status === 'approved').reduce((sum, i) => sum + Number(i.cumulativeAmount || 0), 0);
  const totalNetPayable = invoices.filter(i => i.status === 'approved').reduce((sum, i) => sum + Number(i.netPayable || 0), 0);
  const totalRetentions = invoices.filter(i => i.status === 'approved').reduce((sum, i) => sum + Number(i.retentionHeldAmount || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
      {/* هيدر التبويب وفلتر نوع المستخلص */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#1e293b', margin: 0 }}>
            المستخلصات وشهادات الدفع الجارية (Interim Payment Certificates - IPC)
          </h2>
          <p style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', margin: '4px 0 0' }}>
            {project ? `المشروع: ${project.name}` : 'مطابقة الأعمال المنفذة، التشوينات بالموقع، واحتساب الاستقطاعات النظامية'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* فلتر العميل / مقاولي الباطن */}
          <div style={{ display: 'inline-flex', background: '#f1f5f9', borderRadius: '8px', padding: '3px', border: '1px solid #e2e8f0' }}>
            <button
              type="button"
              onClick={() => onFilterChange('client')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: 'var(--font-badge)',
                fontWeight: 600,
                cursor: 'pointer',
                background: ipcFilter === 'client' ? '#ffffff' : 'transparent',
                color: ipcFilter === 'client' ? '#170e5e' : '#64748b',
                boxShadow: ipcFilter === 'client' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              مستخلصات المالك (العميل)
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('subcontractor')}
              style={{
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: 'var(--font-badge)',
                fontWeight: 600,
                cursor: 'pointer',
                background: ipcFilter === 'subcontractor' ? '#ffffff' : 'transparent',
                color: ipcFilter === 'subcontractor' ? '#170e5e' : '#64748b',
                boxShadow: ipcFilter === 'subcontractor' ? '0 1px 3px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              مستخلصات مقاولي الباطن
            </button>
          </div>

          <button
            type="button"
            onClick={onNewInvoice}
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
            <span>إصدار مستخلص جديد (IPC)</span>
          </button>
        </div>
      </div>

      {/* شريط الإحصائيات للمستخلصات المعتمدة */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي الأعمال المعتمدة تراكمياً</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '2px' }}>
            {totalCumulativeAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>صافي المستحقات المالية المعتمدة للصرف</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
            {totalNetPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px 16px' }}>
          <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي ضمان حسن التنفيذ المحتجز (Retentions)</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a16207', marginTop: '2px' }}>
            {totalRetentions.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* جدول المستخلصات */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', minHeight: '280px', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <div style={{ flex: 1, minHeight: '280px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '32px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', fontWeight: 600 }}>جاري تحميل المستخلصات...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div style={{ flex: 1, minHeight: '280px', padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ color: '#94a3b8', marginBottom: '12px' }}>
              <AppIcons.Receipt size={48} />
            </div>
            <div style={{ fontSize: 'var(--font-section-title)', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
              لا توجد مستخلصات مسجلة لهذا المشروع ({ipcFilter === 'client' ? 'المالك' : 'مقاولو الباطن'})
            </div>
            <div style={{ fontSize: 'var(--font-subtitle)', color: '#64748b', maxWidth: '420px', margin: '0 auto 16px' }}>
              أنشئ مستخلصاً جارياً بمطابقة بنود جدول الكميات والمواد المشونة لتوليد شهادة الدفع المعتمدة.
            </div>
            <button
              type="button"
              onClick={onNewInvoice}
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
              إصدار مستخلص جديد
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم المستخلص</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>التسلسل والفترة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الأعمال الحالية</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>المواد المشونة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الإجمالي التراكمي</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>استقطاع الدفعة المقدمة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>ضمان حسن التنفيذ</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>صافي المستحق</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569', textAlign: 'center' }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#1e293b' }}>
                      {inv.ipcNumber}
                      {inv.notes?.includes('ختامي') && (
                        <span style={{ display: 'block', fontSize: 'var(--font-micro)', color: '#b91c1c' }}>
                          مستخلص ختامي
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      <div style={{ fontWeight: 600 }}>مستخلص رقم #{inv.sequenceOrder}</div>
                      {inv.periodStart && (
                        <div style={{ fontSize: 'var(--font-micro)', color: '#94a3b8' }}>
                          من {inv.periodStart} إلى {inv.periodEnd || 'الآن'}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 600, color: '#0f172a' }}>
                      {Number(inv.currentAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#475569' }}>
                      {Number(inv.storedMaterialsAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a' }}>
                      {Number(inv.cumulativeAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#b91c1c' }}>
                      {Number(inv.advanceRecoveryAmount || 0) > 0
                        ? `-${Number(inv.advanceRecoveryAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '0.00'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', color: '#b91c1c' }}>
                      {Number(inv.retentionHeldAmount || 0) > 0
                        ? `-${Number(inv.retentionHeldAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
                        : '0.00'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 'var(--font-body)', fontWeight: 800, color: '#170e5e' }}>
                      {Number(inv.netPayable || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {getStatusBadge(inv.status, inv.journalEntryId)}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {inv.status !== 'approved' && inv.status !== 'paid' && (
                          <button
                            type="button"
                            disabled={approvingId === inv.id}
                            onClick={() => handleApprove(inv.id)}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#15803d',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                            }}
                          >
                            اعتماد
                          </button>
                        )}
                        {inv.status === 'approved' && !inv.journalEntryId && (
                          <button
                            type="button"
                            disabled={postingJournalId === inv.id}
                            onClick={() => handlePostJournal(inv.id)}
                            style={{
                              height: '28px',
                              padding: '0 10px',
                              borderRadius: '6px',
                              fontSize: 'var(--font-badge)',
                              fontWeight: 600,
                              background: '#170e5e',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="ترحيل القيد لدفتر الأستاذ العام"
                          >
                            <AppIcons.FileCheck size={12} />
                            <span>{postingJournalId === inv.id ? 'جاري...' : 'ترحيل القيد'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onPrintCertificate(inv)}
                          style={{
                            height: '28px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            fontSize: 'var(--font-badge)',
                            fontWeight: 600,
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <AppIcons.Printer size={13} />
                          <span>شهادة الدفع</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
