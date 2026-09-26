import { useState, useMemo } from 'react';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { CustomSelect } from '@/shared/ui/custom-select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '@/features/products/api/products.api';
import { referenceDataApi } from '@/services/reference-data.api';
import { vanSalesApi } from '../api/van-sales.api';
import type { Product, Location } from '@/types/domain';
import { CheckCircleIcon } from '@/shared/components/icons/AppIcons';

interface DriverLoadRequisitionModalProps {
  open: boolean;
  onClose: () => void;
  onRequisitionSubmitted?: (docNo: string) => void;
}

export function DriverLoadRequisitionModal({
  open,
  onClose,
  onRequisitionSubmitted,
}: DriverLoadRequisitionModalProps) {
  const queryClient = useQueryClient();

  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>('');
  const [cart, setCart] = useState<Array<{ product: Product; qty: number }>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [submittedDocNo, setSubmittedDocNo] = useState<string | null>(null);

  // Fetch warehouses
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['warehouses-list'],
    queryFn: referenceDataApi.locations,
    enabled: open,
    staleTime: 60_000,
  });

  const warehouses = useMemo(() => {
    return locations.filter((l: any) => l.location_type !== 'van_stock');
  }, [locations]);

  // Set default warehouse if none selected
  useMemo(() => {
    if (!sourceWarehouseId && warehouses.length > 0) {
      const primary = warehouses.find((w: any) => w.is_primary) || warehouses[0];
      if (primary) setSourceWarehouseId(String(primary.id));
    }
  }, [warehouses, sourceWarehouseId]);

  // Fetch products catalog
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products-catalog'],
    queryFn: productsApi.list,
    enabled: open,
    staleTime: 60_000,
  });

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q);
      })
      .slice(0, 8);
  }, [products, searchQuery]);

  const handleAddProduct = (product: Product) => {
    const existingIndex = cart.findIndex((item) => String(item.product.id) === String(product.id));
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1 }]);
    }
    setSearchQuery('');
  };

  const handleUpdateQty = (index: number, delta: number) => {
    const updated = [...cart];
    const newQty = updated[index].qty + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].qty = newQty;
    }
    setCart(updated);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!sourceWarehouseId) throw new Error('يرجى اختيار المستودع المصدر');
      if (!cart.length) throw new Error('يرجى إضافة صنف واحد على الأقل لطلب التحميل');

      const payload = {
        sourceWarehouseId: Number(sourceWarehouseId),
        items: cart.map((c) => ({
          productId: Number(c.product.id),
          qty: c.qty,
        })),
        notes: notes || undefined,
      };

      return vanSalesApi.submitLoadRequisition(payload);
    },
    onSuccess: (res) => {
      setSubmittedDocNo(res.docNo);
      setCart([]);
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['driver-my-requisitions'] });
      onRequisitionSubmitted?.(res.docNo);
    },
    onError: (err: any) => {
      alert(err?.message || 'فشل إرسال طلب التحميل');
    },
  });

  const handleReset = () => {
    setSubmittedDocNo(null);
    setCart([]);
    onClose();
  };

  return (
    <StandardDialog
      open={open}
      onClose={handleReset}
      title="طلب شحن بضاعة صباحي (إذن تحميل سيارة)"
      subtitle="يقوم المندوب بتحديد الأصناف والكميات المطلوبة من المستودع الرئيسي لإرسالها لمشرف المستودع للمراجعة والاعتماد"
      maxWidth="640px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }} dir="rtl">
        {submittedDocNo ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', backgroundColor: '#f0fdf4', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
            <div style={{ width: '48px', height: '48px', backgroundColor: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
              <CheckCircleIcon size={28} color="#16a34a" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#15803d', margin: '0 0 6px' }}>
              تم إرسال طلب إذن التحميل للمشرف بنجاح!
            </h3>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#166534', margin: '0 0 10px' }}>
              رقم الطلب: #{submittedDocNo}
            </p>
            <div style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              طلبك الآن قيد مراجعة وتجهيز المستودع. سيتم إخطارك وبدء الرحلة فور اعتماد المشرف وصرف البضاعة.
            </div>
            <Button variant="primary" onClick={handleReset} style={{ backgroundColor: '#170e5e', color: '#ffffff' }}>
              تم والعودة للتطبيق
            </Button>
          </div>
        ) : (
          <>
            {/* Source Warehouse */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                المستودع الرئيسي المصدر للشحن:
              </label>
              <CustomSelect
                value={sourceWarehouseId}
                onChange={setSourceWarehouseId}
                options={warehouses.map((w: any) => ({
                  value: String(w.id),
                  label: w.name,
                  hint: w.is_primary ? 'المستودع الرئيسي الافتراضي' : undefined,
                }))}
                placeholder="اختر المستودع المصدر"
              />
            </div>

            {/* Product Quick Search */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                البحث عن أصناف لإضافتها لطلب الشحن:
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="اكتب اسم الصنف أو الباركود..."
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 10px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
              {filteredProducts.length > 0 && (
                <div style={{ marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '8px', maxHeight: '160px', overflowY: 'auto', backgroundColor: '#ffffff' }}>
                  {filteredProducts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{p.name}</span>
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>
                        {Number((p as any).retail_price || (p as any).retailPrice || 0).toFixed(2)} <CurrencySymbol />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Items */}
            {cart.length > 0 ? (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#170e5e', display: 'block', marginBottom: '8px' }}>
                  الأصناف المطلوبة ({cart.length}):
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cart.map((item, idx) => (
                    <div
                      key={item.product.id}
                      style={{
                        backgroundColor: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>{item.product.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 800, fontSize: '13px', minWidth: '24px', textAlign: 'center' }}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', cursor: 'pointer', fontWeight: 700 }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: '#94a3b8', fontSize: '12px', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                لم يتم إضافة أصناف بعد. ابحث في الأصناف أعلاه لإضافتها للطلب.
              </div>
            )}

            {/* Notes */}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                ملاحظات إضافية للمستودع:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="مثال: مطلوب شحن كراتين إضافية لتغطية خط سير اليوم..."
                style={{
                  width: '100%',
                  height: '38px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '0 10px',
                  fontSize: '12px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <StandardDialogFooter>
              <Button variant="secondary" onClick={onClose}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || cart.length === 0}
                style={{ backgroundColor: '#170e5e', color: '#ffffff' }}
              >
                {submitMutation.isPending ? 'جاري الإرسال...' : `إرسال طلب التحميل للمشرف (${cart.length} أصناف)`}
              </Button>
            </StandardDialogFooter>
          </>
        )}
      </div>
    </StandardDialog>
  );
}
