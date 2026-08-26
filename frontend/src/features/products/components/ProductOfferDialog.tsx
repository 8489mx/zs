import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';
import { Field } from '@/shared/ui/field';
import { MutationFeedback } from '@/shared/components/mutation-feedback';
import { productsApi } from '@/features/products/api/products.api';
import { bomsApi } from '@/shared/api/boms.api';
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import type { Product, ProductOffer } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { formatCurrency } from '@/lib/format';

interface ProductOfferDialogProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}

function todayIsoDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDaysIsoDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getOfferStatus(offer: ProductOffer) {
  const today = todayIsoDate();
  const from = offer.from || today;
  const to = offer.to || null;
  if (from > today) return { label: 'يبدأ قريباً', color: '#b45309', bg: '#fef3c7', border: '#fde68a' };
  if (to && to < today) return { label: 'منتهي الصلاحية', color: '#b91c1c', bg: '#fee2e2', border: '#fecaca' };
  return { label: 'نشط وساري', color: '#047857', bg: '#ecfdf5', border: '#a7f3d0' };
}

export function ProductOfferDialog({ open, product: initialProduct, onClose, onSaved }: ProductOfferDialogProps) {
  const queryClient = useQueryClient();
  const [activeProduct, setActiveProduct] = useState<Product | null>(initialProduct || null);
  const [searchQuery, setSearchQuery] = useState('');
  type SearchFilterKey = 'all' | 'offers' | 'near_expiry' | 'stagnant' | 'high_margin' | 'overstock' | 'no_offers';
  const [searchFilter, setSearchFilter] = useState<SearchFilterKey>('all');
  
  const [offerType, setOfferType] = useState<'percent' | 'fixed' | 'price' | 'bundle'>('percent');
  const [offerValue, setOfferValue] = useState('');
  const [offerStartDate, setOfferStartDate] = useState(todayIsoDate);
  const [offerEndDate, setOfferEndDate] = useState('');
  const [minQty, setMinQty] = useState(1);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedOffersTab, setSelectedOffersTab] = useState<'active' | 'expired' | 'all'>('active');

  const [dialogMode, setDialogMode] = useState<'item_offers' | 'active_combos' | 'create_combo'>('item_offers');

  // Combo Creator / Editor State
  const [editingComboId, setEditingComboId] = useState<string | number | null>(null);
  const [editingBomId, setEditingBomId] = useState<string | number | null>(null);
  const [comboName, setComboName] = useState('');
  const [comboBarcode, setComboBarcode] = useState('');
  const [comboPrice, setComboPrice] = useState('');
  const [comboComponents, setComboComponents] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [componentSearchQuery, setComponentSearchQuery] = useState('');
  const [comboSearchQuery, setComboSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setActiveProduct(initialProduct || null);
    setSearchQuery('');
    setSearchFilter('all');
    setOfferType('percent');
    setOfferValue('');
    setOfferStartDate(todayIsoDate());
    setOfferEndDate('');
    setMinQty(1);
    setEditingIndex(null);
    setSelectedOffersTab('active');
    setDialogMode('item_offers');
    setEditingComboId(null);
    setEditingBomId(null);
    setComboName('');
    setComboBarcode('');
    setComboPrice('');
    setComboComponents([]);
    setComponentSearchQuery('');
    setComboSearchQuery('');
  }, [open, initialProduct]);

  // Search products query for global search mode
  const { data: searchResultsData, isLoading: isSearching } = useQuery({
    queryKey: ['products.search.offers', searchQuery],
    queryFn: () => productsApi.listPage({ q: searchQuery.trim(), pageSize: 60 }),
    enabled: open && !activeProduct && dialogMode === 'item_offers',
  });

  // BOMs list for identifying combos and their recipes
  const { data: bomsList = [] } = useQuery({
    queryKey: ['boms.list.offers'],
    queryFn: () => bomsApi.list(),
    enabled: open,
  });

  // All products for combos list
  const { data: allProductsData, isLoading: isLoadingAllProducts } = useQuery({
    queryKey: ['products.all.combos.list'],
    queryFn: () => productsApi.listAll(),
    enabled: open,
  });
  const allProducts: Product[] = allProductsData?.products || [];

  // Helper to identify combo products
  const isComboProduct = useCallback((prod: Product) => {
    if ((prod as any).metadata?.is_combo === true) return true;
    if (bomsList.some((b) => String(b.product_id) === String(prod.id))) return true;
    if (prod.notes?.includes('عرض مجمع') || prod.notes?.includes('وجبة كومبو')) return true;
    return false;
  }, [bomsList]);

  // Component search query for combo creation (loads store products and filters on typing)
  const { data: componentSearchResultsData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['products.combo.components.search', componentSearchQuery],
    queryFn: () => productsApi.listPage({ q: componentSearchQuery.trim(), pageSize: 60 }),
    enabled: open && dialogMode === 'create_combo',
  });

  // Exclude combo products from component picker to avoid combos inside combos!
  const availableCatalogProducts: Product[] = useMemo(() => {
    const raw = componentSearchResultsData?.products || [];
    return raw.filter((p) => !isComboProduct(p));
  }, [componentSearchResultsData?.products, isComboProduct]);

  // Active combo products list
  const comboProducts = useMemo(() => {
    return allProducts.filter((p) => isComboProduct(p));
  }, [allProducts, isComboProduct]);

  const filteredComboProducts = useMemo(() => {
    if (!comboSearchQuery.trim()) return comboProducts;
    const q = comboSearchQuery.trim().toLowerCase();
    return comboProducts.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [comboProducts, comboSearchQuery]);

  const comboTotalItemsPrice = useMemo(() => {
    return comboComponents.reduce((sum, item) => {
      const price = Number(item.product.retailPrice || (item.product as any).retail_price || 0);
      return sum + (price * item.quantity);
    }, 0);
  }, [comboComponents]);

  const comboTotalCost = useMemo(() => {
    return comboComponents.reduce((sum, item) => {
      const cost = Number(item.product.costPrice || (item.product as any).cost_price || 0);
      return sum + (cost * item.quantity);
    }, 0);
  }, [comboComponents]);

  const numericComboPrice = Number(comboPrice) || 0;
  const comboSavings = comboTotalItemsPrice > numericComboPrice && numericComboPrice > 0
    ? comboTotalItemsPrice - numericComboPrice
    : 0;
  const comboSavingsPercent = comboTotalItemsPrice > 0 && comboSavings > 0
    ? ((comboSavings / comboTotalItemsPrice) * 100).toFixed(1)
    : '0';

  const saveComboMutation = useMutation({
    mutationFn: async () => {
      const name = comboName.trim();
      if (!name) throw new Error('يرجى كتابة اسم العرض المجمع');
      if (comboComponents.length === 0) throw new Error('يرجى إضافة مكون واحد على الأقل للعرض');
      if (!numericComboPrice || numericComboPrice <= 0) throw new Error('يرجى تحديد سعر بيع العرض');

      const barcode = comboBarcode.trim() || undefined;
      const notes = `عرض مجمع يشمل: ${comboComponents.map((c) => `${c.product.name} (×${c.quantity})`).join(', ')}`;

      let productId: string | number;

      if (editingComboId) {
        productId = editingComboId;
        const existingProd = allProducts.find((p) => String(p.id) === String(editingComboId));
        await productsApi.update(String(editingComboId), {
          name,
          barcode: barcode || undefined,
          retailPrice: numericComboPrice,
          costPrice: comboTotalCost,
          wholesalePrice: numericComboPrice,
          minStock: existingProd?.minStock || 0,
          stock: existingProd?.stock || 0,
          itemType: 'product',
          itemKind: 'standard',
          notes,
          metadata: { ...(existingProd as any)?.metadata, is_combo: true },
          units: existingProd?.units?.length ? existingProd.units : [
            {
              name: 'عرض',
              multiplier: 1,
              barcode: barcode || '',
              isBaseUnit: true,
              isSaleUnit: true,
              isPurchaseUnit: true,
            },
          ],
        });

        const bomPayload = {
          productId: Number(editingComboId),
          quantity: 1,
          overheadCost: 0,
          lines: comboComponents.map((comp) => ({
            componentProductId: Number(comp.product.id),
            quantity: comp.quantity,
            unitName: 'قطعة',
            expectedCost: Number(comp.product.costPrice || (comp.product as any).cost_price || 0),
            unitMultiplier: 1,
            wastePercentage: 0,
          })),
        };

        if (editingBomId) {
          await bomsApi.update(editingBomId, bomPayload);
        } else {
          await bomsApi.create(bomPayload);
        }
      } else {
        const prodRes = await productsApi.create({
          name,
          barcode: barcode || undefined,
          retailPrice: numericComboPrice,
          costPrice: comboTotalCost,
          wholesalePrice: numericComboPrice,
          minStock: 0,
          stock: 0,
          itemType: 'product',
          itemKind: 'standard',
          notes,
          metadata: { is_combo: true },
          units: [
            {
              name: 'عرض',
              multiplier: 1,
              barcode: barcode || '',
              isBaseUnit: true,
              isSaleUnit: true,
              isPurchaseUnit: true,
            },
          ],
        });

        const extractedId = extractCreatedEntityId(prodRes);
        if (!extractedId) throw new Error('تعذر استخراج رقم الصنف الجديد');
        productId = extractedId;

        await bomsApi.create({
          productId: Number(productId),
          quantity: 1,
          overheadCost: 0,
          lines: comboComponents.map((comp) => ({
            componentProductId: Number(comp.product.id),
            quantity: comp.quantity,
            unitName: 'قطعة',
            expectedCost: Number(comp.product.costPrice || (comp.product as any).cost_price || 0),
            unitMultiplier: 1,
            wastePercentage: 0,
          })),
        });
      }

      return { productId, name };
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products.all.combos.list'] });
      queryClient.invalidateQueries({ queryKey: ['boms.list.offers'] });
      setEditingComboId(null);
      setEditingBomId(null);
      setComboName('');
      setComboBarcode('');
      setComboPrice('');
      setComboComponents([]);
      setDialogMode('active_combos');
    },
  });

  const deleteComboMutation = useMutation({
    mutationFn: async (comboProd: Product) => {
      const bom = bomsList.find((b) => String(b.product_id) === String(comboProd.id));
      if (bom && bom.id) {
        await bomsApi.delete(bom.id).catch(() => undefined);
      }
      await productsApi.remove(String(comboProd.id));
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products.all.combos.list'] });
      queryClient.invalidateQueries({ queryKey: ['boms.list.offers'] });
    },
  });

  function startEditCombo(prod: Product) {
    setEditingComboId(prod.id);
    const bom = bomsList.find((b) => String(b.product_id) === String(prod.id));
    setEditingBomId(bom?.id || null);
    setComboName(prod.name);
    setComboBarcode(prod.barcode || '');
    setComboPrice(String(Number(prod.retailPrice || (prod as any).retail_price || 0)));

    if (bom?.lines && Array.isArray(bom.lines)) {
      const loadedComponents: Array<{ product: Product; quantity: number }> = bom.lines.map((line: any) => {
        const compId = line.componentId ?? line.componentProductId ?? line.component_product_id;
        const matchedProd = allProducts.find((p) => String(p.id) === String(compId));
        return {
          product: matchedProd || ({
            id: String(compId),
            name: line.component_product_name || `صنف #${compId}`,
            costPrice: Number(line.expectedCost || line.expected_cost || 0),
            retailPrice: Number(line.expectedCost || line.expected_cost || 0),
          } as any),
          quantity: Math.max(1, Number(line.quantity || 1)),
        };
      });
      setComboComponents(loadedComponents);
    } else {
      setComboComponents([]);
    }
    setComponentSearchQuery('');
    setDialogMode('create_combo');
  }

  function startCreateNewCombo() {
    setEditingComboId(null);
    setEditingBomId(null);
    setComboName('');
    setComboBarcode('');
    setComboPrice('');
    setComboComponents([]);
    setComponentSearchQuery('');
    setDialogMode('create_combo');
  }

  const searchResults: Product[] = searchResultsData?.products || [];

  const filteredSearchResults = useMemo(() => {
    const today = todayIsoDate();
    const todayTime = new Date().getTime();

    return searchResults.filter((prod) => {
      const prodOffers = prod.offers || [];
      const isCombo = Boolean(
        prod.hasBom ||
        prod.bomId ||
        (prod as any).has_bom ||
        (prod as any).bom_id ||
        prod.comboComponentsSummary ||
        (prod.comboOriginalPrice && Number(prod.comboOriginalPrice) > 0)
      );
      const hasActiveOffers = prodOffers.some((o) => !o.to || o.to >= today) || isCombo;
      const retail = Number((prod as any)?.retailPrice || (prod as any)?.retail_price || 0);
      const cost = Number((prod as any)?.costPrice || (prod as any)?.cost_price || 0);
      const stock = Number(prod.stock || 0);
      const minStock = Number(prod.minStock || 0);
      const marginPercent = retail > 0 && cost > 0 ? ((retail - cost) / retail) * 100 : 0;

      const exp = (prod as any).expiryDate || prod.metadata?.expiryDate;
      let isNearExpiry = false;
      if (exp) {
        const expDate = new Date(`${String(exp).slice(0, 10)}T00:00:00`);
        if (!Number.isNaN(expDate.getTime())) {
          const diffDays = Math.ceil((expDate.getTime() - todayTime) / (24 * 60 * 60 * 1000));
          isNearExpiry = diffDays <= 45;
        }
      }

      switch (searchFilter) {
        case 'offers':
          return hasActiveOffers;
        case 'near_expiry':
          return isNearExpiry;
        case 'no_offers':
          return !hasActiveOffers;
        case 'high_margin':
          return marginPercent >= 25 || (retail - cost) >= 20;
        case 'stagnant':
          return stock > 0 && (!hasActiveOffers || marginPercent >= 15);
        case 'overstock':
          return stock >= (minStock > 0 ? minStock * 2 : 10);
        default:
          return true;
      }
    });
  }, [searchResults, searchFilter]);

  const filterStats = useMemo(() => {
    const today = todayIsoDate();
    const todayTime = new Date().getTime();
    let offersCount = 0;
    let nearExpiryCount = 0;
    let noOffersCount = 0;
    let highMarginCount = 0;
    let stagnantCount = 0;
    let overstockCount = 0;

    searchResults.forEach((prod) => {
      const prodOffers = prod.offers || [];
      const isCombo = Boolean(
        prod.hasBom ||
        prod.bomId ||
        (prod as any).has_bom ||
        (prod as any).bom_id ||
        prod.comboComponentsSummary ||
        (prod.comboOriginalPrice && Number(prod.comboOriginalPrice) > 0)
      );
      const hasActiveOffers = prodOffers.some((o) => !o.to || o.to >= today) || isCombo;
      const retail = Number((prod as any)?.retailPrice || (prod as any)?.retail_price || 0);
      const cost = Number((prod as any)?.costPrice || (prod as any)?.cost_price || 0);
      const stock = Number(prod.stock || 0);
      const minStock = Number(prod.minStock || 0);
      const marginPercent = retail > 0 && cost > 0 ? ((retail - cost) / retail) * 100 : 0;

      const exp = (prod as any).expiryDate || prod.metadata?.expiryDate;
      if (exp) {
        const expDate = new Date(`${String(exp).slice(0, 10)}T00:00:00`);
        if (!Number.isNaN(expDate.getTime())) {
          const diffDays = Math.ceil((expDate.getTime() - todayTime) / (24 * 60 * 60 * 1000));
          if (diffDays <= 45) nearExpiryCount++;
        }
      }

      if (hasActiveOffers) offersCount++;
      else noOffersCount++;

      if (marginPercent >= 25 || (retail - cost) >= 20) highMarginCount++;
      if (stock > 0 && (!hasActiveOffers || marginPercent >= 15)) stagnantCount++;
      if (stock >= (minStock > 0 ? minStock * 2 : 10)) overstockCount++;
    });

    return {
      all: searchResults.length,
      offers: offersCount,
      near_expiry: nearExpiryCount,
      no_offers: noOffersCount,
      high_margin: highMarginCount,
      stagnant: stagnantCount,
      overstock: overstockCount,
    };
  }, [searchResults]);

  const offers = useMemo(() => activeProduct?.offers || [], [activeProduct?.offers]);

  const activeOffers = useMemo(() => {
    const today = todayIsoDate();
    return offers
      .map((offer, index) => ({ offer, originalIndex: index }))
      .filter(({ offer }) => !offer.to || offer.to >= today);
  }, [offers]);

  const expiredOffers = useMemo(() => {
    const today = todayIsoDate();
    return offers
      .map((offer, index) => ({ offer, originalIndex: index }))
      .filter(({ offer }) => Boolean(offer.to && offer.to < today));
  }, [offers]);

  const allOffersWithIndex = useMemo(() => {
    return offers.map((offer, index) => ({ offer, originalIndex: index }));
  }, [offers]);

  const visibleOffersList = useMemo(() => {
    if (selectedOffersTab === 'expired') return expiredOffers;
    if (selectedOffersTab === 'all') return allOffersWithIndex;
    return activeOffers;
  }, [selectedOffersTab, activeOffers, expiredOffers, allOffersWithIndex]);

  const retailPrice = Number((activeProduct as any)?.retailPrice || (activeProduct as any)?.retail_price || 0);
  const costPrice = Number((activeProduct as any)?.costPrice || (activeProduct as any)?.cost_price || 0);

  const mutation = useMutation({
    mutationFn: async (nextOffers: ProductOffer[]) => {
      if (!activeProduct) throw new Error('الصنف غير متاح');
      return productsApi.update(
        activeProduct.id,
        buildUpdatePayload(
          toProductFormValues(activeProduct),
          activeProduct,
          normalizeProductUnits(activeProduct.units, activeProduct.barcode || ''),
          normalizeCustomerPrices(activeProduct),
          nextOffers,
        ),
      );
    },
    onSuccess: async () => {
      await invalidateCatalogDomain(queryClient, { includeProducts: true });
    },
  });

  // Real-time calculation simulator
  const numValue = Number(offerValue || 0);
  let simulatedEffectivePrice = retailPrice;
  let simulatedSavings = 0;
  let simulatedSavingsPercent = 0;

  if (numValue > 0 && retailPrice > 0) {
    if (offerType === 'percent') {
      simulatedSavingsPercent = Math.min(100, Math.max(0, numValue));
      simulatedSavings = (retailPrice * simulatedSavingsPercent) / 100;
      simulatedEffectivePrice = Math.max(0, retailPrice - simulatedSavings);
    } else if (offerType === 'fixed') {
      simulatedSavings = Math.min(retailPrice, numValue);
      simulatedEffectivePrice = Math.max(0, retailPrice - simulatedSavings);
      simulatedSavingsPercent = (simulatedSavings / retailPrice) * 100;
    } else if (offerType === 'price') {
      simulatedEffectivePrice = Math.max(0, numValue);
      simulatedSavings = Math.max(0, retailPrice - simulatedEffectivePrice);
      simulatedSavingsPercent = (simulatedSavings / retailPrice) * 100;
    } else if (offerType === 'bundle') {
      const bundleQty = Math.max(1, Number(minQty || 1));
      const totalOrigPrice = retailPrice * bundleQty;
      const bundlePrice = numValue;
      simulatedEffectivePrice = bundleQty > 0 ? (bundlePrice / bundleQty) : retailPrice;
      simulatedSavings = Math.max(0, totalOrigPrice - bundlePrice);
      simulatedSavingsPercent = totalOrigPrice > 0 ? (simulatedSavings / totalOrigPrice) * 100 : 0;
    }
  }

  async function saveOffer() {
    if (!activeProduct) return;
    const value = Number(offerValue || 0);
    if (!(value > 0)) return;
    const nextOffer: ProductOffer = {
      id: editingIndex != null ? offers[editingIndex]?.id : `${Date.now()}`,
      type: offerType,
      value,
      minQty: Math.max(1, Number(minQty || 1)),
      from: offerStartDate || todayIsoDate(),
      to: offerEndDate || null,
    };
    const nextOffers = editingIndex != null
      ? offers.map((offer, index) => (index === editingIndex ? nextOffer : offer))
      : [...offers, nextOffer];
    
    await mutation.mutateAsync(nextOffers);
    const updatedProduct = { ...activeProduct, offers: nextOffers };
    setActiveProduct(updatedProduct);
    onSaved?.(updatedProduct);
    resetForm();
  }

  async function removeOffer(originalIndex: number) {
    if (!activeProduct) return;
    const nextOffers = offers.filter((_, currentIndex) => currentIndex !== originalIndex);
    await mutation.mutateAsync(nextOffers);
    const updatedProduct = { ...activeProduct, offers: nextOffers };
    setActiveProduct(updatedProduct);
    onSaved?.(updatedProduct);
    if (editingIndex === originalIndex) {
      resetForm();
    }
  }

  function loadOffer(originalIndex: number) {
    const offer = offers[originalIndex];
    if (!offer) return;
    setEditingIndex(originalIndex);
    setOfferType(offer.type === 'bundle' ? 'bundle' : offer.type === 'price' ? 'price' : offer.type === 'fixed' ? 'fixed' : 'percent');
    setOfferValue(String(Number(offer.value || 0)));
    setOfferStartDate(String(offer.from || todayIsoDate()));
    setOfferEndDate(String(offer.to || ''));
    setMinQty(Math.max(1, Number(offer.minQty || 1)));
  }

  function resetForm() {
    setEditingIndex(null);
    setOfferType('percent');
    setOfferValue('');
    setOfferStartDate(todayIsoDate());
    setOfferEndDate('');
    setMinQty(1);
  }

  if (!open) return null;

  return (
    <DialogShell open={open} onClose={onClose} width="min(1080px, 95vw)" zIndex={80} ariaLabel="إدارة عروض الصنف">
      <div className="page-stack" style={{ gap: 16 }}>
        
        {/* Header */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #dbeafe'
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  إدارة العروض والخصومات
                </h3>
                {activeProduct ? (
                  <span style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.76rem',
                    fontWeight: 600
                  }}>
                    {offers.length} {offers.length === 1 ? 'عرض' : 'عروض'}
                  </span>
                ) : (
                  <span style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    color: '#64748b',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.74rem',
                    fontWeight: 600
                  }}>
                    اختصار: Ctrl+Alt+S
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.86rem', color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {activeProduct ? (
                  <>
                    <strong style={{ color: '#1e293b' }}>{activeProduct.name}</strong>
                    <span>·</span>
                    <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 4, color: '#0f172a', fontWeight: 600 }}>
                      السعر الأساسي: {formatCurrency(retailPrice)}
                    </span>
                    {costPrice > 0 ? (
                      <span style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1px 6px', borderRadius: 4, color: '#475569' }}>
                        التكلفة: {formatCurrency(costPrice)}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveProduct(null);
                        resetForm();
                      }}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#1d4ed8',
                        borderRadius: 4,
                        padding: '2px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      <span>اختيار صنف آخر</span>
                    </button>
                  </>
                ) : (
                  <span>ابحث عن أي صنف بالاسم أو الباركود لضبط عروضه وخصوماته فوراً</span>
                )}
              </div>
            </div>
          </div>

          {!activeProduct && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginInlineStart: 'auto', marginInlineEnd: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setDialogMode('item_offers');
                  setActiveProduct(null);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: dialogMode === 'item_offers' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: dialogMode === 'item_offers' ? '#eff6ff' : '#ffffff',
                  color: dialogMode === 'item_offers' ? '#1d4ed8' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                عروض الأصناف
              </button>

              <button
                type="button"
                onClick={() => {
                  setDialogMode('active_combos');
                  setActiveProduct(null);
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: 8,
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  border: (dialogMode === 'active_combos' || dialogMode === 'create_combo') ? '1px solid #db2777' : '1px solid #e2e8f0',
                  background: (dialogMode === 'active_combos' || dialogMode === 'create_combo') ? '#fdf2f8' : '#ffffff',
                  color: (dialogMode === 'active_combos' || dialogMode === 'create_combo') ? '#be185d' : '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                </svg>
                العروض المجمعة (الكومبو)
                <span style={{
                  background: (dialogMode === 'active_combos' || dialogMode === 'create_combo') ? '#be185d' : '#f1f5f9',
                  color: (dialogMode === 'active_combos' || dialogMode === 'create_combo') ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.72rem',
                  fontWeight: 700
                }}>
                  {comboProducts.length}
                </span>
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#f8fafc';
              e.currentTarget.style.color = '#64748b';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            title="إغلاق"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* View 0A: Active Combos List View */}
        {!activeProduct && dialogMode === 'active_combos' ? (
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '16px 20px',
            height: '540px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14
          }}>
            {/* Top Bar inside Active Combos View */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 10,
              paddingBottom: 12,
              borderBottom: '1px solid #f1f5f9'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260, maxWidth: 450 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    value={comboSearchQuery}
                    onChange={(e) => setComboSearchQuery(e.target.value)}
                    placeholder="ابحث في العروض المجمعة (الاسم أو الباركود)..."
                    style={{
                      width: '100%',
                      height: 36,
                      paddingRight: 32,
                      paddingLeft: comboSearchQuery ? 30 : 10,
                      borderRadius: 8,
                      border: '1px solid #cbd5e1',
                      fontSize: '0.84rem',
                      background: '#f8fafc'
                    }}
                  />
                  <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  {comboSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setComboSearchQuery('')}
                      style={{
                        position: 'absolute',
                        left: 8,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                  {filteredComboProducts.length} عرض متاح
                </span>
                <Button
                  type="button"
                  onClick={startCreateNewCombo}
                  style={{
                    background: '#db2777',
                    borderColor: '#be185d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 700
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ إنشاء عرض مجمع جديد</span>
                </Button>
              </div>
            </div>

            {/* Combos Cards Grid (POS-Style Cards) */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 12,
              padding: '2px 4px',
              alignContent: 'start'
            }}>
              {isLoadingAllProducts ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
                  جارٍ تحميل العروض المجمعة...
                </div>
              ) : filteredComboProducts.length > 0 ? (
                filteredComboProducts.map((prod) => {
                  const bom = bomsList.find((b) => String(b.product_id) === String(prod.id));
                  const retail = Number(prod.retailPrice || (prod as any).retail_price || 0);
                  
                  // Calculate total component retail prices and names accurately
                  let origRetailSum = 0;
                  const recipeSummary: Array<{ name: string; qty: number; unitPrice: number }> = [];
                  
                  if (bom?.lines && Array.isArray(bom.lines)) {
                    bom.lines.forEach((l: any) => {
                      const cId = l.componentId ?? l.componentProductId ?? l.component_product_id;
                      const cProd = allProducts.find((p) => String(p.id) === String(cId));
                      const cPrice = Number(cProd?.retailPrice || (cProd as any)?.retail_price || l.expectedCost || l.expected_cost || 0);
                      const cQty = Number(l.quantity || 1);
                      origRetailSum += (cPrice * cQty);
                      recipeSummary.push({
                        name: cProd?.name || l.component_product_name || `صنف #${cId}`,
                        qty: cQty,
                        unitPrice: cPrice
                      });
                    });
                  }

                  const savings = origRetailSum > retail ? origRetailSum - retail : 0;
                  const savingsPct = origRetailSum > 0 && savings > 0 ? ((savings / origRetailSum) * 100).toFixed(0) : null;

                  return (
                    <div
                      key={prod.id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '12px 14px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        minHeight: 180,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'all 0.15s ease',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      {/* Top Row: Badges & Action Buttons */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{
                            background: '#fdf2f8',
                            color: '#db2777',
                            border: '1px solid #fbcfe8',
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            كومبو
                          </span>
                          {prod.barcode && (
                            <span style={{
                              background: '#f8fafc',
                              color: '#64748b',
                              border: '1px solid #e2e8f0',
                              padding: '1px 5px',
                              borderRadius: 4,
                              fontSize: '0.7rem',
                              fontFamily: 'monospace'
                            }}>
                              {prod.barcode}
                            </span>
                          )}
                        </div>

                        {/* Actions in top right */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            type="button"
                            onClick={() => startEditCombo(prod)}
                            title="تعديل العرض ومكوناته"
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: 6,
                              width: 26,
                              height: 26,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`هل أنت متأكد من حذف العرض المجمع "${prod.name}" نهائياً؟`)) {
                                deleteComboMutation.mutate(prod);
                              }
                            }}
                            disabled={deleteComboMutation.isPending}
                            title="حذف العرض"
                            style={{
                              background: '#fee2e2',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              borderRadius: 6,
                              width: 26,
                              height: 26,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Middle: Title & Components List */}
                      <div style={{ marginBottom: 10, flex: 1 }}>
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.94rem',
                          color: '#0f172a',
                          marginBottom: 6,
                          lineHeight: 1.3
                        }}>
                          {prod.name}
                        </div>

                        {/* Components Box */}
                        <div style={{
                          background: '#f8fafc',
                          border: '1px solid #f1f5f9',
                          borderRadius: 8,
                          padding: '6px 8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                          maxHeight: 65,
                          overflowY: 'auto'
                        }}>
                          {recipeSummary.length > 0 ? (
                            recipeSummary.map((c, i) => (
                              <div key={i} style={{ fontSize: '0.74rem', color: '#334155', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: '#2563eb', fontWeight: 700 }}>• {c.qty}×</span>
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                              {prod.notes || 'عرض ترويجي مركب'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bottom Footer: Price & Savings */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-end',
                        paddingTop: 8,
                        borderTop: '1px dashed #e2e8f0'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          {origRetailSum > 0 && origRetailSum > retail && (
                            <span style={{ textDecoration: 'line-through', color: '#94a3b8', fontSize: '0.76rem' }}>
                              {formatCurrency(origRetailSum)}
                            </span>
                          )}
                          <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#16a34a' }}>
                            {formatCurrency(retail)}
                          </span>
                        </div>

                        {savingsPct ? (
                          <span style={{
                            background: '#ecfdf5',
                            color: '#047857',
                            border: '1px solid #a7f3d0',
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: '0.72rem',
                            fontWeight: 700
                          }}>
                            وفرت {savingsPct}%
                          </span>
                        ) : null}
                      </div>

                    </div>
                  );
                })
              ) : (
                <div style={{
                  padding: '60px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12
                }}>
                  <div style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: '#fdf2f8',
                    color: '#db2777',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#1e293b', display: 'block', marginBottom: 4 }}>
                      {comboSearchQuery ? 'لا توجد عروض مجمعة مطابقة لبحثك' : 'لا توجد عروض مجمعة (كومبو) نشطة حالياً'}
                    </strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      يمكنك إنشاء باقات ووجبات ترويجية تجمع عدة أصناف بسعر موحد خاص
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={startCreateNewCombo}
                    style={{
                      background: '#db2777',
                      borderColor: '#be185d',
                      padding: '8px 18px',
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      marginTop: 6
                    }}
                  >
                    + إنشاء أول عرض مجمع الآن
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : !activeProduct && dialogMode === 'create_combo' ? (
          /* View 0B: Create or Edit Combo View */
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '16px 20px',
            height: '540px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 20, flex: 1, minHeight: 0 }}>
              
              {/* Left Column: Form & Pricing */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflowY: 'auto', paddingRight: 4 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: '#fdf2f8',
                        color: '#db2777',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.92rem', color: '#0f172a', display: 'block' }}>
                          {editingComboId ? `تعديل العرض المجمع: ${comboName || 'عرض'}` : 'إعداد عرض مجمع جديد (كومبو)'}
                        </strong>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          {editingComboId ? 'تعديل السعر أو إضافة وحذف المكونات' : 'أنشئ باقة أو وجبة مركبة بسعر خاص ومخفض للزبائن'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDialogMode('active_combos')}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        color: '#475569',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12" />
                        <polyline points="12 19 5 12 12 5" />
                      </svg>
                      العودة للعروض
                    </button>
                  </div>

                  <div className="page-stack" style={{ gap: 10 }}>
                    <Field label="اسم العرض المجمع / الباقة *">
                      <input
                        type="text"
                        autoFocus
                        value={comboName}
                        onChange={(e) => setComboName(e.target.value)}
                        placeholder="مثال: عرض التوفير العائلي / وجبة كومبو ميكس"
                        disabled={saveComboMutation.isPending}
                        style={{ fontWeight: 600 }}
                      />
                    </Field>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <Field label="سعر بيع العرض (ج.م) *">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={comboPrice}
                          onChange={(e) => setComboPrice(e.target.value)}
                          placeholder="مثال: 99.00"
                          disabled={saveComboMutation.isPending}
                          style={{ fontWeight: 700, color: '#16a34a', fontSize: '1rem' }}
                        />
                      </Field>

                      <Field label="الباركود (اختياري)">
                        <div style={{ display: 'flex', gap: 4 }}>
                          <input
                            type="text"
                            value={comboBarcode}
                            onChange={(e) => setComboBarcode(e.target.value)}
                            placeholder="توليد أو مسح"
                            disabled={saveComboMutation.isPending}
                            style={{ flex: 1, fontFamily: 'monospace' }}
                          />
                          <button
                            type="button"
                            onClick={() => setComboBarcode(String(Date.now()).slice(-8))}
                            title="توليد باركود تلقائي"
                            style={{
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              padding: '0 8px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600
                            }}
                          >
                            توليد
                          </button>
                        </div>
                      </Field>
                    </div>

                    {/* Financial Summary & Smart Intelligence Box */}
                    <div style={{
                      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
                      border: '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      marginTop: 4
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#475569', marginBottom: 6 }}>
                        <span>إجمالي أسعار المكونات منفردة:</span>
                        <strong style={{
                          color: '#0f172a',
                          fontSize: '0.88rem',
                          textDecoration: numericComboPrice > 0 && numericComboPrice < comboTotalItemsPrice ? 'line-through' : 'none'
                        }}>
                          {formatCurrency(comboTotalItemsPrice)} ج.م
                        </strong>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', marginBottom: 6 }}>
                        <span>تكلفة المكونات:</span>
                        <span style={{ fontWeight: 600 }}>{formatCurrency(comboTotalCost)} ج.م</span>
                      </div>

                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '0.88rem',
                        color: '#0f172a',
                        fontWeight: 700,
                        paddingTop: 8,
                        marginTop: 4,
                        borderTop: '1px dashed #cbd5e1'
                      }}>
                        <span>سعر العرض الترويجي:</span>
                        <span style={{ color: '#16a34a', fontSize: '1.15rem', fontWeight: 800 }}>
                          {formatCurrency(numericComboPrice)} ج.م
                        </span>
                      </div>

                      {comboSavings > 0 && (
                        <div style={{
                          marginTop: 8,
                          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                          border: '1px solid #a7f3d0',
                          borderRadius: 8,
                          padding: '7px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          color: '#065f46',
                          fontSize: '0.8rem',
                          fontWeight: 700
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            🔥 <span>توفير للزبون:</span> <strong>{formatCurrency(comboSavings)} ج.م</strong>
                          </span>
                          <span style={{ background: '#059669', color: '#ffffff', padding: '1px 8px', borderRadius: 12, fontSize: '0.74rem' }}>
                            خصم {comboSavingsPercent}%
                          </span>
                        </div>
                      )}

                      {numericComboPrice > 0 && numericComboPrice >= comboTotalCost && (
                        <div style={{
                          marginTop: 6,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '0.74rem',
                          color: '#475569',
                          paddingTop: 4
                        }}>
                          <span>هامش ربح التاجر:</span>
                          <strong style={{ color: '#047857' }}>
                            {formatCurrency(numericComboPrice - comboTotalCost)} ج.م ({comboTotalCost > 0 ? (((numericComboPrice - comboTotalCost) / numericComboPrice) * 100).toFixed(0) : 100}%)
                          </strong>
                        </div>
                      )}

                      {numericComboPrice > 0 && numericComboPrice < comboTotalCost && (
                        <div style={{
                          marginTop: 8,
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: '#b91c1c',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          ⚠️ <span>تنبيه: سعر العرض أقل من تكلفة المكونات بخسارة قدرها {formatCurrency(comboTotalCost - numericComboPrice)} ج.م</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <MutationFeedback isError={saveComboMutation.isError} error={saveComboMutation.error} errorFallback="تعذر حفظ العرض المجمع" />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      type="button"
                      onClick={() => saveComboMutation.mutate()}
                      disabled={saveComboMutation.isPending || !comboName.trim() || comboComponents.length === 0 || !numericComboPrice}
                      style={{ flex: 1, background: '#db2777', borderColor: '#be185d' }}
                    >
                      {saveComboMutation.isPending ? 'جارٍ الحفظ...' : editingComboId ? 'حفظ تعديلات العرض' : 'حفظ وتفعيل العرض المجمع'}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setDialogMode('active_combos')}
                      disabled={saveComboMutation.isPending}
                    >
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Components Selector & List */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                minHeight: 0,
                height: '100%'
              }}>
                
                {/* 1. Store Catalog Browser Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '220px',
                  minHeight: '220px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                      أصناف المتجر (اضغط للإضافة)
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      {availableCatalogProducts.length} صنف متاح
                    </span>
                  </div>

                  {/* Search Input */}
                  <div style={{ position: 'relative', marginBottom: 6 }}>
                    <input
                      type="text"
                      value={componentSearchQuery}
                      onChange={(e) => setComponentSearchQuery(e.target.value)}
                      placeholder="ابحث باسم الصنف أو امسح الباركود..."
                      style={{
                        width: '100%',
                        height: 32,
                        paddingRight: 28,
                        paddingLeft: componentSearchQuery ? 28 : 8,
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        background: '#ffffff'
                      }}
                    />
                    <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    {componentSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setComponentSearchQuery('')}
                        style={{
                          position: 'absolute',
                          left: 6,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#94a3b8',
                          cursor: 'pointer',
                          padding: 2
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Catalog Products List */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {isLoadingCatalog ? (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        جارٍ جلب الأصناف...
                      </div>
                    ) : availableCatalogProducts.length > 0 ? (
                      availableCatalogProducts.map((prod) => {
                        const addedItem = comboComponents.find((c) => String(c.product.id) === String(prod.id));
                        const isAdded = Boolean(addedItem);
                        const prodPrice = Number((prod as any).retailPrice || (prod as any).retail_price || 0);
                        return (
                          <div
                            key={prod.id}
                            onClick={() => {
                              setComboComponents((prev) => {
                                const exists = prev.find((c) => String(c.product.id) === String(prod.id));
                                if (exists) {
                                  return prev.map((c) => String(c.product.id) === String(prod.id) ? { ...c, quantity: c.quantity + 1 } : c);
                                }
                                return [...prev, { product: prod, quantity: 1 }];
                              });
                            }}
                            style={{
                              background: isAdded ? '#f0fdf4' : '#ffffff',
                              border: isAdded ? '1px solid #86efac' : '1px solid #e2e8f0',
                              borderRadius: 6,
                              padding: '6px 10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.12s ease'
                            }}
                            onMouseEnter={(e) => {
                              if (!isAdded) e.currentTarget.style.background = '#eff6ff';
                            }}
                            onMouseLeave={(e) => {
                              if (!isAdded) e.currentTarget.style.background = '#ffffff';
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {prod.name}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                {prod.barcode ? `باركود: ${prod.barcode}` : 'صنف أساسي'}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {isAdded && (
                                <span style={{
                                  background: '#dcfce7',
                                  color: '#15803d',
                                  padding: '1px 6px',
                                  borderRadius: 10,
                                  fontSize: '0.68rem',
                                  fontWeight: 700
                                }}>
                                  مضاف ({addedItem?.quantity})
                                </span>
                              )}
                              <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isAdded ? '#15803d' : '#2563eb' }}>
                                {formatCurrency(prodPrice)} ج.م
                              </span>
                              <span style={{
                                background: isAdded ? '#16a34a' : '#2563eb',
                                color: '#ffffff',
                                borderRadius: 4,
                                width: 22,
                                height: 22,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 800
                              }}>
                                +
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                        لا توجد أصناف مطابقة للبحث
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. Selected Components Box */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  minHeight: 0
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <strong style={{ fontSize: '0.84rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      مكونات الباقة المحددة ({comboComponents.length})
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      إجمالي المكونات: {comboComponents.reduce((s, c) => s + c.quantity, 0)} قطعة
                    </span>
                  </div>

                  {/* Components List */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {comboComponents.length > 0 ? (
                      comboComponents.map((item, idx) => {
                        const itemRetail = Number((item.product as any).retailPrice || (item.product as any).retail_price || 0);
                        return (
                          <div
                            key={item.product.id}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #cbd5e1',
                              borderRadius: 6,
                              padding: '6px 10px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, paddingLeft: 6 }}>
                              <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.product.name}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 1 }}>
                                <span>{formatCurrency(itemRetail)} ج.م</span>
                                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>×</span>
                                <span style={{ fontWeight: 600, color: '#0f172a' }}>{item.quantity}</span>
                                <span style={{ margin: '0 4px', color: '#cbd5e1' }}>=</span>
                                <span style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(itemRetail * item.quantity)} ج.م</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {/* Quantity Stepper */}
                              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: 5, overflow: 'hidden', background: '#f8fafc' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity <= 1) {
                                      setComboComponents((prev) => prev.filter((_, i) => i !== idx));
                                    } else {
                                      setComboComponents((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity - 1 } : c));
                                    }
                                  }}
                                  style={{ width: 24, height: 24, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                                >
                                  -
                                </button>
                                <span style={{ padding: '0 8px', fontSize: '0.82rem', fontWeight: 800, minWidth: 20, textAlign: 'center', color: '#0f172a' }}>
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setComboComponents((prev) => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c));
                                  }}
                                  style={{ width: 24, height: 24, border: 'none', background: '#f1f5f9', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                                >
                                  +
                                </button>
                              </div>

                              {/* Remove Button */}
                              <button
                                type="button"
                                onClick={() => setComboComponents((prev) => prev.filter((_, i) => i !== idx))}
                                style={{
                                  border: '1px solid #fecaca',
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  borderRadius: 5,
                                  width: 24,
                                  height: 24,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                title="حذف المكون"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ padding: '24px 8px', textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b' }}>لم يتم اختيار أي مكونات بعد</div>
                        <div style={{ fontSize: '0.72rem', marginTop: 2 }}>اضغط على أي صنف من القائمة بالأعلى لإضافته للباقة</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          </div>
        ) : !activeProduct ? (
          /* View 1: Product Search View (When no product is selected and in item_offers mode) */
          <div style={{
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            padding: '16px 20px',
            height: '540px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم الصنف، الباركود، أو كود الموديل..."
                style={{
                  width: '100%',
                  height: 44,
                  paddingRight: 40,
                  paddingLeft: 16,
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  fontSize: '0.92rem',
                  fontWeight: 500,
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                  background: '#f8fafc',
                  transition: 'all 0.15s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#2563eb';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37, 99, 235, 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                }}
              />
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                pointerEvents: 'none'
              }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
            </div>

            {/* Smart Filter Pills Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 6,
              marginBottom: 12
            }}>
              {/* All */}
              <button
                type="button"
                onClick={() => setSearchFilter('all')}
                style={{
                  border: searchFilter === 'all' ? '1px solid #0f172a' : '1px solid #e2e8f0',
                  background: searchFilter === 'all' ? '#0f172a' : '#f8fafc',
                  color: searchFilter === 'all' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.12)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                الكل
                <span style={{
                  background: searchFilter === 'all' ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  color: searchFilter === 'all' ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem'
                }}>
                  {filterStats.all}
                </span>
              </button>

              {/* Offers */}
              <button
                type="button"
                onClick={() => setSearchFilter('offers')}
                style={{
                  border: searchFilter === 'offers' ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: searchFilter === 'offers' ? '#2563eb' : '#f8fafc',
                  color: searchFilter === 'offers' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'offers' ? '0 1px 3px rgba(37,99,235,0.2)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                عليها عروض
                <span style={{
                  background: searchFilter === 'offers' ? 'rgba(255,255,255,0.25)' : '#dbeafe',
                  color: searchFilter === 'offers' ? '#ffffff' : '#1d4ed8',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {filterStats.offers}
                </span>
              </button>

              {/* Near Expiry (قريبة الانتهاء) */}
              <button
                type="button"
                onClick={() => setSearchFilter('near_expiry')}
                style={{
                  border: searchFilter === 'near_expiry' ? '1px solid #dc2626' : '1px solid #e2e8f0',
                  background: searchFilter === 'near_expiry' ? '#dc2626' : '#f8fafc',
                  color: searchFilter === 'near_expiry' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'near_expiry' ? '0 1px 3px rgba(220,38,38,0.2)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                قريبة الانتهاء
                <span style={{
                  background: searchFilter === 'near_expiry' ? 'rgba(255,255,255,0.25)' : '#fee2e2',
                  color: searchFilter === 'near_expiry' ? '#ffffff' : '#b91c1c',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem',
                  fontWeight: 700
                }}>
                  {filterStats.near_expiry}
                </span>
              </button>

              {/* Stagnant (راكدة للتصريف) */}
              <button
                type="button"
                onClick={() => setSearchFilter('stagnant')}
                style={{
                  border: searchFilter === 'stagnant' ? '1px solid #d97706' : '1px solid #e2e8f0',
                  background: searchFilter === 'stagnant' ? '#d97706' : '#f8fafc',
                  color: searchFilter === 'stagnant' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'stagnant' ? '0 1px 3px rgba(217,119,6,0.2)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                راكدة للتصريف
                <span style={{
                  background: searchFilter === 'stagnant' ? 'rgba(255,255,255,0.25)' : '#fef3c7',
                  color: searchFilter === 'stagnant' ? '#ffffff' : '#b45309',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem'
                }}>
                  {filterStats.stagnant}
                </span>
              </button>

              {/* High Margin (أعلى ربحية) */}
              <button
                type="button"
                onClick={() => setSearchFilter('high_margin')}
                style={{
                  border: searchFilter === 'high_margin' ? '1px solid #059669' : '1px solid #e2e8f0',
                  background: searchFilter === 'high_margin' ? '#059669' : '#f8fafc',
                  color: searchFilter === 'high_margin' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'high_margin' ? '0 1px 3px rgba(5,150,105,0.2)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                أعلى ربحية
                <span style={{
                  background: searchFilter === 'high_margin' ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                  color: searchFilter === 'high_margin' ? '#ffffff' : '#047857',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem'
                }}>
                  {filterStats.high_margin}
                </span>
              </button>

              {/* Overstocked (فائض مخزون) */}
              <button
                type="button"
                onClick={() => setSearchFilter('overstock')}
                style={{
                  border: searchFilter === 'overstock' ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                  background: searchFilter === 'overstock' ? '#7c3aed' : '#f8fafc',
                  color: searchFilter === 'overstock' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'overstock' ? '0 1px 3px rgba(124,58,237,0.2)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                فائض مخزون
                <span style={{
                  background: searchFilter === 'overstock' ? 'rgba(255,255,255,0.25)' : '#ede9fe',
                  color: searchFilter === 'overstock' ? '#ffffff' : '#6d28d9',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem'
                }}>
                  {filterStats.overstock}
                </span>
              </button>

              {/* No Offers */}
              <button
                type="button"
                onClick={() => setSearchFilter('no_offers')}
                style={{
                  border: searchFilter === 'no_offers' ? '1px solid #475569' : '1px solid #e2e8f0',
                  background: searchFilter === 'no_offers' ? '#475569' : '#f8fafc',
                  color: searchFilter === 'no_offers' ? '#ffffff' : '#475569',
                  borderRadius: 20,
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: searchFilter === 'no_offers' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                بدون عروض
                <span style={{
                  background: searchFilter === 'no_offers' ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                  color: searchFilter === 'no_offers' ? '#ffffff' : '#64748b',
                  padding: '1px 6px',
                  borderRadius: 10,
                  fontSize: '0.7rem'
                }}>
                  {filterStats.no_offers}
                </span>
              </button>
            </div>

            {/* Results Container */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {isSearching ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  جاري البحث في قاعدة الأصناف...
                </div>
              ) : filteredSearchResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 10, padding: '2px 4px' }}>
                  {filteredSearchResults.map((prod) => {
                    const prodRetail = Number((prod as any)?.retailPrice || (prod as any)?.retail_price || 0);
                    const prodCost = Number((prod as any)?.costPrice || (prod as any)?.cost_price || 0);
                    const prodStock = Number(prod.stock || 0);
                    const prodMargin = prodRetail > 0 && prodCost > 0 ? ((prodRetail - prodCost) / prodRetail) * 100 : 0;
                    const prodOffers = prod.offers || [];
                    const hasActiveOffers = prodOffers.some((o) => !o.to || o.to >= todayIsoDate());
                    const exp = (prod as any).expiryDate || prod.metadata?.expiryDate;
                    let expDays: number | null = null;
                    if (exp) {
                      const expDate = new Date(`${String(exp).slice(0, 10)}T00:00:00`);
                      if (!Number.isNaN(expDate.getTime())) {
                        expDays = Math.ceil((expDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000));
                      }
                    }

                    return (
                      <div
                        key={prod.id}
                        onClick={() => {
                          setActiveProduct(prod);
                          resetForm();
                        }}
                        style={{
                          background: '#ffffff',
                          border: hasActiveOffers ? '1px solid #93c5fd' : '1px solid #e2e8f0',
                          borderRadius: 10,
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          minHeight: 104,
                          gap: 6,
                          transition: 'all 0.15s ease',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#2563eb';
                          e.currentTarget.style.background = '#f8fafc';
                          e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = hasActiveOffers ? '#93c5fd' : '#e2e8f0';
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)';
                          e.currentTarget.style.transform = 'none';
                        }}
                      >
                        {/* Row 1 (Top): Product Name (Right) + Offer / Expiry Badges (Left) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              flex: 1
                            }}
                            title={prod.name}
                          >
                            {prod.name}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            {hasActiveOffers && (
                              <span style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#1d4ed8',
                                padding: '1px 6px',
                                borderRadius: 5,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 3
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                                  <line x1="7" y1="7" x2="7.01" y2="7" />
                                </svg>
                                {prodOffers.length} {prodOffers.length === 1 ? 'عرض' : 'عروض'}
                              </span>
                            )}
                            {exp ? (
                              <span style={{
                                background: expDays !== null && expDays <= 45 ? '#fee2e2' : '#f8fafc',
                                border: expDays !== null && expDays <= 45 ? '1px solid #fecaca' : '1px solid #e2e8f0',
                                color: expDays !== null && expDays <= 45 ? '#b91c1c' : '#64748b',
                                padding: '1px 5px',
                                borderRadius: 5,
                                fontSize: '0.68rem',
                                fontWeight: expDays !== null && expDays <= 45 ? 700 : 500
                              }}>
                                {expDays !== null && expDays <= 0 ? 'منتهي' : expDays !== null && expDays <= 45 ? `باقي ${expDays} يوم` : String(exp).slice(0, 10)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Row 2 (Middle): Barcode (Right) + Stock (Left) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: '#64748b' }}>
                          <span style={{ fontFamily: 'monospace', color: prod.barcode ? '#475569' : '#94a3b8' }}>
                            {prod.barcode ? `باركود: ${prod.barcode}` : 'بدون باركود'}
                          </span>

                          <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600 }}>
                            المخزون: {prodStock}
                          </span>
                        </div>

                        {/* Row 3 (Bottom): Price (Right) + Profit Margin Badge (Left) */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4, borderTop: '1px dashed #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>سعر البيع:</span>
                            <span style={{ fontWeight: 800, fontSize: '0.96rem', color: '#0f172a' }}>
                              {formatCurrency(prodRetail)}
                            </span>
                          </div>

                          {prodMargin > 0 ? (
                            <span style={{
                              background: prodMargin >= 25 ? '#ecfdf5' : '#f8fafc',
                              border: prodMargin >= 25 ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                              color: prodMargin >= 25 ? '#047857' : '#64748b',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: '0.68rem',
                              fontWeight: 600
                            }}>
                              ربح {prodMargin.toFixed(0)}%
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                              اضغط للضبط
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : searchQuery.trim() || searchFilter !== 'all' ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </div>
                  <div style={{ fontWeight: 600, color: '#64748b' }}>لا توجد أصناف مطابقة للبحث أو الفلتر المحدد</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>جرب اختيار فلتر آخر أو تعديل نص البحث</div>
                </div>
              ) : (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ color: '#94a3b8', marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                      <line x1="7" y1="7" x2="7.01" y2="7" />
                    </svg>
                  </div>
                  <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.95rem' }}>ابحث عن أي صنف لإدارة العروض الترويجية والخصومات الخاصة به</div>
                  <div style={{ fontSize: '0.8rem', marginTop: 4, color: '#94a3b8' }}>اكتب اسم الصنف أو امسح الباركود للبدء مباشرة</div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* View 2: Product Offers Workspace (When a product is selected) */
          <div className="two-column-grid" style={{ alignItems: 'start', gap: 16 }}>
            
            {/* Form Column */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: editingIndex != null ? '1px solid #6366f1' : '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              padding: '16px 20px',
              height: '540px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: editingIndex != null ? '#6366f1' : '#2563eb'
                    }} />
                    <strong style={{ fontSize: '0.92rem', color: '#1e293b' }}>
                      {editingIndex != null ? `تعديل بيانات العرض #${editingIndex + 1}` : 'إعداد عرض ترويجي جديد'}
                    </strong>
                  </div>
                  {editingIndex != null && (
                    <button
                      type="button"
                      onClick={resetForm}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6366f1',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      إلغاء التعديل
                    </button>
                  )}
                </div>

                {/* Segmented Type Selector */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                    نوع الخصم
                  </label>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 4,
                    background: '#f1f5f9',
                    padding: 3,
                    borderRadius: 8
                  }}>
                    <button
                      type="button"
                      onClick={() => setOfferType('percent')}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '7px 4px',
                        fontSize: '0.8rem',
                        fontWeight: offerType === 'percent' ? 700 : 500,
                        color: offerType === 'percent' ? '#1e293b' : '#64748b',
                        background: offerType === 'percent' ? '#ffffff' : 'transparent',
                        boxShadow: offerType === 'percent' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="5" x2="5" y2="19" />
                        <circle cx="6.5" cy="6.5" r="2.5" />
                        <circle cx="17.5" cy="17.5" r="2.5" />
                      </svg>
                      نسبة مئوية
                    </button>

                    <button
                      type="button"
                      onClick={() => setOfferType('fixed')}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '7px 4px',
                        fontSize: '0.8rem',
                        fontWeight: offerType === 'fixed' ? 700 : 500,
                        color: offerType === 'fixed' ? '#1e293b' : '#64748b',
                        background: offerType === 'fixed' ? '#ffffff' : 'transparent',
                        boxShadow: offerType === 'fixed' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      خصم مبلغ
                    </button>

                    <button
                      type="button"
                      onClick={() => setOfferType('price')}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '7px 4px',
                        fontSize: '0.8rem',
                        fontWeight: offerType === 'price' ? 700 : 500,
                        color: offerType === 'price' ? '#1e293b' : '#64748b',
                        background: offerType === 'price' ? '#ffffff' : 'transparent',
                        boxShadow: offerType === 'price' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
                        <path d="M12 18V6" />
                      </svg>
                      سعر محدد
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOfferType('bundle');
                        if (minQty <= 1) setMinQty(3);
                      }}
                      style={{
                        border: 'none',
                        borderRadius: 6,
                        padding: '7px 4px',
                        fontSize: '0.8rem',
                        fontWeight: offerType === 'bundle' ? 700 : 500,
                        color: offerType === 'bundle' ? '#1e293b' : '#64748b',
                        background: offerType === 'bundle' ? '#ffffff' : 'transparent',
                        boxShadow: offerType === 'bundle' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                      باقة / كمية
                    </button>
                  </div>
                </div>

                {/* Inputs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  
                  {/* Row: Value & Min Qty */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 10 }}>
                    <Field label={
                      offerType === 'percent'
                        ? 'نسبة الخصم (%)'
                        : offerType === 'fixed'
                          ? 'قيمة الخصم للقطعة (ج.م)'
                          : offerType === 'bundle'
                            ? 'إجمالي سعر الباقة (ج.م)'
                            : 'سعر القطعة بالعرض (ج.م)'
                    }>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder={offerType === 'percent' ? 'مثال: 20' : offerType === 'fixed' ? 'مثال: 15' : offerType === 'bundle' ? 'مثال: 500' : 'مثال: 80'}
                        value={offerValue}
                        onChange={(event) => setOfferValue(event.target.value)}
                        style={{ fontWeight: 600 }}
                      />
                    </Field>

                    <Field label={offerType === 'bundle' ? 'عدد قطع الباقة *' : 'الكمية الأدنى'}>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={minQty}
                        onChange={(event) => setMinQty(Math.max(1, Number(event.target.value || 1)))}
                      />
                    </Field>
                  </div>

                  {/* Row: Dates on a single line */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Field label="تاريخ البداية">
                      <input
                        type="date"
                        value={offerStartDate}
                        onChange={(event) => setOfferStartDate(event.target.value)}
                      />
                    </Field>

                    <Field label="تاريخ الانتهاء (اختياري)">
                      <input
                        type="date"
                        value={offerEndDate}
                        min={offerStartDate || todayIsoDate()}
                        onChange={(event) => setOfferEndDate(event.target.value)}
                      />
                    </Field>
                  </div>

                  {/* Duration Shortcuts on Single Line */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: 5,
                    marginTop: -4
                  }}>
                    <button
                      type="button"
                      onClick={() => setOfferEndDate(addDaysIsoDate(1))}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '5px 2px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: '#334155',
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      يوم
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferEndDate(addDaysIsoDate(7))}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '5px 2px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: '#334155',
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      أسبوع
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferEndDate(addDaysIsoDate(14))}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '5px 2px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: '#334155',
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      أسبوعين
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferEndDate(addDaysIsoDate(30))}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        padding: '5px 2px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: '#334155',
                        fontWeight: 600,
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f8fafc'}
                    >
                      شهر
                    </button>
                    <button
                      type="button"
                      onClick={() => setOfferEndDate('')}
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: 6,
                        padding: '5px 2px',
                        fontSize: '0.74rem',
                        cursor: 'pointer',
                        color: '#15803d',
                        fontWeight: 700,
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#dcfce7'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f0fdf4'}
                    >
                      دائم
                    </button>
                  </div>

                  {/* Real-time Simulator Card */}
                  {numValue > 0 && retailPrice > 0 ? (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                      padding: '10px 12px',
                      marginTop: 4
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#166534', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                          </svg>
                          {offerType === 'bundle' ? `معاينة الباقة (${minQty} قطع):` : 'معاينة السعر في الكاشير:'}
                        </span>
                        <span style={{ fontSize: '0.74rem', background: '#16a34a', color: '#ffffff', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>
                          وفرت {simulatedSavingsPercent.toFixed(0)}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ textDecoration: 'line-through', color: '#64748b', fontSize: '0.85rem' }}>
                          {formatCurrency(offerType === 'bundle' ? retailPrice * minQty : retailPrice)}
                        </span>
                        <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#15803d' }}>
                          {formatCurrency(offerType === 'bundle' ? numValue : simulatedEffectivePrice)}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 500 }}>
                          {offerType === 'bundle' 
                            ? `(سعر القطعة داخل الباقة: ${formatCurrency(simulatedEffectivePrice)} · توفير ${formatCurrency(simulatedSavings)})`
                            : `(توفير ${formatCurrency(simulatedSavings)})`
                          }
                        </span>
                      </div>

                      {costPrice > 0 && simulatedEffectivePrice < costPrice ? (
                        <div style={{ fontSize: '0.72rem', color: '#b91c1c', marginTop: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                          <span>سعر العرض أقل من سعر التكلفة ({formatCurrency(costPrice)})</span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button
                    type="button"
                    onClick={() => void saveOffer()}
                    disabled={mutation.isPending || !offerValue}
                    style={{
                      flex: 1,
                      background: '#1e293b',
                      color: '#ffffff',
                      fontWeight: 600,
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 16px'
                    }}
                  >
                    {mutation.isPending ? 'جاري الحفظ...' : editingIndex != null ? 'حفظ تعديل العرض' : 'إضافة العرض للصنف'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                    disabled={mutation.isPending}
                  >
                    إعادة التهيئة
                  </Button>
                </div>

                <MutationFeedback isError={mutation.isError} error={mutation.error} errorFallback="تعذر حفظ العرض" />
                <MutationFeedback isSuccess={mutation.isSuccess && !mutation.isPending} successText="تم حفظ العروض وتحديثها بنجاح." />
              </div>
            </div>

            {/* Current Offers Column */}
            <div style={{
              background: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              padding: '16px 20px',
              height: '540px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{ marginBottom: 10 }}>
                <strong style={{ fontSize: '0.92rem', color: '#1e293b', display: 'block' }}>
                  العروض المسجلة
                </strong>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  إدارة وتعديل أو حذف العروض الحالية والسابقة
                </span>
              </div>

              {/* Filter Tabs */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 0.8fr',
                background: '#f1f5f9',
                padding: 3,
                borderRadius: 8,
                marginBottom: 12,
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={() => setSelectedOffersTab('active')}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 4px',
                    fontSize: '0.76rem',
                    fontWeight: selectedOffersTab === 'active' ? 700 : 500,
                    color: selectedOffersTab === 'active' ? '#047857' : '#64748b',
                    background: selectedOffersTab === 'active' ? '#ffffff' : 'transparent',
                    boxShadow: selectedOffersTab === 'active' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#10b981'
                  }} />
                  عروض نشطة ({activeOffers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOffersTab('expired')}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 4px',
                    fontSize: '0.76rem',
                    fontWeight: selectedOffersTab === 'expired' ? 700 : 500,
                    color: selectedOffersTab === 'expired' ? '#b91c1c' : '#64748b',
                    background: selectedOffersTab === 'expired' ? '#ffffff' : 'transparent',
                    boxShadow: selectedOffersTab === 'expired' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#ef4444'
                  }} />
                  عروض منتهية ({expiredOffers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedOffersTab('all')}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 4px',
                    fontSize: '0.76rem',
                    fontWeight: selectedOffersTab === 'all' ? 700 : 500,
                    color: selectedOffersTab === 'all' ? '#1e293b' : '#64748b',
                    background: selectedOffersTab === 'all' ? '#ffffff' : 'transparent',
                    boxShadow: selectedOffersTab === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  الكل ({offers.length})
                </button>
              </div>

              {/* List of cards */}
              <div className="page-stack" style={{ gap: 8, flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
                {visibleOffersList.length ? visibleOffersList.map(({ offer, originalIndex }) => {
                  const status = getOfferStatus(offer);
                  const isCurrentlyEditing = editingIndex === originalIndex;
                  const minQ = Math.max(1, Number(offer.minQty || 1));
                  const typeName = offer.type === 'bundle' ? `باقة (${minQ} قطع)` : offer.type === 'price' ? 'سعر محدد' : offer.type === 'fixed' ? 'خصم مبلغ' : 'خصم نسبة';
                  const valText = offer.type === 'percent' ? `${offer.value}%` : `${formatCurrency(Number(offer.value || 0))}`;

                  return (
                    <div
                      key={`${offer.id || originalIndex}`}
                      style={{
                        background: isCurrentlyEditing ? '#f8fafc' : '#ffffff',
                        border: isCurrentlyEditing ? '1px solid #6366f1' : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '10px 12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                            {typeName}: {valText}
                          </strong>
                          <span style={{
                            background: '#f1f5f9',
                            color: '#475569',
                            padding: '1px 5px',
                            borderRadius: 4,
                            fontSize: '0.72rem',
                            fontWeight: 600
                          }}>
                            {minQ > 1 ? `من ${minQ} قطع` : 'من أول قطعة'}
                          </span>
                        </div>
                        <span style={{
                          background: status.bg,
                          color: status.color,
                          border: `1px solid ${status.border}`,
                          padding: '1px 6px',
                          borderRadius: 10,
                          fontSize: '0.7rem',
                          fontWeight: 600
                        }}>
                          {status.label}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        <span>يبدأ: {offer.from || todayIsoDate()}</span>
                        <span>·</span>
                        <span>ينتهي: {offer.to ? offer.to : 'مفتوح (دائم)'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => loadOffer(originalIndex)}
                          disabled={mutation.isPending}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            color: '#334155',
                            borderRadius: 5,
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          تعديل
                        </button>

                        <button
                          type="button"
                          onClick={() => void removeOffer(originalIndex)}
                          disabled={mutation.isPending}
                          style={{
                            background: '#fff',
                            border: '1px solid #fee2e2',
                            color: '#dc2626',
                            borderRadius: 5,
                            padding: '3px 8px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '30px 16px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1'
                  }}>
                    <div style={{ marginBottom: 8, color: '#94a3b8' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto' }}>
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#64748b' }}>
                      {selectedOffersTab === 'expired' ? 'لا توجد عروض منتهية' : 'لا توجد عروض نشطة'}
                    </div>
                    <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                      {selectedOffersTab === 'expired' ? 'جميع العروض المسجلة لا تزال سارية ونشطة' : 'استخدم النموذج لإنشاء أول عرض ترويجي للصنف'}
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>
    </DialogShell>
  );
}


