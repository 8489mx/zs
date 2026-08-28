import { useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import {
  RefreshCwIcon,
  ScaleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PrinterIcon,
  CreditCardIcon,
  BuildingIcon,
  TruckIcon,
  UsersIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  LayersIcon,
  SparklesIcon,
} from '@/shared/components/icons/AppIcons';
import { printCashDrawerShiftReceipt } from '@/features/cash-drawer/utils/cash-drawer-receipt';
import { formatCurrency, formatDate } from '@/lib/format';
import type { CashierShift } from '@/types/domain';
import {
  type ComparisonRow,
  differenceLabel,
  differenceTone,
  formatCount,
  formatDateOnly,
  formatDuration,
  formatMoney,
  formatSignedCount,
  formatTimeOnly,
  toCount,
  toDisplayCount,
  toMoney,
} from '@/features/cash-drawer/components/cashDrawerReview.helpers';

interface CashDrawerReviewDialogProps {
  open: boolean;
  shift: CashierShift | null;
  managerNote: string;
  onManagerNoteChange: (value: string) => void;
  onApprove: () => void;
  onClose: () => void;
  isPending: boolean;
  isError: boolean;
  error: unknown;
}

interface MovementGroup {
  kind: string;
  label: string;
  total: number;
  isCredit: boolean; // true = +, false = -
  items: Array<{
    id: string;
    amount: number;
    note: string;
    createdAt: string;
  }>;
}

export function CashDrawerReviewDialog(props: CashDrawerReviewDialogProps) {
  const shift = props.shift;
  const [expandedKinds, setExpandedKinds] = useState<Record<string, boolean>>({});
  const [showMovements, setShowMovements] = useState(false);
  const [compactView, setCompactView] = useState(false);

  const toggleGroup = (kind: string) => {
    setExpandedKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const expected = useMemo(() => {
    const rawCashSales = toMoney((shift?.cashSalesTotal || 0) + (shift?.serviceCashTotal || 0));
    const expectedCard = toMoney((shift?.cardSalesTotal || 0) + (shift?.serviceCardTotal || 0) - (shift?.saleReturnCardRefundTotal || 0));
    const expectedWallet = toMoney(shift?.walletSalesTotal || 0);
    const expectedInstapay = toMoney(shift?.instapaySalesTotal || 0);
    const expectedCredit = toMoney(shift?.creditSalesTotal || 0);
    const expectedDelivery = toMoney(shift?.deliverySalesTotal || 0);
    return { rawCashSales, expectedCard, expectedWallet, expectedInstapay, expectedCredit, expectedDelivery };
  }, [shift]);

  const declared = useMemo(() => ({
    cash: toMoney(shift?.declaredCash ?? shift?.countedCash ?? 0),
    card: toMoney(shift?.declaredCardTotal || 0),
    wallet: toMoney(shift?.declaredWalletTotal || 0),
    instapay: toMoney(shift?.declaredInstapayTotal || 0),
  }), [shift]);

  const statusLabel = shift?.status === 'pending_review' ? 'في انتظار مراجعة المشرف' : (shift?.status || '—');

  const totalDeductions = shift ? (
    Number(shift.cashDrawerCashOutTotal || 0) +
    Number(shift.expensesTotal || 0) +
    Number(shift.supplierPaymentsTotal || 0) +
    Number(shift.saleReturnCashRefundTotal || 0)
  ) : 0;

  const dynamicExpectedCash = shift ? (
    Number(shift.openingCash || 0) +
    Number(shift.cashSalesTotal || 0) +
    Number(shift.serviceCashTotal || 0) +
    Number(shift.cashDrawerManualCashInTotal || (Number(shift.cashDrawerDeliveryCashInTotal || 0) === 0 ? shift.cashDrawerCashInTotal : 0) || 0) -
    totalDeductions
  ) : 0;

  const dynamicVariance = shift ? (
    (shift.declaredCash ?? shift.countedCash) != null ? Number(shift.declaredCash ?? shift.countedCash) - dynamicExpectedCash : Number(shift.variance || 0)
  ) : 0;

  const electronicDiff = toMoney(
    (declared.card - expected.expectedCard) +
    (declared.wallet - expected.expectedWallet) +
    (declared.instapay - expected.expectedInstapay)
  );

  const totalShiftDiscrepancy = toMoney(dynamicVariance + electronicDiff);

  const comparison = useMemo(() => {
    const rows: ComparisonRow[] = [
      { key: 'cash', label: 'مبيعات نقدية (كاش)', systemAmount: expected.rawCashSales, declaredAmount: declared.cash, amountDiff: dynamicVariance, systemCount: null, declaredCount: null, countDiff: null },
      { key: 'card', label: 'مبيعات بطاقات (فيزا)', systemAmount: expected.expectedCard, declaredAmount: declared.card, amountDiff: toMoney(declared.card - expected.expectedCard), systemCount: toCount(shift?.cardOperationCount || 0), declaredCount: toCount(shift?.declaredCardCount || 0), countDiff: toCount(shift?.declaredCardCount || 0) - toCount(shift?.cardOperationCount || 0) },
      { key: 'wallet', label: 'محافظ إلكترونية', systemAmount: expected.expectedWallet, declaredAmount: declared.wallet, amountDiff: toMoney(declared.wallet - expected.expectedWallet), systemCount: toCount(shift?.walletOperationCount || 0), declaredCount: toCount(shift?.declaredWalletCount || 0), countDiff: toCount(shift?.declaredWalletCount || 0) - toCount(shift?.walletOperationCount || 0) },
      { key: 'instapay', label: 'تحويلات إنستاباي', systemAmount: expected.expectedInstapay, declaredAmount: declared.instapay, amountDiff: toMoney(declared.instapay - expected.expectedInstapay), systemCount: toCount(shift?.instapayOperationCount || 0), declaredCount: toCount(shift?.declaredInstapayCount || 0), countDiff: toCount(shift?.declaredInstapayCount || 0) - toCount(shift?.instapayOperationCount || 0) },
    ];
    if (expected.expectedCredit > 0) {
      rows.push({ key: 'credit', label: 'مبيعات آجلة (ذمم عملاء)', systemAmount: expected.expectedCredit, declaredAmount: 0, amountDiff: 0, systemCount: null, declaredCount: null, countDiff: null });
    }
    if (expected.expectedDelivery > 0) {
      rows.push({ key: 'delivery', label: 'مبيعات دليفري (تحصيل مناديب)', systemAmount: expected.expectedDelivery, declaredAmount: 0, amountDiff: 0, systemCount: null, declaredCount: null, countDiff: null });
    }
    const systemAmountTotal = rows.reduce((sum, row) => sum + toMoney(row.systemAmount), 0);
    const declaredAmountTotal = rows.reduce((sum, row) => sum + (row.key === 'credit' || row.key === 'delivery' ? 0 : toMoney(row.declaredAmount)), 0);
    const amountDiffTotal = totalShiftDiscrepancy;
    const systemOpsTotal = rows.reduce((sum, row) => sum + (row.systemCount == null ? 0 : row.systemCount), 0);
    const declaredOpsTotal = rows.reduce((sum, row) => sum + (row.declaredCount == null ? 0 : row.declaredCount), 0);
    return { rows, systemAmountTotal, declaredAmountTotal, amountDiffTotal, systemOpsTotal, declaredOpsTotal, opsDiffTotal: declaredOpsTotal - systemOpsTotal };
  }, [declared.card, declared.cash, declared.instapay, declared.wallet, dynamicVariance, expected.expectedCard, expected.expectedCredit, expected.expectedDelivery, expected.expectedInstapay, expected.expectedWallet, expected.rawCashSales, shift?.cardOperationCount, shift?.declaredCardCount, shift?.declaredInstapayCount, shift?.declaredWalletCount, shift?.instapayOperationCount, shift?.walletOperationCount, totalShiftDiscrepancy]);

  const reviewMatched = Math.abs(totalShiftDiscrepancy) <= 0.009 && comparison.opsDiffTotal === 0;

  // Grouped drawer movements
  const movementGroups = useMemo(() => {
    const rawItems = shift?.movementItems || [];
    const groupsMap: Record<string, MovementGroup> = {
      cash_in: { kind: 'cash_in', label: 'إيداع نقدي بالدرج (يدوياً)', total: Number(shift?.cashDrawerManualCashInTotal || shift?.cashDrawerCashInTotal || 0), isCredit: true, items: [] },
      cash_out: { kind: 'cash_out', label: 'مسحوبات نقدية من الدرج', total: Number(shift?.cashDrawerCashOutTotal || 0), isCredit: false, items: [] },
      expense: { kind: 'expense', label: 'مصروفات تشغيلية ونثرية', total: Number(shift?.expensesTotal || 0), isCredit: false, items: [] },
      supplier_payment: { kind: 'supplier_payment', label: 'سداد دفعات موردين', total: Number(shift?.supplierPaymentsTotal || 0), isCredit: false, items: [] },
      sale_return: { kind: 'sale_return', label: 'مرتجع مبيعات نقدي', total: Number(shift?.saleReturnCashRefundTotal || 0), isCredit: false, items: [] },
    };

    for (const item of rawItems) {
      if (item.kind === 'delivery') continue;
      if (groupsMap[item.kind]) {
        groupsMap[item.kind].items.push(item);
      } else if (item.kind === 'return') {
        groupsMap.sale_return.items.push(item);
      } else {
        groupsMap.cash_in.items.push(item);
      }
    }

    return Object.values(groupsMap).filter((g) => g.total > 0 || g.items.length > 0);
  }, [shift]);

  const cleanCloseNote = shift?.closeNote && !shift.closeNote.startsWith('BLIND_CLOSE:')
    ? shift.closeNote
    : (!shift?.closeNoteRaw?.startsWith('BLIND_CLOSE:') && shift?.closeNoteRaw ? shift.closeNoteRaw : '');

  return (
    <DialogShell open={props.open} onClose={props.onClose} width="min(1140px, 96vw)" ariaLabel="مراجعة واعتماد إغلاق الوردية">
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: compactView ? '10px 14px' : '16px 20px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        gap: compactView ? '8px' : '14px'
      }}>
        {shift ? (
          <>
            {/* 1. Header Bar with Mode Toggle Switch */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px 14px',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: compactView ? '6px' : '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: compactView ? '16px' : '22px', background: '#0284c7', borderRadius: '2px' }} />
                <h3 style={{ margin: 0, fontSize: compactView ? '1.02rem' : '1.2rem', fontWeight: 800, color: '#0f172a' }}>
                  مراجعة واعتماد إغلاق الوردية
                </h3>
                <span style={{ fontSize: compactView ? '0.78rem' : '0.86rem', color: '#64748b' }}>
                  (كاشير: <strong style={{ color: '#0f172a' }}>{shift.openedByName || '—'}</strong> | وردية: <strong style={{ color: '#0284c7' }}>#{shift.id || shift.docNo}</strong> | {formatDateOnly(shift.createdAt)} - {formatDuration(shift.createdAt, shift.closedAt)})
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCompactView(!compactView)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: compactView ? '#f0fdf4' : '#f8fafc',
                    border: `1px solid ${compactView ? '#86efac' : '#cbd5e1'}`,
                    borderRadius: '6px',
                    padding: compactView ? '3px 8px' : '5px 12px',
                    fontSize: compactView ? '0.75rem' : '0.8rem',
                    fontWeight: 700,
                    color: compactView ? '#16a34a' : '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                  title={compactView ? 'التبديل إلى الوضع المريح الطبيعي' : 'التبديل إلى الوضع المضغوط للشاشات الصغيرة'}
                >
                  {compactView ? <SparklesIcon size={14} color="#16a34a" /> : <LayersIcon size={14} color="#64748b" />}
                  <span>{compactView ? 'الوضع المريح' : 'الوضع المضغوط'}</span>
                </button>

                <span className={shift.status === 'pending_review' ? 'badge badge-warning' : 'badge'} style={{ padding: '3px 9px', fontSize: '0.76rem' }}>{statusLabel}</span>
              </div>
            </div>

            {/* 1.1 Metadata Bar (In comfortable mode, shown as clean separated row) */}
            {!compactView && (
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px 16px',
                background: '#f8fafc',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.84rem'
              }}>
                <div><strong>الحالة:</strong> <span className={shift.status === 'pending_review' ? 'badge badge-warning' : 'badge'}>{statusLabel}</span></div>
                <div><strong>الفرع / المخزن:</strong> <span>{shift.branchName || '—'} / {shift.locationName || '—'}</span></div>
                <div><strong>التوقيت:</strong> <span>من {formatTimeOnly(shift.createdAt)} إلى {formatTimeOnly(shift.closedAt)}</span></div>
                {shift.closedByName && shift.openedByName && shift.closedByName.trim().toLowerCase() !== shift.openedByName.trim().toLowerCase() ? (
                  <div><strong>أُغلقت إدارياً بواسطة:</strong> <strong style={{ color: '#b45309' }}>{shift.closedByName}</strong></div>
                ) : null}
              </div>
            )}

            {/* 2. Discrepancy Verdict Banner */}
            <div
              className={`cash-drawer-review-banner cash-drawer-review-diff-${reviewMatched ? 'ok' : 'negative'}`}
              style={{
                padding: compactView ? '6px 12px' : '10px 16px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '4px 12px',
                fontSize: compactView ? '0.8rem' : '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800 }}>
                {reviewMatched ? <CheckCircleIcon size={18} color="#16a34a" /> : <AlertTriangleIcon size={18} color="#dc2626" />}
                <span>{reviewMatched ? 'الوردية متطابقة بالكامل مع إقرار الكاشير.' : 'تنبيه: يوجد عجز / فارق في إقرار الكاشير مقارنة بالنظام.'}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px' }}>
                <span><strong>إجمالي الفارق:</strong> <strong style={{ color: totalShiftDiscrepancy < 0 ? '#dc2626' : totalShiftDiscrepancy > 0 ? '#16a34a' : 'inherit', fontSize: compactView ? '0.86rem' : '0.92rem' }}>{differenceLabel(totalShiftDiscrepancy)}</strong></span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span><strong>فارق نقدية الدرج:</strong> <strong style={{ color: dynamicVariance < 0 ? '#dc2626' : dynamicVariance > 0 ? '#16a34a' : 'inherit' }}>{differenceLabel(dynamicVariance)}</strong></span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span><strong>فارق المدفوعات الإلكترونية:</strong> <strong style={{ color: electronicDiff < 0 ? '#dc2626' : electronicDiff > 0 ? '#16a34a' : 'inherit' }}>{differenceLabel(electronicDiff)}</strong></span>
                <span style={{ color: '#cbd5e1' }}>|</span>
                <span><strong>فرق العمليات:</strong> {formatSignedCount(comparison.opsDiffTotal)}</span>
              </div>
            </div>

            {/* 3. Primary Table: System vs Cashier Declared (جدول المطابقة والمقارنة الشامل الموحد) */}
            <div className="cash-drawer-review-block" style={{ marginTop: '0' }}>
              <div className="table-wrap" style={{ overflowX: 'visible' }}>
                <table className="cash-drawer-review-table" style={{ width: '100%', fontSize: compactView ? '0.82rem' : '0.86rem' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'right' }}>طريقة الدفع / قناة البيع</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>مبيعات النظام</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>إقرار الكاشير</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>فرق المبلغ</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>عمليات النظام</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>عمليات الكاشير</th>
                      <th style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>فرق العدد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.key}>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'right' }}><strong>{row.label}</strong></td>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>{formatMoney(row.systemAmount)}</td>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>
                          {row.key === 'credit' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', background: '#f1f5f9', color: '#475569', padding: compactView ? '1px 6px' : '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              <UsersIcon size={12} color="#64748b" /> ذمة عميل (آجل)
                            </span>
                          ) : row.key === 'delivery' ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', background: '#f1f5f9', color: '#475569', padding: compactView ? '1px 6px' : '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                              <TruckIcon size={12} color="#64748b" /> مع المناديب (دليفري)
                            </span>
                          ) : (
                            formatMoney(row.declaredAmount)
                          )}
                        </td>
                        <td className={`cash-drawer-review-diff-${differenceTone(row.amountDiff)}`} style={{ fontWeight: 700, padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>
                          {row.key === 'credit' || row.key === 'delivery' ? <span style={{ color: '#94a3b8' }}>—</span> : differenceLabel(row.amountDiff)}
                        </td>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>{toDisplayCount(row.systemCount)}</td>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>{toDisplayCount(row.declaredCount)}</td>
                        <td style={{ padding: compactView ? '4px 8px' : '7px 10px', textAlign: 'center' }}>{row.countDiff == null ? '—' : formatSignedCount(row.countDiff)}</td>
                      </tr>
                    ))}
                    <tr className="cash-drawer-review-total-row" style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'right' }}><strong>إجمالي مبيعات الفواتير</strong></td>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}><strong style={{ color: '#0f172a' }}>{formatMoney(comparison.systemAmountTotal)}</strong></td>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}><strong>{formatMoney(comparison.declaredAmountTotal)}</strong></td>
                      <td className={`cash-drawer-review-diff-${differenceTone(comparison.amountDiffTotal)}`} style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}>
                        <strong>{differenceLabel(comparison.amountDiffTotal)}</strong>
                      </td>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}><strong>{formatCount(comparison.systemOpsTotal)}</strong></td>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}><strong>{formatCount(comparison.declaredOpsTotal)}</strong></td>
                      <td style={{ padding: compactView ? '5px 8px' : '8px 10px', textAlign: 'center' }}><strong>{formatSignedCount(comparison.opsDiffTotal)}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Compact 1-Line Cash Reconciliation Bar (معادلة الدرج الملمومة) */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: compactView ? '6px 12px' : '10px 16px',
              fontSize: compactView ? '0.8rem' : '0.84rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#334155', fontWeight: 800 }}>
                  <ScaleIcon size={compactView ? 14 : 16} color="#475569" /> جرد ومطابقة الدرج:
                </div>
                <div>العهدة: <strong>{formatCurrency(shift.openingCash)}</strong></div>
                <div>(+) مبيعات كاش: <strong style={{ color: '#16a34a' }}>+{formatCurrency(Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0))}</strong></div>
                <div>(+) إيداعات: <strong style={{ color: '#16a34a' }}>+{formatCurrency(Number(shift.cashDrawerManualCashInTotal || (Number(shift.cashDrawerDeliveryCashInTotal || 0) === 0 ? shift.cashDrawerCashInTotal : 0) || 0))}</strong></div>
                <div>(-) منصرف: <strong style={{ color: '#dc2626' }}>-{formatCurrency(totalDeductions)}</strong></div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: '#ffffff',
                padding: compactView ? '4px 10px' : '6px 12px',
                borderRadius: '6px',
                border: `1px solid ${dynamicVariance < 0 ? '#fca5a5' : '#86efac'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
              }}>
                <div>صافي المتوقع: <strong style={{ color: '#0f172a' }}>{formatCurrency(dynamicExpectedCash)}</strong></div>
                <div style={{ borderInlineStart: '1px solid #e2e8f0', paddingInlineStart: '8px' }}>
                  المعدود: <strong style={{ color: '#0f172a' }}>{formatCurrency(shift.declaredCash ?? shift.countedCash ?? 0)}</strong>
                </div>
                <div style={{ borderInlineStart: '1px solid #e2e8f0', paddingInlineStart: '8px' }}>
                  الفرق: <strong style={{ color: dynamicVariance < 0 ? '#dc2626' : '#16a34a' }}>{formatCurrency(dynamicVariance)} {dynamicVariance === 0 ? '(مطابق)' : dynamicVariance < 0 ? '(عجز)' : '(زيادة)'}</strong>
                </div>
              </div>
            </div>

            {/* 5. Collapsible Drawer Movements (حركات ومنصرفات الدرج القابلة للطي) */}
            <div className="cash-drawer-review-block" style={{ marginTop: '0' }}>
              <div
                onClick={() => setShowMovements(!showMovements)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: compactView ? '5px 10px' : '8px 14px',
                  cursor: 'pointer',
                  fontSize: compactView ? '0.8rem' : '0.84rem',
                  fontWeight: 600,
                  color: '#475569',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <RefreshCwIcon size={compactView ? 13 : 15} color="#64748b" />
                  <span>حركات ومنصرفات الدرج التفصيلية ({shift.movementItems?.filter(i => i.kind !== 'delivery').length || 0} عملية)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.74rem', color: '#0284c7' }}>
                  <span>{showMovements ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}</span>
                  {showMovements ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                </div>
              </div>

              {showMovements && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                  {movementGroups.map((group) => {
                    const isExpanded = !!expandedKinds[group.kind];
                    const hasItems = group.items.length > 0;

                    return (
                      <div
                        key={group.kind}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          background: '#fff',
                          overflow: 'hidden',
                        }}
                      >
                        {/* Group Summary Row */}
                        <div
                          onClick={() => hasItems && toggleGroup(group.kind)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '6px 10px',
                            background: isExpanded ? '#f1f5f9' : '#f8fafc',
                            cursor: hasItems ? 'pointer' : 'default',
                            userSelect: 'none',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#1e293b' }}>
                              {group.label}
                            </span>
                            <span className="badge" style={{ fontSize: '0.7rem', background: '#e2e8f0', color: '#475569', padding: '1px 5px' }}>
                              {group.items.length} {group.items.length === 1 ? 'عملية' : 'عمليات'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '0.82rem', color: group.isCredit ? '#16a34a' : '#dc2626' }}>
                              {group.isCredit ? '+' : '-'}{formatCurrency(group.total)}
                            </strong>
                            {hasItems ? (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '1px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#64748b'
                                }}
                              >
                                {isExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Expandable Itemized Details */}
                        {isExpanded && hasItems ? (
                          <div style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '4px 8px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                              <thead>
                                <tr style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9' }}>
                                  <th style={{ padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>البيان / السبب</th>
                                  <th style={{ padding: '4px 6px', fontWeight: 600, width: '110px', textAlign: 'center' }}>المبلغ</th>
                                  <th style={{ padding: '4px 6px', fontWeight: 600, width: '130px', textAlign: 'center' }}>التوقيت</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((item) => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '4px 6px', color: '#1e293b', fontWeight: 500, textAlign: 'right' }}>
                                      {item.note.replace(/^وردية\s*#?[A-Z0-9_-]+:\s*/i, '').trim() || item.note}
                                    </td>
                                    <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                                      <strong style={{ color: group.isCredit ? '#16a34a' : '#dc2626' }}>
                                        {group.isCredit ? '+' : '-'}{formatCurrency(item.amount)}
                                      </strong>
                                    </td>
                                    <td style={{ padding: '4px 6px', color: '#64748b', fontSize: '0.74rem', textAlign: 'center' }}>
                                      {item.createdAt ? formatDate(item.createdAt) : '—'}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. Executive Decision & Cash Handover Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: compactView ? '8px' : '12px',
            }}>
              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: '2.5px solid #16a34a',
                borderRadius: '8px',
                padding: compactView ? '8px 12px' : '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontSize: compactView ? '0.74rem' : '0.78rem', color: '#64748b', fontWeight: 600 }}>النقدية المستلمة للخزينة:</div>
                  <div style={{ fontSize: compactView ? '1.15rem' : '1.25rem', fontWeight: 800, color: '#16a34a', marginTop: '1px' }}>
                    {formatCurrency(shift.declaredCash ?? shift.countedCash ?? 0)}
                  </div>
                </div>
                <div style={{ background: '#f0fdf4', padding: compactView ? '7px' : '10px', borderRadius: '7px', color: '#16a34a', display: 'flex' }}>
                  <BuildingIcon size={compactView ? 18 : 22} />
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: `2.5px solid ${dynamicVariance < 0 ? '#dc2626' : '#16a34a'}`,
                borderRadius: '8px',
                padding: compactView ? '8px 12px' : '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontSize: compactView ? '0.74rem' : '0.78rem', color: '#64748b', fontWeight: 600 }}>فارق نقدية الدرج:</div>
                  <div style={{ fontSize: compactView ? '1.15rem' : '1.25rem', fontWeight: 800, color: dynamicVariance < 0 ? '#dc2626' : '#16a34a', marginTop: '1px' }}>
                    {formatCurrency(dynamicVariance)} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>{dynamicVariance < 0 ? '(عجز)' : dynamicVariance > 0 ? '(زيادة)' : '(مطابق)'}</span>
                  </div>
                </div>
                <div style={{ background: dynamicVariance < 0 ? '#fef2f2' : '#f0fdf4', padding: compactView ? '7px' : '10px', borderRadius: '7px', color: dynamicVariance < 0 ? '#dc2626' : '#16a34a', display: 'flex' }}>
                  <ScaleIcon size={compactView ? 18 : 22} />
                </div>
              </div>

              <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderTop: `2.5px solid ${electronicDiff < 0 ? '#dc2626' : '#16a34a'}`,
                borderRadius: '8px',
                padding: compactView ? '8px 12px' : '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div>
                  <div style={{ fontSize: compactView ? '0.74rem' : '0.78rem', color: '#64748b', fontWeight: 600 }}>فارق المدفوعات الإلكترونية:</div>
                  <div style={{ fontSize: compactView ? '1.15rem' : '1.25rem', fontWeight: 800, color: electronicDiff < 0 ? '#dc2626' : electronicDiff > 0 ? '#16a34a' : '#0284c7', marginTop: '1px' }}>
                    {formatCurrency(electronicDiff)} <span style={{ fontSize: '0.74rem', fontWeight: 600 }}>{electronicDiff < 0 ? '(عجز)' : electronicDiff > 0 ? '(زيادة)' : '(مطابق)'}</span>
                  </div>
                </div>
                <div style={{ background: electronicDiff < 0 ? '#fef2f2' : '#f0fdf4', padding: compactView ? '7px' : '10px', borderRadius: '7px', color: electronicDiff < 0 ? '#dc2626' : '#16a34a', display: 'flex' }}>
                  <CreditCardIcon size={compactView ? 18 : 22} />
                </div>
              </div>
            </div>

            {/* 7. Notes & Manager Approval */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '8px',
              background: '#f8fafc',
              padding: compactView ? '8px 12px' : '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <div>
                <div style={{ fontSize: '0.76rem', color: '#64748b', marginBottom: '2px' }}>
                  <strong>ملاحظة الافتتاح:</strong> {shift.openingNote || '—'}
                </div>
                <div style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  <strong>ملاحظة الإغلاق:</strong> {cleanCloseNote || '—'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <Field label="ملاحظة المشرف للاعتماد (اختياري)">
                  <input
                    type="text"
                    value={props.managerNote}
                    onChange={(event) => props.onManagerNoteChange(event.target.value)}
                    placeholder="اكتب ملاحظة قصيرة للمراجعة..."
                    disabled={props.isPending}
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  />
                </Field>
              </div>
            </div>

            <MutationFeedback
              isError={props.isError}
              isSuccess={false}
              error={props.error}
              errorFallback="تعذر اعتماد إغلاق الوردية"
            />

            {/* Action Buttons */}
            <div className="actions compact-actions" style={{ justifyContent: 'space-between', marginTop: '2px' }}>
              <Button
                variant="secondary"
                type="button"
                onClick={() => shift && printCashDrawerShiftReceipt(shift)}
                disabled={props.isPending}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: compactView ? '5px 12px' : '7px 16px', fontSize: '0.82rem' }}
              >
                <PrinterIcon size={15} /> طباعة ريسيت الوردية
              </Button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" onClick={props.onClose} disabled={props.isPending} style={{ padding: compactView ? '5px 14px' : '7px 18px', fontSize: '0.82rem' }}>
                  إلغاء
                </Button>
                <Button variant="primary" onClick={props.onApprove} disabled={props.isPending} style={{ padding: '5px 16px', fontSize: '0.82rem' }}>
                  {props.isPending ? 'جاري اعتماد الإغلاق...' : 'اعتماد الإغلاق النهائي'}
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </DialogShell>
  );
}
