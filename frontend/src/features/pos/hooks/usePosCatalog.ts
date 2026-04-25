import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { posApi } from '@/features/pos/api/pos.api';
import { getAvailableSaleProducts, isNegativeStockSalesAllowed } from '@/features/pos/lib/pos.domain';
import { POS_PRODUCT_CACHE_LIMIT, POS_PRODUCT_LOOKUP_LIMIT, isLikelyBarcodeQuery, mergeLookupProducts } from '@/features/pos/lib/pos-product-lookup';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import type { Product } from '@/types/domain';

const posReferenceStaleTime = 45_000;

export function usePosCatalog(search: string, locationId: string) {
  const [productCache, setProductCache] = useState<Product[]>([]);
  const trimmedSearch = search.trim();
  const debouncedSearch = useDebouncedValue(trimmedSearch, 250);
  const lookupTerm = isLikelyBarcodeQuery(trimmedSearch) ? trimmedSearch : debouncedSearch;
  const lookupMode: 'browse' | 'barcode' | 'search' = !lookupTerm ? 'browse' : isLikelyBarcodeQuery(lookupTerm) ? 'barcode' : 'search';
  const productsQuery = useQuery({
    queryKey: queryKeys.posProducts(locationId, lookupMode, lookupTerm, POS_PRODUCT_LOOKUP_LIMIT),
    queryFn: () => posApi.lookupProducts({
      ...(lookupMode === 'barcode' ? { barcode: lookupTerm } : lookupTerm ? { q: lookupTerm } : {}),
      locationId,
      limit: POS_PRODUCT_LOOKUP_LIMIT,
    }),
    staleTime: 10_000,
  });
  const customersQuery = useQuery({ queryKey: queryKeys.posCustomers, queryFn: posApi.customers, staleTime: posReferenceStaleTime });
  const settingsQuery = useQuery({ queryKey: queryKeys.posSettings, queryFn: posApi.settings, staleTime: posReferenceStaleTime });
  const branchesQuery = useQuery({ queryKey: queryKeys.posBranches, queryFn: posApi.branches, staleTime: posReferenceStaleTime });
  const locationsQuery = useQuery({ queryKey: queryKeys.posLocations, queryFn: posApi.locations, staleTime: posReferenceStaleTime });

  useEffect(() => {
    setProductCache([]);
  }, [locationId]);

  useEffect(() => {
    if (!productsQuery.data?.length) return;
    setProductCache((current) => mergeLookupProducts(productsQuery.data, current).slice(0, POS_PRODUCT_CACHE_LIMIT));
  }, [productsQuery.data]);

  const saleProducts = useMemo(
    () => getAvailableSaleProducts(productsQuery.data || [], '', isNegativeStockSalesAllowed(settingsQuery.data)),
    [productsQuery.data, settingsQuery.data],
  );
  const catalogProducts = useMemo(() => mergeLookupProducts(productsQuery.data || [], productCache), [productCache, productsQuery.data]);

  return {
    productsQuery,
    customersQuery,
    settingsQuery,
    branchesQuery,
    locationsQuery,
    saleProducts,
    catalogProducts,
  };
}
