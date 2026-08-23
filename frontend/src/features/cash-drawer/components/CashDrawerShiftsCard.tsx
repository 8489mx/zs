import React, { useState } from 'react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { CreditCardIcon, RefreshCwIcon, ScaleIcon, FileTextIcon, AlertTriangleIcon } from '@/shared/components/icons/AppIcons';
import { SearchToolbar } from '@/shared/components/search-toolbar';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { PaginationControls } from '@/shared/components/pagination-controls';
import { formatCurrency, formatDate } from '@/lib/format';
import { SINGLE_STORE_MODE } from '@/config/product-scope';
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
  if (variance === 0) {
    return <span style={{ color: '#64748b', fontWeight: 600 }}>0.00 ج.م</span>;
  }
  if (variance > 0) {
    return (
      <span style={{ color: '#16a34a', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
        +{formatCurrency(variance)}
      </span>
    );
  }
  return (
    <span style={{ color: '#dc2626', fontWeight: 700, direction: 'ltr', display: 'inline-block' }}>
      -{formatCurrency(Math.abs(variance))}
    </span>
  );
}

export function CashDrawerShiftsCard(props: CashDrawerShiftsCardProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const canViewSensitiveTotals = props.canViewSensitiveTotals !== false;
  const canReviewPending = props.canReviewPending === true && typeof props.onReviewShift === 'function';
  const searchPlaceholder = SINGLE_STORE_MODE
    ? 'ابحث باسم المستخدم أو رقم المرجع أو المخزن'
    : 'ابحث باسم المستخدم أو رقم المرجع أو الفرع أو المخزن';

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const totalPages = Math.max(1, Math.ceil(props.totalPaginationItems / props.pageSize));
  const rangeStart = (props.page - 1) * props.pageSize + 1;
  const rangeEnd = Math.min(props.page * props.pageSize, props.totalPaginationItems);

  return (
    <Card
      title="ورديات نقطة البيع الحالية"
      actions={canViewSensitiveTotals ? (
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={props.onCopySummary} disabled={!props.totalItems}>نسخ الملخص</Button>
          <Button variant="secondary" onClick={props.onExportRows} disabled={!props.totalItems}>تصدير Excel</Button>
          <Button variant="secondary" onClick={props.onPrintRows} disabled={!props.totalItems}>طباعة النتائج</Button>
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
            في انتظار مراجعة المدير{typeof props.pendingReviewCount === 'number' ? ` (${props.pendingReviewCount})` : ''}
          </Button>
        ) : null}
        <Button variant={props.shiftFilter === 'variance' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('variance')}>بفروقات</Button>
        <Button variant={props.shiftFilter === 'today' ? 'primary' : 'secondary'} onClick={() => props.onShiftFilterChange('today')}>اليوم</Button>
      </div>

      <SearchToolbar search={props.search} onSearchChange={props.onSearchChange} searchPlaceholder={searchPlaceholder}>
        <Button variant="secondary" onClick={props.onReset}>إعادة الضبط</Button>
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
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>الوردية / الكاشير</th>
                {!SINGLE_STORE_MODE && <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>الفرع والمخزن</th>}
                {SINGLE_STORE_MODE && <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>المخزن</th>}
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>الحالة</th>
                <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>رصيد الفتح</th>
                {canViewSensitiveTotals && <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>إجمالي المبيعات</th>}
                {canViewSensitiveTotals && <th style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>الفرق</th>}
                <th style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 700, color: '#334155', width: '170px' }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {props.rows.map((row) => {
                const isExpanded = Boolean(expandedIds[row.id]);
                const isPending = String(row.status || '') === 'pending_review';

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      onClick={() => { if (canViewSensitiveTotals) toggleExpand(row.id); }}
                      style={{
                        cursor: canViewSensitiveTotals ? 'pointer' : 'default',
                        borderBottom: isExpanded ? 'none' : '1px solid #f1f5f9',
                        background: isExpanded ? '#f8fafc' : '#ffffff',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { if (!isExpanded && canViewSensitiveTotals) e.currentTarget.style.background = '#fcfdfe'; }}
                      onMouseLeave={(e) => { if (!isExpanded && canViewSensitiveTotals) e.currentTarget.style.background = '#ffffff'; }}
                    >
                      <td style={{ padding: '14px 16px' }}>
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
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>{row.branchName || 'الفرع الرئيسي'}</span>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{row.locationName || 'المخزن الرئيسي'}</span>
                          </div>
                        </td>
                      )}

                      {SINGLE_STORE_MODE && (
                        <td style={{ padding: '14px 16px', color: '#1e293b', fontWeight: 600 }}>
                          {row.locationName || 'المخزن الرئيسي'}
                        </td>
                      )}

                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        {renderStatusBadge(String(row.status || ''))}
                      </td>

                      <td style={{ padding: '14px 16px', fontWeight: 600, color: '#334155' }}>
                        {formatCurrency(row.openingCash)}
                      </td>

                      {canViewSensitiveTotals && (
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(row.shiftSalesTotal || 0)}
                        </td>
                      )}

                      {canViewSensitiveTotals && (
                        <td style={{ padding: '14px 16px' }}>
                          {renderVarianceBadge(row.variance)}
                        </td>
                      )}

                      <td style={{ padding: '14px 16px', textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
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
                          ) : null}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && canViewSensitiveTotals && (
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                        <td colSpan={SINGLE_STORE_MODE ? 6 : 7} style={{ padding: '0 16px 20px' }}>
                          <div style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            border: '1px solid #e2e8f0',
                            padding: '20px',
                            boxShadow: '0 4px 12px -2px rgba(0, 0, 0, 0.05)',
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                            gap: '16px',
                          }}>
                            {/* Card 1: Sales breakdown */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <CreditCardIcon size={16} /> مبيعات وطرق الدفع
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
                                  <span style={{ color: '#64748b' }}>إنستاباي:</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.instapaySalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مبيعات آجلة (ذمم):</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.creditSalesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>خدمات سريعة:</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.serviceTotal || (Number(row.serviceCashTotal || 0) + Number(row.serviceCardTotal || 0)))}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a' }}>إجمالي المبيعات:</span>
                                  <strong style={{ fontWeight: 800, color: '#0284c7' }}>{formatCurrency(row.shiftSalesTotal || 0)}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Card 2: Movements & Returns */}
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <RefreshCwIcon size={16} /> الحركات والمسحوبات والمصروفات
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                {Number(row.cashDrawerDeliveryCashInTotal || 0) > 0 ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: '#64748b' }}>توريد وتحصيل مناديب (دليفري):</span>
                                      <strong style={{ color: '#16a34a' }}>+{formatCurrency(row.cashDrawerDeliveryCashInTotal || 0)}</strong>
                                    </div>
                                    {Number(row.cashDrawerManualCashInTotal || 0) > 0 && (
                                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#64748b' }}>إيداعات نقدية أخرى:</span>
                                        <strong style={{ color: '#16a34a' }}>+{formatCurrency(row.cashDrawerManualCashInTotal || 0)}</strong>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>إيداعات نقدية في الدرج:</span>
                                    <strong style={{ color: '#16a34a' }}>+{formatCurrency(row.cashDrawerCashInTotal || 0)}</strong>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مسحوبات نقدية من الدرج:</span>
                                  <strong style={{ color: '#dc2626' }}>-{formatCurrency(row.cashDrawerCashOutTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مصروفات تشغيلية مسجلة:</span>
                                  <strong style={{ color: '#dc2626' }}>-{formatCurrency(row.expensesTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>دفعات وسداد موردين من الدرج:</span>
                                  <strong style={{ color: '#dc2626' }}>-{formatCurrency(row.supplierPaymentsTotal || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>مرتجعات مبيعات نقدية للعملاء:</span>
                                  <strong style={{ color: '#dc2626' }}>-{formatCurrency(row.saleReturnCashRefundTotal || 0)}</strong>
                                </div>
                                {Number(row.saleReturnCardRefundTotal || 0) > 0 && (
                                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>مرتجعات بطاقات (فيزا):</span>
                                    <strong style={{ color: '#64748b' }}>{formatCurrency(row.saleReturnCardRefundTotal || 0)}</strong>
                                  </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
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
                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                              <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', fontWeight: 800, color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ScaleIcon size={16} /> جرد النقدية وإجمالي الدرج
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>رصيد الفتح (العهدة):</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.openingCash)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>(+) مبيعات وخدمات كاش:</span>
                                  <strong style={{ color: '#16a34a' }}>+{formatCurrency(Number(row.cashSalesTotal || 0) + Number(row.serviceCashTotal || 0))}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>(-) خصومات ومنصرفات الدرج:</span>
                                  <strong style={{ color: '#dc2626' }}>
                                    -{formatCurrency(
                                      Number(row.cashDrawerCashOutTotal || 0) +
                                      Number(row.expensesTotal || 0) +
                                      Number(row.supplierPaymentsTotal || 0) +
                                      Number(row.saleReturnCashRefundTotal || 0)
                                    )}
                                  </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #cbd5e1', paddingTop: '6px', marginTop: '2px' }}>
                                  <span style={{ fontWeight: 800, color: '#0f172a' }}>صافي النقدية بالدرج:</span>
                                  <strong style={{ fontWeight: 800, color: '#0284c7' }}>{formatCurrency(row.expectedCash)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>النقدية الفعلية المعدودة:</span>
                                  <strong style={{ color: '#0f172a' }}>{formatCurrency(row.countedCash || 0)}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: '#64748b' }}>الفرق النهائي:</span>
                                  <strong>{renderVarianceBadge(row.variance)}</strong>
                                </div>
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
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
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
