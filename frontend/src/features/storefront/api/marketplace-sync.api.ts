import { http } from '@/lib/http';

export interface AmazonConfig {
  enabled: boolean;
  sellerId: string;
  refreshToken?: string;
  clientId?: string;
  clientSecret?: string;
  marketplaceId: 'eg' | 'sa' | 'ae';
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'fba' | 'fbm';
}

export interface NoonConfig {
  enabled: boolean;
  merchantId: string;
  apiKey?: string;
  appSecret?: string;
  marketplace: 'eg' | 'sa' | 'ae';
  autoSyncStock: boolean;
  autoPullOrders: boolean;
  fulfillmentType: 'fbn' | 'direct';
}

export interface MarketplaceSkuMapping {
  id: string;
  productId: number;
  productName?: string;
  barcode?: string;
  marketplace: 'amazon' | 'noon';
  marketplaceSku: string;
  marketplaceTitle?: string;
  customPrice?: number;
  syncStock: boolean;
  currentLocalStock?: number;
  lastSyncedStock?: number;
  lastSyncedAt?: string;
  status: 'synced' | 'pending' | 'error';
  errorMessage?: string;
}

export const marketplaceSyncApi = {
  getConfig: async (): Promise<{ amazon: AmazonConfig; noon: NoonConfig }> => {
    return http<{ amazon: AmazonConfig; noon: NoonConfig }>('/api/storefront/marketplaces/config');
  },

  saveConfig: async (payload: { amazon?: Partial<AmazonConfig>; noon?: Partial<NoonConfig> }): Promise<{ ok: boolean }> => {
    return http<{ ok: boolean }>('/api/storefront/marketplaces/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  testConnection: async (marketplace: 'amazon' | 'noon'): Promise<{ success: boolean; message: string; pingMs: number; accountName?: string }> => {
    return http<{ success: boolean; message: string; pingMs: number; accountName?: string }>('/api/storefront/marketplaces/test-connection', {
      method: 'POST',
      body: JSON.stringify({ marketplace }),
    });
  },

  getMappings: async (): Promise<MarketplaceSkuMapping[]> => {
    return http<MarketplaceSkuMapping[]>('/api/storefront/marketplaces/mappings');
  },

  saveMapping: async (payload: Omit<MarketplaceSkuMapping, 'id'> & { id?: string }): Promise<MarketplaceSkuMapping> => {
    return http<MarketplaceSkuMapping>('/api/storefront/marketplaces/mappings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  deleteMapping: async (id: string | number): Promise<{ ok: boolean }> => {
    return http<{ ok: boolean }>(`/api/storefront/marketplaces/mappings/${id}`, {
      method: 'DELETE',
    });
  },

  syncInventory: async (marketplace?: 'amazon' | 'noon'): Promise<{ syncedCount: number; updatedMappings: MarketplaceSkuMapping[] }> => {
    const query = marketplace ? `?marketplace=${marketplace}` : '';
    return http<{ syncedCount: number; updatedMappings: MarketplaceSkuMapping[] }>(`/api/storefront/marketplaces/sync-inventory${query}`, {
      method: 'POST',
    });
  },

  simulateOrder: async (marketplace: 'amazon' | 'noon'): Promise<{ success: boolean; orderId: number; orderNumber: string; totalAmount: number; reservedProductName: string }> => {
    return http<{ success: boolean; orderId: number; orderNumber: string; totalAmount: number; reservedProductName: string }>('/api/storefront/marketplaces/simulate-order', {
      method: 'POST',
      body: JSON.stringify({ marketplace }),
    });
  },

  getAmazonConfig: async (): Promise<AmazonConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.amazon;
  },

  getNoonConfig: async (): Promise<NoonConfig> => {
    const cfg = await marketplaceSyncApi.getConfig();
    return cfg.noon;
  },

  listMappings: async (): Promise<MarketplaceSkuMapping[]> => {
    return marketplaceSyncApi.getMappings();
  },

  addMapping: async (payload: any): Promise<MarketplaceSkuMapping> => {
    return marketplaceSyncApi.saveMapping(payload);
  },

  syncStock: async (marketplace?: any): Promise<{ synced: number }> => {
    const res = await marketplaceSyncApi.syncInventory(marketplace);
    return { synced: res.syncedCount };
  },

  simulateIncomingOrder: async (marketplace: 'amazon' | 'noon'): Promise<{ marketplace: string; marketplaceOrderId: string; customerName: string; quantity: number }> => {
    const res = await marketplaceSyncApi.simulateOrder(marketplace);
    return {
      marketplace,
      marketplaceOrderId: res.orderNumber || String(res.orderId),
      customerName: 'عميل المنصة (محاكاة)',
      quantity: 1,
    };
  },
};
