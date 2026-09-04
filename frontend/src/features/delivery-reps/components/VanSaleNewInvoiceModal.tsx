import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { productsApi } from '@/features/products/api/products.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { salesApi } from '@/features/sales/api/sales.api';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { printSmallReceiptDocument } from '@/lib/small-receipt-printer';
import { openWhatsAppChat, formatInvoiceShareMessage } from '@/lib/whatsapp';
import type { Product, Customer } from '@/types/domain';

interface VanSaleItem {
  product: Product;
  qty: number;
  price: number;
}

interface VanSaleNewInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  repId: number;
  repName?: string;
  onSuccess?: () => void;
}

export function VanSaleNewInvoiceModal({
  open,
  onClose,
  repId,
  repName,
  onSuccess,
}: VanSaleNewInvoiceModalProps) {
  const queryClient = useQueryClient();

  // Mode: form or success
  const [completedSale, setCompletedSale] = useState<{
    docNo: string;
    total: number;
    customerName: string;
    customerPhone: string;
    items: VanSaleItem[];
  } | null>(null);

  // Customer selection
  const [isCashCustomer, setIsCashCustomer] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Cart items
  const [cart, setCart] = useState<VanSaleItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'credit'>('cash');
  const [notes, setNotes] = useState('');

  // Search & Barcode scanner
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  // Load products & customers
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['van-sale-products'],
    queryFn: productsApi.list,
    enabled: open,
    staleTime: 60_000,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['van-sale-customers'],
    queryFn: async () => (await customersApi.list()) || [],
    enabled: open && !isCashCustomer,
    staleTime: 60_000,
  });

  // Filter products for quick picker
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    return products
      .filter((p) => {
        const name = (p.name || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const sku = (p.sku || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || sku.includes(q);
      })
      .slice(0, 6);
  }, [products, searchQuery]);

  const handleAddProduct = (product: Product) => {
    const existingIndex = cart.findIndex((item) => String(item.product.id) === String(product.id));
    const price = Number((product as any).retail_price ?? (product as any).retailPrice ?? (product as any).price ?? 0);

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1, price }]);
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

  const handleRemoveItem = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleBarcodeScanned = (code: string) => {
    setScannerOpen(false);
    const clean = code.trim();
    const found = products.find((p) => p.barcode === clean || p.sku === clean);
    if (found) {
      handleAddProduct(found);
    } else {
      alert(`لم يتم العثور على صنف بالباركود: ${clean}`);
    }
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [cart]);

  // Create Sale Mutation
  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const selectedCustomer = customers.find((c) => String(c.id) === selectedCustomerId);
      const effectiveCustomerName = isCashCustomer ? (customerName || 'عميل نقدي / فان سيلز') : (selectedCustomer?.name || 'عميل');
      const effectiveCustomerPhone = isCashCustomer ? customerPhone : (selectedCustomer?.phone || '');

      const payload = {
        customerId: !isCashCustomer && selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customerPhone: effectiveCustomerPhone,
        customerAddress: 'بيع مباشر من السيارة (Van Sale)',
        deliveryRepId: repId,
        deliveryStatus: 'delivered',
        collectionStatus: paymentMethod === 'cash' ? 'prepaid_by_rep' : 'cod',
        paymentType: paymentMethod,
        paymentChannel: paymentMethod === 'cash' ? 'cash' : 'credit',
        note: notes ? `فان سيلز: ${notes}` : 'بيع مباشر من السيارة (Van Sale)',
        items: cart.map((item) => ({
          productId: Number(item.product.id),
          qty: item.qty,
          price: item.price,
        })),
        payments:
          paymentMethod === 'cash'
            ? [
                {
                  paymentChannel: 'cash',
                  amount: totalAmount,
                },
              ]
            : undefined,
      };

      const res = await salesApi.create(payload);
      return {
        sale: res,
        customerName: effectiveCustomerName,
        customerPhone: effectiveCustomerPhone,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['driver-orders', repId] });
      setCompletedSale({
        docNo: String(data.sale?.docNo || data.sale?.id || 'جديدة'),
        total: totalAmount,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        items: [...cart],
      });
      onSuccess?.();
    },
    onError: (err: any) => {
      alert(err.message || 'حدث خطأ أثناء حفظ فاتورة الفان سيلز.');
    },
  });

  const handlePrintReceipt = () => {
    if (!completedSale) return;
    const itemsHtml = completedSale.items
      .map(
        (i) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span>${i.product.name} × ${i.qty}</span>
          <span>${(i.qty * i.price).toLocaleString()} ج.م</span>
        </div>`
      )
      .join('');

    const html = `
      <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px;">
        <h3 style="margin: 0; font-size: 15px;">فاتورة بيع مباشر (Van Sale)</h3>
        <p style="margin: 2px 0 0; font-size: 11px;">رقم: <b>#${completedSale.docNo}</b></p>
        <p style="margin: 2px 0 0; font-size: 10px; color: #555;">المندوب: ${repName || 'المندوب'}</p>
      </div>
      <div style="font-size: 11px; margin-bottom: 6px;">
        <div><b>العميل:</b> ${completedSale.customerName}</div>
        <div><b>الهاتف:</b> ${completedSale.customerPhone || 'غير مسجل'}</div>
        <div><b>التاريخ:</b> ${new Date().toLocaleDateString('ar-EG')}</div>
      </div>
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 6px;">
        ${itemsHtml}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 8px;">
        <span>الإجمالي المدفوع:</span>
        <span>${completedSale.total.toLocaleString()} ج.م</span>
      </div>
      <div style="text-align: center; font-size: 10px; color: #555;">
        شكراً لتعاملكم معنا!
      </div>
    `;
    printSmallReceiptDocument(html, { title: `فاتورة #${completedSale.docNo}`, widthMm: 58 });
  };

  const handleSendWhatsAppReceipt = () => {
    if (!completedSale) return;
    if (!completedSale.customerPhone) {
      alert('رقم هاتف العميل غير متوفر.');
      return;
    }
    const message = formatInvoiceShareMessage({
      customerName: completedSale.customerName,
      docNo: completedSale.docNo,
      total: completedSale.total,
      itemsCount: completedSale.items.length,
    });
    openWhatsAppChat(completedSale.customerPhone, message);
  };

  const handleResetModal = () => {
    setCompletedSale(null);
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomerId('');
    setIsCashCustomer(true);
    setPaymentMethod('cash');
    setNotes('');
    onClose();
  };

  return (
    <DialogShell
      open={open}
      onClose={handleResetModal}
      width="min(560px, 98vw)"
      ariaLabel="فاتورة بيع مباشر من السيارة"
    >
      <div className="page-stack" style={{ padding: '6px' }} dir="rtl">
        {completedSale ? (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '8px' }}>🎉</div>
            <h3 style={{ margin: '0 0 4px 0', color: '#166534', fontWeight: 'bold' }}>
              تم إصدار الفاتورة وحفظها بنجاح!
            </h3>
            <p className="muted small" style={{ margin: '0 0 16px 0' }}>
              رقم الفاتورة: <strong>#{completedSale.docNo}</strong> بمبلغ{' '}
              <strong>{formatCurrency(completedSale.total)}</strong>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '320px', margin: '0 auto' }}>
              <Button
                onClick={handlePrintReceipt}
                style={{ background: '#170e5e', color: '#fff', padding: '12px', fontSize: '1.05em' }}
              >
                🖨️ طباعة الإيصال الفوري (بلوتوث)
              </Button>

              {completedSale.customerPhone && (
                <Button
                  onClick={handleSendWhatsAppReceipt}
                  style={{ background: '#16a34a', color: '#fff', padding: '12px', fontSize: '1.05em' }}
                >
                  💬 إرسال الفاتورة عبر واتساب
                </Button>
              )}

              <Button variant="secondary" onClick={handleResetModal} style={{ marginTop: '8px' }}>
                تم / إغلاق
              </Button>
            </div>
          </div>
        ) : (
          /* New Sale Form */
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0f172a', fontWeight: 'bold' }}>
                  🚚 بيع مباشر من السيارة (Van Sale)
                </h3>
                <span className="muted small">المندوب: {repName || 'المندوب الحسابي'}</span>
              </div>
              <button
                type="button"
                onClick={handleResetModal}
                style={{ border: 'none', background: 'transparent', fontSize: '1.3rem', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            {/* Customer Section */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <Button
                  variant={isCashCustomer ? 'primary' : 'secondary'}
                  onClick={() => setIsCashCustomer(true)}
                  style={isCashCustomer ? { background: '#170e5e', color: '#fff' } : undefined}
                >
                  عميل نقدي / طيار
                </Button>
                <Button
                  variant={!isCashCustomer ? 'primary' : 'secondary'}
                  onClick={() => setIsCashCustomer(false)}
                  style={!isCashCustomer ? { background: '#170e5e', color: '#fff' } : undefined}
                >
                  عميل مسجل بالقائمة
                </Button>
              </div>

              {isCashCustomer ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <Field label="اسم العميل (اختياري)">
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="عميل نقدي"
                    />
                  </Field>
                  <Field label="هاتف العميل (لواتساب)">
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="01xxxxxxxxx"
                    />
                  </Field>
                </div>
              ) : (
                <Field label="اختر العميل">
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                  >
                    <option value="">-- اختر من قائمة العملاء --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>

            {/* Product Search & Barcode Scan */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن صنف أو كود بالسيارة..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: '8px' }}
                />
              </div>
              <Button
                variant="secondary"
                onClick={() => setScannerOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '9px 14px' }}
              >
                📷 مسح باركود
              </Button>
            </div>

            {/* Quick Picker Results Dropdown */}
            {filteredProducts.length > 0 && (
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                {filteredProducts.map((p) => {
                  const price = Number((p as any).retail_price ?? (p as any).retailPrice ?? (p as any).price ?? 0);
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      style={{
                        padding: '10px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 'bold', color: '#0f172a' }}>{p.name}</div>
                        <div className="muted small">{p.barcode || p.sku}</div>
                      </div>
                      <span style={{ fontWeight: 'bold', color: '#16a34a' }}>{formatCurrency(price)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Cart Items List */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', maxHeight: '200px', overflowY: 'auto' }}>
              {cart.length === 0 ? (
                <div className="muted small" style={{ padding: '20px', textAlign: 'center' }}>
                  لم يتم إضافة أصناف بعد. ابحث عن صنف أو امسح الباركود لإضافته للفاتورة.
                </div>
              ) : (
                cart.map((item, idx) => (
                  <div
                    key={item.product.id}
                    style={{
                      padding: '8px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderBottom: '1px solid #f1f5f9',
                      background: '#fff',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', fontSize: '0.9em', color: '#0f172a' }}>{item.product.name}</div>
                      <div style={{ fontSize: '0.8em', color: '#64748b' }}>{formatCurrency(item.price)} للوحدة</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}
                        >
                          +
                        </button>
                      </div>
                      <span style={{ fontWeight: 'bold', minWidth: '60px', textAlign: 'left', color: '#170e5e' }}>
                        {formatCurrency(item.qty * item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444' }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method & Total Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant={paymentMethod === 'cash' ? 'primary' : 'secondary'}
                  onClick={() => setPaymentMethod('cash')}
                  style={paymentMethod === 'cash' ? { background: '#166534', color: '#fff' } : undefined}
                >
                  💵 كاش نقدي
                </Button>
                <Button
                  variant={paymentMethod === 'credit' ? 'primary' : 'secondary'}
                  onClick={() => {
                    if (isCashCustomer && !selectedCustomerId) {
                      alert('البيع الآجل يتطلب اختيار عميل مسجل من القائمة لتقييد المديونية على حسابه.');
                      setIsCashCustomer(false);
                    }
                    setPaymentMethod('credit');
                  }}
                  style={paymentMethod === 'credit' ? { background: '#d97706', color: '#fff' } : undefined}
                >
                  📝 آجل (حساب)
                </Button>
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8em', color: '#64748b' }}>إجمالي الفاتورة</div>
                <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#170e5e' }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <Button variant="secondary" onClick={handleResetModal}>
                إلغاء
              </Button>
              <Button
                onClick={() => createSaleMutation.mutate()}
                disabled={cart.length === 0 || createSaleMutation.isPending}
                style={{ background: '#170e5e', color: '#fff', minWidth: '160px' }}
              >
                {createSaleMutation.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الفاتورة ✓'}
              </Button>
            </div>

            {/* Scanner Dialog */}
            {scannerOpen && (
              <CameraBarcodeScannerModal
                isOpen={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onScan={handleBarcodeScanned}
              />
            )}
          </>
        )}
      </div>
    </DialogShell>
  );
}
