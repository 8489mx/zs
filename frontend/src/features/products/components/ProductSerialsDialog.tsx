import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { AppIcons } from '@/shared/components/icons/AppIcons';
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
    <StandardDialog
      open={open}
      onClose={onClose}
      title="إدارة أرقام السيريال والـ IMEI (Serial Tracking)"
      subtitle={`${product.name} · تتبع حركة الأجهزة وتواريخ البيع والشراء`}
      maxWidth="860px"
      footerActions={
        <StandardDialogFooter
          cancelText="إغلاق"
          onCancel={onClose}
        />
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }} dir="rtl">
        {/* 1. مؤشرات المخزون وحالة السيريالات */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
            <AppIcons.Layers size={15} />
            <span>1. ملخص أرصدة السيريالات الحالية (Serial Status Overview)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>المتاح في المخزن</div>
              <strong style={{ fontSize: '1.25rem', color: '#15803d' }}>{inStockCount}</strong>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#1e40af', fontWeight: 600 }}>المباع للعملاء</div>
              <strong style={{ fontSize: '1.25rem', color: '#2563eb' }}>{soldCount}</strong>
            </div>
            <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
              <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>إجمالي المسجل</div>
              <strong style={{ fontSize: '1.25rem', color: '#0f172a' }}>{serials.length}</strong>
            </div>
          </div>
        </div>

        {/* 2. إضافة سيريالات جديدة */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isAdding ? '10px' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Plus size={15} />
              <span>2. تسجيل أرقام تسلسلية جديدة (Bulk Serial Entry)</span>
            </div>
            <Button
              variant={isAdding ? 'secondary' : 'primary'}
              onClick={() => setIsAdding(!isAdding)}
              style={{ fontSize: '0.78rem', padding: '4px 12px' }}
            >
              {isAdding ? 'إلغاء الإدخال' : '+ إضافة سيريالات / IMEI'}
            </Button>
          </div>

          {isAdding && (
            <div style={{ marginTop: '10px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155', fontSize: '0.8rem', marginBottom: '6px' }}>
                أدخل أرقام الـ IMEI / السيريال (رقم في كل سطر أو مفصولة بفواصل):
              </label>
              <textarea
                dir="ltr"
                rows={3}
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="354892019283741&#10;354892019283742&#10;354892019283743"
                style={{ width: '100%', fontFamily: 'monospace', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                disabled={addMutation.isPending}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <Button
                  variant="primary"
                  onClick={handleAddSerials}
                  disabled={addMutation.isPending || !bulkInput.trim()}
                >
                  {addMutation.isPending ? 'جارٍ الإضافة...' : 'حفظ السيريالات المدخلة'}
                </Button>
              </div>
            </div>
          )}

          {feedback && (
            <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px', background: feedback.includes('نجاح') ? '#dcfce7' : '#fee2e2', color: feedback.includes('نجاح') ? '#166534' : '#991b1b', fontSize: '0.82rem', fontWeight: 600 }}>
              {feedback}
            </div>
          )}
        </div>

        {/* 3. جدول السيريالات المسجلة */}
        <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#170e5e', fontWeight: 700, fontSize: '0.84rem' }}>
              <AppIcons.Package size={15} />
              <span>3. سجل أرقام السيريال التفصيلي (Serial Log)</span>
            </div>

            <div style={{ display: 'inline-flex', gap: '4px', background: '#e2e8f0', padding: '2px', borderRadius: '6px' }}>
              <button
                type="button"
                style={{
                  padding: '2px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filterStatus === 'all' ? '#170e5e' : 'transparent',
                  color: filterStatus === 'all' ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => setFilterStatus('all')}
              >
                الكل ({serials.length})
              </button>
              <button
                type="button"
                style={{
                  padding: '2px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filterStatus === 'in_stock' ? '#170e5e' : 'transparent',
                  color: filterStatus === 'in_stock' ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => setFilterStatus('in_stock')}
              >
                المتاح بالمخزن ({inStockCount})
              </button>
              <button
                type="button"
                style={{
                  padding: '2px 10px',
                  borderRadius: '4px',
                  border: 'none',
                  background: filterStatus === 'sold' ? '#170e5e' : 'transparent',
                  color: filterStatus === 'sold' ? '#ffffff' : '#475569',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                onClick={() => setFilterStatus('sold')}
              >
                المباع ({soldCount})
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '260px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff' }}>
            {isLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>جاري تحميل أرقام السيريال...</div>
            ) : serials.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
                لا توجد أرقام سيريال مسجلة لهذا الصنف حالياً.
              </div>
            ) : (
              <table className="table" style={{ width: '100%', margin: 0, fontSize: '0.8125rem' }}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>رقم السيريال / IMEI</th>
                    <th>الحالة</th>
                    <th>فاتورة البيع / العميل</th>
                    <th>فاتورة الشراء / المورد</th>
                    <th>الموقع / الفرع</th>
                  </tr>
                </thead>
                <tbody>
                  {serials.map((s, idx) => (
                    <tr key={s.id}>
                      <td style={{ color: '#94a3b8' }}>{idx + 1}</td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, direction: 'ltr', textAlign: 'right' }}>
                        {s.serialNumber}
                        {s.imei2 ? <span style={{ color: '#64748b', fontSize: '0.72rem', display: 'block' }}>IMEI 2: {s.imei2}</span> : null}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            background: s.status === 'in_stock' ? '#dcfce7' : s.status === 'sold' ? '#dbeafe' : '#fef3c7',
                            color: s.status === 'in_stock' ? '#166534' : s.status === 'sold' ? '#1e40af' : '#92400e',
                          }}
                        >
                          <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.status === 'in_stock' ? '#16a34a' : s.status === 'sold' ? '#2563eb' : '#d97706' }} />
                          {s.status === 'in_stock' ? 'متاح بالمخزن' : s.status === 'sold' ? 'تم البيع' : s.status === 'returned' ? 'مرتجع' : s.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        {s.saleDocNo ? (
                          <div>
                            <strong>{s.saleDocNo}</strong>
                            {s.customerName ? <div style={{ color: '#64748b' }}>{s.customerName}</div> : null}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem' }}>
                        {s.purchaseDocNo ? (
                          <div>
                            <strong>{s.purchaseDocNo}</strong>
                            {s.supplierName ? <div style={{ color: '#64748b' }}>{s.supplierName}</div> : null}
                          </div>
                        ) : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        {s.locationName || s.branchName || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </StandardDialog>
  );
}
