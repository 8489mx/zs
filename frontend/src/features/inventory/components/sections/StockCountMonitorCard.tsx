import { useEffect, useMemo, useRef } from 'react';
import { FormSection } from '@/shared/components/form-section';
import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import { Field } from '@/shared/ui/field';
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
}

export function StockCountMonitorCard({
  canReviewStock,
  isLoading,
  isError,
  error,
  stockCountSessions,
  damagedRecords,
  sessionTotalItems,
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  selectedSession,
  selectedSessionTotals,
  sessionFilter,
  postingPin,
  postPending,
  postError,
  postSuccess,
  transferSuccess,
  transferError,
  onSessionFilterChange,
  onPostingPinChange,
  onSelectSession,
  onPostSession,
  onCopySessionDetails,
  onPrintCountSessions,
  onPrintDamagedRecords,
  onExportDamagedCsv,
  onPrintSession,
  selectedSessionIds = [],
  onSelectedSessionIdsChange,
  onPostSelectedSessions,
}: StockCountMonitorCardProps) {
  const detailPanelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!selectedSession) return;
    window.requestAnimationFrame(() => {
      detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    });
  }, [selectedSession]);

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
      title="جلسات الجرد"
      description="مراجعة جلسات الجرد قبل الاعتماد مع عرض واضح للحالة والبنود والفروقات."
      actions={(
        <div className="actions compact-actions">
          <Button variant="secondary" onClick={onPrintCountSessions} disabled={!stockCountSessions.length}>طباعة الجلسات</Button>
          <Button variant="secondary" onClick={onPrintDamagedRecords} disabled={!damagedRecords.length}>طباعة التالف</Button>
          <Button variant="secondary" onClick={onExportDamagedCsv} disabled={!damagedRecords.length}>تصدير التالف</Button>
          <span className="nav-pill">{sessionTotalItems} جلسة</span>
        </div>
      )}
    >
      {canReviewStock ? (
        <Field label="كود اعتماد الجلسة">
          <input
            type="password"
            value={postingPin}
            onChange={(e) => onPostingPinChange(e.target.value)}
            placeholder="يستخدم عند اعتماد أي جلسة"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </Field>
      ) : (
        <div className="surface-note" style={{ marginBottom: 12 }}>
          وضع العد المخفي مفعل لهذا المستخدم لضمان عد فعلي بدون التأثر برصيد النظام.
        </div>
      )}

      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!stockCountSessions.length && !damagedRecords.length}
        loadingText="جاري تحميل جلسات الجرد..."
        emptyTitle="لا توجد جلسات جرد حتى الآن"
        emptyHint="ابدأ بإضافة بنود الجرد ثم إنشاء جلسة جديدة."
      >
        <div className="filter-chip-row">
          <Button type="button" variant={sessionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('all')}>الكل</Button>
          <Button type="button" variant={sessionFilter === 'draft' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('draft')}>مسودة</Button>
          <Button type="button" variant={sessionFilter === 'posted' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('posted')}>معتمد</Button>
        </div>

        <div className="inventory-master-detail inventory-master-detail-wide">
          <div className="section-stack detail-table-panel">
            {canReviewStock && selectedSessionIds.length ? (
              <div className="bulk-toolbar">
                <strong>تم تحديد {selectedSessionIds.length} جلسة</strong>
                <div className="actions compact-actions">
                  {onPostSelectedSessions ? <Button type="button" variant="primary" onClick={onPostSelectedSessions} disabled={postPending}>اعتماد المحدد</Button> : null}
                  <Button type="button" variant="secondary" onClick={() => onSelectedSessionIdsChange?.([])}>إلغاء التحديد</Button>
                </div>
              </div>
            ) : null}

            <DataTable
              rows={stockCountSessions}
              rowKey={(session) => String(session.id)}
              onRowClick={(session) => onSelectSession(String(session.id))}
              rowClassName={(session) => String(selectedSession?.id || '') === String(session.id) ? 'table-row-selected' : undefined}
              rowTitle={(session) => `فتح جلسة الجرد ${session.docNo || session.id}`}
              density="compact"
              selection={tableSelection}
              pagination={{ page, pageSize, onPageChange, onPageSizeChange, totalItems, itemLabel: 'جلسة' }}
              columns={[
                {
                  key: 'doc',
                  header: 'الجلسة',
                  cell: (session) => (
                    <div>
                      <strong>{session.docNo || session.id}</strong>
                      <div className="muted small">{formatDate(session.createdAt)} · {session.locationName || '—'}</div>
                      <div className="muted small">تم العد بواسطة: {session.countedBy || '—'}</div>
                    </div>
                  ),
                },
                { key: 'status', header: 'الحالة', cell: (session) => <span className="nav-pill">{getSessionStatusLabel(session.status)}</span> },
                {
                  key: 'summary',
                  header: 'ملخص المراجعة',
                  cell: (session) => {
                    const summary = summarizeSessionVariance(session);
                    return (
                      <div className="muted small">
                        <div>عدد البنود: {summary.itemsCount}</div>
                        {canReviewStock ? <><div>بنود بفروقات: {summary.varianceItemsCount}</div><div>إجمالي الفروقات المطلقة: {summary.totalAbsoluteVariance}</div></> : null}
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'إجراءات',
                  cell: (session) => {
                    const summary = summarizeSessionVariance(session);
                    return (
                      <div className="actions compact-actions">
                        <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onSelectSession(String(session.id)); }}>التفاصيل</Button>
                        {canReviewStock && session.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(session.id)} disabled={postPending} idleText="اعتماد الجلسة" pendingText="جارٍ الاعتماد..." /> : null}
                        {canReviewStock && session.status === 'posted' ? <span className="muted small">تم اعتماد الجلسة</span> : null}
                        {!canReviewStock ? <span className="muted small">بانتظار مراجعة مخول</span> : null}
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
                  <div><h3 className="detail-panel-title">{selectedSession.docNo || selectedSession.id}</h3><div className="detail-panel-subtitle">مراجعة مفصلة لبنود الجرد قبل الاعتماد.</div></div>
                  <span className="nav-pill">{getSessionStatusLabel(selectedSession.status)}</span>
                </div>

                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-label">المخزن</div><div className="detail-value">{selectedSession.locationName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">الفرع</div><div className="detail-value">{selectedSession.branchName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">عدد البنود</div><div className="detail-value">{selectedSessionTotals.itemsCount}</div></div>
                  <div className="detail-item"><div className="detail-label">تم العد بواسطة</div><div className="detail-value">{selectedSession.countedBy || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">تاريخ الإنشاء</div><div className="detail-value">{formatDate(selectedSession.createdAt)}</div></div>
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">إجمالي المتوقع</div><div className="detail-value">{selectedSessionTotals.expectedQty}</div></div> : null}
                  <div className="detail-item"><div className="detail-label">إجمالي المعدود</div><div className="detail-value">{selectedSessionTotals.countedQty}</div></div>
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">الفرق الكلي</div><div className={`detail-value ${quantityTone(selectedSessionTotals.varianceQty)}`}>{selectedSessionTotals.varianceQty}</div></div> : null}
                  {canReviewStock ? <div className="detail-item"><div className="detail-label">اعتمده</div><div className="detail-value">{selectedSession.approvedBy || '—'}</div></div> : null}
                </div>

                {canReviewStock && selectedSummary?.hasVariance ? <div className="surface-note" style={{ background: 'rgba(245, 158, 11, 0.08)', borderColor: 'rgba(245, 158, 11, 0.2)' }}>توجد فروقات في هذه الجلسة. راجع البنود قبل اعتماد الجلسة.</div> : null}
                {canReviewStock && !selectedSummary?.hasVariance ? <div className="success-box">لا توجد فروقات في هذه الجلسة.</div> : null}
                <div className="surface-note">{selectedSession.note || 'لا توجد ملاحظات مسجلة على جلسة الجرد.'}</div>

                <div className="detail-table-wrap">
                  {(selectedSession.items || []).length ? (
                    canReviewStock ? (
                      <table><thead><tr><th>الصنف</th><th>المتوقع</th><th>المعدود</th><th>الفرق</th><th>السبب</th></tr></thead><tbody>{(selectedSession.items || []).map((item) => { const variance = Number(item.varianceQty || 0); const hasVariance = Math.abs(variance) > 0; return <tr key={item.id || `${selectedSession.id}-${item.productId}`} style={hasVariance ? { background: 'rgba(245, 158, 11, 0.08)' } : undefined}><td>{item.productName || '—'}</td><td>{item.expectedQty}</td><td>{item.countedQty}</td><td><span className={`delta-chip ${quantityTone(variance)}`}>{variance > 0 ? '+' : ''}{item.varianceQty}</span></td><td>{item.reason || '—'}</td></tr>; })}</tbody></table>
                    ) : (
                      <table><thead><tr><th>الصنف</th><th>المعدود</th><th>السبب</th></tr></thead><tbody>{(selectedSession.items || []).map((item) => <tr key={item.id || `${selectedSession.id}-${item.productId}`}><td>{item.productName || '—'}</td><td>{item.countedQty}</td><td>{item.reason || '—'}</td></tr>)}</tbody></table>
                    )
                  ) : <EmptyState title="لا توجد بنود مسجلة في هذه الجلسة." />}
                </div>

                {canReviewStock ? <div className="surface-note">بعد الاعتماد سيتم إنشاء حركات تسوية للمخزون حسب الفروقات.</div> : <div className="surface-note">هذه الجلسة بانتظار مراجعة مستخدم لديه صلاحية اعتماد/تسوية المخزون.</div>}
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={onCopySessionDetails}>نسخ التفاصيل</Button>
                  <Button variant="secondary" onClick={() => onPrintSession(selectedSession)}>طباعة الجلسة</Button>
                  {canReviewStock && selectedSession.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(selectedSession.id)} disabled={postPending} idleText="اعتماد الجلسة" pendingText="جارٍ الاعتماد..." /> : null}
                  {canReviewStock && selectedSession.status === 'posted' ? <span className="muted small">تم اعتماد الجلسة</span> : null}
                </div>
              </div>
            ) : <EmptyState title="اختر جلسة جرد لعرض التفاصيل" hint="عند تحديد جلسة ستظهر البنود والملخص هنا." />}
          </div>
        </div>
      </QueryFeedback>

      <MutationFeedback isError={Boolean(transferError) || Boolean(postError)} isSuccess={transferSuccess || postSuccess} error={transferError || postError} errorFallback="تعذر تنفيذ العملية" successText="تم تنفيذ العملية بنجاح." />
    </FormSection>
  );
}
