import { useMemo } from 'react';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { formatCurrency, formatDate } from '@/lib/format';
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

function toMoney(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(2));
}

function differenceTone(value: number): 'ok' | 'negative' | 'positive' {
  if (Math.abs(value) <= 0.009) return 'ok';
  return value < 0 ? 'negative' : 'positive';
}

function differenceLabel(value: number): string {
  const money = formatCurrency(Math.abs(value));
  if (Math.abs(value) <= 0.009) return `${formatCurrency(0)} (مطابق)`;
  if (value < 0) return `-${money}`;
  return `+${money}`;
}

function renderOperationDetails(
  title: string,
  rows: Array<{ amount: number; reference?: string }> | undefined,
) {
  if (!Array.isArray(rows) || !rows.length) return null;
  return (
    <div className="cash-drawer-review-details-block">
      <strong>{title}</strong>
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
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                <td>{index + 1}</td>
                <td>{formatCurrency(toMoney(row.amount || 0))}</td>
                <td>{row.reference || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CashDrawerReviewDialog(props: CashDrawerReviewDialogProps) {
  const shift = props.shift;
  const expected = useMemo(() => {
    const expectedCash = toMoney(shift?.expectedCash || 0);
    const expectedCard = toMoney((shift?.cardSalesTotal || 0) + (shift?.serviceCardTotal || 0) - (shift?.saleReturnCardRefundTotal || 0));
    const expectedWallet = toMoney(shift?.walletSalesTotal || 0);
    const expectedInstapay = toMoney(shift?.instapaySalesTotal || 0);

    return {
      expectedCash,
      expectedCard,
      expectedWallet,
      expectedInstapay,
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

  const differences = useMemo(() => {
    const cash = toMoney(declared.cash - expected.expectedCash);
    const card = toMoney(declared.card - expected.expectedCard);
    const wallet = toMoney(declared.wallet - expected.expectedWallet);
    const instapay = toMoney(declared.instapay - expected.expectedInstapay);
    return {
      cash,
      card,
      wallet,
      instapay,
      total: toMoney(cash + card + wallet + instapay),
    };
  }, [declared, expected]);

  const hasValidBlindMetadata = shift?.blindCloseMetadataStatus === 'valid';

  return (
    <DialogShell open={props.open} onClose={props.onClose} width="min(1050px, 96vw)" ariaLabel="مراجعة إغلاق الوردية">
      <div className="page-stack cash-drawer-review-dialog">
        <Card
          title="مراجعة إغلاق الوردية"
          description={shift ? `الوردية: ${shift.docNo || shift.id} — ${shift.openedByName || 'غير محدد'} — ${formatDate(shift.createdAt)}` : ''}
          className="dialog-card"
        >
          {shift ? (
            <div className="page-stack">
              <div className="cash-drawer-review-grid">
                <div className="cash-drawer-review-block">
                  <h4>أرقام النظام</h4>
                  <div className="cash-drawer-review-list">
                    <span><strong>إجمالي المبيعات:</strong> {formatCurrency(toMoney(shift.shiftSalesTotal || 0))}</span>
                    <span><strong>المتوقع نقدي:</strong> {formatCurrency(expected.expectedCash)}</span>
                    <span><strong>المتوقع فيزا:</strong> {formatCurrency(expected.expectedCard)}</span>
                    <span><strong>المتوقع محفظة إلكترونية:</strong> {formatCurrency(expected.expectedWallet)}</span>
                    <span><strong>المتوقع InstaPay:</strong> {formatCurrency(expected.expectedInstapay)}</span>
                    {toMoney(shift.creditSalesTotal || 0) > 0 ? <span><strong>إجمالي الآجل:</strong> {formatCurrency(toMoney(shift.creditSalesTotal || 0))}</span> : null}
                    {toMoney(shift.mixedSalesCount || 0) > 0 ? <span><strong>عمليات مختلط:</strong> {Number(shift.mixedSalesCount || 0)}</span> : null}
                    <span><strong>عمليات الفيزا (النظام):</strong> {Number(shift.cardOperationCount || 0)}</span>
                    <span><strong>عمليات المحفظة (النظام):</strong> {Number(shift.walletOperationCount || 0)}</span>
                    <span><strong>عمليات InstaPay (النظام):</strong> {Number(shift.instapayOperationCount || 0)}</span>
                    <span><strong>فروقات النظام الحالية:</strong> {formatCurrency(toMoney(shift.variance || 0))}</span>
                  </div>
                </div>

                <div className="cash-drawer-review-block">
                  <h4>إقرار الكاشير</h4>
                  {hasValidBlindMetadata ? (
                    <div className="cash-drawer-review-list">
                      <span><strong>النقدية المعدودة:</strong> {formatCurrency(declared.cash)}</span>
                      <span><strong>إجمالي الفيزا المعلن:</strong> {formatCurrency(declared.card)}</span>
                      <span><strong>عدد عمليات الفيزا المعلن:</strong> {Number(shift.declaredCardCount || 0)}</span>
                      <span><strong>إجمالي المحفظة المعلن:</strong> {formatCurrency(declared.wallet)}</span>
                      <span><strong>عدد عمليات المحفظة المعلن:</strong> {Number(shift.declaredWalletCount || 0)}</span>
                      <span><strong>إجمالي InstaPay المعلن:</strong> {formatCurrency(declared.instapay)}</span>
                      <span><strong>عدد عمليات InstaPay المعلن:</strong> {Number(shift.declaredInstapayCount || 0)}</span>
                      <span><strong>ملاحظات الكاشير:</strong> {shift.closeNote || '—'}</span>
                    </div>
                  ) : (
                    <div className="warning-box">
                      لا توجد بيانات إقرار كاشير منظمة لهذه الوردية.
                      {shift.closeNoteRaw ? <div className="muted small" style={{ marginTop: 6 }}>الملاحظة الخام: {shift.closeNoteRaw}</div> : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="cash-drawer-review-block">
                <h4>الفروقات</h4>
                <div className="cash-drawer-review-diff-grid">
                  <span className={`cash-drawer-review-diff cash-drawer-review-diff-${differenceTone(differences.cash)}`}><strong>فرق النقدي:</strong> {differenceLabel(differences.cash)}</span>
                  <span className={`cash-drawer-review-diff cash-drawer-review-diff-${differenceTone(differences.card)}`}><strong>فرق الفيزا:</strong> {differenceLabel(differences.card)}</span>
                  <span className={`cash-drawer-review-diff cash-drawer-review-diff-${differenceTone(differences.wallet)}`}><strong>فرق المحفظة:</strong> {differenceLabel(differences.wallet)}</span>
                  <span className={`cash-drawer-review-diff cash-drawer-review-diff-${differenceTone(differences.instapay)}`}><strong>فرق InstaPay:</strong> {differenceLabel(differences.instapay)}</span>
                  <span className={`cash-drawer-review-diff cash-drawer-review-diff-${differenceTone(differences.total)}`}><strong>إجمالي الفرق:</strong> {differenceLabel(differences.total)}</span>
                </div>
              </div>

              {hasValidBlindMetadata ? (
                <div className="cash-drawer-review-details-grid">
                  {renderOperationDetails('تفاصيل الفيزا', shift.cardDetails)}
                  {renderOperationDetails('تفاصيل المحافظ', shift.walletDetails)}
                  {renderOperationDetails('تفاصيل InstaPay', shift.instapayDetails)}
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

              <div className="actions compact-actions">
                <Button variant="secondary" onClick={props.onClose} disabled={props.isPending}>إغلاق</Button>
                <Button variant="primary" onClick={props.onApprove} disabled={props.isPending}>
                  {props.isPending ? 'جارٍ اعتماد الإغلاق...' : 'اعتماد الإغلاق'}
                </Button>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </DialogShell>
  );
}
