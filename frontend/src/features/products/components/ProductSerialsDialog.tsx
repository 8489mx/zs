import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { productSerialsApi, type ProductSerialItem } from '../api/product-serials.api';
import type { Product } from '@/types/domain';

interface ProductSerialsDialogProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
}

export function ProductSerialsDialog({ open, product, onClose }: ProductSerialsDialogProps) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [bulkInput, setBulkInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data: serials = [], isLoading, refetch } = useQuery<ProductSerialItem[]>({
    queryKey: ['product-serials', product?.id, filterStatus],
    queryFn: () => product ? productSerialsApi.listByProduct(product.id, filterStatus === 'all' ? undefined : filterStatus) : Promise.resolve([]),
    enabled: Boolean(open && product?.id),
  });

  const addMutation = useMutation({
    mutationFn: async (serialNumbers: string[]) => {
      if (!product?.id) return;
      const serialRows = serialNumbers.map((s) => ({
        serialNumber: s,
        costPrice: Number(product.costPrice || 0),
      }));
      return productSerialsApi.addSerials(product.id, serialRows);
    },
    onSuccess: (res: any) => {
      setBulkInput('');
      setIsAdding(false);
      setFeedback(`تم إضافة ${res?.addedCount || 0} رقم سيريال/IMEI بنجاح.`);
      void refetch();
      void queryClient.invalidateQueries({ queryKey: ['product-serials'] });
    },
    onError: (err: any) => {
      setFeedback(err?.message || 'حدث خطأ أثناء إضافة السيريالات');
    },
  });

  useEffect(() => {
    if (open) {
      setFeedback(null);
      setBulkInput('');
      setIsAdding(false);
    }
  }, [open]);

  if (!open || !product) return null;

  const handleAddSerials = () => {
    const list = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.length) return;
    addMutation.mutate(list);
  };

  const inStockCount = serials.filter((s) => s.status === 'in_stock').length;
  const soldCount = serials.filter((s) => s.status === 'sold').length;

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel={`إدارة أرقام السيريال: ${product.name}`}>
      <div className="page-stack" dir="rtl" style={{ gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
          📱 إدارة أرقام السيريال والـ IMEI: {product.name}
        </h3>

        {/* Quick Stats Banner */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#166534', fontWeight: 600 }}>المتاح في المخزن</div>
            <strong style={{ fontSize: '1.4rem', color: '#15803d' }}>{inStockCount}</strong>
          </div>
          <div style={{ background: '#eff6ff', padding: '12px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#1e40af', fontWeight: 600 }}>المباع</div>
            <strong style={{ fontSize: '1.4rem', color: '#2563eb' }}>{soldCount}</strong>
          </div>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>إجمالي المسجل</div>
            <strong style={{ fontSize: '1.4rem', color: '#0f172a' }}>{serials.length}</strong>
          </div>
        </div>

        {/* Feedback alert */}
        {feedback && (
          <div style={{ padding: '10px 14px', borderRadius: '6px', background: feedback.includes('نجاح') ? '#dcfce7' : '#fee2e2', color: feedback.includes('نجاح') ? '#166534' : '#991b1b', fontSize: '0.9rem' }}>
            {feedback}
          </div>
        )}

        {/* Actions Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('all')}
            >
              الكل ({serials.length})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'in_stock' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('in_stock')}
            >
              المتاح بالمخزن
            </button>
            <button
              type="button"
              className={`btn btn-sm ${filterStatus === 'sold' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterStatus('sold')}
            >
              المباع
            </button>
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsAdding(!isAdding)}
          >
            {isAdding ? 'إلغاء الإضافة' : '+ إضافة سيريالات / IMEI جديدة'}
          </Button>
        </div>

        {/* Bulk Add Box */}
        {isAdding && (
          <div style={{ padding: '16px', background: '#faf5ff', borderRadius: '8px', border: '1px solid #e9d5ff' }}>
            <label style={{ display: 'block', fontWeight: 600, color: '#6b21a8', marginBottom: '6px' }}>
              أدخل أرقام الـ IMEI / السيريال (رقم في كل سطر أو مفصولة بفواصل):
            </label>
            <textarea
              dir="ltr"
              rows={4}
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              placeholder="354892019283741&#10;354892019283742&#10;354892019283743"
              style={{ width: '100%', fontFamily: 'monospace', padding: '8px', borderRadius: '6px', border: '1px solid #d8b4fe' }}
              disabled={addMutation.isPending}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <Button
                variant="primary"
                onClick={handleAddSerials}
                disabled={addMutation.isPending || !bulkInput.trim()}
              >
                {addMutation.isPending ? 'جارٍ الإضافة...' : 'حفظ السيريالات'}
              </Button>
            </div>
          </div>
        )}

        {/* Serials Table */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
          {isLoading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>جاري تحميل أرقام السيريال...</div>
          ) : serials.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
              لا توجد أرقام سيريال مسجلة لهذا الصنف حتى الآن.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                  <th style={{ padding: '8px 12px' }}>#</th>
                  <th style={{ padding: '8px 12px' }}>رقم السيريال / IMEI</th>
                  <th style={{ padding: '8px 12px' }}>الحالة</th>
                  <th style={{ padding: '8px 12px' }}>فاتورة البيع / العميل</th>
                  <th style={{ padding: '8px 12px' }}>فاتورة الشراء / المورد</th>
                  <th style={{ padding: '8px 12px' }}>الموقع / الفرع</th>
                </tr>
              </thead>
              <tbody>
                {serials.map((s, idx) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 12px', color: '#94a3b8' }}>{idx + 1}</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>
                      {s.serialNumber}
                      {s.imei2 ? <span style={{ color: '#64748b', fontSize: '0.75rem', display: 'block' }}>IMEI 2: {s.imei2}</span> : null}
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: s.status === 'in_stock' ? '#dcfce7' : s.status === 'sold' ? '#dbeafe' : '#f1f5f9',
                          color: s.status === 'in_stock' ? '#166534' : s.status === 'sold' ? '#1e40af' : '#475569',
                        }}
                      >
                        {s.status === 'in_stock' ? '🟢 متاح بالمخزن' : s.status === 'sold' ? '🔵 تم البيع' : s.status === 'returned' ? '🟠 مرتجع' : s.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                      {s.saleDocNo ? (
                        <div>
                          <strong>{s.saleDocNo}</strong>
                          {s.customerName ? <div style={{ color: '#64748b' }}>{s.customerName}</div> : null}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '0.8rem' }}>
                      {s.purchaseDocNo ? (
                        <div>
                          <strong>{s.purchaseDocNo}</strong>
                          {s.supplierName ? <div style={{ color: '#64748b' }}>{s.supplierName}</div> : null}
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: '0.8rem', color: '#64748b' }}>
                      {s.locationName || s.branchName || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Dialog Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
