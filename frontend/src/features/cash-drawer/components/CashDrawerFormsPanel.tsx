import { useEffect, useMemo, useState } from 'react';
import { Controller, type UseFormReturn } from 'react-hook-form';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Field } from '@/shared/ui/field';
import { CustomSelect } from '@/shared/ui/custom-select';
import { Button } from '@/shared/ui/button';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { formatCurrency } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import type { Branch, CashierShift, Location } from '@/types/domain';
import type { CloseShiftValues, MovementValues, OpenShiftValues } from '@/features/cash-drawer/hooks/useCashDrawerPageController';

interface MutationLike {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  error: unknown;
  reset?: () => void;
}

interface CashDrawerFormsPanelProps {
  activeForm: 'open' | 'movement' | 'close' | null;
  onCloseForm: () => void;
  branches: Branch[];
  locations: Location[];
  openOptions: CashierShift[];
  myOpenShift?: CashierShift | null;
  isManager?: boolean;
  openForm: UseFormReturn<OpenShiftValues>;
  movementForm: UseFormReturn<MovementValues>;
  closeForm: UseFormReturn<CloseShiftValues>;
  openMutation: MutationLike & { mutate: (values: OpenShiftValues) => void };
  movementMutation: MutationLike;
  closeMutation: MutationLike;
  closeExpectedCash: number;
  closeVariancePreview: number;
  closeNoteValue: string;
  isBlindCloseMode?: boolean;
  onMovementSubmit: () => void;
  onCloseSubmit: () => void;
}

type DetailChannel = 'cardDetails' | 'walletDetails' | 'instapayDetails';
const EMPTY_DETAIL_ROWS: Array<{ amount?: number }> = [];

function normalizeCount(value: unknown): number {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function summarizeDetails(rows: Array<{ amount?: number }>): number {
  return Number(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0).toFixed(2));
}

function CashIcon(props: { size?: number; color?: string }) {
  const size = props.size || 18;
  const color = props.color || '#16a34a';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="2" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function CardIcon(props: { size?: number; color?: string }) {
  const size = props.size || 18;
  const color = props.color || '#2563eb';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <line x1="6" y1="15" x2="10" y2="15" />
    </svg>
  );
}

function WalletIcon(props: { size?: number; color?: string }) {
  const size = props.size || 18;
  const color = props.color || '#7c3aed';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function InstaPayIcon(props: { size?: number; color?: string }) {
  const size = props.size || 18;
  const color = props.color || '#059669';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function LockIcon(props: { size?: number; color?: string }) {
  const size = props.size || 12;
  const color = props.color || 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function ChevronIcon(props: { open?: boolean; size?: number }) {
  const size = props.size || 15;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: props.open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function CheckCircleIcon(props: { size?: number; color?: string }) {
  const size = props.size || 14;
  const color = props.color || '#16a34a';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon(props: { size?: number; color?: string }) {
  const size = props.size || 14;
  const color = props.color || '#dc2626';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ZapIcon(props: { size?: number; color?: string }) {
  const size = props.size || 13;
  const color = props.color || 'currentColor';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

interface PaymentChannelRowProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  themeColor: string;
  bgLight: string;
  borderColor: string;
  count: number;
  declaredTotal: number;
  declaredFieldName: 'cardDeclaredTotal' | 'walletDeclaredTotal' | 'instapayDeclaredTotal';
  detailsFieldName: DetailChannel;
  detailsRows: Array<{ amount?: number }>;
  isOpen: boolean;
  onToggle: () => void;
  register: UseFormReturn<CloseShiftValues>['register'];
  onApplyTotalToDeclared: (total: number) => void;
  disabled?: boolean;
}

function PaymentChannelRow(props: PaymentChannelRowProps) {
  const detailsTotal = useMemo(() => summarizeDetails(props.detailsRows), [props.detailsRows]);
  const diff = Number((detailsTotal - props.declaredTotal).toFixed(2));
  const isMatch = Math.abs(diff) < 0.01 && detailsTotal > 0 && props.declaredTotal > 0;
  const isZero = detailsTotal === 0 && props.declaredTotal === 0;

  return (
    <div
      style={{
        border: `1.5px solid ${props.isOpen ? props.themeColor : props.borderColor}`,
        borderRadius: '10px',
        background: '#ffffff',
        overflow: 'hidden',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        boxShadow: props.isOpen ? `0 4px 12px -2px ${props.themeColor}20` : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Main Row Bar */}
      <div
        style={{
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: props.isOpen ? props.bgLight : '#ffffff',
          borderBottom: props.isOpen ? `1px solid ${props.borderColor}` : 'none',
        }}
      >
        {/* Left: Icon, Title & Locked Count Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: props.bgLight,
              border: `1px solid ${props.borderColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {props.icon}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{props.title}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #e2e8f0',
                }}
              >
                <LockIcon size={11} color="#64748b" />
                <span>{props.count} {props.count === 1 ? 'عملية' : props.count === 2 ? 'عمليتان' : 'عمليات'}</span>
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{props.subtitle}</div>
          </div>
        </div>

        {/* Right: Declared Amount Input & Expand Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>الإجمالي المعلن:</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="no-spin-arrows"
                {...props.register(props.declaredFieldName, { valueAsNumber: true })}
                disabled={props.disabled}
                style={{
                  width: '125px',
                  padding: '6px 30px 6px 10px',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  textAlign: 'center',
                  borderRadius: '6px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#0f172a',
                  MozAppearance: 'textfield',
                }}
              />
              <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', color: '#94a3b8', pointerEvents: 'none' }}>ج.م</span>
            </div>
          </div>

          <Button
            type="button"
            variant={props.isOpen ? 'primary' : 'secondary'}
            onClick={props.onToggle}
            disabled={props.disabled}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.82rem',
              padding: '6px 12px',
            }}
          >
            <span>تفاصيل العمليات</span>
            <ChevronIcon open={props.isOpen} size={14} />
          </Button>
        </div>
      </div>

      {/* Expanded Accordion Details */}
      {props.isOpen && (
        <div style={{ padding: '16px', background: '#fafbfc' }}>
          {/* Summary KPI Strip */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.83rem', color: '#475569' }}>
                مجموع المربعات: <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{formatCurrency(detailsTotal)}</strong>
              </div>
              <div style={{ fontSize: '0.83rem', color: '#475569' }}>
                المعلن من الماكينة: <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{formatCurrency(props.declaredTotal)}</strong>
              </div>
              {isMatch ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#dcfce7',
                    color: '#15803d',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <CheckCircleIcon size={13} color="#15803d" />
                  <span>متطابق تماماً</span>
                </span>
              ) : !isZero ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#fee2e2',
                    color: '#b91c1c',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  <AlertCircleIcon size={13} color="#b91c1c" />
                  <span>فرق: {formatCurrency(diff)}</span>
                </span>
              ) : null}
            </div>

            <Button
              type="button"
              variant="secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.78rem',
                padding: '4px 10px',
              }}
              onClick={() => props.onApplyTotalToDeclared(detailsTotal)}
              disabled={props.disabled || detailsTotal === 0}
            >
              <ZapIcon size={12} color="#0284c7" />
              <span>اعتماد المجموع كإجمالي معلن</span>
            </Button>
          </div>

          {/* Numbered Amount Input Cards */}
          {props.count === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '0.85rem' }}>
              لا توجد عمليات مسجلة لهذه القناة في الوردية الحالية.
            </div>
          ) : (
            <div
              style={{
                maxHeight: '340px',
                overflowY: 'auto',
                padding: '4px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                gap: '8px',
              }}
            >
              {Array.from({ length: props.count }).map((_, index) => {
                const formattedNum = String(index + 1).padStart(2, '0');
                return (
                  <div
                    key={`${props.detailsFieldName}-${index}`}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '6px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.72rem',
                        color: '#64748b',
                        fontWeight: 700,
                      }}
                    >
                      <span>عملية #{formattedNum}</span>
                    </div>
                    <input
                      id={`${props.detailsFieldName}-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="no-spin-arrows"
                      style={{
                        width: '100%',
                        padding: '5px 6px',
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.9rem',
                        fontWeight: 700,
                        textAlign: 'center',
                        background: '#f8fafc',
                        MozAppearance: 'textfield',
                      }}
                      {...props.register(`${props.detailsFieldName}.${index}.amount` as const, { valueAsNumber: true })}
                      disabled={props.disabled}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const nextInput = document.getElementById(`${props.detailsFieldName}-${index + 1}`);
                          if (nextInput) {
                            nextInput.focus();
                          }
                        }
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CashDrawerFormsPanel(props: CashDrawerFormsPanelProps) {
  const locationList = Array.isArray(props.locations) ? props.locations : [];
  const isBlindCloseMode = props.isBlindCloseMode === true;

  const selectedCloseShift = props.openOptions.find((shift) => String(shift.id) === String(props.closeForm.watch('shiftId'))) || null;
  const closeCashSalesTotal = Number(selectedCloseShift?.cashSalesTotal || 0);
  const closeCardSalesTotal = Number(selectedCloseShift?.cardSalesTotal || 0);
  const closeCreditSalesTotal = Number(selectedCloseShift?.creditSalesTotal || 0);
  const closeDeliverySalesTotal = Number(selectedCloseShift?.deliverySalesTotal || 0);
  const closeShiftSalesTotal = Number(selectedCloseShift?.shiftSalesTotal || 0);
  const closeServiceCashTotal = Number(selectedCloseShift?.serviceCashTotal || 0);
  const closeCashDrawerMovementTotal = Number(selectedCloseShift?.cashDrawerMovementTotal || 0);
  const closeSaleReturnCashRefundTotal = Number(selectedCloseShift?.saleReturnCashRefundTotal || 0);
  const closeExpensesTotal = Number(selectedCloseShift?.expensesTotal || 0);
  const closeSupplierPaymentsTotal = Number(selectedCloseShift?.supplierPaymentsTotal || 0);

  const cardOperationCount = normalizeCount(selectedCloseShift?.cardOperationCount ?? props.closeForm.watch('cardOperationCount'));
  const walletOperationCount = normalizeCount(selectedCloseShift?.walletOperationCount ?? props.closeForm.watch('walletOperationCount'));
  const instapayOperationCount = normalizeCount(selectedCloseShift?.instapayOperationCount ?? props.closeForm.watch('instapayOperationCount'));

  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showWalletDetails, setShowWalletDetails] = useState(false);
  const [showInstapayDetails, setShowInstapayDetails] = useState(false);

  useEffect(() => {
    if (selectedCloseShift) {
      const cardCount = normalizeCount(selectedCloseShift.cardOperationCount);
      const walletCount = normalizeCount(selectedCloseShift.walletOperationCount);
      const instapayCount = normalizeCount(selectedCloseShift.instapayOperationCount);
      props.closeForm.setValue('cardOperationCount', cardCount, { shouldDirty: false });
      props.closeForm.setValue('walletOperationCount', walletCount, { shouldDirty: false });
      props.closeForm.setValue('instapayOperationCount', instapayCount, { shouldDirty: false });
    }
  }, [
    selectedCloseShift?.id,
    selectedCloseShift?.cardOperationCount,
    selectedCloseShift?.walletOperationCount,
    selectedCloseShift?.instapayOperationCount,
    props.closeForm,
  ]);

  const ensureDetailsLength = (field: DetailChannel, size: number) => {
    const current = props.closeForm.getValues(field) || [];
    const next = [...current];
    if (next.length > size) next.length = size;
    while (next.length < size) {
      next.push({ amount: 0 });
    }
    props.closeForm.setValue(field, next, { shouldDirty: false });
  };

  useEffect(() => {
    ensureDetailsLength('cardDetails', cardOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardOperationCount]);

  useEffect(() => {
    ensureDetailsLength('walletDetails', walletOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletOperationCount]);

  useEffect(() => {
    ensureDetailsLength('instapayDetails', instapayOperationCount);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instapayOperationCount]);

  useEffect(() => {
    if (props.activeForm) {
      props.openMutation.reset?.();
      props.movementMutation.reset?.();
      props.closeMutation.reset?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.activeForm]);

  useEffect(() => {
    if (!props.activeForm) return;

    const isCurrentSuccess =
      (props.activeForm === 'open' && props.openMutation.isSuccess) ||
      (props.activeForm === 'movement' && props.movementMutation.isSuccess) ||
      (props.activeForm === 'close' && props.closeMutation.isSuccess);

    if (isCurrentSuccess) {
      const timeout = setTimeout(() => {
        props.onCloseForm();
      }, 1200);
      return () => clearTimeout(timeout);
    }
  }, [
    props.activeForm,
    props.openMutation.isSuccess,
    props.movementMutation.isSuccess,
    props.closeMutation.isSuccess,
    props.onCloseForm,
  ]);

  const cardDeclaredTotal = Number(props.closeForm.watch('cardDeclaredTotal') || 0);
  const walletDeclaredTotal = Number(props.closeForm.watch('walletDeclaredTotal') || 0);
  const instapayDeclaredTotal = Number(props.closeForm.watch('instapayDeclaredTotal') || 0);

  const cardDetailsRows = props.closeForm.watch('cardDetails') ?? EMPTY_DETAIL_ROWS;
  const walletDetailsRows = props.closeForm.watch('walletDetails') ?? EMPTY_DETAIL_ROWS;
  const instapayDetailsRows = props.closeForm.watch('instapayDetails') ?? EMPTY_DETAIL_ROWS;

  const watchedBranchId = props.openForm.watch('branchId');
  const availableLocations = useMemo(() => {
    if (!watchedBranchId) return locationList;
    const branchSpecific = locationList.filter((loc) => !loc.branchId || String(loc.branchId) === String(watchedBranchId));
    return branchSpecific.length > 0 ? branchSpecific : locationList;
  }, [locationList, watchedBranchId]);

  return (
    <DialogShell open={!!props.activeForm} onClose={props.onCloseForm} width={props.activeForm === 'close' ? 'min(940px, 98vw)' : 'min(600px, 100%)'}>
      {props.activeForm === 'open' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>فتح وردية نقطة بيع</h2>
        <form className="form-grid" onSubmit={props.openForm.handleSubmit((values) => props.openMutation.mutate(values))}>
          <Field label="رصيد الفتح"><input type="number" step="0.01" {...props.openForm.register('openingCash', { valueAsNumber: true })} disabled={props.openMutation.isPending} /></Field>
          {!SINGLE_STORE_MODE ? <Field label="الفرع">
            <select
              {...props.openForm.register('branchId')}
              disabled={props.openMutation.isPending}
              onChange={(e) => {
                const nextBranchId = e.target.value;
                props.openForm.setValue('branchId', nextBranchId);
                const branchObj = props.branches.find(b => String(b.id) === String(nextBranchId));
                const nextLocs = locationList.filter(l => !l.branchId || String(l.branchId) === String(nextBranchId));
                const nextDefaultLoc = (branchObj?.defaultStockLocationId && locationList.find(l => String(l.id) === String(branchObj.defaultStockLocationId)))
                  || nextLocs.find(l => l.name.includes('الرئيسي') || l.name.toLowerCase().includes('main'))
                  || nextLocs[0]
                  || locationList[0];
                if (nextDefaultLoc?.id) {
                  props.openForm.setValue('locationId', nextDefaultLoc.id);
                }
              }}
            >
              <option value="">بدون فرع</option>
              {props.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </Field> : null}
          {SINGLE_STORE_MODE ? <Field label="المخزن الأساسي"><input value={locationList[0]?.name || 'سيتم الربط تلقائيًا بالمخزن الأساسي'} disabled readOnly /></Field> : <Field label="المخزن">
            <Controller
              name="locationId"
              control={props.openForm.control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={props.openMutation.isPending}
                  options={[
                    { value: '', label: 'بدون مخزن' },
                    ...availableLocations.map((location) => ({ value: location.id, label: location.name })),
                  ]}
                />
              )}
            />
          </Field>}
          <Field label="ملاحظة الافتتاح"><textarea rows={2} {...props.openForm.register('note')} disabled={props.openMutation.isPending} /></Field>
          <MutationFeedback isError={props.openMutation.isError} isSuccess={props.openMutation.isSuccess} error={props.openMutation.error} errorFallback="تعذر فتح وردية نقطة البيع" successText="تم فتح وردية نقطة البيع بنجاح." />
          <SubmitButton type="submit" isPending={props.openMutation.isPending} idleText="فتح وردية نقطة البيع" pendingText="جارٍ الفتح..." />
        </form>
        </div>
      )}

      {props.activeForm === 'movement' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '8px' }}>
          <h2 style={{ marginTop: 0, marginBottom: '24px' }}>تسجيل حركة درج النقدية</h2>
        <form className="form-grid" onSubmit={props.onMovementSubmit}>
          {props.isManager && props.openOptions.length > 1 ? (
            <Field label="وردية نقطة البيع المفتوحة">
              <Controller
                name="shiftId"
                control={props.movementForm.control}
                render={({ field }) => (
                  <CustomSelect
                    value={field.value}
                    onChange={field.onChange}
                    disabled={props.movementMutation.isPending}
                    options={[
                      { value: '', label: 'اختر وردية نقطة البيع' },
                      ...props.openOptions.map((shift) => ({
                        value: shift.id,
                        label: `${shift.openedByName || 'وردية نقطة بيع'}${shift.docNo ? ` — ${shift.docNo}` : ''}${String(shift.id) === String(props.myOpenShift?.id) ? ' (ورديتي الحالية)' : ''}`,
                      })),
                    ]}
                  />
                )}
              />
            </Field>
          ) : (
            <Field label="وردية نقطة البيع">
              <div style={{
                padding: '10px 14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: 700,
                color: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>{(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.movementForm.watch('shiftId'))) || props.openOptions[0])?.openedByName || 'الوردية الحالية'}{(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.movementForm.watch('shiftId'))) || props.openOptions[0])?.docNo ? ` — ${(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.movementForm.watch('shiftId'))) || props.openOptions[0])?.docNo}` : ''}</span>
                <span className="badge badge-success" style={{ fontSize: '0.75rem' }}>وردية نشطة</span>
              </div>
            </Field>
          )}
          <Field label="النوع">
            <Controller
              name="type"
              control={props.movementForm.control}
              render={({ field }) => (
                <CustomSelect
                  value={field.value}
                  onChange={field.onChange}
                  disabled={props.movementMutation.isPending}
                  options={[
                    { value: 'cash_in', label: 'إيداع' },
                    { value: 'cash_out', label: 'صرف' },
                  ]}
                />
              )}
            />
          </Field>
          <Field label="المبلغ"><input type="number" step="0.01" {...props.movementForm.register('amount', { valueAsNumber: true })} disabled={props.movementMutation.isPending} /></Field>
          <Field label="سبب الحركة (إجباري)"><textarea rows={2} placeholder="اكتب سبب الصرف أو الإيداع بوضوح" required {...props.movementForm.register('note', { required: true })} disabled={props.movementMutation.isPending} /></Field>
          <MutationFeedback isError={props.movementMutation.isError} isSuccess={props.movementMutation.isSuccess} error={props.movementMutation.error} errorFallback="تعذر تسجيل الحركة" successText="تم تسجيل حركة درج النقدية بنجاح." />
          <SubmitButton
            type="submit"
            isPending={props.movementMutation.isPending}
            disabled={!props.movementForm.watch('shiftId') || !(Number(props.movementForm.watch('amount')) > 0) || !String(props.movementForm.watch('note') || '').trim()}
            idleText="حفظ الحركة"
            pendingText="جارٍ الحفظ..."
          />
        </form>
        </div>
      )}

      {props.activeForm === 'close' && (
        <div style={{ background: '#fff', padding: '24px', borderRadius: '12px' }}>
          <style>{`
            input.no-spin-arrows::-webkit-outer-spin-button,
            input.no-spin-arrows::-webkit-inner-spin-button {
              -webkit-appearance: none !important;
              margin: 0 !important;
              display: none !important;
            }
            input.no-spin-arrows {
              -moz-appearance: textfield !important;
              appearance: textfield !important;
            }
          `}</style>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              paddingBottom: '14px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 800 }}>إغلاق وردية نقطة البيع</h2>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                تسجيل إقرار مبيعات النقدية والمدفوعات الإلكترونية ومطابقة بونات الدفع
              </div>
            </div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              <span>{(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.closeForm.watch('shiftId'))) || props.openOptions[0])?.openedByName || 'الوردية الحالية'}{(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.closeForm.watch('shiftId'))) || props.openOptions[0])?.docNo ? ` — ${(props.myOpenShift || props.openOptions.find(s => String(s.id) === String(props.closeForm.watch('shiftId'))) || props.openOptions[0])?.docNo}` : ''}</span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem' }}>وردية نشطة</span>
            </div>
          </div>

          <form className="form-grid" onSubmit={props.onCloseSubmit}>
            {props.isManager && props.openOptions.length > 1 ? (
              <Field label="وردية نقطة البيع المفتوحة">
                <Controller
                  name="shiftId"
                  control={props.closeForm.control}
                  render={({ field }) => (
                    <CustomSelect
                      value={field.value}
                      onChange={field.onChange}
                      disabled={props.closeMutation.isPending}
                      options={[
                        { value: '', label: 'اختر وردية نقطة البيع' },
                        ...props.openOptions.map((shift) => ({
                          value: shift.id,
                          label: `${shift.openedByName || 'وردية نقطة بيع'}${shift.docNo ? ` — ${shift.docNo}` : ''}${String(shift.id) === String(props.myOpenShift?.id) ? ' (ورديتي الحالية)' : ''}`,
                        })),
                      ]}
                    />
                  )}
                />
              </Field>
            ) : null}

            {isBlindCloseMode ? (
              <>
                {/* 1. Cash Section */}
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: '#f0fdf4',
                    border: '1.5px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#ffffff',
                        border: '1px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <CashIcon size={20} color="#16a34a" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#14532d' }}>النقدية المعدودة في درج النقدية</div>
                      <div style={{ fontSize: '0.75rem', color: '#15803d' }}>المبلغ النقدي (الكاش) الفعلي الموجود داخل الدرج</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>المبلغ الفعلي:</span>
                    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="no-spin-arrows"
                        {...props.closeForm.register('countedCash', { valueAsNumber: true })}
                        disabled={props.closeMutation.isPending}
                        style={{
                          width: '140px',
                          padding: '7px 30px 7px 12px',
                          fontSize: '1rem',
                          fontWeight: 800,
                          textAlign: 'center',
                          borderRadius: '6px',
                          border: '1.5px solid #86efac',
                          background: '#ffffff',
                          color: '#14532d',
                          MozAppearance: 'textfield',
                        }}
                      />
                      <span style={{ position: 'absolute', left: '8px', fontSize: '0.75rem', color: '#16a34a', pointerEvents: 'none' }}>ج.م</span>
                    </div>
                  </div>
                </div>

                {/* 2. Electronic Payment Methods Section */}
                <div style={{ gridColumn: '1 / -1', marginTop: '6px', marginBottom: '4px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
                    المدفوعات الإلكترونية وماكينات الدفع
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Card / Visa */}
                    <PaymentChannelRow
                      title="فيزا وماكينات POS"
                      subtitle="مدفوعات البطاقات البنكية حسب تقرير الماكينة"
                      icon={<CardIcon size={18} color="#2563eb" />}
                      themeColor="#2563eb"
                      bgLight="#eff6ff"
                      borderColor="#dbeafe"
                      count={cardOperationCount}
                      declaredTotal={cardDeclaredTotal}
                      declaredFieldName="cardDeclaredTotal"
                      detailsFieldName="cardDetails"
                      detailsRows={cardDetailsRows}
                      isOpen={showCardDetails}
                      onToggle={() => setShowCardDetails((v) => !v)}
                      register={props.closeForm.register}
                      onApplyTotalToDeclared={(total) => props.closeForm.setValue('cardDeclaredTotal', total, { shouldDirty: true })}
                      disabled={props.closeMutation.isPending}
                    />

                    {/* Wallets */}
                    <PaymentChannelRow
                      title="المحافظ الإلكترونية"
                      subtitle="فودافون كاش، أورنج، اتصالات كاش، وي باي"
                      icon={<WalletIcon size={18} color="#7c3aed" />}
                      themeColor="#7c3aed"
                      bgLight="#f5f3ff"
                      borderColor="#ede9fe"
                      count={walletOperationCount}
                      declaredTotal={walletDeclaredTotal}
                      declaredFieldName="walletDeclaredTotal"
                      detailsFieldName="walletDetails"
                      detailsRows={walletDetailsRows}
                      isOpen={showWalletDetails}
                      onToggle={() => setShowWalletDetails((v) => !v)}
                      register={props.closeForm.register}
                      onApplyTotalToDeclared={(total) => props.closeForm.setValue('walletDeclaredTotal', total, { shouldDirty: true })}
                      disabled={props.closeMutation.isPending}
                    />

                    {/* InstaPay */}
                    <PaymentChannelRow
                      title="تحويلات InstaPay"
                      subtitle="التحويلات البنكية اللحظية وتطبيق إنستاباي"
                      icon={<InstaPayIcon size={18} color="#059669" />}
                      themeColor="#059669"
                      bgLight="#ecfdf5"
                      borderColor="#d1fae5"
                      count={instapayOperationCount}
                      declaredTotal={instapayDeclaredTotal}
                      declaredFieldName="instapayDeclaredTotal"
                      detailsFieldName="instapayDetails"
                      detailsRows={instapayDetailsRows}
                      isOpen={showInstapayDetails}
                      onToggle={() => setShowInstapayDetails((v) => !v)}
                      register={props.closeForm.register}
                      onApplyTotalToDeclared={(total) => props.closeForm.setValue('instapayDeclaredTotal', total, { shouldDirty: true })}
                      disabled={props.closeMutation.isPending}
                    />
                  </div>
                </div>

                {/* 3. Password & Optional Notes in One Unified Row */}
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'start' }}>
                  <Field label="كلمة مرور المستخدم الحالي (تأكيد الإغلاق)">
                    <input
                      type="text"
                      className="secure-password-field"
                      placeholder="أدخل كلمة المرور لتأكيد الإغلاق"
                      required
                      {...props.closeForm.register('managerPin')}
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      disabled={props.closeMutation.isPending}
                      style={{ width: '100%' }}
                    />
                  </Field>

                  <Field label="ملاحظات الإغلاق (اختياري)">
                    <input
                      type="text"
                      placeholder="أية ملاحظات خاصة بوردية اليوم..."
                      {...props.closeForm.register('note')}
                      disabled={props.closeMutation.isPending}
                      style={{ width: '100%' }}
                    />
                  </Field>
                </div>

                <div className="muted small" style={{ gridColumn: '1 / -1' }}>
                  سيتم تسجيل الإقرار وإرسال وردية نقطة البيع في انتظار مراجعة واعتماد الإدارة.
                </div>
              </>
            ) : (
              <>
                <Field label="النقدية المتوقعة"><input value={formatCurrency(props.closeExpectedCash)} disabled readOnly /></Field>
                {selectedCloseShift ? (
                  <div className="muted small" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8 }}>
                    <span>مبيعات نقدي: <strong>{formatCurrency(closeCashSalesTotal)}</strong></span>
                    <span>مبيعات فيزا: <strong>{formatCurrency(closeCardSalesTotal)}</strong></span>
                    {closeDeliverySalesTotal > 0 ? <span>مبيعات دليفري: <strong>{formatCurrency(closeDeliverySalesTotal)}</strong></span> : null}
                    {closeServiceCashTotal > 0 ? <span>خدمات نقدي: <strong>{formatCurrency(closeServiceCashTotal)}</strong></span> : null}
                    {closeCreditSalesTotal > 0 ? <span>مبيعات آجل: <strong>{formatCurrency(closeCreditSalesTotal)}</strong></span> : null}
                    {closeSaleReturnCashRefundTotal > 0 ? <span>مرتجعات نقدي: <strong>{formatCurrency(closeSaleReturnCashRefundTotal)}</strong></span> : null}
                    {closeCashDrawerMovementTotal !== 0 ? <span>حركات درج النقدية: <strong>{formatCurrency(closeCashDrawerMovementTotal)}</strong></span> : null}
                    {closeExpensesTotal > 0 ? <span>مصروفات مسجلة: <strong>{formatCurrency(closeExpensesTotal)}</strong></span> : null}
                    {closeSupplierPaymentsTotal > 0 ? <span>دفعات موردين: <strong>{formatCurrency(closeSupplierPaymentsTotal)}</strong></span> : null}
                    <span>إجمالي مبيعات الفواتير: <strong>{formatCurrency(closeShiftSalesTotal)}</strong></span>
                    {Number(selectedCloseShift.freelanceDeliveryFeeTotal || 0) > 0 ? (
                      <>
                        <span>(-) رسوم طيارين: <strong style={{ color: '#dc2626' }}>-{formatCurrency(selectedCloseShift.freelanceDeliveryFeeTotal || 0)}</strong></span>
                        <span>صافي مبيعات المتجر: <strong style={{ color: '#16a34a' }}>{formatCurrency(closeShiftSalesTotal - Number(selectedCloseShift.freelanceDeliveryFeeTotal || 0))}</strong></span>
                      </>
                    ) : null}
                    <span style={{ gridColumn: '1 / -1' }}>النقدية المتوقعة = رصيد الفتح + مبيعات وخدمات النقدي - مرتجعات النقدي + حركات الدرج - المصروفات - دفعات الموردين.</span>
                  </div>
                ) : null}
                <Field label="المبلغ المعدود"><input type="number" min="0" step="0.01" {...props.closeForm.register('countedCash', { valueAsNumber: true })} disabled={props.closeMutation.isPending} /></Field>
                
                <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', alignItems: 'start' }}>
                  <Field label="كلمة مرور المستخدم الحالي (تأكيد الإغلاق)">
                    <input
                      type="text"
                      className="secure-password-field"
                      placeholder="أدخل كلمة المرور لتأكيد الإغلاق"
                      required
                      {...props.closeForm.register('managerPin')}
                      autoComplete="off"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      disabled={props.closeMutation.isPending}
                      style={{ width: '100%' }}
                    />
                  </Field>

                  <Field label="ملاحظة الإغلاق">
                    <input
                      type="text"
                      placeholder={Math.abs(props.closeVariancePreview) >= 0.01 ? 'اشرح سبب الفرق قبل إغلاق الوردية' : 'اختياري عند عدم وجود فرق'}
                      {...props.closeForm.register('note')}
                      disabled={props.closeMutation.isPending}
                      style={{ width: '100%' }}
                    />
                  </Field>
                </div>

                <div className={Math.abs(props.closeVariancePreview) >= 0.01 ? 'warning-box' : 'muted small'} style={{ gridColumn: '1 / -1' }}>
                  الفرق المتوقع بعد الإغلاق: <strong>{formatCurrency(props.closeVariancePreview)}</strong>
                  {Math.abs(props.closeVariancePreview) >= 0.01 ? ' — يلزم كتابة ملاحظة قبل إغلاق وردية نقطة البيع مع وجود فرق.' : ''}
                </div>
              </>
            )}

            <MutationFeedback isError={props.closeMutation.isError} isSuccess={props.closeMutation.isSuccess} error={props.closeMutation.error} errorFallback="تعذر إغلاق وردية نقطة البيع" successText="تم إغلاق وردية نقطة البيع بنجاح." />
            <SubmitButton
              type="submit"
              isPending={props.closeMutation.isPending}
              disabled={!props.closeForm.watch('shiftId') || (!isBlindCloseMode && Math.abs(props.closeVariancePreview) >= 0.01 && !props.closeNoteValue) || !props.closeForm.watch('managerPin')}
              idleText={isBlindCloseMode ? 'إرسال إقرار الإغلاق' : 'إغلاق وردية نقطة البيع'}
              pendingText="جارٍ الإغلاق..."
            />
          </form>
        </div>
      )}
    </DialogShell>
  );
}
