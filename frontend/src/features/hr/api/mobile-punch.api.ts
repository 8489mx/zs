import { http } from '@/lib/http';

export interface MobileAttendanceUser {
  employeeId: number;
  employeeNo: string;
  name: string;
  phone: string;
  branchId: number | null;
  branchName: string;
  tenantId: string;
  accountId: string;
  branchLat: number | null;
  branchLng: number | null;
  geofenceRadiusMeters: number;
}

export interface TodayAttendanceStatus {
  workDate: string;
  hasCheckedIn: boolean;
  hasCheckedOut: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInSelfie?: string | null;
  checkOutSelfie?: string | null;
  distanceMeters?: number | null;
  branch: {
    id: number | null;
    name: string;
    lat: number | null;
    lng: number | null;
    geofenceRadius: number;
  };
}

function getMobilePunchHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('zs_mobile_punch_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const mobilePunchApi = {
  login: async (payload: { phone: string; pinCode: string }) => {
    return http<{
      token: string;
      employee: MobileAttendanceUser;
      todayStatus: any;
    }>('/api/hr/mobile-punch/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getStatus: async () => {
    return http<TodayAttendanceStatus>('/api/hr/mobile-punch/status', {
      headers: getMobilePunchHeaders(),
    });
  },

  recordPunch: async (payload: {
    type: 'check_in' | 'check_out';
    latitude: number;
    longitude: number;
    selfieDataUrl?: string;
    notes?: string;
  }) => {
    return http<{
      ok: boolean;
      type: string;
      time: string;
      distanceMeters: number;
      message: string;
    }>('/api/hr/mobile-punch/record', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: getMobilePunchHeaders(),
    });
  },

  updateBranchGeofence: async (branchId: number, payload: { latitude: number; longitude: number; geofenceRadiusMeters?: number }) => {
    return http<{ ok: boolean; message: string }>(`/api/hr/mobile-punch/branches/${branchId}/geofence`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  setEmployeePin: async (employeeId: number, pinCode: string) => {
    return http<{ ok: boolean; message: string }>(`/api/hr/mobile-punch/employees/${employeeId}/pin`, {
      method: 'PUT',
      body: JSON.stringify({ pinCode }),
    });
  },
};
