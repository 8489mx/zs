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
  XIcon,
  BuildingIcon,
  ArrowRightIcon,
  BriefcaseIcon,
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
  quantity: number; // Total base pieces
  cartons: number;
  pieces: number;
  packagingUnitName?: string;
  cartonMultiplier: number;
  pieceUnitPrice: number;
  cartonUnitPrice: number;
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

interface CompactStepperProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unitLabel: string;
  onIncrement: () => void;
  onDecrement: () => void;
  onChange: (val: number) => void;
  disabledIncrement?: boolean;
  disabledDecrement?: boolean;
  inputWidth?: string;
  height?: string;
}

/**
 * Strict RTL Stepper: [+] first in DOM (physically on the RIGHT), [-] last in DOM (physically on the LEFT).
 */
const CompactStepper: React.FC<CompactStepperProps> = ({
  value,
  min = 0,
  max = 999999,
  step = 1,
  unitLabel,
  onIncrement,
  onDecrement,
  onChange,
  disabledIncrement = false,
  disabledDecrement = false,
  inputWidth = '36px',
  height = '30px',
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          border: '1px solid #cbd5e1',
          borderRadius: '7px',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          height,
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* STRICT RTL STEPPER: + is FIRST in DOM (Renders on the RIGHT) */}
        <button
          type="button"
          onClick={onIncrement}
          disabled={disabledIncrement}
          style={{
            width: '26px',
            height: '100%',
            border: 'none',
            backgroundColor: '#f8fafc',
            color: '#170e5e',
            cursor: disabledIncrement ? 'not-allowed' : 'pointer',
            opacity: disabledIncrement ? 0.35 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderInlineEnd: '1px solid #e2e8f0',
            fontWeight: 800,
            fontSize: '13px',
            padding: 0,
          }}
          title={`زيادة ${unitLabel}`}
        >
          +
        </button>

        <input
          type="number"
          step={step}
          className="no-spin-arrows"
          min={min}
          max={max}
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            const parsed = parseInt(e.target.value, 10);
            if (!isNaN(parsed)) onChange(Math.max(0, parsed));
            else if (e.target.value === '') onChange(0);
          }}
          onFocus={(e) => e.target.select()}
          style={{
            width: inputWidth,
            height: '100%',
            border: 'none',
            textAlign: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: '#0f172a',
            outline: 'none',
            MozAppearance: 'textfield',
            appearance: 'textfield',
            padding: '0 2px',
          }}
        />

        {/* STRICT RTL STEPPER: - is LAST in DOM (Renders on the LEFT) */}
        <button
          type="button"
          onClick={onDecrement}
          disabled={disabledDecrement}
          style={{
            width: '26px',
            height: '100%',
            border: 'none',
            backgroundColor: '#f8fafc',
            color: '#334155',
            cursor: disabledDecrement ? 'not-allowed' : 'pointer',
            opacity: disabledDecrement ? 0.35 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderInlineStart: '1px solid #e2e8f0',
            fontWeight: 800,
            fontSize: '14px',
            padding: 0,
          }}
          title={`إنقاص ${unitLabel}`}
        >
          -
        </button>
      </div>
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
        {unitLabel}
      </span>
    </div>
  );
};

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

  // Browsing by company and category
  const [isBrowsingCompanies, setIsBrowsingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart
  const [cart, setCart] = useState<PreSalesCartLine[]>([]);

  // Fetch Warehouse Catalog
  const {
    data: catalogProducts = [],
    isLoading: isCatalogLoading,
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

  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Group products by Company (Supplier)
  const companies = useMemo(() => {
    const map = new Map<string, {
      name: string;
      totalProducts: number;
      availableProducts: number;
      categoryMap: Map<string, { id: number | null; name: string; count: number }>;
    }>();

    for (const prod of catalogProducts) {
      const compName = (prod.supplierName || '').trim() || 'الشركة العامة';
      if (!map.has(compName)) {
        map.set(compName, {
          name: compName,
          totalProducts: 0,
          availableProducts: 0,
          categoryMap: new Map(),
        });
      }
      const c = map.get(compName)!;
      c.totalProducts += 1;
      if (prod.warehouseAvailable > 0) {
        c.availableProducts += 1;
      }

      const catName = (prod.categoryName || '').trim() || 'عام';
      const catId = prod.categoryId ?? null;
      if (!c.categoryMap.has(catName)) {
        c.categoryMap.set(catName, { id: catId, name: catName, count: 0 });
      }
      c.categoryMap.get(catName)!.count += 1;
    }

    return Array.from(map.values())
      .map((c) => ({
        name: c.name,
        totalProducts: c.totalProducts,
        availableProducts: c.availableProducts,
        categories: Array.from(c.categoryMap.values()),
      }))
      .sort((a, b) => b.availableProducts - a.availableProducts);
  }, [catalogProducts]);

  // Categories for currently selected company
  const companyCategories = useMemo(() => {
    if (!selectedCompany) return [];
    const found = companies.find((c) => c.name === selectedCompany);
    return found ? found.categories : [];
  }, [companies, selectedCompany]);

  // Filter Catalog
  const displayedProducts = useMemo(() => {
    return catalogProducts.filter((p) => {
      // Out of stock filter
      if (!showOutOfStock && p.warehouseAvailable <= 0) return false;

      // If user typed in search bar: search takes priority
      if (searchCatalogQuery.trim()) {
        const q = searchCatalogQuery.toLowerCase().trim();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchBarcode = (p.barcode || '').toLowerCase().includes(q);
        const matchCompany = (p.supplierName || '').toLowerCase().includes(q);
        return matchName || matchBarcode || matchCompany;
      }

      // If user is inside a company: filter by company & category
      if (selectedCompany) {
        const compName = (p.supplierName || '').trim() || 'الشركة العامة';
        if (compName !== selectedCompany) return false;

        if (selectedCategory !== 'all') {
          const catName = (p.categoryName || '').trim() || 'عام';
          if (catName !== selectedCategory) return false;
        }
        return true;
      }

      return true;
    });
  }, [catalogProducts, searchCatalogQuery, selectedCompany, selectedCategory, showOutOfStock]);

  const availableItemsCount = useMemo(() => {
    return catalogProducts.filter((p) => p.warehouseAvailable > 0).length;
  }, [catalogProducts]);

  const outOfStockCount = useMemo(() => {
    return catalogProducts.length - availableItemsCount;
  }, [catalogProducts, availableItemsCount]);

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

  // Update Carton and Piece Quantities for an item
  const handleUpdateProductUnits = (
    product: PreSalesCatalogItem,
    targetCartons: number,
    targetPieces: number,
  ) => {
    const mult = product.packagingUnit?.multiplier || 1;
    const isCartonItem = Boolean(product.packagingUnit && mult > 1);
    const safeCartons = isCartonItem ? Math.max(0, targetCartons) : 0;
    const safePieces = Math.max(0, targetPieces);
    const totalBaseQty = safeCartons * mult + safePieces;

    if (totalBaseQty > product.warehouseAvailable) {
      toast.warning(`أقصى رصيد متاح للحجز من "${product.name}" بالمخزن هو ${product.warehouseAvailable} قطعة`);
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((l) => l.productId === product.id);

      if (totalBaseQty <= 0) {
        if (existingIdx >= 0) {
          return prev.filter((l) => l.productId !== product.id);
        }
        return prev;
      }

      const piecePricing = calculateItemPrice(product, paymentTerms, totalBaseQty, 1);
      const cartonPricing = isCartonItem ? calculateItemPrice(product, paymentTerms, totalBaseQty, mult) : null;

      const newCartLine: PreSalesCartLine = {
        productId: product.id,
        productName: product.name,
        unitName: isCartonItem ? (safeCartons > 0 ? (product.packagingUnit?.name || 'كرتونة') : 'قطعة') : 'قطعة',
        unitMultiplier: mult,
        quantity: totalBaseQty,
        cartons: safeCartons,
        pieces: safePieces,
        packagingUnitName: product.packagingUnit?.name || 'كرتونة',
        cartonMultiplier: mult,
        pieceUnitPrice: piecePricing.effectivePrice,
        cartonUnitPrice: cartonPricing ? cartonPricing.effectivePrice : piecePricing.effectivePrice * mult,
        unitPrice: piecePricing.effectivePrice,
        consumerPrice: piecePricing.consumerPrice,
        pricingTierType: piecePricing.tierType,
        unitOfferSavings: piecePricing.savings,
        warehouseAvailable: product.warehouseAvailable,
      };

      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx] = newCartLine;
        return next;
      } else {
        return [...prev, newCartLine];
      }
    });
  };

  // Quick increment/decrement from Cart
  const handleCartDelta = (productId: number, unitType: 'carton' | 'piece', delta: number) => {
    const line = cart.find((l) => l.productId === productId);
    if (!line) return;
    const prod = catalogProducts.find((p) => p.id === productId);
    if (!prod) return;

    if (unitType === 'carton') {
      handleUpdateProductUnits(prod, line.cartons + delta, line.pieces);
    } else {
      handleUpdateProductUnits(prod, line.cartons, line.pieces + delta);
    }
  };

  // Change payment terms (Cash / Credit) & refresh cart prices
  const handlePaymentTermsChange = (newTerms: 'cash' | 'credit') => {
    setPaymentTerms(newTerms);
    setCart((prev) =>
      prev.map((line) => {
        const catItem = catalogProducts.find((p) => p.id === line.productId);
        if (!catItem) return line;
        const totalBase = line.quantity;
        const piecePricing = calculateItemPrice(catItem, newTerms, totalBase, 1);
        const cartonPricing = line.cartonMultiplier > 1 ? calculateItemPrice(catItem, newTerms, totalBase, line.cartonMultiplier) : null;
        return {
          ...line,
          pieceUnitPrice: piecePricing.effectivePrice,
          cartonUnitPrice: cartonPricing ? cartonPricing.effectivePrice : piecePricing.effectivePrice * line.cartonMultiplier,
          unitPrice: piecePricing.effectivePrice,
          pricingTierType: piecePricing.tierType,
          unitOfferSavings: piecePricing.savings,
        };
      }),
    );
  };

  // Cart totals
  const cartTotalAmount = useMemo(() => {
    return cart.reduce((sum, line) => {
      if (line.cartonMultiplier > 1 && (line.cartons > 0 || line.pieces > 0)) {
        return sum + (line.cartons * line.cartonUnitPrice + line.pieces * line.pieceUnitPrice);
      }
      return sum + line.quantity * line.pieceUnitPrice;
    }, 0);
  }, [cart]);

  const totalPieces = useMemo(() => {
    return cart.reduce((sum, line) => sum + line.quantity, 0);
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

      const itemsPayload: Array<{
        productId: number;
        qty: number;
        quantity: number;
        unitName: string;
        unitMultiplier: number;
        unitPrice: number;
      }> = [];

      for (const line of cart) {
        if (line.cartonMultiplier > 1) {
          if (line.cartons > 0) {
            itemsPayload.push({
              productId: line.productId,
              qty: line.cartons,
              quantity: line.cartons,
              unitName: line.packagingUnitName || 'كرتونة',
              unitMultiplier: line.cartonMultiplier,
              unitPrice: line.cartonUnitPrice,
            });
          }
          if (line.pieces > 0) {
            itemsPayload.push({
              productId: line.productId,
              qty: line.pieces,
              quantity: line.pieces,
              unitName: 'قطعة',
              unitMultiplier: 1,
              unitPrice: line.pieceUnitPrice,
            });
          }
        } else {
          itemsPayload.push({
            productId: line.productId,
            qty: line.quantity,
            quantity: line.quantity,
            unitName: line.unitName || 'قطعة',
            unitMultiplier: 1,
            unitPrice: line.pieceUnitPrice,
          });
        }
      }

      return vanSalesApi.createPreSalesOrder({
        customerId: Number(selectedCustomerId),
        paymentMethod: paymentTerms,
        notes: bookingNotes.trim() || undefined,
        deliveryDate: deliveryDate || undefined,
        items: itemsPayload,
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
      case 'confirmed':
        return (
          <span style={{ padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 700, backgroundColor: '#dcfce7', color: '#15803d' }}>
            معتمدة وجاهزة للتحميل
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '24px' }}>
      {/* SUB-TABS SELECTOR */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#f1f5f9',
          padding: '3px',
          borderRadius: '10px',
          gap: '4px',
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
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              placeholder="ابحث بالاسم أو الباركود في المخزن الرئيسي..."
              value={searchCatalogQuery}
              onChange={(e) => setSearchCatalogQuery(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                padding: searchCatalogQuery ? '0 32px 0 32px' : '0 32px 0 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                boxSizing: 'border-box',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            />
            <SearchIcon
              size={15}
              color="#94a3b8"
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            {searchCatalogQuery && (
              <button
                type="button"
                onClick={() => setSearchCatalogQuery('')}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '22px',
                  height: '22px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                  padding: 0,
                }}
                title="مسح البحث"
              >
                <XIcon size={13} />
              </button>
            )}
          </div>

          {/* COMPANY / CATALOG WORKFLOW */}
          {searchCatalogQuery.trim() ? (
            /* SEARCH RESULTS VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', fontSize: '11.5px' }}>
                <span style={{ color: '#475569', fontWeight: 700 }}>
                  نتائج البحث: ({displayedProducts.length} صنف)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {outOfStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOutOfStock((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showOutOfStock ? '#170e5e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '11px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      {showOutOfStock ? 'إخفاء غير المتوفر' : `غير المتوفر (${outOfStockCount})`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSearchCatalogQuery('')}
                    style={{ background: 'none', border: 'none', color: '#170e5e', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                  >
                    العودة لتصفح الشركات
                  </button>
                </div>
              </div>

              {renderProductsList(displayedProducts)}
            </div>
          ) : !selectedCompany ? (
            /* BROWSE COMPANIES TRIGGER / GRID */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {!isBrowsingCompanies ? (
                /* INITIAL SCREEN: BUTTON TO BROWSE COMPANIES (Products hidden) */
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    border: '1px solid #e2e8f0',
                    padding: '20px 16px',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '14px',
                      backgroundColor: '#eef2ff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#170e5e',
                    }}
                  >
                    <BuildingIcon size={24} />
                  </div>

                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                      تصفح المنتجات حسب الشركات والأقسام
                    </h3>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                      اختر الشركة الموردة لعرض أقسامها ومنتجاتها وحجز الكميات بالكرتونة والقطعة ({companies.length} شركة مسجلة)
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsBrowsingCompanies(true)}
                    style={{
                      height: '40px',
                      padding: '0 24px',
                      backgroundColor: '#170e5e',
                      color: '#ffffff',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(23,14,94,0.15)',
                    }}
                  >
                    <BriefcaseIcon size={16} />
                    <span>تصفح الشركات ({companies.length})</span>
                  </button>
                </div>
              ) : (
                /* COMPANIES GRID VIEW */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '3px', height: '14px', backgroundColor: '#170e5e', borderRadius: '2px', display: 'inline-block' }} />
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                        شركات وموردي البضاعة ({companies.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBrowsingCompanies(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      إخفاء القائمة
                    </button>
                  </div>

                  {companies.length === 0 ? (
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '12px' }}>
                      لا توجد شركات أو أصناف مسجلة بالمخزن حالياً
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                        gap: '10px',
                      }}
                    >
                      {companies.map((comp) => (
                        <div
                          key={comp.name}
                          onClick={() => {
                            setSelectedCompany(comp.name);
                            setSelectedCategory('all');
                          }}
                          style={{
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '14px',
                            padding: '14px 10px',
                            cursor: 'pointer',
                            textAlign: 'center',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                            transition: 'border-color 0.15s ease',
                          }}
                        >
                          <div
                            style={{
                              width: '42px',
                              height: '42px',
                              borderRadius: '12px',
                              backgroundColor: '#eef2ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#170e5e',
                            }}
                          >
                            <BuildingIcon size={20} />
                          </div>

                          <span
                            style={{
                              fontWeight: 800,
                              fontSize: '12.5px',
                              color: '#0f172a',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={comp.name}
                          >
                            {comp.name}
                          </span>

                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              color: comp.availableProducts > 0 ? '#047857' : '#94a3b8',
                              backgroundColor: comp.availableProducts > 0 ? '#f0fdf4' : '#f1f5f9',
                              border: `1px solid ${comp.availableProducts > 0 ? '#bbf7d0' : '#e2e8f0'}`,
                              padding: '2px 8px',
                              borderRadius: '12px',
                            }}
                          >
                            {comp.availableProducts > 0 ? `${comp.availableProducts} صنف متاح` : 'نفد الرصيد'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* SELECTED COMPANY VIEW: HORIZONTAL CATEGORIES BAR & PRODUCTS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* COMPANY HEADER WITH BACK BUTTON */}
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  padding: '10px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCompany(null);
                      setSelectedCategory('all');
                    }}
                    style={{
                      height: '28px',
                      padding: '0 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#f8fafc',
                      color: '#170e5e',
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ArrowRightIcon size={14} />
                    <span>تصفح الشركات</span>
                  </button>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {selectedCompany}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    ({displayedProducts.length} صنف)
                  </span>
                  {outOfStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowOutOfStock((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: showOutOfStock ? '#170e5e' : '#64748b',
                        fontWeight: 700,
                        fontSize: '10.5px',
                        cursor: 'pointer',
                        textDecoration: 'underline',
                        padding: 0,
                      }}
                    >
                      {showOutOfStock ? 'إخفاء غير المتوفر' : `غير المتوفر (${outOfStockCount})`}
                    </button>
                  )}
                </div>
              </div>

              {/* HORIZONTAL CATEGORIES BAR (DEFAULT IS 'all') */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  overflowX: 'auto',
                  padding: '2px 0 6px',
                  scrollbarWidth: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    border: selectedCategory === 'all' ? '1px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: selectedCategory === 'all' ? '#170e5e' : '#ffffff',
                    color: selectedCategory === 'all' ? '#ffffff' : '#475569',
                  }}
                >
                  الكل ({catalogProducts.filter((p) => ((p.supplierName || '').trim() || 'الشركة العامة') === selectedCompany).length})
                </button>

                {companyCategories.map((cat) => (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      border: selectedCategory === cat.name ? '1px solid #170e5e' : '1px solid #cbd5e1',
                      backgroundColor: selectedCategory === cat.name ? '#170e5e' : '#ffffff',
                      color: selectedCategory === cat.name ? '#ffffff' : '#475569',
                    }}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>

              {/* PRODUCTS LIST */}
              {renderProductsList(displayedProducts)}
            </div>
          )}

          {/* BOOKING CART & STEPPERS (Visible when cart has items) */}
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
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cart.map((line) => {
                  const lineTotal = line.cartonMultiplier > 1 && (line.cartons > 0 || line.pieces > 0)
                    ? line.cartons * line.cartonUnitPrice + line.pieces * line.pieceUnitPrice
                    : line.quantity * line.pieceUnitPrice;

                  return (
                    <div
                      key={line.productId}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: '12.5px', color: '#0f172a' }}>{line.productName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            {line.cartonMultiplier > 1 ? (
                              <span>
                                {line.cartons > 0 ? `${line.cartons} ${line.packagingUnitName || 'كرتونة'}` : ''}
                                {line.cartons > 0 && line.pieces > 0 ? ' + ' : ''}
                                {line.pieces > 0 ? `${line.pieces} قطعة` : ''}
                                {' '}(إجمالي: {line.quantity} قطعة)
                              </span>
                            ) : (
                              <span>{line.quantity} قطعة</span>
                            )}
                          </div>
                        </div>

                        <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#170e5e' }}>
                          {lineTotal.toFixed(2)} <CurrencySymbol />
                        </span>
                      </div>

                      {/* QUICK CONTROLS IN CART */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                        {line.cartonMultiplier > 1 ? (
                          <>
                            <CompactStepper
                              value={line.cartons}
                              unitLabel={line.packagingUnitName || 'كرتونة'}
                              onIncrement={() => handleCartDelta(line.productId, 'carton', 1)}
                              onDecrement={() => handleCartDelta(line.productId, 'carton', -1)}
                              onChange={(val) => {
                                const prod = catalogProducts.find((p) => p.id === line.productId);
                                if (prod) handleUpdateProductUnits(prod, val, line.pieces);
                              }}
                              disabledDecrement={line.cartons <= 0}
                              height="28px"
                              inputWidth="32px"
                            />
                            <CompactStepper
                              value={line.pieces}
                              unitLabel="قطع"
                              onIncrement={() => handleCartDelta(line.productId, 'piece', 1)}
                              onDecrement={() => handleCartDelta(line.productId, 'piece', -1)}
                              onChange={(val) => {
                                const prod = catalogProducts.find((p) => p.id === line.productId);
                                if (prod) handleUpdateProductUnits(prod, line.cartons, val);
                              }}
                              disabledDecrement={line.pieces <= 0}
                              height="28px"
                              inputWidth="32px"
                            />
                          </>
                        ) : (
                          <CompactStepper
                            value={line.quantity}
                            unitLabel="قطع"
                            onIncrement={() => handleCartDelta(line.productId, 'piece', 1)}
                            onDecrement={() => handleCartDelta(line.productId, 'piece', -1)}
                            onChange={(val) => {
                              const prod = catalogProducts.find((p) => p.id === line.productId);
                              if (prod) handleUpdateProductUnits(prod, 0, val);
                            }}
                            disabledDecrement={line.quantity <= 0}
                            height="28px"
                            inputWidth="34px"
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
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

  /**
   * Helper function to render a list of products with dual Carton & Piece steppers.
   */
  function renderProductsList(products: PreSalesCatalogItem[]) {
    if (isCatalogLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          جاري جلب رصيد المخزن الرئيسي والأسعار...
        </div>
      );
    }

    if (products.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '24px', color: '#64748b', fontSize: '12px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          لا توجد أصناف مطابقة في هذا القسم بالمخزن الرئيسي
        </div>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {products.map((prod) => {
          const isOutOfStock = prod.warehouseAvailable <= 0;
          const pricing = calculateItemPrice(prod, paymentTerms, 1, 1);
          const mult = prod.packagingUnit?.multiplier || 1;
          const isCartonItem = Boolean(prod.packagingUnit && mult > 1);

          // Get current selected quantities from cart
          const cartItem = cart.find((l) => l.productId === prod.id);
          const currentCartons = cartItem?.cartons || 0;
          const currentPieces = isCartonItem ? (cartItem?.pieces || 0) : (cartItem?.quantity || 0);
          const totalChosen = cartItem?.quantity || 0;

          // Available in cartons breakdown
          const availCartons = isCartonItem ? Math.floor(prod.warehouseAvailable / mult) : 0;
          const availPieces = isCartonItem ? prod.warehouseAvailable % mult : prod.warehouseAvailable;

          return (
            <div
              key={prod.id}
              style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 12px',
                backgroundColor: isOutOfStock ? '#f8fafc' : '#ffffff',
                opacity: isOutOfStock ? 0.65 : 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              {/* Row 1: Product Name, Category & Barcode */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                  <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', lineHeight: 1.35 }}>
                    {prod.name}
                  </span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {prod.supplierName && (
                      <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                        {prod.supplierName}
                      </span>
                    )}
                    {prod.categoryName && (
                      <span style={{ fontSize: '10px', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                        {prod.categoryName}
                      </span>
                    )}
                  </div>
                </div>
                {prod.barcode ? (
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace', flexShrink: 0 }}>
                    {prod.barcode}
                  </span>
                ) : null}
              </div>

              {/* Row 2: Pricing Badges & Expected Profit */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ color: '#170e5e', fontWeight: 900, fontSize: '13.5px' }}>
                  {pricing.effectivePrice.toFixed(2)} <CurrencySymbol />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#64748b' }}> / قطعة</span>
                  {pricing.tierType === 'credit' ? (
                    <span style={{ color: '#b45309', fontSize: '10.5px', fontWeight: 700, marginRight: '3px' }}> (آجل)</span>
                  ) : null}
                </span>

                {isCartonItem && (
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#4338ca', backgroundColor: '#eef2ff', padding: '2px 7px', borderRadius: '5px' }}>
                    {(pricing.effectivePrice * mult).toFixed(2)} <CurrencySymbol /> / {prod.packagingUnit?.name || 'كرتونة'} ({mult}ق)
                  </span>
                )}

                {pricing.consumerPrice ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#475569',
                      backgroundColor: '#f1f5f9',
                      padding: '2px 7px',
                      borderRadius: '5px',
                    }}
                  >
                    مستهلك: {pricing.consumerPrice.toFixed(2)}
                  </span>
                ) : null}

                {pricing.consumerPrice && pricing.consumerPrice > pricing.effectivePrice ? (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#059669',
                      backgroundColor: '#ecfdf5',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      border: '1px solid #a7f3d0',
                    }}
                  >
                    ربح: +{(pricing.consumerPrice - pricing.effectivePrice).toFixed(2)}
                  </span>
                ) : null}
              </div>

              {/* Row 3: Warehouse Stock & Available Units */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isOutOfStock ? '#b91c1c' : '#047857',
                    backgroundColor: isOutOfStock ? '#fee2e2' : '#f0fdf4',
                    border: `1px solid ${isOutOfStock ? '#fca5a5' : '#bbf7d0'}`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isOutOfStock ? '#ef4444' : '#10b981', display: 'inline-block' }} />
                  {isOutOfStock ? (
                    'نفد من المخزن'
                  ) : isCartonItem ? (
                    `متاح: ${prod.warehouseAvailable} ق (${availCartons} ك + ${availPieces} ق)`
                  ) : (
                    `متاح بالمخزن: ${prod.warehouseAvailable} قطعة`
                  )}
                </span>

                {totalChosen > 0 && (
                  <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#170e5e', backgroundColor: '#ede9fe', padding: '2px 8px', borderRadius: '6px' }}>
                    المطلوب: {totalChosen} قطعة
                  </span>
                )}
              </div>

              {/* Row 4: CARTON & PIECE STEPPERS (Strict RTL: [+] on right, [-] on left) */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '4px',
                  borderTop: '1px dashed #f1f5f9',
                  gap: '6px',
                }}
              >
                {isOutOfStock ? (
                  <span style={{ fontSize: '11.5px', color: '#94a3b8', fontWeight: 600 }}>الصنف غير متاح للحجز</span>
                ) : isCartonItem ? (
                  /* Dual Steppers for Cartons and Pieces */
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CompactStepper
                        value={currentCartons}
                        unitLabel={prod.packagingUnit?.name || 'كرتونة'}
                        onIncrement={() => handleUpdateProductUnits(prod, currentCartons + 1, currentPieces)}
                        onDecrement={() => handleUpdateProductUnits(prod, Math.max(0, currentCartons - 1), currentPieces)}
                        onChange={(val) => handleUpdateProductUnits(prod, val, currentPieces)}
                        disabledDecrement={currentCartons <= 0}
                        height="30px"
                        inputWidth="36px"
                      />
                      <CompactStepper
                        value={currentPieces}
                        unitLabel="قطع"
                        onIncrement={() => handleUpdateProductUnits(prod, currentCartons, currentPieces + 1)}
                        onDecrement={() => handleUpdateProductUnits(prod, currentCartons, Math.max(0, currentPieces - 1))}
                        onChange={(val) => handleUpdateProductUnits(prod, currentCartons, val)}
                        disabledDecrement={currentPieces <= 0}
                        height="30px"
                        inputWidth="36px"
                      />
                    </div>

                    {totalChosen === 0 && (
                      <button
                        type="button"
                        onClick={() => handleUpdateProductUnits(prod, 1, 0)}
                        style={{
                          height: '30px',
                          padding: '0 10px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#170e5e',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <PlusIcon size={13} />
                        <span>حجز كرتونة</span>
                      </button>
                    )}
                  </div>
                ) : (
                  /* Single Stepper for Pieces */
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <CompactStepper
                      value={currentPieces}
                      unitLabel="قطع"
                      onIncrement={() => handleUpdateProductUnits(prod, 0, currentPieces + 1)}
                      onDecrement={() => handleUpdateProductUnits(prod, 0, Math.max(0, currentPieces - 1))}
                      onChange={(val) => handleUpdateProductUnits(prod, 0, val)}
                      disabledDecrement={currentPieces <= 0}
                      height="30px"
                      inputWidth="38px"
                    />

                    {totalChosen === 0 && (
                      <button
                        type="button"
                        onClick={() => handleUpdateProductUnits(prod, 0, 1)}
                        style={{
                          height: '30px',
                          padding: '0 12px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: '#170e5e',
                          color: '#ffffff',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <PlusIcon size={13} />
                        <span>إضافة قطعة</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
};
