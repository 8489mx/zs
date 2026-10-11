import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/features/pos/api/pos.api';
import { settingsApi } from '@/features/settings';
import { printKitchenTicket } from '@/lib/pos-printing/kitchen';
import { toast } from '@/shared/components/system-alert';

export interface WaiterCartItem {
  id: string;
  productId: number;
  name: string;
  price: number;
  qty: number;
  notes?: string;
  modifiers?: Array<{ name: string; price: number }>;
}

export function useWaiterStation() {
  const queryClient = useQueryClient();

  // Settings & Configuration
  const { data: settings } = useQuery({
    queryKey: ['waiter-settings'],
    queryFn: () => settingsApi.getSettings(),
  });
  const tablesCount = Math.max(1, Number(settings?.restaurantTablesCount || 20));

  // Products Catalog (Cached & Fast)
  const { data: productsData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['waiter-products'],
    queryFn: () => posApi.searchProducts({ fullCatalog: true, limit: 100 }),
  });
  const products = productsData || [];

  // Active Held Drafts (To know occupied tables and their items)
  const { data: heldDrafts = [], refetch: refetchDrafts } = useQuery({
    queryKey: ['waiter-held-drafts'],
    queryFn: () => posApi.listHeldDrafts(),
    refetchInterval: 10_000,
  });

  const occupiedTablesMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const d of heldDrafts) {
      if (d.tableNumber && String(d.tableNumber).trim()) {
        map.set(String(d.tableNumber).trim(), d);
      }
    }
    return map;
  }, [heldDrafts]);

  // Submit & Send to Kitchen Mutation
  const sendToKitchenMutation = useMutation({
    mutationFn: async ({
      selectedTable,
      guestCount,
      waiterPin,
      cart,
    }: {
      selectedTable: string;
      guestCount: number;
      waiterPin: string;
      cart: WaiterCartItem[];
    }) => {
      if (!selectedTable || cart.length === 0) return;

      const existingDraft = occupiedTablesMap.get(selectedTable);
      const existingCart = existingDraft?.cart || [];

      // Consolidate payload
      const combinedCart = [
        ...existingCart,
        ...cart.map((c) => ({
          productId: c.productId,
          productName: c.name,
          name: c.name,
          price: c.price,
          qty: c.qty,
          notes: c.notes,
          modifiers: c.modifiers || [],
        })),
      ];

      const draftPayload = {
        id: existingDraft?.id || `draft-${Date.now()}`,
        tableNumber: selectedTable,
        orderType: 'dine_in',
        guestCount,
        waiterPin,
        cart: combinedCart,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save / Update Held Draft
      await posApi.saveHeldDraft(draftPayload);

      // 2. Thermal Kitchen Order Ticket (KOT)
      try {
        printKitchenTicket({
          ticketNumber: String(draftPayload.id).slice(-4),
          tableNumber: selectedTable,
          orderType: 'dine_in',
          items: cart.map((c) => ({
            name: c.name,
            qty: c.qty,
            notes: c.notes,
            modifiers: c.modifiers,
          })),
          timestamp: new Date(),
          serverName: `ويتر #${waiterPin}`,
        });
      } catch {
        // Kitchen print non-blocking
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(`تم إرسال طلب طاولة ${variables.selectedTable} إلى المطبخ بنجاح!`);
      queryClient.invalidateQueries({ queryKey: ['waiter-held-drafts'] });
      queryClient.invalidateQueries({ queryKey: ['pos-floor-kds-tickets'] });
    },
    onError: () => {
      toast.error('تعذر إرسال الطلب إلى المطبخ. يرجى التحقق من الاتصال.');
    },
  });

  return {
    tablesCount,
    products,
    isCatalogLoading,
    heldDrafts,
    refetchDrafts,
    occupiedTablesMap,
    sendToKitchen: sendToKitchenMutation.mutateAsync,
    isSendingToKitchen: sendToKitchenMutation.isPending,
  };
}
