import { useState, useEffect, useCallback } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { contractingApi } from '../api/contracting.api';
import type { SubcontractorLedgerResponse } from '../contracting.types';
import { useSystemCurrency } from '@/shared/hooks/use-system-currency';
import { useContracting } from '../context/ContractingContext';
import { AppIcons } from '@/shared/components/icons/AppIcons';
import { CustomSelect } from '@/shared/ui/custom-select';
import { RecordSubcontractorPaymentModal } from './RecordSubcontractorPaymentModal';

interface SubcontractorLedgerModalProps {
  open: boolean;
  subcontractorId: number;
  initialProjectId?: string;
  onClose: () => void;
}

export function SubcontractorLedgerModal({
  open,
  subcontractorId,
  initialProjectId,
  onClose,
}: SubcontractorLedgerModalProps) {
  const { currencySymbol } = useSystemCurrency();
  const { projects } = useContracting();

  const [ledgerData, setLedgerData] = useState<SubcontractorLedgerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId || '');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const loadLedger = useCallback(async () => {
    if (!open || !subcontractorId) return;
    try {
      setLoading(true);
      const data = await contractingApi.getSubcontractorLedger(subcontractorId, {
        projectId: selectedProjectId || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setLedgerData(data);
    } catch (err) {
      console.error('Failed to load subcontractor ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [open, subcontractorId, selectedProjectId, fromDate, toDate]);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const sub = ledgerData?.subcontractor;
  const summary = ledgerData?.summary;
  const transactions = ledgerData?.transactions || [];

  const projectOptions = [
    { value: '', label: 'كافة المشاريع' },
    ...projects.map((p) => ({ value: p.id, label: `${p.code} - ${p.name}` })),
  ];

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <StandardDialog
        open={open}
        onClose={onClose}
        title="كشف حساب مقاول الباطن (Subcontractor Statement - ما له وما عليه)"
        subtitle="سجل تحليلي شامل للمستخلصات المعتمدة، الدفعات المسددة، الخصومات، ومحجوز الضمان"
        maxWidth="1100px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} dir="rtl">
          {/* هيدر المقاول ومعلومات الاتصال */}
          {sub && (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                    {sub.name}
                  </h3>
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      background: '#eff6ff',
                      color: '#1e40af',
                      fontWeight: 700,
                      fontSize: 'var(--font-micro)',
                      border: '1px solid #dbeafe',
                    }}
                  >
                    {sub.tradeSpecialty || 'مقاولات عامة'}
                  </span>
                  <span
                    style={{
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: sub.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: sub.status === 'active' ? '#15803d' : '#991b1b',
                      fontWeight: 600,
                      fontSize: 'var(--font-micro)',
                    }}
                  >
                    {sub.status === 'active' ? 'معتمد ونشط' : 'موقوف'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', marginTop: '6px', fontSize: 'var(--font-micro)', color: '#64748b' }}>
                  {sub.phone && <span>الهاتف: {sub.phone}</span>}
                  {sub.contactPerson && <span>المسؤول: {sub.contactPerson}</span>}
                  {sub.taxNumber && <span>الرقم الضريبي: {sub.taxNumber}</span>}
                  {sub.bankName && <span>البنك: {sub.bankName} {sub.bankIban && `(${sub.bankIban})`}</span>}
                </div>
              </div>

              {/* أزرار الإجراءات السريعة */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(true)}
                  style={{
                    height: '36px',
                    padding: '0 14px',
                    borderRadius: '8px',
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 'var(--font-body)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <AppIcons.Plus size={15} />
                  <span>تسجيل دفعة / صرف</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    fontWeight: 600,
                    fontSize: 'var(--font-body)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <AppIcons.Printer size={15} />
                  <span>طباعة الكشف</span>
                </button>
              </div>
            </div>
          )}

          {/* بطاقات الملخص المالي لكشف الحساب */}
          {summary && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 14px' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#64748b', fontWeight: 600 }}>إجمالي العقود المسندة</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', marginTop: '2px' }}>
                  {summary.totalCommitted.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8' }}>{summary.totalSubcontracts} عقد/أمر تكليف</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#f0fdf4' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#166534', fontWeight: 700 }}>إجمالي المستخلصات (له)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d', marginTop: '2px' }}>
                  {summary.totalInvoiced.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#16a34a' }}>أعمال وتشوينات معتمدة</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fed7aa', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#fff7ed' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#9a3412', fontWeight: 700 }}>الدفعات المسددة (عليه)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#c2410c', marginTop: '2px' }}>
                  {summary.totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#ea580c' }}>سندات صرف بنكية ونقدية</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #fecaca', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#fef2f2' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#991b1b', fontWeight: 700 }}>خصومات الموقع (عليه)</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', marginTop: '2px' }}>
                  {summary.totalBackcharges.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#ef4444' }}>تشوينات وعيوب وتلفيات</div>
              </div>

              <div style={{ background: '#ffffff', border: '1px solid #c7d2fe', borderRadius: '10px', padding: '10px 14px', backgroundColor: '#eff6ff' }}>
                <div style={{ fontSize: 'var(--font-micro)', color: '#1e40af', fontWeight: 700 }}>صافي المستحق للمقاول</div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#170e5e', marginTop: '2px' }}>
                  {summary.netBalanceDue.toLocaleString('en-US', { minimumFractionDigits: 2 })} <span style={{ fontSize: '0.7rem' }}>{currencySymbol}</span>
                </div>
                <div style={{ fontSize: '10px', color: '#3b82f6' }}>
                  محتجز ضمان: {summary.totalRetentionHeld.toLocaleString('ar-EG')} {currencySymbol}
                </div>
              </div>
            </div>
          )}

          {/* شريط الفلاتر */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <div style={{ width: '220px' }}>
              <CustomSelect
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                options={projectOptions}
                placeholder="تصفية حسب المشروع..."
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: 'var(--font-micro)', color: '#64748b' }}>إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                style={{ height: '34px', padding: '0 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: 'var(--font-micro)' }}
              />
            </div>
            {(selectedProjectId || fromDate || toDate) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedProjectId('');
                  setFromDate('');
                  setToDate('');
                }}
                style={{ height: '34px', padding: '0 10px', borderRadius: '6px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontSize: 'var(--font-micro)', color: '#334155' }}
              >
                إعادة ضبط
              </button>
            )}
          </div>

          {/* جدول الحركات المالية التحليلي */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', minHeight: '300px' }}>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '10px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', border: '3px solid #e2e8f0', borderTopColor: '#170e5e', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8' }}>جاري تحميل كشف الحساب...</span>
              </div>
            ) : transactions.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <AppIcons.FileText size={42} style={{ color: '#cbd5e1', marginBottom: '8px' }} />
                <div style={{ fontWeight: 700, fontSize: 'var(--font-section-title)', color: '#334155' }}>لا توجد حركات مالية مسجلة لهذا المقاول</div>
                <div style={{ fontSize: 'var(--font-subtitle)', color: '#94a3b8', marginTop: '4px' }}>
                  ستظهر هنا مستخلصات الأعمال المعتمدة، وسندات صرف الدفعات، وخصومات الموقع فور اعتمادها.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '920px', tableLayout: 'fixed', borderCollapse: 'collapse', textAlign: 'right' }}>
                  <colgroup>
                    <col style={{ width: '105px' }} /> {/* التاريخ */}
                    <col style={{ width: '130px' }} /> {/* رقم المستند */}
                    <col style={{ width: '110px' }} /> {/* نوع الحركة */}
                    <col style={{ width: '260px' }} /> {/* البيان والتفاصيل */}
                    <col style={{ width: '105px' }} /> {/* له (دائن) */}
                    <col style={{ width: '105px' }} /> {/* عليه (مدين) */}
                    <col style={{ width: '115px' }} /> {/* الرصيد بعد الحركة */}
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>التاريخ</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>رقم المستند</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>نوع الحركة</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 600, color: '#475569' }}>البيان والتفاصيل</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#15803d', textAlign: 'left' }}>له (دائن)</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#dc2626', textAlign: 'left' }}>عليه (مدين)</th>
                      <th style={{ padding: '10px 12px', fontSize: 'var(--font-table-head)', fontWeight: 700, color: '#170e5e', textAlign: 'left' }}>الرصيد التراكمي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#475569', whiteSpace: 'nowrap' }}>
                          {tx.date}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {tx.refNumber}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {tx.type === 'invoice' && (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontSize: 'var(--font-micro)', fontWeight: 700 }}>
                              مستخلص معتمد
                            </span>
                          )}
                          {tx.type === 'payment' && (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#e0e7ff', color: '#3730a3', fontSize: 'var(--font-micro)', fontWeight: 700 }}>
                              سند صرف دفعة
                            </span>
                          )}
                          {tx.type === 'backcharge' && (
                            <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontSize: 'var(--font-micro)', fontWeight: 700 }}>
                              خصم موقع
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 'var(--font-body)', color: '#334155' }}>
                          <div>{tx.description}</div>
                          {tx.details && tx.details.retentionHeld > 0 ? (
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                              (مستقطع ضمان أعمال: {tx.details.retentionHeld.toLocaleString('ar-EG')} {currencySymbol})
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: tx.credit > 0 ? '#15803d' : '#94a3b8', fontSize: 'var(--font-body)' }}>
                          {tx.credit > 0 ? tx.credit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: tx.debit > 0 ? '#dc2626' : '#94a3b8', fontSize: 'var(--font-body)' }}>
                          {tx.debit > 0 ? tx.debit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: '#170e5e', fontSize: 'var(--font-body)' }}>
                          {tx.balanceAfter.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </StandardDialog>

      {/* نافذة تسجيل دفعة سريعة من داخل كشف الحساب */}
      {sub && (
        <RecordSubcontractorPaymentModal
          open={isPaymentModalOpen}
          subcontractor={sub}
          projectId={selectedProjectId || initialProjectId}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={loadLedger}
        />
      )}
    </>
  );
}
