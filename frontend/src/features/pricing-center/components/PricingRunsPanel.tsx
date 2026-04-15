import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DataTable } from '@/shared/ui/data-table';
import { formatDate } from '@/lib/format';
import type { PricingRun } from '@/shared/api/pricing.api';
import { summarizeRun } from '@/features/pricing-center/lib/pricing-center.utils';
interface Props { runs: PricingRun[]; canEditPrice: boolean; isUndoPending: boolean; onUndo: (runId: number) => void; }
export function PricingRunsPanel({ runs, canEditPrice, isUndoPending, onUndo }: Props) { return <Card title="سجل موجات التسعير" description="يمكن التراجع فقط عن آخر موجة مطبقة حتى لا يتداخل التاريخ السعري."><DataTable density="compact" rows={runs} rowKey={(row) => String(row.id)} columns={[{ key: 'id', header: '#', cell: (row) => row.id },{ key: 'createdAt', header: 'التاريخ', cell: (row) => formatDate(row.createdAt) },{ key: 'createdBy', header: 'بواسطة', cell: (row) => row.createdBy },{ key: 'operation', header: 'العملية', cell: (row) => summarizeRun(row) },{ key: 'affected', header: 'أصناف متأثرة', cell: (row) => row.affectedCount },{ key: 'status', header: 'الحالة', cell: (row) => row.undoneAt ? `تم التراجع ${formatDate(row.undoneAt)}` : row.status },{ key: 'actions', header: 'إجراءات', cell: (row) => <Button variant="secondary" onClick={() => onUndo(row.id)} disabled={!canEditPrice || !row.canUndo || isUndoPending}>تراجع</Button> }]} empty={<div className="empty-state"><p>لا توجد موجات تسعير مسجلة بعد.</p></div>} /></Card>; }
