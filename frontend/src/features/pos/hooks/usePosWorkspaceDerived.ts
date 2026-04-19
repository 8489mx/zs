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
  openShiftRows: Array<{ id: string | number; docNo?: string; openedById?: string | number; openedByName?: string }>;
  authUserId?: string | number | null;
  authPermissions?: string[];
  settings?: { taxRate?: number | string; taxMode?: string } | null;
  heldDrafts: Array<unknown>;
  recentProductIds: string[];
  productFilter: PosProductFilter;
  cart: PosItem[];
  discount: number;
  discountApprovalGranted?: boolean;
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

function getShiftDisplayLabel(shift: { docNo?: string; openedByName?: string } | null | undefined) {
  if (!shift) return 'غير مفتوحة';
  const openedByName = String(shift.openedByName || '').trim();
  const docNo = String(shift.docNo || '').trim();
  if (openedByName && docNo) return `${openedByName} — ${docNo}`;
  return openedByName || docNo || 'مفتوحة';
}

export function usePosWorkspaceDerived(params: PosWorkspaceDerivedParams) {
  const productList = useMemo(() => (Array.isArray(params.products) ? params.products : []), [params.products]);
  const saleProductList = useMemo(() => (Array.isArray(params.saleProducts) ? params.saleProducts : []), [params.saleProducts]);
  const branchList = useMemo(() => (Array.isArray(params.branches) ? params.branches : []), [params.branches]);
  const locationList = useMemo(() => (Array.isArray(params.locations) ? params.locations : []), [params.locations]);
  const openShiftList = useMemo(() => (Array.isArray(params.openShiftRows) ? params.openShiftRows : []), [params.openShiftRows]);
  const customerList = useMemo(() => (Array.isArray(params.customers) ? params.customers : []), [params.customers]);
  const authPermissionSet = useMemo(() => new Set(params.authPermissions || []), [params.authPermissions]);
  const recentProductIdSet = useMemo(() => new Set(params.recentProductIds), [params.recentProductIds]);
  const productById = useMemo(() => new Map(productList.map((product) => [String(product.id), product])), [productList]);
  const customerById = useMemo(() => new Map(customerList.map((customer) => [String(customer.id), customer.name])), [customerList]);
  const branchById = useMemo(() => new Map(branchList.map((branch) => [String(branch.id), branch])), [branchList]);
  const locationById = useMemo(() => new Map(locationList.map((location) => [String(location.id), location])), [locationList]);
  const openShiftByUserId = useMemo(
    () => new Map(openShiftList.map((shift) => [String(shift.openedById || ''), shift])),
    [openShiftList],
  );
  const defaultPriceByProductId = useMemo(
    () => new Map(productList.map((product) => [String(product.id), Number(getProductPrice(product, 'retail', 1) || 0)])),
    [productList],
  );

  const recentProducts = useMemo(() => {
    return params.recentProductIds.map((id) => productById.get(String(id))).filter(Boolean) as Product[];
  }, [params.recentProductIds, productById]);

  const filteredSaleProducts = useMemo(() => {
    return saleProductList.filter((product) => {
      if (params.productFilter === 'offers' && !(product.offers || []).length) return false;
      if (params.productFilter === 'priced' && !(product.customerPrices || []).length) return false;
      if (params.productFilter === 'low' && !(Number(product.stock || 0) <= Number(product.minStock || 0))) return false;
      if (params.productFilter === 'recent' && !recentProductIdSet.has(product.id)) return false;
      return true;
    });
  }, [params.productFilter, recentProductIdSet, saleProductList]);

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

  const changeAmount = useMemo(() => Math.max(0, Number(params.paidAmount || 0) - totals.total), [params.paidAmount, totals.total]);
  const amountDue = useMemo(() => Math.max(0, Number(totals.total || 0) - Number(params.paidAmount || 0)), [params.paidAmount, totals.total]);
  const currentBranch = useMemo(
    () => branchById.get(String(params.branchId)) || branchList[0] || null,
    [branchById, branchList, params.branchId],
  );
  const currentLocation = useMemo(
    () => locationById.get(String(params.locationId)) || locationList[0] || null,
    [locationById, locationList, params.locationId],
  );
  const ownOpenShift = useMemo(
    () => openShiftByUserId.get(String(params.authUserId || '')) || null,
    [openShiftByUserId, params.authUserId],
  );
  const canApplyDiscount = authPermissionSet.has('canDiscount') || authPermissionSet.has('*') || Boolean(params.discountApprovalGranted);
  const canEditPrice = authPermissionSet.has('canEditPrice') || authPermissionSet.has('*');
  const hasOperationalSetup = Boolean(branchList.length > 0 && locationList.length > 0);
  const hasCatalogReady = Boolean(productList.length > 0);
  const requiresCashierShift = params.paymentType !== 'credit';
  const hasZeroPriceLine = params.cart.some((item) => Number(item.price || 0) <= 0);
  const hasCreditWithoutCustomer = params.paymentType === 'credit' && !params.customerId;
  const hasUnderpaidSale = params.paymentType !== 'credit' && Number(params.paidAmount || 0) < Number(totals.total || 0);
  const hasDiscountPermissionViolation = !canApplyDiscount && Math.abs(Number(params.discount || 0)) > 0.0001;
  const hasPricePermissionViolation = !canEditPrice && params.cart.some((item) => {
    const baselinePrice = item.priceType === 'retail' && Number(item.qty || 0) === 1
      ? defaultPriceByProductId.get(String(item.productId))
      : undefined;
    if (typeof baselinePrice === 'number') {
      return Math.abs(Number(item.price || 0) - baselinePrice) > 0.0001;
    }
    const product = productById.get(String(item.productId));
    if (!product) return false;
    return Math.abs(Number(item.price || 0) - Number(getProductPrice(product, item.priceType, item.qty) || 0)) > 0.0001;
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

  const openShiftLabel = getShiftDisplayLabel(ownOpenShift);

  const contextBadges = useMemo(() => [
    ...(SINGLE_STORE_MODE ? [] : [{ key: 'branch', label: `الفرع: ${currentBranch?.name || 'الافتراضي'}` }]),
    { key: 'location', label: `${SINGLE_STORE_MODE ? 'نقطة التشغيل' : 'المخزن'}: ${currentLocation?.name || (SINGLE_STORE_MODE ? 'المخزن الأساسي' : 'الافتراضي')}` },
    { key: 'shift', label: `الوردية: ${openShiftLabel}` },
    { key: 'payment', label: `الدفع: ${paymentLabel(params.paymentType, params.paymentChannel)}` },
    { key: 'held', label: `المعلقات: ${params.heldDrafts.length}` },
    { key: 'products', label: `المعروض: ${filteredSaleProducts.length}` },
  ], [currentBranch?.name, currentLocation?.name, filteredSaleProducts.length, openShiftLabel, params.heldDrafts.length, params.paymentChannel, params.paymentType]);

  const shortSummary = useMemo(() => [
    { key: 'total', label: 'المطلوب دفعه', value: formatCurrency(totals.total) },
    { key: 'items', label: 'عدد الأصناف', value: String(params.cart.length) },
    { key: 'shift', label: 'الوردية', value: openShiftLabel },
    { key: 'change', label: params.paymentType === 'credit' ? 'المتبقي على العميل' : 'الباقي للعميل', value: formatCurrency(params.paymentType === 'credit' ? totals.total : changeAmount) },
  ], [changeAmount, openShiftLabel, params.cart.length, params.paymentType, totals.total]);

  const selectedCustomerName = customerById.get(String(params.customerId)) || 'عميل نقدي';
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
