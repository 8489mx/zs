import { useQuery } from '@tanstack/react-query';
import { storefrontApi } from '@/features/storefront';
import { posApi } from '@/features/pos/api/pos.api';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';

export function useSelfOrderingKiosk(storeName: string = 'main') {
  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['kiosk-catalog', storeName],
    queryFn: async () => {
      try {
        const cat = await storefrontApi.getCatalog(storeName);
        if (cat && cat.products && cat.products.length > 0) return cat;
      } catch {
        // Fallback to POS product catalog
      }
      const products = await posApi.lookupProducts({ limit: 100 });
      return {
        categories: [],
        products: (products || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          price: Number(p.price || 0),
          categoryId: null,
          imageUrl: p.image_url || p.imageUrl || '',
          description: p.description || '',
          inStock: true,
        })),
      };
    },
    staleTime: 60_000,
  });

  const checkUpsell = async (productId: number) => {
    try {
      const rules = await restaurantAdvancedFnbApi.getUpsellRecommendations(productId);
      return rules || [];
    } catch {
      return [];
    }
  };

  const createOrder = async (orderPayload: any) => {
    return await storefrontApi.createOrder(storeName, orderPayload);
  };

  return {
    catalogData,
    isCatalogLoading,
    checkUpsell,
    createOrder,
  };
}
