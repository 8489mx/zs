import { useMemo } from 'react';
import { formatCurrency } from '@/lib/format';
import { paymentLabel } from '@/features/pos/lib/pos-workspace.helpers';
import { getProductPrice } from '@/features/pos/lib/pos.domain';
import type { PaymentChannel, PaymentType, PosProductFilter } from '@/features/pos/hooks/usePosWorkspace';
import type { PosItem, PosPriceType } from '@/features/pos/types/pos.types';
import type { Product, Sale } from '@/types/domain';
import { SINGLE_STORE_MODE } from '@/config/product-scope';

interface PosWorkspaceDerivedParams {
  saleProducts: Product[];
  products: Product[];
  customers: Array<{ id: string | number; name: string }>;
  branches: Array<{ id: string | number; name: string }>;
  locations: Array<{ id: string | number; name: string }>;
  openShiftRows: Array<{ id: string | number; docNo?: string; openedById?: string | number }>;
  authUserId?: string | number | null;
  authPermissions?: string[];
  settings?: { taxRate?: number | string; taxMode?: string } | null;
  heldDrafts: Array<unknown>;
  recentProductIds: string[];
  productFilter: PosProductFilter;
  cart: PosItem[];
  discount: number;
  paidAmount: number;
  paymentType: PaymentType;
  paymentChannel: PaymentChannel;
  customerId: string;
  branchId: string;
  locationId: string;
  lastSale: Sale | null;
}

function getCanSubmitHint(params: {
  cartLength: number;
  hasOperationalSetup: boolean;
  hasCatalogReady: boolean;
  requiresCashierShift: boolean;
  ownOpenShift: { id: string | number } | null;
  hasCreditWithoutCustomer: boolean;
  hasZeroPriceLine: boolean;
  hasDiscountPermissionViolation?: boolean;
  hasPricePermissionViolation?: boolean;
  hasUnderpaidSale: boolean;
}) {
  if (!params.cartLength) return 'أضف صنفًا واحدًا على الأقل.';
  if (!params.hasOperationalSetup) return 'أكمل إعداد المتجر ونقطة التشغيل أولًا.';
  if (!params.hasCatalogReady) return 'أضف الأصناف أولًا قبل البيع.';
  if (params.requiresCashierShift && !params.ownOpenShift) return 'افتح وردية كاشير أولًا.';
  if (params.hasCreditWithoutCustomer) return 'البيع الآجل يحتاج اختيار عميل.';
  if (params.hasZeroPriceLine) return 'راجع السلة: يوجد صنف بسعر صفر.';
  if ((params as typeof params & { hasDiscountPermissionViolation?: boolean }).hasDiscountPermissionViolation) return 'لا تملك صلاحية تعديل الخصم.';
  if ((params as typeof params & { hasPricePermissionViolation?: boolean }).hasPricePermissionViolation) return 'لا تملك صلاحية تعديل السعر.';
  if (params.hasUnderpaidSale) return 'أكمل المدفوع أو حوّل العملية إلى آجل.';
  return '';
}

export function usePosWorkspaceDerived(params: PosWorkspaceDerivedParams) {
  const recentProducts = useMemo(() => {
    const map = new Map(params.products.map((product) => [product.id, product]));
    return params.recentProductIds.map((id) => map.get(id)).filter(Boolean) as Product[];
  }, [params.products, params.recentProductIds]);

  const filteredSaleProducts = useMemo(() => {
    const recentSet = new Set(params.recentProductIds);
    return params.saleProducts.filter((product) => {
      if (params.productFilter === 'offers' && !(product.offers || []).length) return false;
      if (params.productFilter === 'priced' && !(product.customerPrices || []).length) return false;
      if (params.productFilter === 'low' && !(Number(product.stock || 0) <= Number(product.minStock || 0))) return false;
      if (params.productFilter === 'recent' && !recentSet.has(product.id)) return false;
      return true;
    });
  }, [params.productFilter, params.recentProductIds, params.saleProducts]);

  const totals = useMemo(() => {
    const subTotal = params.cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const discountValue = Math.max(0, Number(params.discount || 0));
    const taxRate = Number(params.settings?.taxRate || 0);
    const pricesIncludeTax = String(params.settings?.taxMode || 'exclusive') === 'inclusive';
    let taxAmount = 0;
    let total = Math.max(0, subTotal - discountValue);
    if (taxRate > 0) {
      if (pricesIncludeTax) {
        taxAmount = Number((total - (total / (1 + taxRate / 100))).toFixed(2));
      } else {
        taxAmount = Number((total * (taxRate / 100)).toFixed(2));
        total = Number((total + taxAmount).toFixed(2));
      }
    }
    return { subTotal, discountValue, taxRate, taxAmount, total, pricesIncludeTax };
  }, [params.cart, params.discount, params.settings]);

  const changeAmount = Math.max(0, Number(params.paidAmount || 0) - totals.total);
  const amountDue = Math.max(0, Number(totals.total || 0) - Number(params.paidAmount || 0));
  const currentBranch = params.branches.find((branch) => String(branch.id) === String(params.branchId)) || params.branches[0] || null;
  const currentLocation = params.locations.find((location) => String(location.id) === String(params.locationId)) || params.locations[0] || null;
  const ownOpenShift = params.openShiftRows.find((shift) => String(shift.openedById || '') === String(params.authUserId || '')) || null;
  const authPermissions = params.authPermissions || [];
  const canApplyDiscount = authPermissions.includes('canDiscount') || authPermissions.includes('*');
  const canEditPrice = authPermissions.includes('canEditPrice') || authPermissions.includes('*');
  const hasOperationalSetup = Boolean(params.branches.length > 0 && params.locations.length > 0);
  const hasCatalogReady = Boolean(params.products.length > 0);
  const requiresCashierShift = params.paymentType !== 'credit';
  const hasZeroPriceLine = params.cart.some((item) => Number(item.price || 0) <= 0);
  const hasCreditWithoutCustomer = params.paymentType === 'credit' && !params.customerId;
  const hasUnderpaidSale = params.paymentType !== 'credit' && Number(params.paidAmount || 0) < Number(totals.total || 0);
  const hasDiscountPermissionViolation = !canApplyDiscount && Math.abs(Number(params.discount || 0)) > 0.0001;
  const hasPricePermissionViolation = !canEditPrice && params.cart.some((item) => {
    const product = params.products.find((entry) => String(entry.id) === String(item.productId));
    if (!product) return false;
    return Math.abs(Number(item.price || 0) - Number(getProductPrice(product, item.priceType) || 0)) > 0.0001;
  });

  const canSubmitSale = Boolean(
    params.cart.length
    && hasOperationalSetup
    && hasCatalogReady
    && (!requiresCashierShift || ownOpenShift)
    && !hasZeroPriceLine
    && !hasCreditWithoutCustomer
    && !hasUnderpaidSale
    && !hasDiscountPermissionViolation
    && !hasPricePermissionViolation,
  );

  const canSubmitHint = getCanSubmitHint({
    cartLength: params.cart.length,
    hasOperationalSetup,
    hasCatalogReady,
    requiresCashierShift,
    ownOpenShift,
    hasCreditWithoutCustomer,
    hasZeroPriceLine,
    hasDiscountPermissionViolation,
    hasPricePermissionViolation,
    hasUnderpaidSale,
  } as Parameters<typeof getCanSubmitHint>[0]);

  const contextBadges = [
    ...(SINGLE_STORE_MODE ? [] : [{ key: 'branch', label: `الفرع: ${currentBranch?.name || 'الافتراضي'}` }]),
    { key: 'location', label: `${SINGLE_STORE_MODE ? 'نقطة التشغيل' : 'الموقع'}: ${currentLocation?.name || (SINGLE_STORE_MODE ? 'المخزن الأساسي' : 'الافتراضي')}` },
    { key: 'shift', label: ownOpenShift ? `الوردية: ${ownOpenShift.docNo || 'مفتوحة'}` : 'الوردية: غير مفتوحة' },
    { key: 'payment', label: `الدفع: ${paymentLabel(params.paymentType, params.paymentChannel)}` },
    { key: 'held', label: `المعلقات: ${params.heldDrafts.length}` },
    { key: 'products', label: `المعروض: ${filteredSaleProducts.length}` },
  ];

  const shortSummary = [
    { key: 'total', label: 'المطلوب دفعه', value: formatCurrency(totals.total) },
    { key: 'items', label: 'عدد الأصناف', value: String(params.cart.length) },
    { key: 'shift', label: 'الوردية', value: ownOpenShift ? (ownOpenShift.docNo || 'مفتوحة') : 'غير مفتوحة' },
    { key: 'change', label: params.paymentType === 'credit' ? 'المتبقي على العميل' : 'الباقي للعميل', value: formatCurrency(params.paymentType === 'credit' ? totals.total : changeAmount) },
  ];

  const selectedCustomerName = params.customers.find((customer) => String(customer.id) === String(params.customerId))?.name || 'عميل نقدي';
  const hasRecentProducts = recentProducts.length > 0;
  const selectedPriceType = (params.cart[0]?.priceType || null) as PosPriceType | null;

  return {
    recentProducts,
    filteredSaleProducts,
    totals,
    changeAmount,
    amountDue,
    currentBranch,
    currentLocation,
    ownOpenShift,
    hasOperationalSetup,
    hasCatalogReady,
    requiresCashierShift,
    hasZeroPriceLine,
    hasCreditWithoutCustomer,
    hasDiscountPermissionViolation,
    hasPricePermissionViolation,
    hasUnderpaidSale,
    canApplyDiscount,
    canEditPrice,
    canSubmitSale,
    canSubmitHint,
    contextBadges,
    shortSummary,
    selectedCustomerName,
    hasRecentProducts,
    selectedPriceType,
  };
}
