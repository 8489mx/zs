import { http } from '@/lib/http';

export interface DailyDigestConfig {
  enabled: boolean;
  phone: string;
  timeOfDay: string;
  includeSales: boolean;
  includeTransfers: boolean;
  includeShortages: boolean;
  mainWarehouseId?: number;
  shopLocationId?: number;
}

export const dailyDigestApi = {
  getConfig: async (): Promise<DailyDigestConfig> => {
    return http<DailyDigestConfig>('/api/settings/daily-digest/config');
  },

  saveConfig: async (payload: Partial<DailyDigestConfig>): Promise<{ ok: boolean }> => {
    return http<{ ok: boolean }>('/api/settings/daily-digest/config', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  sendTest: async (phone?: string): Promise<{ success: boolean; message?: string; text?: string }> => {
    return http<{ success: boolean; message?: string; text?: string }>('/api/settings/daily-digest/send-test', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
};
