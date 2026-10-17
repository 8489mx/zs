import { useQuery } from '@tanstack/react-query';
import { storefrontApi } from '@/features/storefront';
import { posApi } from '@/features/pos/api/pos.api';
import { restaurantAdvancedFnbApi } from '@/features/pos/api/restaurant-advanced-fnb.api';

export function useSelfOrderingKiosk(storeSlug: string = 'almhnds') {
  const cleanSlug = String(storeSlug || 'almhnds').trim().toLowerCase();

  const { data: catalogData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['kiosk-catalog', cleanSlug],
    queryFn: async () => {
      // 1. Try target slug if provided and valid
      if (cleanSlug && cleanSlug !== 'main') {
        try {
          const cat = await storefrontApi.getCatalog(cleanSlug);
          if (cat && cat.products && cat.products.length > 0) return cat;
        } catch {
          // ignore & fallback
        }
      }

      // 2. Try candidate fallback slugs
      const candidateSlugs = ['almhnds', 'default'];
      for (const candidate of candidateSlugs) {
        if (candidate === cleanSlug) continue;
        try {
          const fallbackCat = await storefrontApi.getCatalog(candidate);
          if (fallbackCat && fallbackCat.products && fallbackCat.products.length > 0) return fallbackCat;
        } catch {
          // continue
        }
      }

      // 3. Fallback to POS product catalog (for authenticated POS/kiosk terminals)
      try {
        const rawProducts = await posApi.lookupProducts({ limit: 100 });
        const productsList = Array.isArray(rawProducts) ? rawProducts : (rawProducts as any)?.products || [];
        if (productsList.length > 0) {
          const categoryMap = new Map<number, string>();
          productsList.forEach((p: any) => {
            if (p.categoryId && p.categoryName) {
              categoryMap.set(Number(p.categoryId), String(p.categoryName));
            }
          });
          const categories = Array.from(categoryMap.entries()).map(([id, name]) => ({
            id,
            name,
            imageUrl: '',
          }));

          return {
            categories,
            products: productsList.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: Number(p.retailPrice ?? p.price ?? 0),
              categoryId: p.categoryId ? Number(p.categoryId) : null,
              categoryName: p.categoryName || 'عام',
              imageUrl: p.imageUrl || p.image_url || '',
              description: p.description || p.notes || '',
              inStock: true,
            })),
          };
        }
      } catch {
        // ignore
      }

      return { categories: [], products: [] };
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
    const slugToUse = cleanSlug && cleanSlug !== 'main' ? cleanSlug : 'almhnds';
    const payload = {
      customerName:
        orderPayload.customerName ||
        (orderPayload.orderType === 'dine_in'
          ? `عميل طاولة ${orderPayload.tableNumber || ''}`.trim()
          : 'طلب كشك استلام سفري'),
      customerPhone: orderPayload.customerPhone || '01000000000',
      orderType: orderPayload.orderType === 'takeaway' ? 'delivery' : 'dine_in',
      fulfillmentType: orderPayload.orderType === 'takeaway' ? 'pickup' : 'dine_in',
      tableNumber: orderPayload.tableNumber ? String(orderPayload.tableNumber) : undefined,
      customerNotes: orderPayload.notes,
      paymentMethod: orderPayload.paymentMethod || 'card',
      items: (orderPayload.items || []).map((item: any) => ({
        productId: item.productId,
        quantity: item.qty || item.quantity || 1,
        notes: item.notes,
      })),
    };
    return await storefrontApi.createOrder(slugToUse, payload as any);
  };

  const listTerminals = async () => {
    try {
      const res = await posApi.listTerminals();
      return res?.data || [];
    } catch {
      return [];
    }
  };

  const initiateTerminalCharge = async (payload: { terminalId?: string; amount: number; invoiceReference?: string }) => {
    return await posApi.initiateTerminalCharge(payload);
  };

  return {
    catalogData,
    isCatalogLoading,
    checkUpsell,
    createOrder,
    listTerminals,
    initiateTerminalCharge,
  };
}
