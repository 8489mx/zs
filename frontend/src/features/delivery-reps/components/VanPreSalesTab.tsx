import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/components/system-alert';
import {
  SearchIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';
import {
  vanSalesApi,
  PreSalesCatalogItem,
} from '../api/van-sales.api';

interface CustomerOption {
  id: number;
  name: string;
  phone?: string;
  balance: number;
  creditLimit?: number;
  customerCode?: string;
}

interface PreSalesCartLine {
  productId: number;
  productName: string;
  unitName: string;
  unitMultiplier: number;
  quantity: number;
  unitPrice: number;
  consumerPrice?: number | null;
  pricingTierType: 'cash' | 'credit' | 'offer';
  unitOfferSavings?: number | null;
  warehouseAvailable: number;
}

interface VanPreSalesTabProps {
  customers: CustomerOption[];
  selectedCustomerId: number | '';
  onSelectCustomer: (val: number | '') => void;
  repId: number;
  repName?: string;
}

export const VanPreSalesTab: React.FC<VanPreSalesTabProps> = ({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  repId: _repId,
  repName: _repName,
}) => {
  const queryClient = useQueryClient();

  const [activeSubTab, setActiveSubTab] = useState<'new-booking' | 'my-orders'>('new-booking');
  const [paymentTerms, setPaymentTerms] = useState<'cash' | 'credit'>('cash');
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // Cart
  const [cart, setCart] = useState<PreSalesCartLine[]>([]);

  // Fetch Warehouse Catalog
  const {
    data: catalogProducts = [],
    isLoading: isCatalogLoading,
    refetch: refetchCatalog,
    isFetching: isCatalogFetching,
  } = useQuery({
    queryKey: ['van-presales-warehouse-catalog', searchCatalogQuery],
    queryFn: () => vanSalesApi.fetchPreSalesCatalog({ search: searchCatalogQuery.trim() || undefined }),
    staleTime: 30_000,
  });

  // Fetch My Pre-Sales Orders
  const {
    data: myOrders = [],
    isLoading: isMyOrdersLoading,
    refetch: refetchMyOrders,
    isFetching: isMyOrdersFetching,
  } = useQuery({
    queryKey: ['van-presales-my-orders'],
    queryFn: () => vanSalesApi.fetchMyPreSalesOrders(),
    staleTime: 15_000,
  });

  // Filter Catalog
  const filteredCatalog = useMemo(() => {
    if (!searchCatalogQuery.trim()) return catalogProducts;
    const q = searchCatalogQuery.toLowerCase().trim();
    return catalogProducts.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(q);
      const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
      return matchName || matchBarcode;
    });
  }, [catalogProducts, searchCatalogQuery]);

  // Selected customer object
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => Number(c.id) === Number(selectedCustomerId)) || null;
  }, [customers, selectedCustomerId]);

  // Compute pricing for an item based on terms and quantity
  const calculateItemPrice = (
    item: PreSalesCatalogItem,
    terms: 'cash' | 'credit',
    totalBaseQty: number,
    multiplier: number,
  ) => {
    const isCredit = terms === 'credit';
    const baseUnitPrice =
      isCredit && item.creditPrice != null && Number(item.creditPrice) > 0
        ? Number(item.creditPrice) * multiplier
        : Number(item.retailPrice || 0) * multiplier;

    let effectivePrice = baseUnitPrice;
    let tierType: 'cash' | 'credit' | 'offer' = isCredit ? 'credit' : 'cash';
    let savings = 0;

    // Check offers
    const matchingOffer = (item.offers || [])
      .filter((off) => totalBaseQty >= Math.max(1, Number(off.minQty || 1)))
      .sort((a, b) => Number(b.minQty || 0) - Number(a.minQty || 0))[0];

    if (matchingOffer) {
      const offerVal = Number(matchingOffer.value || 0);
      if (matchingOffer.offerType === 'percent' && offerVal > 0) {
        effectivePrice = Math.max(0, Number((baseUnitPrice * (1 - offerVal / 100)).toFixed(2)));
        tierType = 'offer';
        savings = Math.max(0, Number((baseUnitPrice - effectivePrice).toFixed(2)));
      } else if (matchingOffer.offerType === 'fixed' && offerVal > 0) {
        effectivePrice = Math.max(0, Number((baseUnitPrice - offerVal * multiplier).toFixed(2)));
        tierType = 'offer';
        savings = Math.max(0, Number((baseUnitPrice - effectivePrice).toFixed(2)));
      } else if (matchingOffer.offerType === 'price' && offerVal > 0) {
        effectivePrice = Number((offerVal * multiplier).toFixed(2));
        tierType = 'offer';
        savings = Math.max(0, Number((baseUnitPrice - effectivePrice).toFixed(2)));
      }
    }

    const consumerPrice =
      item.consumerPrice != null && Number(item.consumerPrice) > 0
        ? Number((Number(item.consumerPrice) * multiplier).toFixed(2))
        : null;

    return { effectivePrice, tierType, savings, consumerPrice };
  };

  // Add item to cart
  const handleAddToCart = (product: PreSalesCatalogItem, selectedUnitMultiplier = 1, unitName = 'قطعة') => {
    if (product.warehouseAvailable <= 0) {
      toast.warning(`الرصيد المتاح من الصنف "${product.name}" بالمخزن الرئيسي هو صفر`);
      return;
    }

    const existingIdx = cart.findIndex((line) => line.productId === product.id);
    if (existingIdx >= 0) {
      const existing = cart[existingIdx];
      const nextQty = existing.quantity + 1;
      const nextTotalBase = nextQty * existing.unitMultiplier;

      if (nextTotalBase > product.warehouseAvailable) {
        toast.warning(`أقصى رصيد متاح للحجز هو ${product.warehouseAvailable} قطعة`);
        return;
      }

      const pricing = calculateItemPrice(product, paymentTerms, nextTotalBase, existing.unitMultiplier);
      const updated = [...cart];
      updated[existingIdx] = {
        ...existing,
        quantity: nextQty,
        unitPrice: pricing.effectivePrice,
        pricingTierType: pricing.tierType,
        unitOfferSavings: pricing.savings,
      };
      setCart(updated);
    } else {
      const nextTotalBase = 1 * selectedUnitMultiplier;
      if (nextTotalBase > product.warehouseAvailable) {
        toast.warning(`أقصى رصيد متاح للحجز هو ${product.warehouseAvailable} قطعة`);
        return;
      }

      const pricing = calculateItemPrice(product, paymentTerms, nextTotalBase, selectedUnitMultiplier);
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          unitName,
          unitMultiplier: selectedUnitMultiplier,
          quantity: 1,
          unitPrice: pricing.effectivePrice,
          consumerPrice: pricing.consumerPrice,
          pricingTierType: pricing.tierType,
          unitOfferSavings: pricing.savings,
          warehouseAvailable: product.warehouseAvailable,
        },
      ]);
    }
    toast.success(`تمت إضافة "${product.name}" لسلة الحجز`);
  };

  // Stepper update quantity (Strict RTL: + then qty then -)
  const handleUpdateQty = (productId: number, delta: number) => {
    setCart((prev) => {
      const target = prev.find((line) => line.productId === productId);
      if (!target) return prev;
      const nextQty = target.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((line) => line.productId !== productId);
      }

      const nextTotalBase = nextQty * target.unitMultiplier;
      if (nextTotalBase > target.warehouseAvailable) {
        toast.warning(`أقصى رصيد متاح للحجز هو ${target.warehouseAvailable} قطعة`);
        return prev;
      }

      // Re-lookup catalog item for pricing
      const catItem = catalogProducts.find((p) => p.id === productId);
      const pricing = catItem
        ? calculateItemPrice(catItem, paymentTerms, nextTotalBase, target.unitMultiplier)
        : { effectivePrice: target.unitPrice, tierType: target.pricingTierType, savings: target.unitOfferSavings };

      return prev.map((line) =>
        line.productId === productId
          ? {
              ...line,
              quantity: nextQty,
              unitPrice: pricing.effectivePrice,
              pricingTierType: pricing.tierType,
              unitOfferSavings: pricing.savings,
            }
          : line,
      );
    });
  };

  // Change payment terms (Cash / Credit) & refresh cart prices
  const handlePaymentTermsChange = (newTerms: 'cash' | 'credit') => {
    setPaymentTerms(newTerms);
    setCart((prev) =>
      prev.map((line) => {
        const catItem = catalogProducts.find((p) => p.id === line.productId);
        if (!catItem) return line;
        const totalBase = line.quantity * line.unitMultiplier;
        const pricing = calculateItemPrice(catItem, newTerms, totalBase, line.unitMultiplier);
        return {
          ...line,
          unitPrice: pricing.effectivePrice,
          pricingTierType: pricing.tierType,
          unitOfferSavings: pricing.savings,
        };
      }),
    );
  };

  // Cart totals
  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  }, [cart]);

  const totalPieces = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantity * line.unitMultiplier, 0);
  }, [cart]);

  // Submit Pre-Sales Booking Mutation
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) {
        throw new Error('يرجى اختيار العميل المطلوب حجز الطلبية له أولاً');
      }
      if (cart.length === 0) {
        throw new Error('سلة الحجز فارغة. أضف أصنافاً أولاً');
      }

      return vanSalesApi.createPreSalesOrder({
        customerId: Number(selectedCustomerId),
        paymentMethod: paymentTerms,
        notes: bookingNotes.trim() || undefined,
        deliveryDate: deliveryDate || undefined,
        items: cart.map((line) => ({
          productId: line.productId,
          unitName: line.unitName,
          quantity: line.quantity,
          unitMultiplier: line.unitMultiplier,
          unitPrice: line.unitPrice,
        })),
      });
    },
    onSuccess: (res) => {
      toast.success(`تم حجز الطلبية رقم #${res.orderNumber} بالمخزن الرئيسي وإرسالها للمشرف للاعتماد!`);
      setCart([]);
      setBookingNotes('');
      setDeliveryDate('');
      setActiveSubTab('my-orders');
      queryClient.invalidateQueries({ queryKey: ['van-presales-warehouse-catalog'] });
      queryClient.invalidateQueries({ queryKey: ['van-presales-my-orders'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'تعذر تسجيل وحجز طلبية المندوب');
    },
  });

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_supervisor':
      case 'pending_approval':
        return (
          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fef3c7', color: '#b45309' }}>
            بانتظار اعتماد المشرف
          </span>
        );
      case 'approved':
        return (
          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
            معتمدة وجاهزة للتجهيز
          </span>
        );
      case 'rejected':
        return (
          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, backgroundColor: '#fee2e2', color: '#b91c1c' }}>
            مرفوضة من المشرف
          </span>
        );
      default:
        return (
          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, backgroundColor: '#f1f5f9', color: '#475569' }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* SUB-TAB NAVIGATOR */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          background: '#ffffff',
          padding: '5px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('new-booking')}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            border: activeSubTab === 'new-booking' ? '1px solid #170e5e' : '1px solid transparent',
            background: activeSubTab === 'new-booking' ? '#170e5e' : 'transparent',
            color: activeSubTab === 'new-booking' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <PlusIcon size={14} />
          <span>حجز طلبية جديدة من المخزن</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('my-orders')}
          style={{
            flex: 1,
            padding: '8px 4px',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 600,
            border: activeSubTab === 'my-orders' ? '1px solid #170e5e' : '1px solid transparent',
            background: activeSubTab === 'my-orders' ? '#170e5e' : 'transparent',
            color: activeSubTab === 'my-orders' ? '#ffffff' : '#475569',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
        >
          <ClockIcon size={14} />
          <span>طلبياتي المحجوزة ({myOrders.length})</span>
        </button>
      </div>

      {activeSubTab === 'new-booking' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* CUSTOMER & PAYMENT TERMS CARD */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>العميل وطريقة الدفع:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={() => handlePaymentTermsChange('cash')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: paymentTerms === 'cash' ? '1px solid #15803d' : '1px solid #cbd5e1',
                    backgroundColor: paymentTerms === 'cash' ? '#dcfce7' : '#ffffff',
                    color: paymentTerms === 'cash' ? '#15803d' : '#475569',
                  }}
                >
                  كاش نقدي
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTermsChange('credit')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: paymentTerms === 'credit' ? '1px solid #b45309' : '1px solid #cbd5e1',
                    backgroundColor: paymentTerms === 'credit' ? '#fef3c7' : '#ffffff',
                    color: paymentTerms === 'credit' ? '#b45309' : '#475569',
                  }}
                >
                  آجل على الحساب
                </button>
              </div>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => onSelectCustomer(e.target.value ? Number(e.target.value) : '')}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#0f172a',
                boxSizing: 'border-box',
              }}
            >
              <option value="">-- اختر العميل لتسجيل الطلبية --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.phone ? `(${c.phone})` : ''} - رصيد: {Number(c.balance || 0).toFixed(0)}
                </option>
              ))}
            </select>

            {selectedCustomer && (
              <div
                style={{
                  fontSize: '11.5px',
                  backgroundColor: '#f8fafc',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  border: '1px solid #e2e8f0',
                }}
              >
                <span>
                  الرصيد الحالي: <strong style={{ color: Number(selectedCustomer.balance) > 0 ? '#b91c1c' : '#15803d' }}>{Number(selectedCustomer.balance || 0).toFixed(2)} <CurrencySymbol /></strong>
                </span>
                <span>
                  سقف الائتمان: <strong style={{ color: '#170e5e' }}>{selectedCustomer.creditLimit ? `${Number(selectedCustomer.creditLimit).toFixed(2)}` : 'غير محدد'}</strong>
                </span>
              </div>
            )}
          </div>

          {/* CATALOG SEARCH BAR */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
            }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                placeholder="ابحث عن صنف بالمخزن الرئيسي..."
                value={searchCatalogQuery}
                onChange={(e) => setSearchCatalogQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 30px 0 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12.5px',
                  boxSizing: 'border-box',
                }}
              />
              <SearchIcon size={15} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '10px' }} />
            </div>
            <Button
              variant="secondary"
              onClick={() => refetchCatalog()}
              disabled={isCatalogFetching}
              style={{ height: '36px', padding: '0 10px' }}
            >
              <RefreshCwIcon size={14} className={isCatalogFetching ? 'spin' : ''} />
            </Button>
          </div>

          {/* WAREHOUSE CATALOG LIST */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
            className="thin-scrollbar"
          >
            {isCatalogLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
                جاري جلب رصيد المخزن الرئيسي والأسعار...
              </div>
            ) : filteredCatalog.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
                لا توجد أصناف مطابقة في المخزن الرئيسي
              </div>
            ) : (
              filteredCatalog.map((prod) => {
                const isOutOfStock = prod.warehouseAvailable <= 0;
                const pricing = calculateItemPrice(prod, paymentTerms, 1, 1);
                return (
                  <div
                    key={prod.id}
                    style={{
                      border: '1px solid #f1f5f9',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      backgroundColor: isOutOfStock ? '#fafafa' : '#ffffff',
                      opacity: isOutOfStock ? 0.6 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a' }}>{prod.name}</div>
                      <div style={{ fontSize: '11px', display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                        <span style={{ color: '#170e5e', fontWeight: 800 }}>
                          {pricing.effectivePrice.toFixed(2)} <CurrencySymbol />
                          {pricing.tierType === 'credit' ? (
                            <span style={{ color: '#b45309', fontSize: '10px' }}> (سعر آجل)</span>
                          ) : null}
                        </span>
                        {pricing.consumerPrice ? (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>
                            سعر المستهلك: {pricing.consumerPrice.toFixed(2)}
                          </span>
                        ) : null}
                        <span style={{ color: isOutOfStock ? '#b91c1c' : '#15803d', fontWeight: 700 }}>
                          متاح بالمخزن: {prod.warehouseAvailable}
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      onClick={() => handleAddToCart(prod, 1, 'قطعة')}
                      disabled={isOutOfStock}
                      style={{
                        height: '30px',
                        padding: '0 10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        backgroundColor: '#170e5e',
                        color: '#fff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PlusIcon size={13} />
                      <span>إضافة</span>
                    </Button>
                  </div>
                );
              })
            )}
          </div>

          {/* BOOKING CART & STEPPERS */}
          {cart.length > 0 && (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                  بنود الحجز ({cart.length} أصناف | {totalPieces} قطعة):
                </span>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#059669' }}>
                  {cartTotalAmount.toFixed(2)} <CurrencySymbol />
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {cart.map((line) => (
                  <div
                    key={line.productId}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      paddingBottom: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12px', color: '#0f172a' }}>{line.productName}</div>
                      <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {line.unitPrice.toFixed(2)} × {line.quantity} = <strong>{(line.quantity * line.unitPrice).toFixed(2)}</strong> <CurrencySymbol />
                        {line.consumerPrice ? (
                          <span style={{ color: '#2563eb', marginRight: '6px' }}>
                            (مستهلك: {line.consumerPrice.toFixed(2)})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* STRICT RTL STEPPER: [+] (QTY) [-] */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(line.productId, 1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#170e5e',
                          color: '#ffffff',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        title="زيادة الكمية"
                      >
                        +
                      </button>
                      <span style={{ minWidth: '22px', textAlign: 'center', fontWeight: 800, fontSize: '12px', color: '#170e5e' }}>
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(line.productId, -1)}
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#ffffff',
                          color: '#0f172a',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                        title="إنقاص الكمية"
                      >
                        -
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* DETAILS & SUBMIT */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>تاريخ التسليم المقترح:</label>
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '0 6px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: '#64748b' }}>ملاحظات التجهيز:</label>
                  <input
                    type="text"
                    placeholder="ملاحظات للمخزن..."
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    style={{
                      width: '100%',
                      height: '32px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '11.5px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <Button
                variant="primary"
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending || !selectedCustomerId}
                style={{
                  height: '40px',
                  backgroundColor: '#170e5e',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRadius: '8px',
                  marginTop: '4px',
                }}
              >
                <CheckCircleIcon size={16} />
                <span>
                  {createOrderMutation.isPending
                    ? 'جاري الحجز وتثبيت المخزون...'
                    : `تأكيد حجز الطلبية (${cartTotalAmount.toFixed(2)})`}
                </span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* MY ORDERS SUB-TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>سجل طلبياتي المحجوزة:</span>
            <Button
              variant="secondary"
              onClick={() => refetchMyOrders()}
              disabled={isMyOrdersFetching}
              style={{ height: '30px', padding: '0 8px', fontSize: '11px' }}
            >
              <RefreshCwIcon size={13} className={isMyOrdersFetching ? 'spin' : ''} />
              <span>تحديث</span>
            </Button>
          </div>

          {isMyOrdersLoading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px' }}>
              جاري تحميل طلبياتك...
            </div>
          ) : myOrders.length === 0 ? (
            <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '12.5px' }}>
              لم تقم بحجز أي طلبيات مسبقة حتى الآن.
            </div>
          ) : (
            myOrders.map((ord) => (
              <div
                key={ord.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#170e5e', fontSize: '12px' }}>
                    #{ord.orderNumber}
                  </span>
                  {getOrderStatusBadge(ord.status)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span>
                    العميل: <strong style={{ color: '#0f172a' }}>{ord.customerName}</strong>
                  </span>
                  <span style={{ fontWeight: 800, color: '#059669' }}>
                    {Number(ord.totalAmount).toFixed(2)} <CurrencySymbol />
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
                  <span>
                    {ord.paymentTerms === 'cash' ? 'كاش نقدي' : 'آجل على الحساب'} | {ord.itemsCount} أصناف
                  </span>
                  <span>
                    {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('ar-EG') : ''}
                  </span>
                </div>

                {ord.supervisorRejectionReason ? (
                  <div style={{ fontSize: '11px', color: '#b91c1c', backgroundColor: '#fef2f2', padding: '4px 8px', borderRadius: '4px' }}>
                    <b>سبب الرفض:</b> {ord.supervisorRejectionReason}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
