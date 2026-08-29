import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DialogShell } from '@/shared/components/dialog-shell';
import { productsApi } from '@/features/products/api/products.api';
import { bomsApi } from '@/shared/api/boms.api';
import { extractCreatedEntityId } from '@/lib/api/extract-created-entity-id';
import { invalidateCatalogDomain } from '@/app/query-invalidation';
import type { Product, ProductOffer } from '@/types/domain';
import { buildUpdatePayload, normalizeCustomerPrices, toProductFormValues } from '@/features/products/components/workspace-sections/product-workspace.utils';
import { normalizeProductUnits } from '@/features/products/components/ProductUnitsEditor';
import { formatCurrency } from '@/lib/format';

import { todayIsoDate } from './offers/product-offer.utils';
import { ProductOfferActiveCombosTab } from './offers/ProductOfferActiveCombosTab';
import { ProductOfferComboCreatorTab } from './offers/ProductOfferComboCreatorTab';
import { ProductOfferSearchTab, type SearchFilterKey } from './offers/ProductOfferSearchTab';
import { ProductOfferItemEditorTab } from './offers/ProductOfferItemEditorTab';

interface ProductOfferDialogProps {
  open: boolean;
  product?: Product | null;
  onClose: () => void;
  onSaved?: (product: Product) => void;
}

export function ProductOfferDialog({ open, product: initialProduct, onClose, onSaved }: ProductOfferDialogProps) {
  const queryClient = useQueryClient();
  const [activeProduct, setActiveProduct] = useState<Product | null>(initialProduct || null);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Component search query for combo creation
  const { data: componentSearchResultsData, isLoading: isLoadingCatalog } = useQuery({
    queryKey: ['products.combo.components.search', componentSearchQuery],
    queryFn: () => productsApi.listPage({ q: componentSearchQuery.trim(), pageSize: 60 }),
    enabled: open && dialogMode === 'create_combo',
  });

  // Exclude combo products from component picker
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

  const offers: ProductOffer[] = activeProduct?.offers || [];
  const retailPrice = Number(activeProduct?.retailPrice || (activeProduct as any)?.retail_price || 0);
  const costPrice = Number(activeProduct?.costPrice || (activeProduct as any)?.cost_price || 0);

  const activeOffers = useMemo(() => {
    const today = todayIsoDate();
    return offers.filter((o) => !o.to || o.to >= today);
  }, [offers]);

  const expiredOffers = useMemo(() => {
    const today = todayIsoDate();
    return offers.filter((o) => o.to && o.to < today);
  }, [offers]);

  const visibleOffersList = useMemo(() => {
    const listWithIndex = offers.map((offer, index) => ({ offer, originalIndex: index }));
    const today = todayIsoDate();
    if (selectedOffersTab === 'active') {
      return listWithIndex.filter(({ offer }) => !offer.to || offer.to >= today);
    }
    if (selectedOffersTab === 'expired') {
      return listWithIndex.filter(({ offer }) => offer.to && offer.to < today);
    }
    return listWithIndex;
  }, [offers, selectedOffersTab]);

  const mutation = useMutation({
    mutationFn: async (nextOffers: ProductOffer[]) => {
      if (!activeProduct) return;
      const baseValues = toProductFormValues(activeProduct);
      return productsApi.update(
        String(activeProduct.id),
        buildUpdatePayload(
          baseValues,
          activeProduct,
          normalizeProductUnits(activeProduct.units || []),
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
          <ProductOfferActiveCombosTab
            comboSearchQuery={comboSearchQuery}
            setComboSearchQuery={setComboSearchQuery}
            filteredComboProducts={filteredComboProducts}
            isLoadingAllProducts={isLoadingAllProducts}
            bomsList={bomsList}
            allProducts={allProducts}
            onStartCreateCombo={startCreateNewCombo}
            onEditCombo={startEditCombo}
            onDeleteCombo={(prod) => deleteComboMutation.mutate(prod)}
            isDeletingCombo={deleteComboMutation.isPending}
          />
        ) : !activeProduct && dialogMode === 'create_combo' ? (
          <ProductOfferComboCreatorTab
            editingComboId={editingComboId}
            comboName={comboName}
            setComboName={setComboName}
            comboPrice={comboPrice}
            setComboPrice={setComboPrice}
            comboBarcode={comboBarcode}
            setComboBarcode={setComboBarcode}
            comboComponents={comboComponents}
            setComboComponents={setComboComponents}
            componentSearchQuery={componentSearchQuery}
            setComponentSearchQuery={setComponentSearchQuery}
            availableCatalogProducts={availableCatalogProducts}
            isLoadingCatalog={isLoadingCatalog}
            comboTotalItemsPrice={comboTotalItemsPrice}
            comboTotalCost={comboTotalCost}
            numericComboPrice={numericComboPrice}
            comboSavings={comboSavings}
            comboSavingsPercent={comboSavingsPercent}
            saveComboMutation={saveComboMutation}
            onCancel={() => setDialogMode('active_combos')}
          />
        ) : !activeProduct ? (
          <ProductOfferSearchTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchFilter={searchFilter}
            setSearchFilter={setSearchFilter}
            filterStats={filterStats}
            filteredSearchResults={filteredSearchResults}
            isSearching={isSearching}
            onSelectProduct={(prod) => {
              setActiveProduct(prod);
              resetForm();
            }}
          />
        ) : (
          <ProductOfferItemEditorTab
            product={activeProduct}
            offerType={offerType}
            setOfferType={setOfferType}
            offerValue={offerValue}
            setOfferValue={setOfferValue}
            offerStartDate={offerStartDate}
            setOfferStartDate={setOfferStartDate}
            offerEndDate={offerEndDate}
            setOfferEndDate={setOfferEndDate}
            minQty={minQty}
            setMinQty={setMinQty}
            editingIndex={editingIndex}
            selectedOffersTab={selectedOffersTab}
            setSelectedOffersTab={setSelectedOffersTab}
            offers={offers}
            activeOffers={activeOffers}
            expiredOffers={expiredOffers}
            visibleOffersList={visibleOffersList}
            numValue={numValue}
            retailPrice={retailPrice}
            costPrice={costPrice}
            simulatedEffectivePrice={simulatedEffectivePrice}
            simulatedSavings={simulatedSavings}
            simulatedSavingsPercent={simulatedSavingsPercent}
            saveOffer={saveOffer}
            removeOffer={removeOffer}
            loadOffer={loadOffer}
            resetForm={resetForm}
            mutation={mutation}
          />
        )}
      </div>
    </DialogShell>
  );
}
