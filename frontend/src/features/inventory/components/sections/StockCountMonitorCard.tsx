import { Card } from '@/shared/ui/card';
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

interface StockCountMonitorCardProps {
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
  return (
    <Card title="جلسات الجرد" description="عرض جدولي قابل للترقيم للجلسات مع لوحة تفصيل جلسة الجرد نفسها: البنود والفروقات والإجماليات ونقطة الاعتماد." actions={<div className="actions compact-actions"><Button variant="secondary" onClick={onPrintCountSessions} disabled={!stockCountSessions.length}>طباعة الجلسات</Button><Button variant="secondary" onClick={onPrintDamagedRecords} disabled={!damagedRecords.length}>طباعة التالف</Button><Button variant="secondary" onClick={onExportDamagedCsv} disabled={!damagedRecords.length}>تصدير التالف</Button><span className="nav-pill">{sessionTotalItems} جلسة</span></div>}>
      <Field label="كود اعتماد الجلسة">
        <input type="password" value={postingPin} onChange={(e) => onPostingPinChange(e.target.value)} placeholder="يستخدم عند اعتماد أي جلسة" />
      </Field>
      <QueryFeedback
        isLoading={isLoading}
        isError={isError}
        error={error}
        isEmpty={!stockCountSessions.length && !damagedRecords.length}
        loadingText="جاري تحميل الجلسات والتالف..."
        emptyTitle="لا توجد جلسات جرد أو سجلات تالف بعد"
      >
        <div className="filter-chip-row">
          <Button type="button" variant={sessionFilter === 'all' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('all')}>الكل</Button>
          <Button type="button" variant={sessionFilter === 'draft' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('draft')}>مسودة</Button>
          <Button type="button" variant={sessionFilter === 'posted' ? 'primary' : 'secondary'} onClick={() => onSessionFilterChange('posted')}>معتمدة</Button>
        </div>
        <div className="inventory-master-detail inventory-master-detail-wide">
          <div className="section-stack detail-table-panel">
            {selectedSessionIds.length ? (
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
              selection={{
                selectedKeys: selectedSessionIds,
                onChange: onSelectedSessionIdsChange || (() => {}),
                checkboxLabel: (session) => `تحديد جلسة ${session.docNo || session.id}`,
              }}
              pagination={{
                page,
                pageSize,
                onPageChange,
                onPageSizeChange,
                totalItems,
                itemLabel: 'جلسة',
              }}
              columns={[
                {
                  key: 'doc',
                  header: 'الجلسة',
                  cell: (session) => (
                    <div>
                      <strong>{session.docNo || session.id}</strong>
                      <div className="muted small">{session.locationName || '—'} · {formatDate(session.createdAt)}</div>
                    </div>
                  ),
                },
                {
                  key: 'status',
                  header: 'الحالة',
                  cell: (session) => <span className="nav-pill">{session.status || '—'}</span>,
                },
                {
                  key: 'items',
                  header: 'البنود',
                  cell: (session) => (session.items || []).length,
                },
                {
                  key: 'variance',
                  header: 'فرق الجلسة',
                  cell: (session) => {
                    const variance = Number((session.items || []).reduce((sum, item) => sum + Number(item.varianceQty || 0), 0).toFixed(3));
                    return <span className={`delta-chip ${quantityTone(variance)}`}>{variance > 0 ? '+' : ''}{variance}</span>;
                  },
                },
                {
                  key: 'actions',
                  header: 'إجراءات',
                  cell: (session) => (
                    <div className="actions compact-actions">
                      <Button type="button" variant="secondary" onClick={(event) => { event.stopPropagation(); onSelectSession(String(session.id)); }}>التفاصيل</Button>
                      {session.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(session.id)} disabled={postPending} idleText="اعتماد" pendingText="جارٍ الاعتماد..." /> : null}
                    </div>
                  ),
                },
              ]}
            />
          </div>
          <div className="detail-panel">
            {selectedSession ? (
              <div className="section-stack">
                <div className="detail-panel-header">
                  <div>
                    <h3 className="detail-panel-title">{selectedSession.docNo || selectedSession.id}</h3>
                    <div className="detail-panel-subtitle">لوحة تفصيل جلسة الجرد: إجماليات الفرق، البنود المعدودة، وسياق الاعتماد.</div>
                  </div>
                  <span className="nav-pill">{selectedSession.status || '—'}</span>
                </div>
                <div className="detail-grid">
                  <div className="detail-item"><div className="detail-label">الموقع</div><div className="detail-value">{selectedSession.locationName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">الفرع</div><div className="detail-value">{selectedSession.branchName || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">عدد البنود</div><div className="detail-value">{selectedSessionTotals.itemsCount}</div></div>
                  <div className="detail-item"><div className="detail-label">إجمالي المتوقع</div><div className="detail-value">{selectedSessionTotals.expectedQty}</div></div>
                  <div className="detail-item"><div className="detail-label">إجمالي المعدود</div><div className="detail-value">{selectedSessionTotals.countedQty}</div></div>
                  <div className="detail-item"><div className="detail-label">الفرق الكلي</div><div className={`detail-value ${quantityTone(selectedSessionTotals.varianceQty)}`}>{selectedSessionTotals.varianceQty}</div></div>
                  <div className="detail-item"><div className="detail-label">تم العد بواسطة</div><div className="detail-value">{selectedSession.countedBy || '—'}</div></div>
                  <div className="detail-item"><div className="detail-label">اعتمده</div><div className="detail-value">{selectedSession.approvedBy || '—'}</div></div>
                </div>
                <div className="surface-note">{selectedSession.note || 'لا توجد ملاحظات مسجلة على جلسة الجرد.'}</div>
                <div className="detail-table-wrap">
                  <table>
                    <thead><tr><th>الصنف</th><th>المتوقع</th><th>المعدود</th><th>الفرق</th><th>السبب</th></tr></thead>
                    <tbody>{(selectedSession.items || []).map((item) => <tr key={item.id || `${selectedSession.id}-${item.productId}`}><td>{item.productName || '—'}</td><td>{item.expectedQty}</td><td>{item.countedQty}</td><td><span className={`delta-chip ${quantityTone(Number(item.varianceQty || 0))}`}>{Number(item.varianceQty || 0) > 0 ? '+' : ''}{item.varianceQty}</span></td><td>{item.reason || '—'}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="actions compact-actions">
                  <Button variant="secondary" onClick={onCopySessionDetails}>نسخ التفاصيل</Button>
                  <Button variant="secondary" onClick={() => onPrintSession(selectedSession)}>طباعة الجلسة</Button>
                  {selectedSession.status === 'draft' && onPostSession ? <SubmitButton type="button" onClick={() => onPostSession(selectedSession.id)} disabled={postPending} idleText="اعتماد من اللوحة" pendingText="جارٍ الاعتماد..." /> : null}
                </div>
              </div>
            ) : <EmptyState title="اختر جلسة جرد لعرض التفاصيل" hint="عند تحديد جلسة ستظهر البنود والفروقات والإجماليات هنا." />}
          </div>
        </div>
      </QueryFeedback>
      <MutationFeedback isError={Boolean(transferError) || Boolean(postError)} isSuccess={transferSuccess || postSuccess} error={transferError || postError} errorFallback="تعذر تنفيذ العملية" successText="تم تنفيذ العملية بنجاح." />
    </Card>
  );
}
