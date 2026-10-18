import { useTranslation } from 'react-i18next';
import { useMemo, useRef } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { DataTable } from '@/shared/ui/data-table';
import { QueryFeedback } from '@/shared/components/query-feedback';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { SubmitButton } from '@/shared/components/submit-button';
import { formatDate } from '@/lib/format';
import type { DamagedStockRecord, StockCountSession } from '@/types/domain';
import { quantityTone } from '@/features/inventory/components/sections/InventoryMonitorCards.shared';
import { getSessionStatusLabel, summarizeSessionVariance } from '@/features/inventory/components/sections/stockCountMonitor.helpers';

interface StockCountMonitorCardProps {
  canReviewStock: boolean;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  stockCountSessions: StockCountSession[];
  damagedRecords: DamagedStockRecord[];
  sessionTotalItems: number;
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  selectedSession: StockCountSession | null;
  selectedSessionTotals: { itemsCount: number; expectedQty: number; countedQty: number; varianceQty: number };
  sessionFilter: 'all' | 'draft' | 'posted';
  postingPin: string;
  postPending: boolean;
  postError?: unknown;
  postSuccess: boolean;
  transferSuccess: boolean;
  transferError?: unknown;
  onSessionFilterChange: (value: 'all' | 'draft' | 'posted') => void;
  onPostingPinChange: (value: string) => void;
  onSelectSession: (sessionId: string) => void;
  onPostSession?: (sessionId: string) => void;
  onCopySessionDetails: () => void;
  onPrintCountSessions: () => void;
  onPrintDamagedRecords: () => void;
  onExportDamagedCsv: () => void;
  onPrintSession: (session: StockCountSession) => void;
  selectedSessionIds?: string[];
  onSelectedSessionIdsChange?: (ids: string[]) => void;
  onPostSelectedSessions?: () => void;
  onStartNewCount?: () => void;
}

export function StockCountMonitorCard({
  canReviewStock,
  isLoading,
  isError,
  error,
  stockCountSessions,
  damagedRecords: _damagedRecords,
  sessionTotalItems,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  selectedSession,
  selectedSessionTotals,
  sessionFilter,
  postingPin: _postingPin,
  postPending,
  postError,
  postSuccess,
  transferSuccess,
  transferError,
  onSessionFilterChange,
  onPostingPinChange: _onPostingPinChange,
  onSelectSession,
  onPostSession,
  onCopySessionDetails,
  onPrintCountSessions,
  onPrintDamagedRecords: _onPrintDamagedRecords,
  onExportDamagedCsv: _onExportDamagedCsv,
  onPrintSession,
  selectedSessionIds = [],
  onSelectedSessionIdsChange,
  onPostSelectedSessions,
  onStartNewCount,
}: StockCountMonitorCardProps) {
  const { t } = useTranslation();
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  const handleSelectSession = (id: string) => {
    onSelectSession(id);
    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    });
  };

  const selectedSummary = useMemo(
    () => (selectedSession ? summarizeSessionVariance(selectedSession) : null),
    [selectedSession],
  );

  const tableSelection = canReviewStock
    ? {
      selectedKeys: selectedSessionIds,
      onChange: onSelectedSessionIdsChange || (() => {}),
      checkboxLabel: (session: StockCountSession) => `تحديد جلسة ${session.docNo || session.id}`,
    }
    : undefined;

  return (
    <FormSection
      title={t('inventory.sections.stock_count_monitor_card.s0', "سجل جلسات الجرد")}
      description={t('inventory.sections.stock_count_monitor_card.s1', "مراجعة جلسات الجرد السابقة والمسودات وتفاصيل الفروقات والاعتماد.")}
      actions={(
        <div className="actions compact-actions">
          {onStartNewCount ? <Button variant="primary" onClick={onStartNewCount}>{t('inventory.sections.stock_count_monitor_card.s2', "بدء جلسة جديدة")}</Button> : null}
          <Button variant="secondary" onClick={onPrintCountSessions} disabled={!stockCountSessions.length}>{t('inventory.sections.stock_count_monitor_card.s3', "طباعة الجلسات")}</Button>
          <span className="nav-pill">{sessionTotalItems} {t('inventory.sections.stock_count_monitor_card.s4', "جلسة")}</span>
        </div>
      )}
    >
      <div className="stock-count-filter-toolbar">
        <div className="filter-chip-row">
          <Button type="button" variant={sessionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('all')}>{t('inventory.sections.stock_count_monitor_card.s5', "الكل")}</Button>
          <Button type="button" variant={sessionFilter === 'draft' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('draft')}>{t('inventory.sections.stock_count_monitor_card.s6', "مسودة")}</Button>
          <Button type="button" variant={sessionFilter === 'posted' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('posted')}>{t('inventory.sections.stock_count_monitor_card.s7', "معتمد")}</Button>
        </div>
      </div>

      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!stockCountSessions.length}
        loadingText={t('inventory.sections.stock_count_monitor_card.s8', "جاري تحميل جلسات الجرد...")}
        emptyTitle={t('inventory.sections.stock_count_monitor_card.s9', "لا توجد جلسات جرد مسجلة حتى الآن")}
        emptyHint={t('inventory.sections.stock_count_monitor_card.s10', "اضغط على زر (بدء جلسة جرد جديدة) لاختيار المخزن والأصناف وبدء العد.")}
      >

        <div className="inventory-master-detail inventory-master-detail-wide">
          <div className="section-stack detail-table-panel">
            {canReviewStock && selectedSessionIds.length ? (
              <div className="bulk-toolbar">
                <strong>{t('inventory.sections.stock_count_monitor_card.s11', "تم تحديد")} {selectedSessionIds.length} {t('inventory.sections.stock_count_monitor_card.s12', "جلسة")}</strong>
                <div className="actions compact-actions">
                  {onPostSelectedSessions ? <Button type="button" variant="primary" onClick={onPostSelectedSessions} disabled={postPending}>{t('inventory.sections.stock_count_monitor_card.s13', "اعتماد المحدد")}</Button> : null}
                  <Button type="button" variant="secondary" onClick={() => onSelectedSessionIdsChange?.([])}>{t('inventory.sections.stock_count_monitor_card.s14', "إلغاء التحديد")}</Button>
                </div>
              </div>
            ) : null}

            <DataTable
              rows={stockCountSessions}
              rowKey={(session) => String(session.id)}
              onRowClick={(session) => handleSelectSession(String(session.id))}
              rowClassName={(session) => String(selectedSession?.id || '') === String(session.id) ? 'table-row-selected' : undefined}
              rowTitle={(session) => `فتح جلسة الجرد ${session.docNo || session.id}`}
              density="compact"
              selection={tableSelection}
              pagination={{ page, pageSize, onPageChange, onPageSizeChange, totalItems, itemLabel: t('inventory.sections.stock_count_monitor_card.s15', "جلسة") }}
              columns={[
                {
                  key: 'doc',
                  header: t('inventory.sections.stock_count_monitor_card.s16', "الجلسة"),
                  cell: (session) => (
                    <div>
                      <strong>{session.docNo || session.id}</strong>
                      <div className="muted small">{formatDate(session.createdAt)} · {session.locationName || '—'}</div>
                      <div className="muted small">{t('inventory.sections.stock_count_monitor_card.s17', "تم العد بواسطة:")} {session.countedBy || '—'}</div>
                    </div>
                  ),
                },
                { key: 'status', header: t('inventory.sections.stock_count_monitor_card.s18', "الحالة"), cell: (session) => <span className="nav-pill">{getSessionStatusLabel(session.status)}</span> },
                {
                  key: 'summary',
                  header: t('inventory.sections.stock_count_monitor_card.s19', "ملخص المراجعة"),
                  cell: (session) => {
                    const summary = summarizeSessionVariance(session);
                    return (
                      <div className="muted small">
                        <div>{t('inventory.sections.stock_count_monitor_card.s20', "عدد البنود:")} {summary.itemsCount}</div>
                        {canReviewStock ? <><div>{t('inventory.sections.stock_count_monitor_card.s21', "بنود بفروقات:")} {summary.varianceItemsCount}</div><div>{t('inventory.sections.stock_count_monitor_card.s22', "إجمالي الفروقات المطلقة:")} {summary.totalAbsoluteVariance}</div></> : null}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: t('inventory.sections.stock_count_monitor_card.s23', "إجراءات"),
                  cell: (session) => {
                    const summary = summarizeSessionVariance(session);
                    return (
                      <div className="actions compact-actions">
                        <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); handleSelectSession(String(session.id)); }}>{t('inventory.sections.stock_count_monitor_card.s24', "التفاصيل")}</Button>
                        {canReviewStock && session.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(session.id)} disabled={postPending} idleText={t('inventory.sections.stock_count_monitor_card.s25', "اعتماد الجلسة")} pendingText={t('inventory.sections.stock_count_monitor_card.s26', "جارٍ الاعتماد...")} /> : null}
                        {canReviewStock && session.status === 'posted' ? <span className="muted small">{t('inventory.sections.stock_count_monitor_card.s27', "تم اعتماد الجلسة")}</span> : null}
                        {!canReviewStock ? <span className="muted small">{t('inventory.sections.stock_count_monitor_card.s28', "بانتظار مراجعة مخول")}</span> : null}
                        {canReviewStock && summary.hasVariance ? <span className={`delta-chip ${quantityTone(summary.totalVariance)}`}>{summary.totalVariance > 0 ? '+' : ''}{summary.totalVariance}</span> : null}
                      </div>
                    );
                  },
                },
              ]}
            />
          </div>

          <div ref={detailPanelRef} className="detail-panel">
            {selectedSession ? (
              <div className="section-stack">
                <div className="detail-panel-header">
                  <div><h3 className="detail-panel-title">{selectedSession.docNo || selectedSession.id}</h3><div className="detail-panel-subtitle">{t('inventory.sections.stock_count_monitor_card.s29', "مراجعة مفصلة لبنود الجرد قبل الاعتماد.")}</div></div>
                  <span className="nav-pill">{getSessionStatusLabel(selectedSession.status)}</span>
                </div>

                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s30', "المخزن")}</div><div className="detail-value">{selectedSession.locationName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s31', "الفرع")}</div><div className="detail-value">{selectedSession.branchName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s32', "عدد البنود")}</div><div className="detail-value">{selectedSessionTotals.itemsCount}</div></div>
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s33', "تم العد بواسطة")}</div><div className="detail-value">{selectedSession.countedBy || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s34', "تاريخ الإنشاء")}</div><div className="detail-value">{formatDate(selectedSession.createdAt)}</div></div>
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s35', "إجمالي المتوقع")}</div><div className="detail-value">{selectedSessionTotals.expectedQty}</div></div> : null}
                  <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s36', "إجمالي المعدود")}</div><div className="detail-value">{selectedSessionTotals.countedQty}</div></div>
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s37', "الفرق الكلي")}</div><div className={`detail-value ${quantityTone(selectedSessionTotals.varianceQty)}`}>{selectedSessionTotals.varianceQty}</div></div> : null}
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">{t('inventory.sections.stock_count_monitor_card.s38', "اعتمده")}</div><div className="detail-value">{selectedSession.approvedBy || '—'}</div></div> : null}
                </div>

                {canReviewStock && selectedSummary?.hasVariance ? <div className="surface-note" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>{t('inventory.sections.stock_count_monitor_card.s39', "توجد فروقات في هذه الجلسة. راجع البنود قبل اعتماد الجلسة.")}</div> : null}
                {canReviewStock && !selectedSummary?.hasVariance ? <div className="success-box">{t('inventory.sections.stock_count_monitor_card.s40', "لا توجد فروقات في هذه الجلسة.")}</div> : null}
                <div className="surface-note">{selectedSession.note || t('inventory.sections.stock_count_monitor_card.s41', "لا توجد ملاحظات مسجلة على جلسة الجرد.")}</div>

                <details className="detail-table-wrap surface-note" style={{ padding: 0, overflow: 'hidden' }}>
                  <summary style={{ padding: '12px 16px', cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                    {t('inventory.sections.stock_count_monitor_card.s42', "عرض تفاصيل البنود (")}{selectedSessionTotals.itemsCount} {t('inventory.sections.stock_count_monitor_card.s43', "صنف)")}
                  </summary>
                  <div style={{ padding: '0 16px 16px', maxHeight: '500px', overflowY: 'auto' }}>
                    {(selectedSession.items || []).length ? (
                      canReviewStock ? (
                        <table><thead><tr><th>{t('inventory.sections.stock_count_monitor_card.s44', "الصنف")}</th><th>{t('inventory.sections.stock_count_monitor_card.s45', "المتوقع")}</th><th>{t('inventory.sections.stock_count_monitor_card.s46', "المعدود")}</th><th>{t('inventory.sections.stock_count_monitor_card.s47', "الفرق")}</th><th>{t('inventory.sections.stock_count_monitor_card.s48', "السبب")}</th></tr></thead><tbody>{(selectedSession.items || []).map((item) => { const variance = Number(item.varianceQty || 0); const hasVariance = Math.abs(variance) > 0; return <tr key={item.id || `${selectedSession.id}-${item.productId}`} style={hasVariance ? { background: 'rgba(245, 158, 11, 0.08)' } : undefined}><td>{item.productName || '—'}</td><td>{item.expectedQty}</td><td>{item.countedQty}</td><td><span className={`delta-chip ${quantityTone(variance)}`}>{variance > 0 ? '+' : ''}{item.varianceQty}</span></td><td>{item.reason || '—'}</td></tr>; })}</tbody></table>
                      ) : (
                        <table><thead><tr><th>{t('inventory.sections.stock_count_monitor_card.s49', "الصنف")}</th><th>{t('inventory.sections.stock_count_monitor_card.s50', "المعدود")}</th><th>{t('inventory.sections.stock_count_monitor_card.s51', "السبب")}</th></tr></thead><tbody>{(selectedSession.items || []).map((item) => <tr key={item.id || `${selectedSession.id}-${item.productId}`}><td>{item.productName || '—'}</td><td>{item.countedQty}</td><td>{item.reason || '—'}</td></tr>)}</tbody></table>
                      )
                    ) : <EmptyState title={t('inventory.sections.stock_count_monitor_card.s52', "لا توجد بنود مسجلة في هذه الجلسة.")} />}
                  </div>
                </details>

                {canReviewStock ? <div className="surface-note">{t('inventory.sections.stock_count_monitor_card.s53', "بعد الاعتماد سيتم إنشاء حركات تسوية للمخزون حسب الفروقات.")}</div> : <div className="surface-note">{t('inventory.sections.stock_count_monitor_card.s54', "هذه الجلسة بانتظار مراجعة مستخدم لديه صلاحية اعتماد/تسوية المخزون.")}</div>}
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={onCopySessionDetails}>{t('inventory.sections.stock_count_monitor_card.s55', "نسخ التفاصيل")}</Button>
                  <Button variant="secondary" onClick={() => onPrintSession(selectedSession)}>{t('inventory.sections.stock_count_monitor_card.s56', "طباعة الجلسة")}</Button>
                  {canReviewStock && selectedSession.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(selectedSession.id)} disabled={postPending} idleText={t('inventory.sections.stock_count_monitor_card.s57', "اعتماد الجلسة")} pendingText={t('inventory.sections.stock_count_monitor_card.s58', "جارٍ الاعتماد...")} /> : null}
                  {canReviewStock && selectedSession.status === 'posted' ? <span className="muted small">{t('inventory.sections.stock_count_monitor_card.s59', "تم اعتماد الجلسة")}</span> : null}
                </div>
              </div>
            ) : <EmptyState title={t('inventory.sections.stock_count_monitor_card.s60', "اختر جلسة جرد لعرض التفاصيل")} hint={t('inventory.sections.stock_count_monitor_card.s61', "عند تحديد جلسة ستظهر البنود والملخص هنا.")} />}
          </div>
        </div>
      </QueryFeedback>

      <MutationFeedback isError={Boolean(transferError) || Boolean(postError)} isSuccess={transferSuccess || postSuccess} error={transferError || postError} errorFallback={t('inventory.sections.stock_count_monitor_card.s62', "تعذر تنفيذ العملية")} successText={t('inventory.sections.stock_count_monitor_card.s63', "تم تنفيذ العملية بنجاح.")} />
    </FormSection>
  );
}
