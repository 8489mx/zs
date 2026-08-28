import { useMemo, useState } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import {
  RefreshCwIcon,
  ScaleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PrinterIcon,
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

  const toggleGroup = (kind: string) => {
    setExpandedKinds((prev) => ({ ...prev, [kind]: !prev[kind] }));
  };

  const expected = useMemo(() => {
    const expectedCash = toMoney(shift?.expectedCash || 0);
    const expectedCard = toMoney((shift?.cardSalesTotal || 0) + (shift?.serviceCardTotal || 0) - (shift?.saleReturnCardRefundTotal || 0));
    const expectedWallet = toMoney(shift?.walletSalesTotal || 0);
    const expectedInstapay = toMoney(shift?.instapaySalesTotal || 0);
    const expectedCredit = toMoney(shift?.creditSalesTotal || 0);
    return { expectedCash, expectedCard, expectedWallet, expectedInstapay, expectedCredit };
  }, [shift]);

  const declared = useMemo(() => ({
    cash: toMoney(shift?.declaredCash ?? shift?.countedCash ?? 0),
    card: toMoney(shift?.declaredCardTotal || 0),
    wallet: toMoney(shift?.declaredWalletTotal || 0),
    instapay: toMoney(shift?.declaredInstapayTotal || 0),
  }), [shift]);

  const statusLabel = shift?.status === 'pending_review' ? 'في انتظار مراجعة المشرف' : (shift?.status || '—');

  const comparison = useMemo(() => {
    const rows: ComparisonRow[] = [
      { key: 'cash', label: 'النقدي بالدرج (كاش)', systemAmount: expected.expectedCash, declaredAmount: declared.cash, amountDiff: toMoney(declared.cash - expected.expectedCash), systemCount: null, declaredCount: null, countDiff: null },
      { key: 'card', label: 'بطاقات (فيزا)', systemAmount: expected.expectedCard, declaredAmount: declared.card, amountDiff: toMoney(declared.card - expected.expectedCard), systemCount: toCount(shift?.cardOperationCount || 0), declaredCount: toCount(shift?.declaredCardCount || 0), countDiff: toCount(shift?.declaredCardCount || 0) - toCount(shift?.cardOperationCount || 0) },
      { key: 'wallet', label: 'محافظ إلكترونية', systemAmount: expected.expectedWallet, declaredAmount: declared.wallet, amountDiff: toMoney(declared.wallet - expected.expectedWallet), systemCount: toCount(shift?.walletOperationCount || 0), declaredCount: toCount(shift?.declaredWalletCount || 0), countDiff: toCount(shift?.declaredWalletCount || 0) - toCount(shift?.walletOperationCount || 0) },
      { key: 'instapay', label: 'InstaPay', systemAmount: expected.expectedInstapay, declaredAmount: declared.instapay, amountDiff: toMoney(declared.instapay - expected.expectedInstapay), systemCount: toCount(shift?.instapayOperationCount || 0), declaredCount: toCount(shift?.declaredInstapayCount || 0), countDiff: toCount(shift?.declaredInstapayCount || 0) - toCount(shift?.instapayOperationCount || 0) },
    ];
    if (expected.expectedCredit > 0) rows.push({ key: 'credit', label: 'مبيعات آجلة (ذمم)', systemAmount: expected.expectedCredit, declaredAmount: 0, amountDiff: toMoney(-expected.expectedCredit), systemCount: null, declaredCount: null, countDiff: null });
    const systemAmountTotal = rows.reduce((sum, row) => sum + toMoney(row.systemAmount), 0);
    const declaredAmountTotal = rows.reduce((sum, row) => sum + toMoney(row.declaredAmount), 0);
    const amountDiffTotal = toMoney(declaredAmountTotal - systemAmountTotal);
    const systemOpsTotal = rows.reduce((sum, row) => sum + (row.systemCount == null ? 0 : row.systemCount), 0);
    const declaredOpsTotal = rows.reduce((sum, row) => sum + (row.declaredCount == null ? 0 : row.declaredCount), 0);
    return { rows, systemAmountTotal, declaredAmountTotal, amountDiffTotal, systemOpsTotal, declaredOpsTotal, opsDiffTotal: declaredOpsTotal - systemOpsTotal };
  }, [declared.card, declared.cash, declared.instapay, declared.wallet, expected.expectedCard, expected.expectedCash, expected.expectedCredit, expected.expectedInstapay, expected.expectedWallet, shift?.cardOperationCount, shift?.declaredCardCount, shift?.declaredInstapayCount, shift?.declaredWalletCount, shift?.instapayOperationCount, shift?.walletOperationCount]);

  const reviewMatched = Math.abs(comparison.amountDiffTotal) <= 0.009 && comparison.opsDiffTotal === 0;

  // Grouped drawer movements
  const movementGroups = useMemo(() => {
    const rawItems = shift?.movementItems || [];
    const groupsMap: Record<string, MovementGroup> = {
      delivery: { kind: 'delivery', label: 'توريد وتحصيل المناديب (دليفري)', total: Number(shift?.cashDrawerDeliveryCashInTotal || 0), isCredit: true, items: [] },
      cash_in: { kind: 'cash_in', label: 'إيداعات نقدية أخرى بالدرج', total: Number(shift?.cashDrawerManualCashInTotal || (Number(shift?.cashDrawerDeliveryCashInTotal || 0) === 0 ? shift?.cashDrawerCashInTotal : 0) || 0), isCredit: true, items: [] },
      cash_out: { kind: 'cash_out', label: 'مسحوبات نقدية من الدرج', total: Number(shift?.cashDrawerCashOutTotal || 0), isCredit: false, items: [] },
      expense: { kind: 'expense', label: 'مصروفات تشغيلية مسجلة', total: Number(shift?.expensesTotal || 0), isCredit: false, items: [] },
      supplier_payment: { kind: 'supplier_payment', label: 'سداد دفعات موردين من الدرج', total: Number(shift?.supplierPaymentsTotal || 0), isCredit: false, items: [] },
      sale_return: { kind: 'sale_return', label: 'مرتجعات مبيعات نقدية للعملاء', total: Number(shift?.saleReturnCashRefundTotal || 0), isCredit: false, items: [] },
    };

    for (const item of rawItems) {
      if (groupsMap[item.kind]) {
        groupsMap[item.kind].items.push(item);
      } else if (item.kind === 'delivery') {
        groupsMap.delivery.items.push(item);
      } else {
        groupsMap.cash_in.items.push(item);
      }
    }

    return Object.values(groupsMap).filter((g) => g.total > 0 || g.items.length > 0);
  }, [shift]);

  const totalDeductions = shift ? (
    Number(shift.cashDrawerCashOutTotal || 0) +
    Number(shift.expensesTotal || 0) +
    Number(shift.supplierPaymentsTotal || 0) +
    Number(shift.saleReturnCashRefundTotal || 0)
  ) : 0;

  const cleanCloseNote = shift?.closeNote && !shift.closeNote.startsWith('BLIND_CLOSE:')
    ? shift.closeNote
    : (!shift?.closeNoteRaw?.startsWith('BLIND_CLOSE:') && shift?.closeNoteRaw ? shift.closeNoteRaw : '');

  return (
    <DialogShell open={props.open} onClose={props.onClose} width="min(980px, 96vw)" ariaLabel="مراجعة واعتماد إغلاق الوردية">
      <div className="page-stack cash-drawer-review-dialog" style={{ gap: '12px' }}>
        <Card
          title="مراجعة واعتماد إغلاق الوردية"
          description={shift ? `كاشير: ${shift.openedByName || '—'} | رقم الوردية: ${shift.docNo || shift.id} | ${formatDateOnly(shift.createdAt)} (${formatDuration(shift.createdAt, shift.closedAt)})` : ''}
          className="dialog-card"
        >
          {shift ? (
            <div className="page-stack" style={{ gap: '12px' }}>
              {/* 1. Ultra-Compact Metadata Strip */}
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

              {/* 2. Discrepancy Verdict Banner */}
              <div className={`cash-drawer-review-banner cash-drawer-review-diff-${reviewMatched ? 'ok' : 'negative'}`} style={{ padding: '8px 14px' }}>
                <div style={{ fontWeight: 700 }}>
                  {reviewMatched ? 'الوردية متطابقة بالكامل مع إقرار الكاشير.' : 'تنبيه: يوجد فرق في إقرار الكاشير مقارنة بالنظام.'}
                </div>
                <div className="cash-drawer-review-banner-meta" style={{ gap: '16px' }}>
                  <span><strong>فرق المبلغ:</strong> {differenceLabel(comparison.amountDiffTotal)}</span>
                  <span><strong>فرق العمليات:</strong> {formatSignedCount(comparison.opsDiffTotal)}</span>
                </div>
              </div>

              {/* 3. Primary Table: System vs Cashier Declared (جدول المطابقة والمقارنة الشامل الموحد) */}
              <div className="cash-drawer-review-block" style={{ marginTop: '2px' }}>
                <div className="table-wrap">
                  <table className="cash-drawer-review-table" style={{ fontSize: '0.86rem' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th>طريقة الدفع / البند</th>
                        <th>مبيعات النظام</th>
                        <th>إقرار الكاشير</th>
                        <th>فرق المبلغ</th>
                        <th>عمليات النظام</th>
                        <th>عمليات الكاشير</th>
                        <th>فرق العدد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row) => (
                        <tr key={row.key}>
                          <td><strong>{row.label}</strong></td>
                          <td>{formatMoney(row.systemAmount)}</td>
                          <td>{formatMoney(row.declaredAmount)}</td>
                          <td className={`cash-drawer-review-diff-${differenceTone(row.amountDiff)}`} style={{ fontWeight: 700 }}>
                            {differenceLabel(row.amountDiff)}
                          </td>
                          <td>{toDisplayCount(row.systemCount)}</td>
                          <td>{toDisplayCount(row.declaredCount)}</td>
                          <td>{row.countDiff == null ? '—' : formatSignedCount(row.countDiff)}</td>
                        </tr>
                      ))}
                      <tr className="cash-drawer-review-total-row" style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1' }}>
                        <td><strong>الإجمالي العام</strong></td>
                        <td><strong>{formatMoney(comparison.systemAmountTotal)}</strong></td>
                        <td><strong>{formatMoney(comparison.declaredAmountTotal)}</strong></td>
                        <td className={`cash-drawer-review-diff-${differenceTone(comparison.amountDiffTotal)}`}>
                          <strong>{differenceLabel(comparison.amountDiffTotal)}</strong>
                        </td>
                        <td><strong>{formatCount(comparison.systemOpsTotal)}</strong></td>
                        <td><strong>{formatCount(comparison.declaredOpsTotal)}</strong></td>
                        <td><strong>{formatSignedCount(comparison.opsDiffTotal)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. Compact 1-Line Cash Reconciliation Bar (معادلة الدرج الملمومة) */}
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '0.82rem',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px 12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', fontWeight: 700 }}>
                  <ScaleIcon size={16} /> جرد النقدية بالدرج:
                </div>
                <div>العهدة: <strong>{formatCurrency(shift.openingCash)}</strong></div>
                <div>(+) مبيعات كاش: <strong style={{ color: '#16a34a' }}>+{formatCurrency(Number(shift.cashSalesTotal || 0) + Number(shift.serviceCashTotal || 0))}</strong></div>
                <div>(+) توريدات وإيداعات: <strong style={{ color: '#16a34a' }}>+{formatCurrency(shift.cashDrawerCashInTotal || 0)}</strong></div>
                <div>(-) منصرفات ومسحوبات: <strong style={{ color: '#dc2626' }}>-{formatCurrency(totalDeductions)}</strong></div>
                <div style={{ borderInlineStart: '1px solid #7dd3fc', paddingInlineStart: '10px' }}>
                  صافي المتوقع: <strong style={{ color: '#0284c7', fontSize: '0.92rem' }}>{formatCurrency(shift.expectedCash)}</strong>
                </div>
                <div>المعدود: <strong style={{ fontSize: '0.92rem' }}>{formatCurrency(shift.declaredCash ?? shift.countedCash ?? 0)}</strong></div>
                <div>الفرق: <strong style={{ color: Number(shift.variance || 0) < 0 ? '#dc2626' : Number(shift.variance || 0) > 0 ? '#16a34a' : '#0284c7' }}>{formatCurrency(shift.variance || 0)}</strong></div>
              </div>

              {/* 5. Grouped & Expandable Drawer Movements (حركات ومنصرفات الدرج المجمعة والقابلة للطي) */}
              <div className="cash-drawer-review-block" style={{ marginTop: '2px' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 8px', fontSize: '0.88rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <RefreshCwIcon size={15} />
                    حركات ومنصرفات وتوريدات الدرج ({movementGroups.reduce((s, g) => s + g.items.length, 0)} عملية)
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 400 }}>
                    اضغط على أي بند لعرض التفاصيل
                  </span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {movementGroups.map((group) => {
                    const isExpanded = !!expandedKinds[group.kind];
                    const hasItems = group.items.length > 0;

                    return (
                      <div
                        key={group.kind}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
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
                            padding: '9px 14px',
                            background: isExpanded ? '#f1f5f9' : '#f8fafc',
                            cursor: hasItems ? 'pointer' : 'default',
                            userSelect: 'none',
                            transition: 'background 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.86rem', color: '#1e293b' }}>
                              {group.label}
                            </span>
                            <span className="badge" style={{ fontSize: '0.75rem', background: '#e2e8f0', color: '#475569' }}>
                              {group.items.length} {group.items.length === 1 ? 'عملية' : 'عمليات'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <strong style={{ fontSize: '0.92rem', color: group.isCredit ? '#16a34a' : '#dc2626' }}>
                              {group.isCredit ? '+' : '-'}{formatCurrency(group.total)}
                            </strong>
                            {hasItems ? (
                              <button
                                type="button"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  padding: '2px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  color: '#64748b'
                                }}
                              >
                                {isExpanded ? <ChevronUpIcon size={16} /> : <ChevronDownIcon size={16} />}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        {/* Expandable Itemized Details */}
                        {isExpanded && hasItems ? (
                          <div style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '6px 12px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                              <thead>
                                <tr style={{ color: '#64748b', borderBottom: '1px solid #f1f5f9', textAlign: 'right' }}>
                                  <th style={{ padding: '6px 8px', fontWeight: 600 }}>البيان / السبب / المندوب</th>
                                  <th style={{ padding: '6px 8px', fontWeight: 600, width: '130px' }}>المبلغ</th>
                                  <th style={{ padding: '6px 8px', fontWeight: 600, width: '160px' }}>التوقيت</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.items.map((item) => (
                                  <tr key={item.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                    <td style={{ padding: '7px 8px', color: '#1e293b', fontWeight: 500 }}>
                                      {item.note}
                                    </td>
                                    <td style={{ padding: '7px 8px' }}>
                                      <strong style={{ color: group.isCredit ? '#16a34a' : '#dc2626' }}>
                                        {group.isCredit ? '+' : '-'}{formatCurrency(item.amount)}
                                      </strong>
                                    </td>
                                    <td style={{ padding: '7px 8px', color: '#64748b', fontSize: '0.78rem' }}>
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
              </div>

              {/* 6. Notes & Manager Approval (مضغوطة وملمومة) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '12px',
                background: '#f8fafc',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '4px' }}>
                    <strong>ملاحظة الافتتاح:</strong> {shift.openingNote || '—'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    <strong>ملاحظة الإغلاق:</strong> {cleanCloseNote || '—'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <Field label="ملاحظة المشرف للاعتماد (اختياري)">
                    <input
                      type="text"
                      value={props.managerNote}
                      onChange={(event) => props.onManagerNoteChange(event.target.value)}
                      placeholder="اكتب ملاحظة قصيرة للمراجعة..."
                      disabled={props.isPending}
                      style={{ fontSize: '0.84rem', padding: '6px 10px' }}
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
              <div className="actions compact-actions" style={{ justifyContent: 'space-between', marginTop: '4px' }}>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => shift && printCashDrawerShiftReceipt(shift)}
                  disabled={props.isPending}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <PrinterIcon size={16} /> طباعة ريسيت الوردية
                </Button>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" onClick={props.onClose} disabled={props.isPending}>
                    إلغاء
                  </Button>
                  <Button variant="primary" onClick={props.onApprove} disabled={props.isPending}>
                    {props.isPending ? 'جاري اعتماد الإغلاق...' : 'اعتماد الإغلاق النهائي'}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </DialogShell>
  );
}
