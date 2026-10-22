import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/features/pos/api/pos.api';
import { getAvailableSaleProducts } from '@/features/pos/lib/pos.domain';
import { POS_PRODUCT_CACHE_LIMIT, POS_PRODUCT_LOOKUP_LIMIT, createProductBarcodeMap, isLikelyBarcodeQuery, mergeLookupProducts } from '@/features/pos/lib/pos-product-lookup';
import { parseQuantityPrefixQuery } from '@/features/pos/lib/pos-quantity-prefix';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { searchCatalogFromStorage, getAllCatalogFromStorage, getStoredTenantIdFromStorage, clearCatalogStorage } from '@/features/pos/lib/pos-catalog-storage';
import { useAuthStore } from '@/stores/auth-store';
import type { Product } from '@/types/domain';

const CATALOG_PERSIST_KEY = 'zsystems_pos_catalog_cache';

function getActiveTenantId(): string {
  try {
    return String(useAuthStore.getState().user?.tenantId || useAuthStore.getState().tenant?.id || '').trim();
  } catch {
    return '';
  }
}

function getStoredCatalog(): Product[] {
  try {
    const raw = localStorage.getItem(CATALOG_PERSIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const activeTenantId = getActiveTenantId();
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.products)) {
      if (activeTenantId && parsed.tenantId && parsed.tenantId !== activeTenantId) {
        return [];
      }
      return parsed.products as Product[];
    }
    return activeTenantId ? [] : (parsed as Product[]);
  } catch {
    return [];
  }
}

function storeCatalog(products: Product[]) {
  try {
    if (products && products.length > 0) {
      const activeTenantId = getActiveTenantId();
      const existing = getStoredCatalog();
      const merged = mergeLookupProducts(products, existing).slice(0, 1000);
      localStorage.setItem(
        CATALOG_PERSIST_KEY,
        JSON.stringify({ tenantId: activeTenantId, products: merged }),
      );
    }
  } catch {
    // storage limit fallback
  }
}

export function clearStoredCatalog() {
  try {
    localStorage.removeItem(CATALOG_PERSIST_KEY);
  } catch {
    // ignore
  }
}

export function usePosCatalog(search: string, branchId: string, locationId: string, productFilter: string = 'all') {
  const [productCache, setProductCache] = useState<Product[]>([]);
  const parsedSearch = parseQuantityPrefixQuery(search);
  const trimmedSearch = parsedSearch.cleanQuery;
  const debouncedSearch = useDebouncedValue(trimmedSearch, 250);
  const lookupTerm = isLikelyBarcodeQuery(trimmedSearch) ? trimmedSearch : debouncedSearch;
  const lookupMode: 'browse' | 'barcode' | 'search' = !lookupTerm ? 'browse' : isLikelyBarcodeQuery(lookupTerm) ? 'barcode' : 'search';
  const lookupView = productFilter === 'offers' ? 'offers' : '';
  const productsQuery = useQuery({
    queryKey: ['products', 'pos', branchId || 'all', locationId || 'all', lookupMode, lookupTerm || '', lookupView || 'all', String(POS_PRODUCT_LOOKUP_LIMIT)] as const,
    queryFn: async () => {
      try {
        const res = await posApi.lookupProducts({
          ...(lookupMode === 'barcode' ? { barcode: lookupTerm } : lookupTerm ? { q: lookupTerm } : {}),
          ...(lookupView ? { view: lookupView } : {}),
          branchId,
          locationId,
          limit: POS_PRODUCT_LOOKUP_LIMIT,
        });
        if (res && res.length > 0) {
          storeCatalog(res);
        } else if (lookupMode === 'browse' && Array.isArray(res) && res.length === 0) {
          // If browse query returned 0 products from server, purge stale local cache
          clearStoredCatalog();
          void clearCatalogStorage();
        }
        return res;
      } catch {
        // High-performance offline fallback from IndexedDB persistent storage
        const activeTenantId = getActiveTenantId();
        const storedTenantId = await getStoredTenantIdFromStorage();
        if (activeTenantId && storedTenantId && activeTenantId !== storedTenantId) {
          await clearCatalogStorage();
          return [];
        }
        const idbStored = await searchCatalogFromStorage(lookupTerm, POS_PRODUCT_LOOKUP_LIMIT);
        if (idbStored && idbStored.length > 0) {
          return idbStored;
        }

        // Secondary fallback from legacy localStorage cache
        const stored = getStoredCatalog();
        if (!lookupTerm) return stored.slice(0, POS_PRODUCT_LOOKUP_LIMIT);
        const term = lookupTerm.toLowerCase();
        return stored
          .filter((p) =>
            (p.name && p.name.toLowerCase().includes(term)) ||
            (p.barcode && String(p.barcode).toLowerCase().includes(term)) ||
            (p.sku && String(p.sku).toLowerCase().includes(term))
          )
          .slice(0, POS_PRODUCT_LOOKUP_LIMIT);
      }
    },
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });

  useEffect(() => {
    let active = true;
    (async () => {
      const activeTenantId = getActiveTenantId();
      const storedTenantId = await getStoredTenantIdFromStorage();
      if (activeTenantId && storedTenantId && activeTenantId !== storedTenantId) {
        await clearCatalogStorage();
        if (active) setProductCache([]);
        return;
      }
      const stored = await getAllCatalogFromStorage(POS_PRODUCT_CACHE_LIMIT);
      if (active) {
        setProductCache(stored || []);
      }
    })();
    return () => {
      active = false;
    };
  }, [locationId, branchId]);

  useEffect(() => {
    if (!productsQuery.data) return;
    if (productsQuery.data.length === 0 && lookupMode === 'browse') {
      setProductCache([]);
      clearStoredCatalog();
      return;
    }
    if (productsQuery.data.length > 0) {
      setProductCache((current) => mergeLookupProducts(productsQuery.data, current).slice(0, POS_PRODUCT_CACHE_LIMIT));
    }
  }, [productsQuery.data, lookupMode]);

  const saleProducts = useMemo(
    () => getAvailableSaleProducts(productsQuery.data || [], '', productFilter),
    [productsQuery.data, productFilter],
  );
  const catalogProducts = useMemo(() => mergeLookupProducts(productsQuery.data || [], productCache), [productCache, productsQuery.data]);
  const barcodeMap = useMemo(() => createProductBarcodeMap(catalogProducts), [catalogProducts]);

  return {
    productsQuery,
    saleProducts,
    catalogProducts,
    barcodeMap,
  };
}
