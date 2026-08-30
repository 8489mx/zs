import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/features/pos/api/pos.api';
import { getAvailableSaleProducts } from '@/features/pos/lib/pos.domain';
import { POS_PRODUCT_CACHE_LIMIT, POS_PRODUCT_LOOKUP_LIMIT, createProductBarcodeMap, isLikelyBarcodeQuery, mergeLookupProducts } from '@/features/pos/lib/pos-product-lookup';
import { parseQuantityPrefixQuery } from '@/features/pos/lib/pos-quantity-prefix';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import type { Product } from '@/types/domain';

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
    queryFn: () => posApi.lookupProducts({
      ...(lookupMode === 'barcode' ? { barcode: lookupTerm } : lookupTerm ? { q: lookupTerm } : {}),
      ...(lookupView ? { view: lookupView } : {}),
      branchId,
      locationId,
      limit: POS_PRODUCT_LOOKUP_LIMIT,
    }),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
  useEffect(() => {
    setProductCache([]);
  }, [locationId, branchId]);

  useEffect(() => {
    if (!productsQuery.data?.length) return;
    setProductCache((current) => mergeLookupProducts(productsQuery.data, current).slice(0, POS_PRODUCT_CACHE_LIMIT));
  }, [productsQuery.data]);

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
