import { useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { formatDate } from '@/lib/format';
import type { CashierShift } from '@/types/domain';

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

type ComparisonRow = {
  key: string;
  label: string;
  systemAmount: number;
  declaredAmount: number;
  amountDiff: number;
  systemCount: number | null;
  declaredCount: number | null;
  countDiff: number | null;
};

function toMoney(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function toCount(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function differenceTone(value: number): 'ok' | 'negative' | 'positive' {
  if (Math.abs(value) <= 0.009) return 'ok';
  return value < 0 ? 'negative' : 'positive';
}

function formatMoney(value: number): string {
  const amount = toMoney(value);
  return `${new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} ج.م`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(toCount(value));
}

function formatInteger(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.trunc(value));
}

function formatSignedCount(value: number): string {
  if (value > 0) return `+${formatInteger(value)}`;
  return formatInteger(value);
}

function differenceLabel(value: number): string {
  const money = formatMoney(Math.abs(value));
  if (Math.abs(value) <= 0.009) return `${formatMoney(0)} (مطابق)`;
  if (value < 0) return `-${money}`;
  return `+${money}`;
}

function parseIso(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDateOnly(value?: string): string {
  const parsed = parseIso(value);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed);
}

function formatTimeOnly(value?: string): string {
  const parsed = parseIso(value);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
}

function formatDuration(startIso?: string, endIso?: string): string {
  const start = parseIso(startIso);
  const end = parseIso(endIso);
  if (!start || !end || end <= start) return '—';

  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${formatCount(hours)} ساعات و ${formatCount(minutes)} دقيقة`;
}

function toDisplayCount(value?: number | null): string {
  if (value == null) return '—';
  return formatCount(Number(value || 0));
}

function renderOperationDetails(
  title: string,
  rows: Array<{ amount: number; reference?: string }> | undefined,
  declaredCount?: number | null,
  declaredTotal?: number | null,
) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const count = safeRows.length;
  const total = safeRows.reduce((sum, row) => sum + toMoney(row.amount || 0), 0);
  const summaryCount = declaredCount == null ? count : toCount(declaredCount);
  const summaryTotal = declaredTotal == null ? total : toMoney(declaredTotal);

  return (
    <details className="cash-drawer-review-accordion">
      <summary>
        <span>{title}</span>
        <span className="muted small">
          {formatCount(summaryCount)} عملية — {formatMoney(summaryTotal)}
        </span>
      </summary>
      {safeRows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم العملية</th>
                <th>المبلغ</th>
                <th>المرجع</th>
              </tr>
            </thead>
            <tbody>
              {safeRows.map((row, index) => (
                <tr key={`${title}-${index}`}>
                  <td>{formatCount(index + 1)}</td>
                  <td>{formatMoney(toMoney(row.amount || 0))}</td>
                  <td>{row.reference || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted small" style={{ margin: 0 }}>
          لا توجد تفاصيل مسجلة لهذا البند.
        </p>
      )}
    </details>
  );
}

export function CashDrawerReviewDialog(props: CashDrawerReviewDialogProps) {
  const shift = props.shift;

  const expected = useMemo(() => {
    const expectedCash = toMoney(shift?.expectedCash || 0);
    const expectedCard = toMoney(
      (shift?.cardSalesTotal || 0)
      + (shift?.serviceCardTotal || 0)
      - (shift?.saleReturnCardRefundTotal || 0),
    );
    const expectedWallet = toMoney(shift?.walletSalesTotal || 0);
    const expectedInstapay = toMoney(shift?.instapaySalesTotal || 0);
    const expectedCredit = toMoney(shift?.creditSalesTotal || 0);

    return {
      expectedCash,
      expectedCard,
      expectedWallet,
      expectedInstapay,
      expectedCredit,
    };
  }, [shift]);

  const declared = useMemo(() => {
    return {
      cash: toMoney(shift?.declaredCash ?? shift?.countedCash ?? 0),
      card: toMoney(shift?.declaredCardTotal || 0),
      wallet: toMoney(shift?.declaredWalletTotal || 0),
      instapay: toMoney(shift?.declaredInstapayTotal || 0),
    };
  }, [shift]);

  const hasValidBlindMetadata = shift?.blindCloseMetadataStatus === 'valid';
  const statusLabel = shift?.status === 'pending_review' ? 'في انتظار مراجعة المدير' : (shift?.status || '—');

  const comparison = useMemo(() => {
    const rows: ComparisonRow[] = [
      {
        key: 'cash',
        label: 'النقدي',
        systemAmount: expected.expectedCash,
        declaredAmount: declared.cash,
        amountDiff: toMoney(declared.cash - expected.expectedCash),
        systemCount: null,
        declaredCount: null,
        countDiff: null,
      },
      {
        key: 'card',
        label: 'فيزا',
        systemAmount: expected.expectedCard,
        declaredAmount: declared.card,
        amountDiff: toMoney(declared.card - expected.expectedCard),
        systemCount: toCount(shift?.cardOperationCount || 0),
        declaredCount: toCount(shift?.declaredCardCount || 0),
        countDiff: toCount(shift?.declaredCardCount || 0) - toCount(shift?.cardOperationCount || 0),
      },
      {
        key: 'wallet',
        label: 'محفظة إلكترونية',
        systemAmount: expected.expectedWallet,
        declaredAmount: declared.wallet,
        amountDiff: toMoney(declared.wallet - expected.expectedWallet),
        systemCount: toCount(shift?.walletOperationCount || 0),
        declaredCount: toCount(shift?.declaredWalletCount || 0),
        countDiff: toCount(shift?.declaredWalletCount || 0) - toCount(shift?.walletOperationCount || 0),
      },
      {
        key: 'instapay',
        label: 'InstaPay',
        systemAmount: expected.expectedInstapay,
        declaredAmount: declared.instapay,
        amountDiff: toMoney(declared.instapay - expected.expectedInstapay),
        systemCount: toCount(shift?.instapayOperationCount || 0),
        declaredCount: toCount(shift?.declaredInstapayCount || 0),
        countDiff: toCount(shift?.declaredInstapayCount || 0) - toCount(shift?.instapayOperationCount || 0),
      },
    ];

    if (expected.expectedCredit > 0) {
      rows.push({
        key: 'credit',
        label: 'آجل',
        systemAmount: expected.expectedCredit,
        declaredAmount: 0,
        amountDiff: toMoney(-expected.expectedCredit),
        systemCount: null,
        declaredCount: null,
        countDiff: null,
      });
    }

    const systemAmountTotal = rows.reduce((sum, row) => sum + toMoney(row.systemAmount), 0);
    const declaredAmountTotal = rows.reduce((sum, row) => sum + toMoney(row.declaredAmount), 0);
    const amountDiffTotal = toMoney(declaredAmountTotal - systemAmountTotal);

    const systemOpsTotal = rows.reduce((sum, row) => sum + (row.systemCount == null ? 0 : row.systemCount), 0);
    const declaredOpsTotal = rows.reduce((sum, row) => sum + (row.declaredCount == null ? 0 : row.declaredCount), 0);
    const opsDiffTotal = declaredOpsTotal - systemOpsTotal;

    return {
      rows,
      systemAmountTotal,
      declaredAmountTotal,
      amountDiffTotal,
      systemOpsTotal,
      declaredOpsTotal,
      opsDiffTotal,
    };
  }, [declared.card, declared.cash, declared.instapay, declared.wallet, expected.expectedCard, expected.expectedCash, expected.expectedCredit, expected.expectedInstapay, expected.expectedWallet, shift?.cardOperationCount, shift?.declaredCardCount, shift?.declaredInstapayCount, shift?.declaredWalletCount, shift?.instapayOperationCount, shift?.walletOperationCount]);

  const reviewMatched = Math.abs(comparison.amountDiffTotal) <= 0.009 && comparison.opsDiffTotal === 0;

  return (
    <DialogShell open={props.open} onClose={props.onClose} width="min(1080px, 96vw)" ariaLabel="مراجعة إغلاق الوردية">
      <div className="page-stack cash-drawer-review-dialog">
        <Card
          title="مراجعة إغلاق الوردية"
          description={shift ? `الوردية: ${shift.docNo || shift.id}` : ''}
          className="dialog-card"
        >
          {shift ? (
            <div className="page-stack">
              <div className="cash-drawer-review-header-grid">
                <div className="cash-drawer-review-header-item"><strong>الكاشير:</strong><span>{shift.openedByName || '—'}</span></div>
                <div className="cash-drawer-review-header-item"><strong>رقم الوردية:</strong><span>{shift.docNo || shift.id || '—'}</span></div>
                <div className="cash-drawer-review-header-item"><strong>حالة الوردية:</strong><span>{statusLabel}</span></div>
                <div className="cash-drawer-review-header-item"><strong>تاريخ الوردية:</strong><span>{formatDateOnly(shift.createdAt)}</span></div>
                <div className="cash-drawer-review-header-item"><strong>بداية الوردية:</strong><span>{formatTimeOnly(shift.createdAt)}</span></div>
                <div className="cash-drawer-review-header-item"><strong>نهاية الوردية:</strong><span>{formatTimeOnly(shift.closedAt)}</span></div>
                <div className="cash-drawer-review-header-item"><strong>مدة الوردية:</strong><span>{formatDuration(shift.createdAt, shift.closedAt)}</span></div>
                <div className="cash-drawer-review-header-item"><strong>الفرع / المخزن:</strong><span>{`${shift.branchName || '—'} / ${shift.locationName || '—'}`}</span></div>
              </div>

              <div className={`cash-drawer-review-banner cash-drawer-review-diff-${reviewMatched ? 'ok' : 'negative'}`}>
                <div>{reviewMatched ? 'الإقرار مطابق لأرقام النظام.' : 'يوجد فرق في الإغلاق، راجع البنود قبل الاعتماد.'}</div>
                <div className="cash-drawer-review-banner-meta">
                  <span><strong>إجمالي فرق المبلغ:</strong> {differenceLabel(comparison.amountDiffTotal)}</span>
                  <span><strong>إجمالي فرق عدد العمليات:</strong> {formatSignedCount(comparison.opsDiffTotal)}</span>
                </div>
              </div>

              <div className="cash-drawer-review-block">
                <h4>مقارنة النظام مع إقرار الكاشير</h4>
                <div className="table-wrap">
                  <table className="cash-drawer-review-table">
                    <thead>
                      <tr>
                        <th>البند</th>
                        <th>مبلغ النظام</th>
                        <th>مبلغ إقرار الكاشير</th>
                        <th>فرق المبلغ</th>
                        <th>عدد عمليات النظام</th>
                        <th>عدد عمليات الكاشير</th>
                        <th>فرق العدد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.rows.map((row) => (
                        <tr key={row.key}>
                          <td><strong>{row.label}</strong></td>
                          <td>{formatMoney(row.systemAmount)}</td>
                          <td>{formatMoney(row.declaredAmount)}</td>
                          <td className={`cash-drawer-review-diff-${differenceTone(row.amountDiff)}`}>{differenceLabel(row.amountDiff)}</td>
                          <td>{toDisplayCount(row.systemCount)}</td>
                          <td>{toDisplayCount(row.declaredCount)}</td>
                          <td>{row.countDiff == null ? '—' : formatSignedCount(row.countDiff)}</td>
                        </tr>
                      ))}
                      <tr className="cash-drawer-review-total-row">
                        <td><strong>الإجمالي</strong></td>
                        <td><strong>{formatMoney(comparison.systemAmountTotal)}</strong></td>
                        <td><strong>{formatMoney(comparison.declaredAmountTotal)}</strong></td>
                        <td className={`cash-drawer-review-diff-${differenceTone(comparison.amountDiffTotal)}`}><strong>{differenceLabel(comparison.amountDiffTotal)}</strong></td>
                        <td><strong>{formatCount(comparison.systemOpsTotal)}</strong></td>
                        <td><strong>{formatCount(comparison.declaredOpsTotal)}</strong></td>
                        <td><strong>{formatSignedCount(comparison.opsDiffTotal)}</strong></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="cash-drawer-review-details-grid">
                {renderOperationDetails('تفاصيل الفيزا', shift.cardDetails, shift.declaredCardCount, shift.declaredCardTotal)}
                {renderOperationDetails('تفاصيل المحافظ', shift.walletDetails, shift.declaredWalletCount, shift.declaredWalletTotal)}
                {renderOperationDetails('تفاصيل InstaPay', shift.instapayDetails, shift.declaredInstapayCount, shift.declaredInstapayTotal)}
              </div>

              {!hasValidBlindMetadata ? (
                <div className="warning-box">لا توجد بيانات إقرار كاشير منظمة لهذه الوردية.</div>
              ) : null}

              {shift.closeNote ? (
                <div className="cash-drawer-review-block">
                  <h4>ملاحظة الكاشير</h4>
                  <p className="muted" style={{ margin: 0 }}>{shift.closeNote}</p>
                </div>
              ) : null}

              {!hasValidBlindMetadata && shift.closeNoteRaw ? (
                <div className="cash-drawer-review-block">
                  <h4>ملاحظة الكاشير</h4>
                  <p className="muted" style={{ margin: 0 }}>{shift.closeNoteRaw}</p>
                </div>
              ) : null}

              <Field label="ملاحظة المدير (اختياري)">
                <textarea
                  rows={2}
                  value={props.managerNote}
                  onChange={(event) => props.onManagerNoteChange(event.target.value)}
                  placeholder="اكتب ملاحظة قصيرة للمراجعة"
                  disabled={props.isPending}
                />
              </Field>

              {shift.managerReviewNote ? (
                <div className="muted small">
                  آخر ملاحظة مدير: <strong>{shift.managerReviewNote}</strong>
                  {shift.managerReviewedByName ? ` — بواسطة ${shift.managerReviewedByName}` : ''}
                  {shift.managerReviewedAt ? ` — ${formatDate(shift.managerReviewedAt)}` : ''}
                </div>
              ) : null}

              <MutationFeedback
                isError={props.isError}
                isSuccess={false}
                error={props.error}
                errorFallback="تعذر اعتماد إغلاق الوردية"
              />

              {!reviewMatched ? (
                <p className="muted small" style={{ margin: 0 }}>
                  يوجد فرق مسجل، تأكد من المراجعة قبل الاعتماد.
                </p>
              ) : null}

              <div className="actions compact-actions">
                <Button variant="secondary" onClick={props.onClose} disabled={props.isPending}>إغلاق</Button>
                <Button variant="primary" onClick={props.onApprove} disabled={props.isPending}>
                  {props.isPending ? 'جاري اعتماد الإغلاق...' : 'اعتماد الإغلاق'}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </DialogShell>
  );
}
