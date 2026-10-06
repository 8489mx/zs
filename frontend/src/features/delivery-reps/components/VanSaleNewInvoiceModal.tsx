import { useState, useMemo, useRef } from 'react';
import { getGlobalCurrencySymbol } from '@/lib/currencies';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StandardDialog, StandardDialogFooter } from '@/shared/components/StandardDialog';
import { CustomSelect } from '@/shared/ui/custom-select';
import { toast } from '@/shared/components/system-alert';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { formatCurrency } from '@/lib/format';
import { productsApi } from '@/features/products/api/products.api';
import { customersApi } from '@/features/customers/api/customers.api';
import { salesApi } from '@/features/sales/api/sales.api';
import { CameraBarcodeScannerModal } from '@/shared/components/CameraBarcodeScannerModal';
import { openWhatsAppChat, formatInvoiceShareMessage } from '@/lib/whatsapp';
import { printSmallReceiptDocument } from '@/lib/small-receipt-printer';
import type { Product, Customer } from '@/types/domain';
import {
  CheckCircleIcon,
  PrinterIcon,
  MessageSquareIcon,
  BarcodeIcon,
  DollarSignIcon,
  FileTextIcon,
  Trash2Icon,
  CameraIcon,
  PackageIcon,
  XIcon,
} from '@/shared/components/icons/AppIcons';

interface VanSaleItem {
  product: Product;
  qty: number;
  price: number;
  consumerPrice?: number | null;
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
    totalLines?: number;
    totalUnits?: number;
    totalCartons?: number;
    deliveryImage?: string | null;
  } | null>(null);

  // Delivery image & cartons
  const [deliveryImage, setDeliveryImage] = useState<string | null>(null);
  const [customCartons, setCustomCartons] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 5 ميجابايت');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setDeliveryImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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

  const getProductPriceForTerm = (product: Product, terms: 'cash' | 'credit') => {
    if (terms === 'credit') {
      const creditP = Number((product as any).credit_price ?? (product as any).creditPrice ?? 0);
      if (creditP > 0) return creditP;
    }
    return Number((product as any).retail_price ?? (product as any).retailPrice ?? (product as any).price ?? 0);
  };

  const handlePaymentMethodChange = (newMethod: 'cash' | 'credit') => {
    setPaymentMethod(newMethod);
    setCart((prev) =>
      prev.map((item) => ({
        ...item,
        price: getProductPriceForTerm(item.product, newMethod),
      }))
    );
  };

  const handleAddProduct = (product: Product) => {
    const existingIndex = cart.findIndex((item) => String(item.product.id) === String(product.id));
    const price = getProductPriceForTerm(product, paymentMethod);
    const consumerPrice = Number((product as any).consumer_price ?? (product as any).consumerPrice ?? 0) || null;

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].qty += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, qty: 1, price, consumerPrice }]);
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
      toast.warning(`لم يتم العثور على صنف بالباركود: ${clean}`);
    }
  };

  const totalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  }, [cart]);

  const totalLines = cart.length;

  const totalUnits = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  const autoCalculatedCartons = useMemo(() => {
    return cart.reduce((sum, item) => {
      const perCarton = Number((item.product as any).items_per_carton || (item.product as any).itemsPerCarton || 0);
      if (perCarton > 0) {
        return sum + item.qty / perCarton;
      }
      return sum;
    }, 0);
  }, [cart]);

  const effectiveCartons = customCartons !== '' ? Number(customCartons) : (autoCalculatedCartons > 0 ? autoCalculatedCartons : 0);

  // Create Sale Mutation
  const createSaleMutation = useMutation({
    mutationFn: async () => {
      const selectedCustomer = customers.find((c) => String(c.id) === selectedCustomerId);
      const effectiveCustomerName = isCashCustomer ? (customerName || 'عميل نقدي / فان سيلز') : (selectedCustomer?.name || 'عميل');
      const effectiveCustomerPhone = isCashCustomer ? customerPhone : (selectedCustomer?.phone || '');

      const saleNotesParts = [
        notes ? `فان سيلز: ${notes}` : 'بيع مباشر من السيارة (Van Sale)',
        `[عدد البنود: ${totalLines} | إجمالي القطع: ${totalUnits} | إجمالي الكراتين: ${effectiveCartons}]`,
        deliveryImage ? '[مرفق صورة تسليم البضاعة]' : '',
      ].filter(Boolean);

      const payload = {
        customerId: !isCashCustomer && selectedCustomerId ? Number(selectedCustomerId) : undefined,
        customerPhone: effectiveCustomerPhone,
        customerAddress: 'بيع مباشر من السيارة (Van Sale)',
        deliveryRepId: repId,
        deliveryStatus: 'delivered',
        collectionStatus: paymentMethod === 'cash' ? 'prepaid_by_rep' : 'cod',
        paymentType: paymentMethod,
        paymentChannel: paymentMethod === 'cash' ? 'cash' : 'credit',
        note: saleNotesParts.join(' - '),
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
        totalLines,
        totalUnits,
        totalCartons: effectiveCartons,
        deliveryImage,
      });
      onSuccess?.();
    },
    onError: (err: any) => {
      toast.error(err.message || 'حدث خطأ أثناء حفظ فاتورة الفان سيلز.');
    },
  });

  const handlePrintReceipt = () => {
    if (!completedSale) return;
    const itemsHtml = completedSale.items
      .map(
        (i) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px;">
          <span>${i.product.name} × ${i.qty}</span>
          <span>${(i.qty * i.price).toLocaleString()} ${getGlobalCurrencySymbol()}</span>
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
      <div style="display: flex; justify-content: space-between; font-size: 10.5px; padding: 4px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; margin-bottom: 6px;">
        <span>البنود: <b>${completedSale.totalLines || completedSale.items.length}</b></span>
        <span>القطع: <b>${completedSale.totalUnits || completedSale.items.reduce((s, i) => s + i.qty, 0)}</b></span>
        <span>الكراتين: <b>${completedSale.totalCartons || 0}</b></span>
      </div>
      <div style="border-bottom: 1px dashed #000; padding: 6px 0; margin-bottom: 6px;">
        ${itemsHtml}
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; margin-bottom: 8px;">
        <span>الإجمالي المدفوع:</span>
        <span>${completedSale.total.toLocaleString()} ${getGlobalCurrencySymbol()}</span>
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
      toast.warning('رقم هاتف العميل غير متوفر.');
      return;
    }
    const message = [
      formatInvoiceShareMessage({
        customerName: completedSale.customerName,
        docNo: completedSale.docNo,
        total: completedSale.total,
        itemsCount: completedSale.items.length,
      }),
      `إجمالي الكراتين: ${completedSale.totalCartons || 0} | عدد القطع: ${completedSale.totalUnits || 0}`,
    ].join('\n');
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
    setDeliveryImage(null);
    setCustomCartons('');
    onClose();
  };

  return (
    <StandardDialog
      open={open}
      onClose={handleResetModal}
      width="min(640px, 98vw)"
      title={completedSale ? 'تم إصدار الفاتورة وحفظها بنجاح' : 'فاتورة بيع مباشر من السيارة (Van Sale)'}
      subtitle={completedSale ? `رقم الفاتورة: #${completedSale.docNo}` : `المندوب: ${repName || 'المندوب الحسابي'}`}
      badge="مبيعات الفان"
      footerActions={
        completedSale ? (
          <StandardDialogFooter
            onClose={handleResetModal}
            cancelText="إغلاق"
            extraActions={
              <div style={{ display: 'inline-flex', gap: '8px' }}>
                <Button
                  onClick={handlePrintReceipt}
                  style={{ background: '#170e5e', color: '#fff', padding: '6px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <PrinterIcon size={16} color="#fff" />
                  <span>طباعة الإيصال (بلوتوث)</span>
                </Button>
                {completedSale.customerPhone && (
                  <Button
                    onClick={handleSendWhatsAppReceipt}
                    style={{ background: '#16a34a', color: '#fff', padding: '6px 14px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <MessageSquareIcon size={16} color="#fff" />
                    <span>واتساب</span>
                  </Button>
                )}
              </div>
            }
          />
        ) : (
          <StandardDialogFooter
            onClose={handleResetModal}
            cancelText="إلغاء"
            onSubmit={() => createSaleMutation.mutate()}
            submitText={createSaleMutation.isPending ? 'جاري الحفظ...' : 'تأكيد وحفظ الفاتورة'}
            isSubmitting={createSaleMutation.isPending}
            submitDisabled={cart.length === 0}
          />
        )
      }
    >
      <div className="page-stack" style={{ padding: '4px 0' }} dir="rtl">
        {completedSale ? (
          /* Success Screen */
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
              <CheckCircleIcon size={48} color="#16a34a" />
            </div>
            <h3 style={{ margin: '0 0 6px 0', color: '#166534', fontWeight: 'bold', fontSize: '16px' }}>
              تم حفظ وترحيل الفاتورة بنجاح!
            </h3>
            <p className="muted small" style={{ margin: '0 0 12px 0' }}>
              رقم الفاتورة: <strong>#{completedSale.docNo}</strong> بمبلغ{' '}
              <strong>{formatCurrency(completedSale.total)}</strong>
            </p>

            <div style={{ display: 'inline-flex', gap: '16px', background: '#f8fafc', padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', margin: '0 auto 14px auto', fontSize: '12px' }}>
              <span>البنود: <b>{completedSale.totalLines ?? completedSale.items.length}</b></span>
              <span>القطع: <b>{completedSale.totalUnits ?? completedSale.items.reduce((s, i) => s + i.qty, 0)}</b></span>
              <span>الكراتين: <b>{completedSale.totalCartons ?? 0}</b></span>
            </div>

            {completedSale.deliveryImage && (
              <div style={{ margin: '0 auto 12px auto', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>صورة إثبات التسليم المرفقة:</div>
                <img
                  src={completedSale.deliveryImage}
                  alt="إثبات التسليم"
                  style={{ maxHeight: '110px', maxWidth: '200px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}
          </div>
        ) : (
          /* New Sale Form */
          <>
            {/* Customer Section */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px' }}>
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
                  <CustomSelect
                    value={selectedCustomerId}
                    onChange={(val) => setSelectedCustomerId(val)}
                    placeholder="-- اختر من قائمة العملاء --"
                    options={customers.map((c) => ({
                      value: String(c.id),
                      label: c.name,
                      hint: c.phone || undefined,
                    }))}
                  />
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
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 14px' }}
              >
                <BarcodeIcon size={16} />
                <span>مسح باركود</span>
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
                      <div style={{ fontSize: '0.8em', color: '#64748b', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>{formatCurrency(item.price)} للوحدة</span>
                        {item.consumerPrice && item.consumerPrice > 0 ? (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>
                            (سعر المستهلك: {formatCurrency(item.consumerPrice)})
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '2px 4px' }}>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, 1)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px', color: '#170e5e' }}
                          title="زيادة الكمية"
                        >
                          +
                        </button>
                        <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{item.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(idx, -1)}
                          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: 'bold', padding: '0 4px' }}
                          title="إنقاص الكمية"
                        >
                          -
                        </button>
                      </div>
                      <span style={{ fontWeight: 'bold', minWidth: '60px', textAlign: 'left', color: '#170e5e' }}>
                        {formatCurrency(item.qty * item.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                        title="حذف الصنف"
                      >
                        <Trash2Icon size={14} color="#ef4444" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Cargo / Quantities Summary Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '8px 12px',
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                  <PackageIcon size={14} color="#170e5e" />
                  <span>عدد البنود:</span>
                  <b style={{ color: '#170e5e' }}>{totalLines}</b>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#334155' }}>
                  <span>إجمالي القطع:</span>
                  <b style={{ color: '#170e5e' }}>{totalUnits}</b>
                </div>

                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
                  <span>إجمالي الكراتين:</span>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={customCartons}
                    onChange={(e) => setCustomCartons(e.target.value)}
                    placeholder={autoCalculatedCartons > 0 ? String(autoCalculatedCartons) : '0'}
                    style={{
                      width: '64px',
                      padding: '2px 6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: '#170e5e',
                      border: '1px solid #cbd5e1',
                      borderRadius: '4px',
                      textAlign: 'center',
                      background: '#fff',
                    }}
                    title="يمكنك تعديل إجمالي عدد الكراتين يدوياً أو تركه للحساب التلقائي"
                  />
                  <span style={{ fontSize: '11px', color: '#64748b' }}>كرتونة</span>
                </div>
              </div>

              {/* Delivery Photo Capture/Attachment */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={fileInputRef}
                  onChange={handleImageCapture}
                  style={{ display: 'none' }}
                />
                {!deliveryImage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '11.5px',
                      padding: '4px 10px',
                      background: '#fff',
                      border: '1px dashed #94a3b8',
                      color: '#1e293b',
                    }}
                    title="التقاط صورة بضاعة التسليم بالكاميرا أو إرفاق صورة"
                  >
                    <CameraIcon size={14} color="#170e5e" />
                    <span>تصوير البضاعة المسلّمة</span>
                  </Button>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '6px',
                      padding: '2px 8px',
                    }}
                  >
                    <img
                      src={deliveryImage}
                      alt="البضاعة"
                      style={{ width: '24px', height: '24px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#166534', fontWeight: 600 }}>تم إرفاق صورة</span>
                    <button
                      type="button"
                      onClick={() => setDeliveryImage(null)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#ef4444',
                        padding: '0 2px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="حذف الصورة"
                    >
                      <XIcon size={12} color="#ef4444" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method & Total Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <Button
                  variant={paymentMethod === 'cash' ? 'primary' : 'secondary'}
                  onClick={() => handlePaymentMethodChange('cash')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    ...(paymentMethod === 'cash' ? { background: '#166534', color: '#fff' } : {}),
                  }}
                >
                  <DollarSignIcon size={14} />
                  <span>كاش نقدي</span>
                </Button>
                <Button
                  variant={paymentMethod === 'credit' ? 'primary' : 'secondary'}
                  onClick={() => {
                    if (isCashCustomer && !selectedCustomerId) {
                      toast.warning('البيع الآجل يتطلب اختيار عميل مسجل من القائمة لتقييد المديونية على حسابه.');
                      setIsCashCustomer(false);
                    }
                    handlePaymentMethodChange('credit');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    ...(paymentMethod === 'credit' ? { background: '#d97706', color: '#fff' } : {}),
                  }}
                >
                  <FileTextIcon size={14} />
                  <span>آجل (حساب)</span>
                </Button>
              </div>

              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.8em', color: '#64748b' }}>إجمالي الفاتورة</div>
                <div style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#170e5e' }}>
                  {formatCurrency(totalAmount)}
                </div>
              </div>
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
    </StandardDialog>
  );
}
