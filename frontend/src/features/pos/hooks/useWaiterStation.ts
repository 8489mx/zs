import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/features/pos/api/pos.api';
import { settingsApi } from '@/features/settings';
import { printKitchenTicket } from '@/lib/pos-printing/kitchen';
import { toast } from '@/shared/components/system-alert';
import { tableCallsApi, type TableServiceCall } from '@/shared/api/table-calls.api';

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
    queryFn: () => settingsApi.settings(),
  });
  const tablesCount = Math.max(1, Number(settings?.restaurantTablesCount || 20));

  // Products Catalog (Cached & Fast)
  const { data: productsData, isLoading: isCatalogLoading } = useQuery({
    queryKey: ['waiter-products'],
    queryFn: () => posApi.lookupProducts({ fullCatalog: true, limit: 100 }),
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

  // Real-time table service calls (Waiters & Bill requests)
  const { data: pendingCalls = [], refetch: refetchCalls } = useQuery({
    queryKey: ['waiter-station-table-calls'],
    queryFn: () => tableCallsApi.listPendingCalls(),
    refetchInterval: 5_000,
  });

  const pendingCallsByTable = useMemo(() => {
    const map = new Map<string, TableServiceCall[]>();
    for (const call of pendingCalls) {
      const tNum = String(call.table_number).trim();
      if (!map.has(tNum)) {
        map.set(tNum, []);
      }
      map.get(tNum)!.push(call);
    }
    return map;
  }, [pendingCalls]);

  const resolveCallMutation = useMutation({
    mutationFn: (callId: number) => tableCallsApi.resolveCall(callId),
    onSuccess: () => {
      toast.success('تم تأكيد تلبية نداء الطاولة');
      queryClient.invalidateQueries({ queryKey: ['waiter-station-table-calls'] });
    },
    onError: () => {
      toast.error('فشل تحديث حالة النداء');
    },
  });

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
        } as any, settings);
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
    pendingCalls,
    pendingCallsByTable,
    handleResolveCall: (callId: number) => resolveCallMutation.mutateAsync(callId),
    sendToKitchen: sendToKitchenMutation.mutateAsync,
    isSendingToKitchen: sendToKitchenMutation.isPending,
  };
}
