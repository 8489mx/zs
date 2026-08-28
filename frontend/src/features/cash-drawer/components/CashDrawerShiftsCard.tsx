import React, { useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import {
  CreditCardIcon,
  RefreshCwIcon,
  ScaleIcon,
  FileTextIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PrinterIcon,
  DownloadIcon,
  CopyIcon,
} from '@/shared/components/icons/AppIcons';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
import { printCashDrawerShiftReceipt } from '@/features/cash-drawer/utils/cash-drawer-receipt';
import type { CashierShift } from '@/types/domain';

interface CashDrawerShiftsCardProps {
  search: string;
  onSearchChange: (value: string) => void;
  shiftFilter: 'all' | 'open' | 'closed' | 'pending_review' | 'variance' | 'today';
  onShiftFilterChange: (value: 'all' | 'open' | 'closed' | 'pending_review' | 'variance' | 'today') => void;
  onReset: () => void;
  onCopySummary: () => void;
  onExportRows: () => void;
  onPrintRows: () => void;
  onReviewShift?: (shift: CashierShift) => void;
  canReviewPending?: boolean;
  pendingReviewCount?: number;
  totalItems: number;
  rows: CashierShift[];
  canViewSensitiveTotals?: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  page: number;
  pageSize: number;
  totalPaginationItems: number;
  onPageChange: (value: number) => void;
  onPageSizeChange: (value: number) => void;
}


function renderStatusBadge(status: string) {
  if (status === 'open') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: '#ecfdf5',
        color: '#065f46',
        fontSize: '0.82rem',
        fontWeight: 700,
        border: '1px solid #a7f3d0'
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
        مفتوحة
      </span>
    );
  }
  if (status === 'pending_review') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '20px',
        background: '#fffbeb',
        color: '#92400e',
        fontSize: '0.82rem',
        fontWeight: 700,
        border: '1px solid #fde68a'
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
        بانتظار المراجعة
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      borderRadius: '20px',
      background: '#f1f5f9',
      color: '#475569',
      fontSize: '0.82rem',
      fontWeight: 600,
      border: '1px solid #e2e8f0'
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} />
      مغلقة
    </span>
  );
}

function renderVarianceBadge(variance: number) {
  if (Math.abs(variance) < 0.01) {
    return <span style={{ color: '#64748b', fontWeight: 600, fontSize: '0.85rem' }}>0.00 ج.م</span>;
  }
  if (variance > 0) {
    return (
      <span style={{
        background: '#ecfdf5',
        color: '#15803d',
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: 700,
        fontSize: '0.86rem',
        border: '1px solid #bbf7d0',
        display: 'inline-block',
      }}>
        +{formatCurrency(variance)}
      </span>
    );
  }
  return (
    <span style={{
      background: '#fef2f2',
      color: '#dc2626',
      padding: '2px 8px',
      borderRadius: '6px',
      fontWeight: 700,
      fontSize: '0.86rem',
      border: '1px solid #fecaca',
      display: 'inline-block',
    }}>
      {formatCurrency(variance)}
    </span>
  );
}

export function CashDrawerShiftsCard(props: CashDrawerShiftsCardProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({});
  const canViewSensitiveTotals = props.canViewSensitiveTotals !== false;
  const canReviewPending = props.canReviewPending === true && typeof props.onReviewShift === 'function';
  const searchPlaceholder = SINGLE_STORE_MODE
    ? 'ابحث باسم المستخدم أو رقم المرجع أو المخزن'
    : 'ابحث باسم المستخدم أو رقم المرجع أو الفرع أو المخزن';

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubGroup = (shiftId: string, groupKey: string) => {
    const key = `${shiftId}_${groupKey}`;
    setExpandedSubGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalPages = Math.max(1, Math.ceil(props.totalPaginationItems / props.pageSize));
  const rangeStart = (props.page - 1) * props.pageSize + 1;
  const rangeEnd = Math.min(props.page * props.pageSize, props.totalPaginationItems);

  return (
    <Card
      title="ورديات نقطة البيع الحالية"
      actions={canViewSensitiveTotals ? (
        <div className="actions compact-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Button variant="secondary" onClick={props.onCopySummary} disabled={!props.totalItems} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <CopyIcon size={14} /> <span>نسخ الملخص</span>
          </Button>
          <Button variant="secondary" onClick={props.onExportRows} disabled={!props.totalItems} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <DownloadIcon size={14} /> <span>تصدير Excel</span>
          </Button>
          <Button variant="secondary" onClick={props.onPrintRows} disabled={!props.totalItems} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <PrinterIcon size={14} /> <span>طباعة النتائج</span>
          </Button>
        </div>
      ) : undefined}
      className="cash-drawer-shifts-card"
    >
      <div className="filter-chip-row">
        <Button variant={props.shiftFilter === 'all' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('all')}>الكل</Button>
        <Button variant={props.shiftFilter === 'open' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('open')}>مفتوحة</Button>
        <Button variant={props.shiftFilter === 'closed' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('closed')}>مغلقة</Button>
        {canReviewPending ? (
          <Button variant={props.shiftFilter === 'pending_review' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('pending_review')}>
            في انتظار مراجعة المشرف{typeof props.pendingReviewCount === 'number' ? ` (${props.pendingReviewCount})` : ''}
          </Button>
        ) : null}
        <Button variant={props.shiftFilter === 'variance' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('variance')}>بفروقات</Button>
        <Button variant={props.shiftFilter === 'today' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('today')}>اليوم</Button>
      </div>

      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder={searchPlaceholder}>
        <Button variant="secondary" onClick={props.onReset} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <RefreshCwIcon size={14} /> <span>إعادة الضبط</span>
        </Button>
      </SearchToolbar>

      <QueryFeedback
        isLoading={props.isLoading}
        isError={props.isError}
        error={props.error}
        isEmpty={!props.totalItems}
        loadingText="جاري تحميل ورديات نقطة البيع..."
        errorTitle="تعذر تحميل ورديات نقطة البيع"
        emptyTitle="لا توجد ورديات نقطة بيع مطابقة حاليًا"
        emptyHint="افتح وردية نقطة بيع جديدة أو وسّع شروط البحث الحالية."
      >
        <div className="table-wrap table-wrap-sticky" style={{ overflowX: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>الوردية / الكاشير</th>
                {!SINGLE_STORE_MODE && <th style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>الفرع والمخزن</th>}
                {SINGLE_STORE_MODE && <th style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>المخزن</th>}
                <th style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>الحالة</th>
                <th style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>رصيد الفتح</th>
                {canViewSensitiveTotals && <th style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>إجمالي المبيعات</th>}
                {canViewSensitiveTotals && <th style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle', fontWeight: 700, color: '#334155' }}>الفرق</th>}
                <th style={{ padding: '14px 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 700, color: '#334155', minWidth: '170px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => {
                const isExpanded = Boolean(expandedIds[row.id]);
                const isPending = String(row.status || '') === 'pending_review';
                const isOpen = String(row.status || '') === 'open';

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => { if (canViewSensitiveTotals) toggleExpand(row.id); }}
                      style={{
                        cursor: canViewSensitiveTotals ? 'pointer' : 'default',
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#f8fafc' : isOpen ? '#f0fdf4' : '#ffffff',
                        borderInlineStart: isOpen ? '4px solid #16a34a' : '4px solid transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isExpanded && canViewSensitiveTotals) e.currentTarget.style.background = isOpen ? '#eafaf1' : '#fcfdfe'; }}
                      onMouseLeave={(e) => { if (!isExpanded && canViewSensitiveTotals) e.currentTarget.style.background = isOpen ? '#f0fdf4' : '#ffffff'; }}
                    >
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                            {row.openedByName || row.docNo || `وردية #${row.id}`}
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                            {row.docNo ? `${row.docNo} • ` : ''}{formatDate(row.createdAt)}
                          </span>
                        </div>
                      </td>

                      {!SINGLE_STORE_MODE && (
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{row.branchName || 'الفرع الرئيسي'}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.locationName || 'المخزن الرئيسي'}</span>
                          </div>
                        </td>
                      )}

                      {SINGLE_STORE_MODE && (
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', color: '#1e293b', fontWeight: 600 }}>
                          {row.locationName || 'المخزن الرئيسي'}
                        </td>
                      )}

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'right' }}>
                        {renderStatusBadge(String(row.status || ''))}
                      </td>

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 600, color: '#334155' }}>
                        {formatCurrency(row.openingCash)}
                      </td>

                      {canViewSensitiveTotals && (
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                          <div>{formatCurrency(row.shiftSalesTotal || 0)}</div>
                          {Number(row.freelanceDeliveryFeeTotal || 0) > 0 && (
                            <div style={{ fontSize: '0.74rem', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                              صافي المتجر: {formatCurrency((row.shiftSalesTotal || 0) - (row.freelanceDeliveryFeeTotal || 0))}
                            </div>
                          )}
                        </td>
                      )}

                      {canViewSensitiveTotals && (
                        <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {(() => {
                            const openingCash = Number(row.openingCash || 0);
                            const cashSales = Number(row.cashSalesTotal || 0) + Number(row.serviceCashTotal || 0);
                            const manualIn = Number(row.cashDrawerManualCashInTotal || (Number(row.cashDrawerDeliveryCashInTotal || 0) === 0 ? row.cashDrawerCashInTotal : 0) || 0);
                            const totalOut = Number(row.cashDrawerCashOutTotal || 0) + Number(row.expensesTotal || 0) + Number(row.supplierPaymentsTotal || 0) + Number(row.saleReturnCashRefundTotal || 0);
                            const dynamicExpectedCash = openingCash + cashSales + manualIn - totalOut;
                            const drawerVariance = row.countedCash != null ? Number(row.countedCash) - dynamicExpectedCash : Number(row.variance || 0);

                            const expectedCard = Number(row.cardSalesTotal || 0) + Number(row.serviceCardTotal || 0) - Number(row.saleReturnCardRefundTotal || 0);
                            const cardDiff = Number(row.declaredCardTotal || 0) - expectedCard;
                            const walletDiff = Number(row.declaredWalletTotal || 0) - Number(row.walletSalesTotal || 0);
                            const instapayDiff = Number(row.declaredInstapayTotal || 0) - Number(row.instapaySalesTotal || 0);
                            const electronicDiff = cardDiff + walletDiff + instapayDiff;
                            const hasElectronicDeclarations = row.declaredCardTotal != null || row.declaredWalletTotal != null || row.declaredInstapayTotal != null;
                            const totalShiftVariance = hasElectronicDeclarations ? drawerVariance + electronicDiff : drawerVariance;

                            return (
                              <div>
                                <div>{renderVarianceBadge(totalShiftVariance)}</div>
                                {hasElectronicDeclarations && Math.abs(electronicDiff) > 0.009 && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', whiteSpace: 'nowrap' }}>
                                    درج: {formatCurrency(drawerVariance)} | إلكتروني: {formatCurrency(electronicDiff)}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      )}

                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'left' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', width: '100%' }}>
                          {canReviewPending && isPending ? (
                            <button
                              type="button"
                              onClick={() => props.onReviewShift?.(row)}
                              style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: '#fef3c7',
                                color: '#92400e',
                                border: '1px solid #fde68a',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                cursor: 'pointer',
                              }}
                            >
                              مراجعة
                            </button>
                          ) : null}

                          {canViewSensitiveTotals ? (
                            <>
                              <button
                                type="button"
                                onClick={() => printCashDrawerShiftReceipt(row)}
                                title="طباعة ريسيت الوردية (Thermal 80mm)"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '6px 8px',
                                  borderRadius: '8px',
                                  background: '#f8fafc',
                                  color: '#0f172a',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <PrinterIcon size={14} />
                              </button>

                              <button
                                type="button"
                                onClick={() => toggleExpand(row.id)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  background: isExpanded ? '#e2e8f0' : '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  fontWeight: 600,
                                  fontSize: '0.82rem',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                }}
                              >
                                <span>{isExpanded ? 'إخفاء' : 'التفاصيل'}</span>
                                <svg
                                  viewBox="0 0 24 24"
                                  width="14"
                                  height="14"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  fill="none"
                                  style={{
                                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s',
                                  }}
                                >
                                  <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && canViewSensitiveTotals && (() => {
                      const movementItems = row.movementItems || [];
                      const manualCashInItems = movementItems.filter((i) => i.kind === 'cash_in');
                      const cashOutItems = movementItems.filter((i) => i.kind === 'cash_out');
                      const expenseItems = movementItems.filter((i) => i.kind === 'expense');
                      const supplierItems = movementItems.filter((i) => i.kind === 'supplier_payment');
                      const returnItems = movementItems.filter((i) => i.kind === 'return' || i.kind.includes('return'));

                      const renderMovementAccordionRow = (
                        groupKey: string,
                        label: string,
                        total: number,
                        items: typeof movementItems,
                        isCredit: boolean
                      ) => {
                        if (total <= 0 && items.length === 0) return null;
                        const isSubExpanded = !!expandedSubGroups[`${row.id}_${groupKey}`];
                        const hasItems = items.length > 0;

                        return (
                          <div key={groupKey} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <div
                              onClick={() => hasItems && toggleSubGroup(row.id, groupKey)}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: hasItems ? '4px 6px' : '0',
                                margin: hasItems ? '0 -6px' : '0',
                                borderRadius: '6px',
                                cursor: hasItems ? 'pointer' : 'default',
                                background: isSubExpanded ? '#e2e8f0' : 'transparent',
                                transition: 'background 0.15s ease',
                                userSelect: 'none',
                                gap: '8px',
                              }}
                              title={hasItems ? 'اضغط لعرض تفاصيل الحركات' : undefined}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                                <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {label}:
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                <strong style={{ color: isCredit ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap' }}>
                                  {isCredit ? '+' : '-'}{formatCurrency(total)}
                                </strong>
                                {hasItems && (
                                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center' }}>
                                    {isSubExpanded ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                                  </span>
                                )}
                              </div>
                            </div>

                            {isSubExpanded && hasItems && (
                              <div style={{
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                margin: '2px 0 4px',
                                fontSize: '0.78rem',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '5px',
                              }}>
                                {items.map((item, idx) => (
                                  <div
                                    key={item.id}
                                    style={{
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '3px',
                                      borderBottom: idx < items.length - 1 ? '1px solid #f1f5f9' : 'none',
                                      paddingBottom: idx < items.length - 1 ? '5px' : '2px',
                                      paddingTop: idx > 0 ? '3px' : '0',
                                    }}
                                  >
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.80rem', wordBreak: 'break-word', lineHeight: 1.35 }}>
                                      {item.note}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                                      <span style={{ color: '#64748b' }}>
                                        {item.createdAt ? formatDate(item.createdAt) : '—'}
                                      </span>
                                      <strong style={{ color: isCredit ? '#16a34a' : '#dc2626', fontSize: '0.84rem' }}>
                                        {isCredit ? '+' : '-'}{formatCurrency(item.amount)}
                                      </strong>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      };

                      return (
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <td colSpan={SINGLE_STORE_MODE ? 7 : 8} style={{ padding: '16px 24px' }}>
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '20px',
                            boxShadow: '0 4px 16px -2px rgba(0, 0, 0, 0.05)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                            gap: '16px',
                          }}>
                            {/* Card 1: Sales breakdown */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CreditCardIcon size={16} /> المبيعات وطرق الدفع
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مبيعات نقدية (كاش):</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.cashSalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مبيعات بطاقات (فيزا):</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.cardSalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>محافظ إلكترونية:</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.walletSalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>تحويلات إنستاباي:</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.instapaySalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مبيعات آجلة (ذمم عملاء):</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.creditSalesTotal || 0)}</strong>
                                </div>
                                {Number(row.deliverySalesTotal || 0) > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>مبيعات دليفري (تحصيل مناديب):</span>
                                    <strong style={{ color: '#0f172a' }}>{formatCurrency(row.deliverySalesTotal || 0)}</strong>
                                  </div>
                                )}
                                {Number(row.serviceTotal || (Number(row.serviceCashTotal || 0) + Number(row.serviceCardTotal || 0))) > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>خدمات وصيانة سريعة:</span>
                                    <strong style={{ color: '#0f172a' }}>{formatCurrency(row.serviceTotal || (Number(row.serviceCashTotal || 0) + Number(row.serviceCardTotal || 0)))}</strong>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a' }}>إجمالي مبيعات الفواتير:</span>
                                  <strong style={{ fontWeight: 800, color: '#0284c7' }}>{formatCurrency(row.shiftSalesTotal || 0)}</strong>
                                </div>
                                {Number(row.freelanceDeliveryFeeTotal || 0) > 0 && (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626', fontSize: '0.84rem' }}>
                                      <span>(-) رسوم توصيل طيارين (للمندوب):</span>
                                      <strong>-{formatCurrency(row.freelanceDeliveryFeeTotal || 0)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '4px', marginTop: '2px' }}>
                                      <span style={{ fontWeight: 800, color: '#16a34a' }}>صافي مبيعات المتجر:</span>
                                      <strong style={{ fontWeight: 800, color: '#16a34a' }}>{formatCurrency((row.shiftSalesTotal || 0) - (row.freelanceDeliveryFeeTotal || 0))}</strong>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Card 2: Movements & Returns */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <RefreshCwIcon size={16} /> حركات ومنصرفات الدرج
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                {renderMovementAccordionRow('cash_in', 'إيداعات نقدية بالدرج (يدوياً)', Number(row.cashDrawerManualCashInTotal || row.cashDrawerCashInTotal || 0), manualCashInItems, true)}
                                {renderMovementAccordionRow('cash_out', 'مسحوبات نقدية من الدرج', Number(row.cashDrawerCashOutTotal || 0), cashOutItems, false)}
                                {renderMovementAccordionRow('expense', 'مصروفات تشغيلية ونثرية', Number(row.expensesTotal || 0), expenseItems, false)}
                                {renderMovementAccordionRow('supplier_payment', 'سداد دفعات موردين', Number(row.supplierPaymentsTotal || 0), supplierItems, false)}
                                {renderMovementAccordionRow('return_cash', 'مرتجع مبيعات نقدي', Number(row.saleReturnCashRefundTotal || 0), returnItems.filter(i => i.note.includes('كاش')), false)}
                                {Number(row.saleReturnCardRefundTotal || 0) > 0 && (
                                  renderMovementAccordionRow('return_card', 'مرتجع مبيعات بطاقات', Number(row.saleReturnCardRefundTotal || 0), returnItems.filter(i => i.note.includes('فيزا')), false)
                                )}

                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a' }}>إجمالي المنصرف من الدرج:</span>
                                  <strong style={{ fontWeight: 800, color: '#dc2626' }}>
                                    -{formatCurrency(
                                      Number(row.cashDrawerCashOutTotal || 0) +
                                      Number(row.expensesTotal || 0) +
                                      Number(row.supplierPaymentsTotal || 0) +
                                      Number(row.saleReturnCashRefundTotal || 0)
                                    )}
                                  </strong>
                                </div>
                              </div>
                            </div>

                            {/* Card 3: Reconciliation & Cash */}
                            {(() => {
                              const openingCash = Number(row.openingCash || 0);
                              const cashSales = Number(row.cashSalesTotal || 0) + Number(row.serviceCashTotal || 0);
                              const manualIn = Number(row.cashDrawerManualCashInTotal || (Number(row.cashDrawerDeliveryCashInTotal || 0) === 0 ? row.cashDrawerCashInTotal : 0) || 0);
                              const totalOut = Number(row.cashDrawerCashOutTotal || 0) + Number(row.expensesTotal || 0) + Number(row.supplierPaymentsTotal || 0) + Number(row.saleReturnCashRefundTotal || 0);
                              const dynamicExpectedCash = openingCash + cashSales + manualIn - totalOut;
                              const dynamicVariance = row.countedCash != null ? Number(row.countedCash) - dynamicExpectedCash : (row.variance != null ? Number(row.variance) : 0);

                              return (
                                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                                  <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ScaleIcon size={16} /> جرد ومطابقة نقدية الدرج
                                  </h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>رصيد الافتتاح (العهدة):</span>
                                      <strong style={{ color: '#0f172a' }}>{formatCurrency(openingCash)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>(+) مبيعات نقدية (كاش):</span>
                                      <strong style={{ color: '#16a34a' }}>+{formatCurrency(cashSales)}</strong>
                                    </div>
                                    {manualIn > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>(+) إيداعات نقدية بالدرج:</span>
                                        <strong style={{ color: '#16a34a' }}>+{formatCurrency(manualIn)}</strong>
                                      </div>
                                    )}
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>(-) إجمالي المنصرف من الدرج:</span>
                                      <strong style={{ color: '#dc2626' }}>
                                        -{formatCurrency(totalOut)}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                                      <span style={{ fontWeight: 800, color: '#0f172a' }}>صافي النقدية المتوقعة:</span>
                                      <strong style={{ fontWeight: 800, color: '#0284c7' }}>{formatCurrency(dynamicExpectedCash)}</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>النقدية الفعلية (المعدودة):</span>
                                      <strong style={{ color: '#0f172a' }}>{formatCurrency(row.countedCash || 0)}</strong>
                                    </div>
                                    {(() => {
                                      const expectedCard = Number(row.cardSalesTotal || 0) + Number(row.serviceCardTotal || 0) - Number(row.saleReturnCardRefundTotal || 0);
                                      const cardDiff = Number(row.declaredCardTotal || 0) - expectedCard;
                                      const walletDiff = Number(row.declaredWalletTotal || 0) - Number(row.walletSalesTotal || 0);
                                      const instapayDiff = Number(row.declaredInstapayTotal || 0) - Number(row.instapaySalesTotal || 0);
                                      const electronicDiff = cardDiff + walletDiff + instapayDiff;
                                      const hasElectronicDeclarations = row.declaredCardTotal != null || row.declaredWalletTotal != null || row.declaredInstapayTotal != null;

                                      if (hasElectronicDeclarations && Math.abs(electronicDiff) > 0.009) {
                                        return (
                                          <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: '#64748b' }}>فارق نقدية الدرج:</span>
                                              <strong>{renderVarianceBadge(dynamicVariance)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                              <span style={{ color: '#64748b' }}>فارق الإلكتروني (فيزا/محافظ):</span>
                                              <strong>{renderVarianceBadge(electronicDiff)}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1.5px solid #cbd5e1', paddingTop: '4px', marginTop: '2px' }}>
                                              <span style={{ fontWeight: 800, color: '#0f172a' }}>إجمالي فارق الوردية النهائي:</span>
                                              <strong>{renderVarianceBadge(dynamicVariance + electronicDiff)}</strong>
                                            </div>
                                          </>
                                        );
                                      }

                                      return (
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                          <span style={{ color: '#64748b' }}>الفارق النهائي (عجز / زيادة):</span>
                                          <strong>{renderVarianceBadge(dynamicVariance)}</strong>
                                        </div>
                                      );
                                    })()}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                                      <span style={{ color: '#64748b' }}>تاريخ الإغلاق:</span>
                                      <strong style={{ color: '#334155' }}>{row.closedAt ? formatDate(row.closedAt) : 'مفتوحة حاليًا'}</strong>
                                    </div>
                                    {row.closedByName ? (
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>أُغلقت بواسطة:</span>
                                        <strong style={{ color: '#334155' }}>{row.closedByName}</strong>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Card 4: Notes & Manager Approval */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileTextIcon size={16} /> الملاحظات والاعتماد
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                <div>
                                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>ملاحظة الافتتاح:</span>
                                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{row.openingNote || '—'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>ملاحظة الإغلاق:</span>
                                  <span style={{ color: '#1e293b', fontWeight: 500 }}>{row.closeNote || '—'}</span>
                                </div>
                                {row.closedByName && row.openedByName && row.closedByName.trim().toLowerCase() !== row.openedByName.trim().toLowerCase() ? (
                                  <div style={{ borderTop: '1px dashed #f59e0b', paddingTop: '6px', marginTop: '2px', background: '#fffbeb', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                    <span style={{ color: '#b45309', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', fontWeight: 700 }}>
                                      <AlertTriangleIcon size={14} color="#b45309" /> إغلاق إداري:
                                    </span>
                                    <span style={{ color: '#92400e', fontWeight: 600 }}>
                                      تم إغلاق الوردية بواسطة ({row.closedByName})
                                    </span>
                                  </div>
                                ) : null}
                                {row.managerReviewedByName ? (
                                  <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '4px' }}>
                                    <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>اعتماد ومراجعة المدير:</span>
                                    <span style={{ color: '#065f46', fontWeight: 700 }}>
                                      {row.managerReviewedByName} {row.managerReviewNote ? `(${row.managerReviewNote})` : ''}
                                    </span>
                                  </div>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => printCashDrawerShiftReceipt(row)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    background: '#0f172a',
                                    color: '#ffffff',
                                    border: 'none',
                                    fontWeight: 700,
                                    fontSize: '0.84rem',
                                    cursor: 'pointer',
                                    marginTop: '8px',
                                    transition: 'opacity 0.15s',
                                  }}
                                >
                                  <PrinterIcon size={16} /> طباعة ريسيت الوردية (Thermal 80mm)
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ); })()}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <PaginationControls
          page={props.page}
          totalPages={totalPages}
          pageSize={props.pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          totalItems={props.totalPaginationItems}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          onPageChange={props.onPageChange}
          onPageSizeChange={props.onPageSizeChange}
          itemLabel="وردية نقطة بيع"
        />
      </QueryFeedback>
    </Card>
  );
}
