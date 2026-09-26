import { http } from '@/lib/http';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  mainWarehouseQty?: number;
  costPrice: number;
  retailPrice: number;
  unitName?: string;
}

export interface VanTripSummary {
  id: number;
  repId: number;
  repName: string;
  vehicleId?: number;
  vehiclePlate?: string;
  vehicleModel?: string;
  shiftName?: string;
  startOdometer?: number;
  endOdometer?: number;
  vanLocationId: number;
  vanLocationName: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  status: 'open' | 'settled';
  openedAt: string;
  closedAt?: string;
  loadedAmount: number;
  salesAmount: number;
  cashCollected: number;
  creditSales: number;
  returnsAmount: number;
  variance: number;
  notes?: string;
}

export interface FleetVehicle {
  id: number;
  plateNumber: string;
  modelName?: string;
  vehicleType: string;
  vinChassis?: string;
  vanLocationId: number;
  vanLocationName: string;
  branchId?: number;
  currentOdometer: number;
  fuelType: string;
  licenseExpiresAt?: string;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  assignedRepId?: number | null;
  assignedRepName?: string;
  assignedRepPhone?: string;
  notes?: string;
  createdAt: string;
}

export interface RepTargetMetrics {
  periodMonth: string;
  targetAmount: number;
  actualSalesMTD: number;
  achievementRate: number;
  remainingTarget: number;
  isTargetAchieved: boolean;
  totalDaysInMonth: number;
  currentDayOfMonth: number;
  remainingDaysTotal: number;
  remainingWorkingDays: number;
  requiredDailyTarget: number;
  excludedFridaysCount: number;
  excludedHolidaysCount: number;
}

export interface VanActiveTripResponse {
  hasActiveTrip: boolean;
  trip?: VanTripSummary;
  vanLocation?: { id: number; name: string };
  inventory: VanStockItem[];
  customers: { id: number; name: string; phone?: string; address?: string; balance: number }[];
  recentSales: {
    id: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
  }[];
  targetMetrics?: RepTargetMetrics;
}

export interface CustomerEligibleSaleItem {
  saleItemId: number;
  productId: number;
  productName: string;
  soldQty: number;
  alreadyReturnedQty: number;
  remainingReturnableQty: number;
  unitPrice: number;
  netUnitPrice: number;
}

export interface CustomerEligibleSale {
  id: number;
  docNo: string;
  createdAt: string;
  total: number;
  discount: number;
  items: CustomerEligibleSaleItem[];
}

export interface VanFieldReturnRecord {
  id: number;
  docNo: string;
  tripId: number;
  repId: number;
  repName: string;
  customerId: number;
  customerName: string;
  saleId?: number;
  saleDocNo?: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  returnReason: 'damaged' | 'expired' | 'manufacturing_defect' | 'stagnant' | 'order_mismatch' | 'customer_request';
  totalAmount: number;
  items: Array<{ productId: number; productName?: string; qty: number; unitPrice: number; saleItemId?: number }>;
  notes?: string;
  rejectionReason?: string;
  approvedByName?: string;
  approvedAt?: string;
  createdAt: string;
}

export interface VanLoadRequisitionRecord {
  id: number;
  docNo: string;
  repId: number;
  repName: string;
  vehiclePlate: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  status: 'pending' | 'approved' | 'rejected' | 'dispatched';
  requestedItems: Array<{ productId: number; productName: string; barcode?: string; retailPrice?: number; qty: number; warehouseAvailQty?: number }>;
  approvedItems: Array<{ productId: number; productName: string; barcode?: string; retailPrice?: number; qty: number; warehouseAvailQty?: number }>;
  notes?: string;
  rejectionReason?: string;
  tripId?: number;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface RepTargetSummary {
  repId: number;
  repName: string;
  phone: string;
  vehiclePlate: string;
  repType: string;
  targetAmount: number;
  actualSales: number;
  achievementRate: number;
  remainingTarget: number;
  remainingWorkingDays: number;
  requiredDailyTarget: number;
  isTargetAchieved: boolean;
}

export interface TripAdminDetails {
  trip: VanTripSummary & { repPhone?: string };
  sales: Array<{
    id: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName: string;
    customerPhone: string;
    deliveryGpsLat?: number;
    deliveryGpsLng?: number;
  }>;
  collections: Array<{
    id: number;
    amount: number;
    createdAt: string;
    customerName: string;
    note?: string;
    gpsLat?: number;
    gpsLng?: number;
  }>;
  returns: Array<{
    id: number;
    docNo: string;
    totalAmount: number;
    returnReason: string;
    status: string;
    createdAt: string;
    customerName: string;
  }>;
  vanStock: Array<{
    productId: number;
    productName: string;
    barcode?: string;
    retailPrice: number;
    qty: number;
  }>;
}

function getDriverAuthHeaders() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('zs_driver_portal_token') : null;
  return { Authorization: `Bearer ${token || ''}` };
}

export const vanSalesApi = {
  getActiveTrip: async (): Promise<VanActiveTripResponse> => {
    return http<VanActiveTripResponse>('/api/driver-portal/van-sales/active-trip', {
      headers: getDriverAuthHeaders(),
    });
  },

  openTrip: async (payload: {
    sourceWarehouseId: number;
    items: { productId: number; qty: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; tripId: number; totalLoadedValue: number; itemsCount: number }> => {
    return http('/api/driver-portal/van-sales/trips/open', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  executeSale: async (payload: {
    tripId: number;
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    paymentMethod: 'cash' | 'credit';
    items: { productId: number; qty: number; unitPrice?: number }[];
    notes?: string;
    deliveryGpsLat?: number;
    deliveryGpsLng?: number;
  }): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    paymentMethod: 'cash' | 'credit';
    customerName: string;
    itemsCount: number;
  }> => {
    return http('/api/driver-portal/van-sales/sales', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  recordCollection: async (payload: {
    tripId: number;
    customerId: number;
    amount: number;
    notes?: string;
    gpsLat?: number;
    gpsLng?: number;
  }): Promise<{
    ok: boolean;
    receiptNo: string;
    amount: number;
    customerName: string;
    newBalance: number;
  }> => {
    return http('/api/driver-portal/van-sales/collections', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getCustomerEligibleSales: async (customerId: number): Promise<CustomerEligibleSale[]> => {
    const res = await http<{ ok: boolean; sales: CustomerEligibleSale[] }>(
      `/api/driver-portal/van-sales/customers/${customerId}/eligible-sales`,
      { headers: getDriverAuthHeaders() },
    );
    return res.sales || [];
  },

  submitFieldReturn: async (payload: {
    tripId: number;
    customerId: number;
    saleId?: number | null;
    returnReason: 'damaged' | 'expired' | 'manufacturing_defect' | 'stagnant' | 'order_mismatch' | 'customer_request';
    items: { productId: number; qty: number; unitPrice: number; saleItemId?: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; returnDocNo: string; returnId: number; status: string; totalAmount: number }> => {
    return http('/api/driver-portal/van-sales/field-returns', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  submitLoadRequisition: async (payload: {
    sourceWarehouseId: number;
    items: { productId: number; qty: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; docNo: string; requisitionId: number }> => {
    return http('/api/driver-portal/van-sales/requisitions', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  listMyRequisitions: async (): Promise<VanLoadRequisitionRecord[]> => {
    const res = await http<{ ok: boolean; requisitions: VanLoadRequisitionRecord[] }>(
      '/api/driver-portal/van-sales/requisitions',
      { headers: getDriverAuthHeaders() },
    );
    return res.requisitions || [];
  },

  getMyTarget: async (month?: string): Promise<{ repId: number; repName: string; metrics: RepTargetMetrics }> => {
    return http(`/api/driver-portal/van-sales/my-target${month ? `?month=${month}` : ''}`, {
      headers: getDriverAuthHeaders(),
    });
  },

  settleTrip: async (payload: {
    tripId: number;
    countedCash: number;
    unloadRemainingToWarehouse: boolean;
    notes?: string;
  }): Promise<{
    ok: boolean;
    tripId: number;
    expectedCash: number;
    countedCash: number;
    variance: number;
    unloadedItemsCount: number;
    status: 'settled';
  }> => {
    return http('/api/driver-portal/van-sales/trips/settle', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  listAdminTrips: async (filters?: {
    repId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<VanTripSummary[]> => {
    const searchParams = new URLSearchParams();
    if (filters?.repId) searchParams.set('repId', String(filters.repId));
    if (filters?.status) searchParams.set('status', filters.status);
    if (filters?.dateFrom) searchParams.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) searchParams.set('dateTo', filters.dateTo);
    const qs = searchParams.toString();
    const res = await http<{ ok: boolean; trips: VanTripSummary[] }>(`/api/van-sales/admin/trips${qs ? `?${qs}` : ''}`);
    return res.trips || [];
  },

  getTripDetails: async (tripId: number): Promise<TripAdminDetails> => {
    return http<TripAdminDetails>(`/api/van-sales/admin/trips/${tripId}`);
  },

  listVehicles: async (): Promise<FleetVehicle[]> => {
    const res = await http<{ ok: boolean; vehicles: FleetVehicle[] }>('/api/van-sales/admin/vehicles');
    return res.vehicles || [];
  },

  createVehicle: async (payload: {
    plateNumber: string;
    modelName?: string;
    vehicleType?: string;
    vinChassis?: string;
    branchId?: number;
    currentOdometer?: number;
    fuelType?: string;
    licenseExpiresAt?: string;
    assignedRepId?: number;
    notes?: string;
  }): Promise<FleetVehicle[]> => {
    const res = await http<{ ok: boolean; vehicles: FleetVehicle[] }>('/api/van-sales/admin/vehicles', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.vehicles || [];
  },

  updateVehicle: async (
    id: number,
    payload: {
      plateNumber?: string;
      modelName?: string;
      vehicleType?: string;
      vinChassis?: string;
      branchId?: number;
      currentOdometer?: number;
      fuelType?: string;
      licenseExpiresAt?: string;
      status?: string;
      assignedRepId?: number | null;
      notes?: string;
    },
  ): Promise<FleetVehicle[]> => {
    const res = await http<{ ok: boolean; vehicles: FleetVehicle[] }>(`/api/van-sales/admin/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.vehicles || [];
  },

  assignVehicleRep: async (
    vehicleId: number,
    payload: { repId: number | null; shiftName?: string },
  ): Promise<FleetVehicle[]> => {
    const res = await http<{ ok: boolean; vehicles: FleetVehicle[] }>(`/api/van-sales/admin/vehicles/${vehicleId}/assign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.vehicles || [];
  },

  // Admin Field Returns API
  listAdminReturns: async (filters?: {
    status?: string;
    repId?: number;
    tripId?: number;
    customerId?: number;
  }): Promise<VanFieldReturnRecord[]> => {
    const sp = new URLSearchParams();
    if (filters?.status) sp.set('status', filters.status);
    if (filters?.repId) sp.set('repId', String(filters.repId));
    if (filters?.tripId) sp.set('tripId', String(filters.tripId));
    if (filters?.customerId) sp.set('customerId', String(filters.customerId));
    const qs = sp.toString();
    const res = await http<{ ok: boolean; returns: VanFieldReturnRecord[] }>(`/api/van-sales/admin/returns${qs ? `?${qs}` : ''}`);
    return res.returns || [];
  },

  approveReturn: async (id: number): Promise<{ ok: boolean; returnId: number; status: string }> => {
    return http(`/api/van-sales/admin/returns/${id}/approve`, { method: 'POST' });
  },

  rejectReturn: async (id: number, reason: string): Promise<{ ok: boolean; returnId: number; status: string }> => {
    return http(`/api/van-sales/admin/returns/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Admin Loading Requisitions API
  listAdminRequisitions: async (filters?: {
    status?: string;
    repId?: number;
  }): Promise<VanLoadRequisitionRecord[]> => {
    const sp = new URLSearchParams();
    if (filters?.status) sp.set('status', filters.status);
    if (filters?.repId) sp.set('repId', String(filters.repId));
    const qs = sp.toString();
    const res = await http<{ ok: boolean; requisitions: VanLoadRequisitionRecord[] }>(`/api/van-sales/admin/requisitions${qs ? `?${qs}` : ''}`);
    return res.requisitions || [];
  },

  reviewRequisition: async (id: number, approvedItems: { productId: number; qty: number }[], notes?: string) => {
    return http(`/api/van-sales/admin/requisitions/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ approvedItems, notes }),
    });
  },

  dispatchRequisition: async (id: number): Promise<{ ok: boolean; requisitionId: number; tripId: number; docNo: string }> => {
    return http(`/api/van-sales/admin/requisitions/${id}/dispatch`, { method: 'POST' });
  },

  rejectRequisition: async (id: number, reason: string): Promise<{ ok: boolean; requisitionId: number; status: string }> => {
    return http(`/api/van-sales/admin/requisitions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Admin Rep Targets API
  listRepTargets: async (month?: string): Promise<RepTargetSummary[]> => {
    const res = await http<{ ok: boolean; targets: RepTargetSummary[] }>(`/api/van-sales/admin/targets${month ? `?month=${month}` : ''}`);
    return res.targets || [];
  },

  setRepTarget: async (repId: number, month: string, targetAmount: number) => {
    return http('/api/van-sales/admin/targets', {
      method: 'POST',
      body: JSON.stringify({ repId, month, targetAmount }),
    });
  },
};
