import { http } from '@/lib/http';

export interface VanStockItem {
  productId: number;
  productName: string;
  barcode: string;
  qty: number;
  mainWarehouseQty?: number;
  costPrice: number;
  retailPrice: number;
  creditPrice?: number | null;
  consumerPrice?: number | null;
  unitName?: string;
  originalPrice?: number;
  discountPerUnit?: number;
  hasActiveOffer?: boolean;
  offerBadge?: string;
  packagingUnit?: { name: string; multiplier: number };
  availableUnits?: { id: number; name: string; multiplier: number; isBase: boolean }[];
}

export interface VanTripExpense {
  id: number;
  tripId: number;
  expenseType: 'fuel' | 'toll' | 'maintenance' | 'tips' | 'meals' | 'other' | string;
  amount: number;
  notes: string;
  receiptPhotoUrl?: string | null;
  createdAt: string;
  createdByName?: string | null;
}

export interface VanPackagingMovement {
  id: number;
  packageType: string;
  deliveredQty: number;
  returnedQty: number;
  netBalance: number;
  notes: string;
  createdAt: string;
  customerId?: number | null;
  customerName?: string | null;
}

export interface CustomerPackagingBalance {
  packageType: string;
  totalDelivered: number;
  totalReturned: number;
  netOwedToCompany: number;
}

export interface PreSalesCatalogItem {
  id: number;
  name: string;
  barcode: string;
  categoryName?: string;
  categoryId?: number | null;
  supplierId?: number | null;
  supplierName?: string | null;
  packagingUnit?: { name: string; multiplier: number } | null;
  costPrice: number;
  retailPrice: number;
  creditPrice?: number | null;
  consumerPrice?: number | null;
  warehouseStock: number;
  warehouseReserved: number;
  warehouseAvailable: number;
  units: Array<{
    id: number;
    name: string;
    multiplier: number;
    isBase: boolean;
    isSaleDefault: boolean;
  }>;
  offers: Array<{
    id: number;
    offerType: string;
    value: number;
    minQty: number;
  }>;
}

export interface PreSalesOrderItemInput {
  productId: number;
  unitName?: string;
  quantity: number;
  unitMultiplier?: number;
  unitPrice?: number;
}

export interface PreSalesOrderRecord {
  id: number;
  orderNumber: string;
  orderSource: string;
  status: string;
  paymentTerms: 'cash' | 'credit';
  repId: number;
  repName?: string;
  repPhone?: string;
  customerId: number;
  customerName?: string;
  customerPhone?: string;
  warehouseLocationId?: number;
  warehouseLocationName?: string;
  totalAmount: number;
  subtotalAmount: number;
  itemsCount: number;
  notes?: string;
  deliveryDate?: string;
  supervisorApprovedAt?: string;
  supervisorApprovedByName?: string;
  supervisorRejectionReason?: string;
  createdAt: string;
  items?: Array<{
    id: number;
    productId: number;
    productName: string;
    unitName: string;
    quantity: number;
    unitMultiplier: number;
    unitPrice: number;
    consumerPrice?: number | null;
    pricingTierType: 'cash' | 'credit' | 'offer';
    unitOfferSavings?: number | null;
    lineTotal: number;
  }>;
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
  cashRefunds?: number;
  tripExpenses?: number;
  expectedCashToRemit?: number;
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
  todaySales?: number;
  collectionTarget?: number | null;
  actualCollectionsMTD?: number;
  todayCollections?: number;
  collectionAchievementRate?: number | null;
  remainingCollection?: number;
  requiredDailyCollection?: number;
  isCollectionAchieved?: boolean;
  visitsTarget?: number | null;
  actualVisitsMTD?: number;
  todayVisits?: number;
  visitsAchievementRate?: number | null;
  remainingVisits?: number;
  requiredDailyVisits?: number;
  isVisitsAchieved?: boolean;
}

export interface VanAssignedVehicle {
  id: number;
  plateNumber: string;
  modelName?: string;
  vehicleType: string;
  currentOdometer: number;
  fuelType: string;
  licenseExpiresAt?: string;
  status: string;
}

export interface VanActiveTripResponse {
  hasActiveTrip: boolean;
  trip?: VanTripSummary;
  assignedVehicle?: VanAssignedVehicle | null;
  vanLocation?: { id: number; name: string };
  inventory: VanStockItem[];
  customers: {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    balance: number;
    creditLimit?: number;
    customerCode?: string;
    route?: string;
    locationUrl?: string;
  }[];
  recentSales: {
    id: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
  }[];
  sales?: {
    id: number;
    docNo: string;
    total: number;
    subtotal?: number;
    discount?: number;
    paymentMethod: string;
    createdAt: string;
    customerName?: string;
    customerPhone?: string;
  }[];
  collections?: {
    id: number;
    amount: number;
    createdAt: string;
    customerName: string;
    note?: string;
    gpsLat?: number;
    gpsLng?: number;
  }[];
  returns?: {
    id: number;
    docNo: string;
    totalAmount: number;
    returnReason: string;
    refundMethod?: 'credit' | 'cash';
    status: string;
    createdAt: string;
    customerName?: string;
  }[];
  targetMetrics?: RepTargetMetrics;
}

export interface DriverSaleHistoryItem {
  id: number;
  docNo: string;
  total: number;
  subtotal: number;
  discount: number;
  paymentMethod: 'cash' | 'credit' | 'card' | 'split';
  paymentChannel?: string;
  paidAmount?: number;
  remainingCredit?: number;
  createdAt: string;
  packagingBreakdown?: {
    cartonsCount?: number;
    piecesCount?: number;
    itemsCount?: number;
  } | null;
  deliveryProofPhoto?: string | null;
  customerId?: number | null;
  customerName: string;
  customerPhone?: string | null;
  customerCode?: string | null;
  customerAddress?: string | null;
  repName?: string;
  vehiclePlate?: string | null;
  tripId?: number | null;
  itemsCount: number;
  items: Array<{
    productId: number;
    name: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }>;
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

export interface SupervisorCustomerRouteItem {
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCode: string;
  route: string;
  routeSequence: number;
  visitDays: string[];
  assignedRepId: number | null;
  assignedRepName: string | null;
  locationUrl?: string;
  balance: number;
  creditLimit: number;
}


export interface RequisitionItemRecord {
  productId: number;
  productName: string;
  barcode?: string;
  retailPrice?: number;
  qty: number;
  unit?: string;
  unitName?: string;
  cartonMultiplier?: number;
  packagingUnitName?: string;
  packagingUnit?: { name: string; multiplier: number };
  isWeight?: boolean;
  cartons?: number;
  pieces?: number;
  packingText?: string;
  warehouseAvailQty?: number;
  sourceWarehouseId?: number;
  sourceWarehouseName?: string;
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
  requestedItems: RequisitionItemRecord[];
  approvedItems: RequisitionItemRecord[];
  notes?: string;
  rejectionReason?: string;
  tripId?: number;
  vanLocationName?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DriverWarehouse {
  id: number;
  name: string;
  code: string;
  locationType: string;
}

export interface DriverProductStock {
  warehouseId: number;
  warehouseName: string;
  qty: number;
}

export interface DriverAvailableProduct {
  id: number;
  name: string;
  barcode: string;
  sku: string;
  retailPrice: number;
  unit: string;
  totalStock: number;
  warehouseStocks: DriverProductStock[];
  packagingUnit?: { name: string; multiplier: number };
  isWeight?: boolean;
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
  collectionTarget?: number | null;
  actualCollections?: number;
  collectionAchievementRate?: number | null;
  remainingCollection?: number;
  requiredDailyCollection?: number;
  isCollectionAchieved?: boolean;
  visitsTarget?: number | null;
  actualVisits?: number;
  visitsAchievementRate?: number | null;
  remainingVisits?: number;
  requiredDailyVisits?: number;
  isVisitsAchieved?: boolean;
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
    isCreditOverridden?: boolean;
    creditOverrideReason?: string;
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

export interface VanCustomerItineraryItem {
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCode: string;
  route: string;
  district?: string;
  visitDay?: string;
  visitDays: string[];
  isScheduledToday?: boolean;
  currentDayName?: string;
  assignedRepId?: number | null;
  assignedRepName?: string;
  locationUrl: string;
  balance: number;
  creditLimit: number;
  visitStatus: 'pending' | 'positive' | 'negative';
  todayVisit?: {
    id: number;
    visitType: 'positive' | 'negative';
    saleId?: number;
    saleDocNo?: string;
    saleTotal?: number;
    negativeReason?: string;
    postponedToDate?: string;
    visitedAt?: string;
    notes?: string;
  } | null;
  repeatedNegativesCount: number;
  hasRepeatedNegativeAlert: boolean;
}

export interface FleetFuelLogRecord {
  id: number;
  vehicleId: number;
  plateNumber: string;
  modelName?: string;
  tripId?: number;
  repId?: number;
  repName?: string;
  odometer: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  stationName?: string;
  kmSinceLastFuel: number;
  consumptionRate: number;
  notes?: string;
  createdAt: string;
}

export interface FleetOilChangeRecord {
  id: number;
  vehicleId: number;
  plateNumber: string;
  modelName?: string;
  currentOdometer: number;
  repId?: number;
  repName?: string;
  odometerAtChange: number;
  oilType: string;
  ratedKm: number;
  withFilter: boolean;
  alertKmBefore: number;
  nextDueOdometer: number;
  cost: number;
  performedBy?: string;
  status: 'active' | 'completed' | 'overdue';
  notes?: string;
  createdAt: string;
}

export interface FleetMaintenanceAlert {
  id: string;
  vehicleId: number;
  plateNumber: string;
  repName: string;
  type: 'oil_change' | 'license_expiry';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  currentValue: string | number;
  thresholdValue: string | number;
  dueDate?: string;
}

export interface VehicleDriverShiftRecord {
  id: number;
  vehicleId: number;
  repId: number;
  repName: string;
  repPhone: string;
  shiftName: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
}

export interface InterVanTransferRecord {
  id: number;
  transferNo: string;
  fromRepId: number;
  fromRepName: string;
  toRepId: number;
  toRepName: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  totalItemsCount: number;
  totalQty: number;
  notes?: string;
  createdAt: string;
  acceptedAt?: string;
  rejectedAt?: string;
  items: Array<{
    transferId: number;
    productId: number;
    productName: string;
    barcode: string;
    qty: number;
    unitPrice: number;
  }>;
}

export interface SupervisorRouteKpiSummary {
  totalVisits: number;
  positiveVisits: number;
  negativeVisits: number;
  strikeRate: number;
  negativeReasonsBreakdown: Record<string, number>;
  repeatedNegativeCustomersCount: number;
  totalFuelLiters: number;
  totalFuelCost: number;
  totalKmDriven: number;
  avgConsumptionRate: number;
  alertsCount: number;
  alerts: FleetMaintenanceAlert[];
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

  openTrip: async (payload?: {
    sourceWarehouseId?: number;
    items?: { productId: number; qty: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; tripId: number; totalLoadedValue: number; itemsCount: number }> => {
    return http('/api/driver-portal/van-sales/trips/open', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload || {}),
    });
  },

  executeSale: async (payload: {
    tripId: number;
    customerId?: number;
    customerName?: string;
    customerPhone?: string;
    paymentMethod: 'cash' | 'credit' | 'card' | 'split';
    paidAmount?: number;
    items: {
      productId: number;
      qty: number;
      unitPrice?: number;
      unitName?: string;
      unitMultiplier?: number;
      isBonus?: boolean;
      bonusReason?: string;
      originalPrice?: number;
    }[];
    notes?: string;
    deliveryGpsLat?: number;
    deliveryGpsLng?: number;
    deliveryProofPhoto?: string;
    packagingBreakdown?: { cartonsCount?: number; piecesCount?: number; itemsCount?: number };
    clientTxId?: string;
    supervisorOverridePin?: string;
    supervisorOverrideReason?: string;
  }): Promise<{
    ok: boolean;
    saleId: number;
    docNo: string;
    total: number;
    paymentMethod: string;
    customerName: string;
    itemsCount: number;
    cashPaid?: number;
    creditOwed?: number;
  }> => {
    return http('/api/driver-portal/van-sales/sales', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getDriverSales: async (params?: {
    dateScope?: 'today' | 'yesterday' | 'week' | 'all';
    customerId?: number;
    paymentMethod?: string;
    search?: string;
    tripId?: number;
  }): Promise<{ ok: boolean; sales: DriverSaleHistoryItem[] }> => {
    const sp = new URLSearchParams();
    if (params?.dateScope) sp.set('dateScope', params.dateScope);
    if (params?.customerId) sp.set('customerId', String(params.customerId));
    if (params?.paymentMethod) sp.set('paymentMethod', params.paymentMethod);
    if (params?.search) sp.set('search', params.search);
    if (params?.tripId) sp.set('tripId', String(params.tripId));
    const qs = sp.toString();
    return http(`/api/driver-portal/van-sales/sales${qs ? '?' + qs : ''}`, {
      method: 'GET',
      headers: getDriverAuthHeaders(),
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
    refundMethod?: 'credit' | 'cash';
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
    sourceWarehouseId?: number;
    items: { productId: number; qty: number; sourceWarehouseId?: number; sourceWarehouseName?: string }[];
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

  getWarehouses: async (): Promise<DriverWarehouse[]> => {
    const res = await http<{ ok: boolean; warehouses: DriverWarehouse[] }>(
      '/api/driver-portal/van-sales/warehouses',
      { headers: getDriverAuthHeaders() },
    );
    return res.warehouses || [];
  },

  getAvailableProducts: async (warehouseId?: string): Promise<DriverAvailableProduct[]> => {
    const query = warehouseId && warehouseId !== 'all' ? `?warehouseId=${warehouseId}` : '';
    const res = await http<{ ok: boolean; products: DriverAvailableProduct[] }>(
      `/api/driver-portal/van-sales/available-products${query}`,
      { headers: getDriverAuthHeaders() },
    );
    return res.products || [];
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

  // Driver Field Itinerary & Visits
  getMyItinerary: async (): Promise<VanCustomerItineraryItem[]> => {
    const res = await http<{ ok: boolean; itinerary: VanCustomerItineraryItem[] }>(
      '/api/driver-portal/van-sales/itinerary',
      { headers: getDriverAuthHeaders() },
    );
    return res.itinerary || [];
  },

  recordFieldVisit: async (payload: {
    tripId: number;
    customerId: number;
    visitType: 'positive' | 'negative';
    saleId?: number;
    negativeReason?: 'no_cash' | 'shop_closed' | 'sufficient_stock' | 'item_unavailable' | 'postponed' | 'other';
    postponedToDate?: string;
    gpsLat?: number;
    gpsLng?: number;
    notes?: string;
  }): Promise<{ ok: boolean; visitId: number; consecutiveNegativeAlert: boolean }> => {
    return http('/api/driver-portal/van-sales/field-visits', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  // Driver Fleet Fuel & Maintenance
  recordDriverFuelLog: async (payload: {
    vehicleId: number;
    tripId?: number;
    odometer: number;
    liters: number;
    pricePerLiter: number;
    stationName?: string;
    notes?: string;
  }): Promise<{ ok: boolean; fuelLogId: number; kmSinceLastFuel: number; consumptionRate: number; totalCost: number }> => {
    return http('/api/driver-portal/van-sales/fuel-logs', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getDriverFuelLogs: async (): Promise<FleetFuelLogRecord[]> => {
    const res = await http<{ ok: boolean; logs: FleetFuelLogRecord[] }>(
      '/api/driver-portal/van-sales/fuel-logs',
      { headers: getDriverAuthHeaders() },
    );
    return res.logs || [];
  },

  recordDriverOilChange: async (payload: {
    vehicleId: number;
    odometerAtChange: number;
    oilType: string;
    ratedKm: number;
    withFilter: boolean;
    alertKmBefore?: number;
    cost?: number;
    performedBy?: string;
    notes?: string;
  }): Promise<{ ok: boolean; oilChangeId: number; nextDueOdometer: number; alertKmBefore: number }> => {
    return http('/api/driver-portal/van-sales/oil-changes', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getDriverMaintenanceAlerts: async (): Promise<FleetMaintenanceAlert[]> => {
    const res = await http<{ ok: boolean; alerts: FleetMaintenanceAlert[] }>(
      '/api/driver-portal/van-sales/maintenance-alerts',
      { headers: getDriverAuthHeaders() },
    );
    return res.alerts || [];
  },

  // Driver Inter-Van Transfers
  createDriverTransfer: async (payload: {
    toRepId: number;
    fromTripId?: number;
    toTripId?: number;
    items: { productId: number; qty: number }[];
    notes?: string;
  }): Promise<{ ok: boolean; transferId: number; transferNo: string; status: string }> => {
    return http('/api/driver-portal/van-sales/transfers', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  getDriverTransfers: async (): Promise<InterVanTransferRecord[]> => {
    const res = await http<{ ok: boolean; transfers: InterVanTransferRecord[] }>(
      '/api/driver-portal/van-sales/transfers',
      { headers: getDriverAuthHeaders() },
    );
    return res.transfers || [];
  },

  acceptDriverTransfer: async (transferId: number): Promise<{ ok: boolean; transferId: number; status: string }> => {
    return http(`/api/driver-portal/van-sales/transfers/${transferId}/accept`, {
      method: 'POST',
      headers: getDriverAuthHeaders(),
    });
  },

  rejectDriverTransfer: async (transferId: number, reason?: string): Promise<{ ok: boolean; transferId: number; status: string }> => {
    return http(`/api/driver-portal/van-sales/transfers/${transferId}/reject`, {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
  },

  getPeerReps: async (): Promise<Array<{ id: number; name: string; phone?: string; vehiclePlate?: string }>> => {
    const res = await http<{ ok: boolean; reps: any[] }>('/api/driver-portal/van-sales/peer-reps', {
      headers: getDriverAuthHeaders(),
    });
    return res.reps || [];
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

  getAdminWarehouses: async (): Promise<DriverWarehouse[]> => {
    const res = await http<{ ok: boolean; warehouses: DriverWarehouse[] }>('/api/van-sales/admin/warehouses');
    return res.warehouses || [];
  },

  createAdminLoadRequisition: async (payload: {
    repId: number;
    sourceWarehouseId?: number;
    items: { productId: number; qty: number; productName?: string; barcode?: string }[];
    notes?: string;
    dispatchImmediately?: boolean;
  }): Promise<{ ok: boolean; docNo: string; requisitionId: number; dispatched: boolean; tripId?: number }> => {
    return http('/api/van-sales/admin/requisitions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getAdminAvailableProducts: async (warehouseId?: number | string): Promise<DriverAvailableProduct[]> => {
    const query = warehouseId && warehouseId !== 'all' ? `?warehouseId=${warehouseId}` : '';
    const res = await http<{ ok: boolean; products: DriverAvailableProduct[] }>(
      `/api/van-sales/admin/available-products${query}`,
    );
    return res.products || [];
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

  deleteRequisition: async (id: number): Promise<{ ok: boolean; requisitionId: number; docNo: string }> => {
    return http(`/api/van-sales/admin/requisitions/${id}`, {
      method: 'DELETE',
    });
  },

  // Admin Rep Targets API
  listRepTargets: async (month?: string): Promise<RepTargetSummary[]> => {
    const res = await http<{ ok: boolean; targets: RepTargetSummary[] }>(`/api/van-sales/admin/targets${month ? `?month=${month}` : ''}`);
    return res.targets || [];
  },

  setRepTarget: async (
    repId: number,
    month: string,
    targetAmount: number,
    collectionTarget?: number | null,
    visitsTarget?: number | null,
  ) => {
    return http('/api/van-sales/admin/targets', {
      method: 'POST',
      body: JSON.stringify({ repId, month, targetAmount, collectionTarget, visitsTarget }),
    });
  },

  // Supervisor Route KPIs & Field Visits API
  fetchSupervisorRouteKpis: async (params?: { dateFrom?: string; dateTo?: string }): Promise<SupervisorRouteKpiSummary> => {
    const sp = new URLSearchParams();
    if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.set('dateTo', params.dateTo);
    const qs = sp.toString();
    const res = await http<SupervisorRouteKpiSummary & { ok: boolean }>(`/api/van-sales/admin/kpis${qs ? `?${qs}` : ''}`);
    return res;
  },

  fetchAdminFieldVisits: async (filters?: {
    repId?: number;
    customerId?: number;
    visitType?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<any[]> => {
    const sp = new URLSearchParams();
    if (filters?.repId) sp.set('repId', String(filters.repId));
    if (filters?.customerId) sp.set('customerId', String(filters.customerId));
    if (filters?.visitType) sp.set('visitType', filters.visitType);
    if (filters?.dateFrom) sp.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) sp.set('dateTo', filters.dateTo);
    const qs = sp.toString();
    const res = await http<{ ok: boolean; visits: any[] }>(`/api/van-sales/admin/field-visits${qs ? `?${qs}` : ''}`);
    return res.visits || [];
  },

  setCustomerRouteSchedule: async (
    customerId: number,
    payload: {
      route?: string;
      routeSequence?: number;
      visitDays?: string[];
      customerCode?: string;
      locationUrl?: string;
      assignedRepId?: number | null;
      assignedRepName?: string;
    },
  ) => {
    return http(`/api/van-sales/admin/customers/${customerId}/route-schedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getSupervisorCustomerRoutes: async (filters?: {
    search?: string;
    repId?: number | string;
    route?: string;
    unassignedOnly?: boolean;
  }): Promise<SupervisorCustomerRouteItem[]> => {
    const sp = new URLSearchParams();
    if (filters?.search) sp.set('search', filters.search);
    if (filters?.repId && filters.repId !== 'all') sp.set('repId', String(filters.repId));
    if (filters?.route && filters.route !== 'all') sp.set('route', filters.route);
    if (filters?.unassignedOnly) sp.set('unassignedOnly', 'true');
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    const res = await http<{ ok: boolean; customers: SupervisorCustomerRouteItem[] }>(
      `/api/van-sales/admin/supervisor/customer-routes${qs}`,
    );
    return res.customers || [];
  },

  bulkAssignCustomerRoutes: async (payload: {
    customerIds: number[];
    assignedRepId?: number | null;
    assignedRepName?: string;
    route?: string;
    visitDays?: string[];
  }): Promise<{ ok: boolean; updatedCount: number; assignedRepId?: number | null; assignedRepName?: string | null }> => {
    return http<{ ok: boolean; updatedCount: number; assignedRepId?: number | null; assignedRepName?: string | null }>(
      `/api/van-sales/admin/supervisor/customer-routes/bulk-assign`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },


  // Fleet Fuel Logs API
  fetchAdminFuelLogs: async (filters?: { vehicleId?: number; repId?: number; dateFrom?: string; dateTo?: string }): Promise<FleetFuelLogRecord[]> => {
    const sp = new URLSearchParams();
    if (filters?.vehicleId) sp.set('vehicleId', String(filters.vehicleId));
    if (filters?.repId) sp.set('repId', String(filters.repId));
    if (filters?.dateFrom) sp.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) sp.set('dateTo', filters.dateTo);
    const qs = sp.toString();
    const res = await http<{ ok: boolean; logs: FleetFuelLogRecord[] }>(`/api/van-sales/admin/fuel-logs${qs ? `?${qs}` : ''}`);
    return res.logs || [];
  },

  recordAdminFuelLog: async (payload: {
    vehicleId: number;
    tripId?: number;
    repId?: number;
    odometer: number;
    liters: number;
    pricePerLiter: number;
    stationName?: string;
    notes?: string;
  }) => {
    return http('/api/van-sales/admin/fuel-logs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Fleet Oil Changes API
  fetchAdminOilChanges: async (vehicleId?: number): Promise<FleetOilChangeRecord[]> => {
    const res = await http<{ ok: boolean; changes: FleetOilChangeRecord[] }>(
      `/api/van-sales/admin/oil-changes${vehicleId ? `?vehicleId=${vehicleId}` : ''}`,
    );
    return res.changes || [];
  },

  recordAdminOilChange: async (payload: {
    vehicleId: number;
    odometerAtChange: number;
    oilType: string;
    ratedKm: number;
    withFilter: boolean;
    alertKmBefore?: number;
    cost?: number;
    performedBy?: string;
    notes?: string;
    repId?: number;
  }) => {
    return http('/api/van-sales/admin/oil-changes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  fetchMaintenanceAlerts: async (): Promise<FleetMaintenanceAlert[]> => {
    const res = await http<{ ok: boolean; alerts: FleetMaintenanceAlert[] }>('/api/van-sales/admin/maintenance-alerts');
    return res.alerts || [];
  },

  // Multi-Driver Vehicle Shifts API
  fetchVehicleDrivers: async (vehicleId: number): Promise<VehicleDriverShiftRecord[]> => {
    const res = await http<{ ok: boolean; drivers: VehicleDriverShiftRecord[] }>(
      `/api/van-sales/admin/vehicles/${vehicleId}/drivers`,
    );
    return res.drivers || [];
  },

  assignVehicleDriver: async (
    vehicleId: number,
    payload: {
      repId: number;
      shiftName: string;
      shiftStartTime?: string;
      shiftEndTime?: string;
      notes?: string;
    },
  ) => {
    return http(`/api/van-sales/admin/vehicles/${vehicleId}/drivers`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  removeVehicleDriver: async (vehicleId: number, driverId: number) => {
    return http(`/api/van-sales/admin/vehicles/${vehicleId}/drivers/${driverId}`, {
      method: 'DELETE',
    });
  },

  // Inter-Van Transfers Audit API
  fetchAdminTransfers: async (filters?: { repId?: number; status?: string }): Promise<InterVanTransferRecord[]> => {
    const sp = new URLSearchParams();
    if (filters?.repId) sp.set('repId', String(filters.repId));
    if (filters?.status) sp.set('status', filters.status);
    const qs = sp.toString();
    const res = await http<{ ok: boolean; transfers: InterVanTransferRecord[] }>(`/api/van-sales/admin/transfers${qs ? `?${qs}` : ''}`);
    return res.transfers || [];
  },

  // Field Pre-Sales (Order Booking from Main Warehouse) API
  fetchPreSalesCatalog: async (params?: { warehouseLocationId?: number; search?: string; categoryId?: number }): Promise<PreSalesCatalogItem[]> => {
    const sp = new URLSearchParams();
    if (params?.warehouseLocationId) sp.set('warehouseLocationId', String(params.warehouseLocationId));
    if (params?.search) sp.set('search', params.search);
    if (params?.categoryId) sp.set('categoryId', String(params.categoryId));
    const qs = sp.toString();
    const res = await http<any>(
      `/api/driver-portal/van-sales/pre-sales/catalog${qs ? `?${qs}` : ''}`,
      { headers: getDriverAuthHeaders() }
    );
    return res.products || res.items || [];
  },

  createPreSalesOrder: async (payload: {
    customerId: number;
    paymentMethod: 'cash' | 'credit';
    warehouseLocationId?: number;
    notes?: string;
    deliveryDate?: string;
    items: PreSalesOrderItemInput[];
  }): Promise<{ ok: boolean; orderId: number; orderNumber: string; totalAmount: number; status: string }> => {
    return http('/api/driver-portal/van-sales/pre-sales/orders', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },

  fetchMyPreSalesOrders: async (params?: { status?: string; dateFrom?: string; dateTo?: string; search?: string }): Promise<PreSalesOrderRecord[]> => {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.dateFrom) sp.set('dateFrom', params.dateFrom);
    if (params?.dateTo) sp.set('dateTo', params.dateTo);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    const res = await http<{ ok: boolean; orders: PreSalesOrderRecord[] }>(
      `/api/driver-portal/van-sales/pre-sales/my-orders${qs ? `?${qs}` : ''}`,
      { headers: getDriverAuthHeaders() }
    );
    return res.orders || [];
  },

  getPreSalesOrderDetails: async (orderId: number): Promise<PreSalesOrderRecord> => {
    const res = await http<any>(
      `/api/driver-portal/van-sales/pre-sales/orders/${orderId}`,
      { headers: getDriverAuthHeaders() }
    );
    return res.order || res;
  },

  // Supervisor Admin Pre-Sales Endpoints
  listAdminPreSalesOrders: async (filters?: {
    repId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<PreSalesOrderRecord[]> => {
    const sp = new URLSearchParams();
    if (filters?.repId) sp.set('repId', String(filters.repId));
    if (filters?.status) sp.set('status', filters.status);
    if (filters?.dateFrom) sp.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) sp.set('dateTo', filters.dateTo);
    if (filters?.search) sp.set('search', filters.search);
    const qs = sp.toString();
    const res = await http<{ ok: boolean; orders: PreSalesOrderRecord[] }>(`/api/van-sales/admin/pre-sales-orders${qs ? `?${qs}` : ''}`);
    return res.orders || [];
  },

  getAdminPreSalesOrderDetails: async (orderId: number): Promise<PreSalesOrderRecord> => {
    const res = await http<any>(`/api/van-sales/admin/pre-sales-orders/${orderId}`);
    return res.order || res;
  },

  approveAdminPreSalesOrder: async (orderId: number): Promise<{ ok: boolean; status: string }> => {
    return http(`/api/van-sales/admin/pre-sales-orders/${orderId}/approve`, {
      method: 'POST',
    });
  },

  rejectAdminPreSalesOrder: async (orderId: number, reason?: string): Promise<{ ok: boolean; status: string }> => {
    return http(`/api/van-sales/admin/pre-sales-orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // =========================================================================
  // Trip Operational Expenses API
  // =========================================================================

  recordTripExpense: async (
    payloadOrTripId: number | { tripId: number; expenseType: string; amount: number; notes?: string; description?: string; receiptPhotoUrl?: string; receiptPhoto?: string },
    extraPayload?: { expenseType: string; amount: number; notes?: string; description?: string; receiptPhotoUrl?: string; receiptPhoto?: string },
  ): Promise<{ ok: boolean; expenseId: number; totalTripExpenses: number }> => {
    let tripId: number;
    let body: any;
    if (typeof payloadOrTripId === 'number') {
      tripId = payloadOrTripId;
      body = {
        tripId,
        expenseType: extraPayload?.expenseType,
        amount: extraPayload?.amount,
        notes: extraPayload?.notes || extraPayload?.description,
        receiptPhotoUrl: extraPayload?.receiptPhotoUrl || extraPayload?.receiptPhoto,
      };
    } else {
      tripId = payloadOrTripId.tripId;
      body = {
        tripId,
        expenseType: payloadOrTripId.expenseType,
        amount: payloadOrTripId.amount,
        notes: payloadOrTripId.notes || payloadOrTripId.description,
        receiptPhotoUrl: payloadOrTripId.receiptPhotoUrl || payloadOrTripId.receiptPhoto,
      };
    }
    return http(`/api/driver-portal/van-sales/trips/${tripId}/expenses`, {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(body),
    });
  },

  getTripExpenses: async (tripId: number): Promise<{ expenses: VanTripExpense[]; totalExpenses: number }> => {
    return http(`/api/driver-portal/van-sales/trips/${tripId}/expenses`, {
      headers: getDriverAuthHeaders(),
    });
  },

  getAdminTripExpenses: async (tripId: number): Promise<{ expenses: VanTripExpense[]; totalExpenses: number }> => {
    return http(`/api/van-sales/admin/trips/${tripId}/expenses`);
  },

  // =========================================================================
  // Returnable Packaging & Empties Ledger API
  // =========================================================================

  recordPackagingMovement: async (
    payloadOrTripId: number | { tripId: number; customerId?: number; packageType?: string; packagingType?: string; deliveredQty?: number; qtyOut?: number; returnedQty?: number; qtyIn?: number; notes?: string },
    extraPayload?: { customerId?: number; packageType?: string; packagingType?: string; deliveredQty?: number; qtyOut?: number; returnedQty?: number; qtyIn?: number; notes?: string },
  ): Promise<{ ok: boolean; movementId: number }> => {
    let tripId: number;
    let p: any;
    if (typeof payloadOrTripId === 'number') {
      tripId = payloadOrTripId;
      p = extraPayload || {};
    } else {
      tripId = payloadOrTripId.tripId;
      p = payloadOrTripId;
    }
    const body = {
      tripId,
      customerId: p.customerId,
      packageType: p.packageType || p.packagingType || 'crate_plastic',
      deliveredQty: p.deliveredQty ?? p.qtyOut ?? 0,
      returnedQty: p.returnedQty ?? p.qtyIn ?? 0,
      notes: p.notes,
    };
    return http(`/api/driver-portal/van-sales/trips/${tripId}/packaging`, {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(body),
    });
  },

  getTripPackagingMovements: async (tripId: number): Promise<VanPackagingMovement[]> => {
    return http(`/api/driver-portal/van-sales/trips/${tripId}/packaging`, {
      headers: getDriverAuthHeaders(),
    });
  },

  getAdminTripPackaging: async (tripId: number): Promise<VanPackagingMovement[]> => {
    return http(`/api/van-sales/admin/trips/${tripId}/packaging`);
  },

  getCustomerPackagingBalance: async (customerId: number): Promise<CustomerPackagingBalance[]> => {
    return http(`/api/driver-portal/van-sales/customers/${customerId}/packaging`, {
      headers: getDriverAuthHeaders(),
    });
  },

  getAdminCustomerPackaging: async (customerId: number): Promise<CustomerPackagingBalance[]> => {
    return http(`/api/van-sales/admin/customers/${customerId}/packaging`);
  },

  createCustomer: async (payload: {
    name: string;
    phone?: string;
    address?: string;
    district?: string;
    route?: string;
    notes?: string;
    metadata?: any;
  }): Promise<{ ok: boolean; customer: any }> => {
    return http('/api/driver-portal/van-sales/customers', {
      method: 'POST',
      headers: getDriverAuthHeaders(),
      body: JSON.stringify(payload),
    });
  },
};

