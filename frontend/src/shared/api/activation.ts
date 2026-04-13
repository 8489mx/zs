import { http } from '@/lib/http';
import type { ActivationInitializePayload, ActivationStatusResponse } from '@/types/activation';

export const activationApi = {
  status() {
    return http<ActivationStatusResponse>('/api/activation/status');
  },
  activate(activationCode: string) {
    return http<{ ok: boolean } & ActivationStatusResponse>('/api/activation/activate', {
      method: 'POST',
      body: JSON.stringify({ activationCode }),
    });
  },
  initialize(payload: ActivationInitializePayload) {
    return http<{ ok: boolean } & ActivationStatusResponse>('/api/activation/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
