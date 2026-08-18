export type MaintenanceStatus =
  | 'received'
  | 'inspecting'
  | 'in_progress'
  | 'repaired'
  | 'delivered'
  | 'unrepairable'
  | 'cancelled';

export interface MaintenanceTicketPart {
  id: string;
  ticketId: string;
  productId: string;
  productName: string;
  qty: number;
  unitCost: number;
  unitPrice: number;
  totalPrice: number;
  locationId?: string | null;
  createdAt: string;
}

export interface MaintenanceTicket {
  id: string;
  ticketNo: string;
  customerId?: string | null;
  customerName: string;
  customerPhone: string;
  deviceBrand?: string | null;
  deviceModel: string;
  serialNumber?: string | null;
  passcode?: string | null;
  problemDescription: string;
  deviceCondition?: string | null;
  expectedCost: number;
  finalCost: number;
  advancePayment: number;
  status: MaintenanceStatus;
  technicianId?: string | null;
  technicianName?: string | null;
  technicianNotes?: string | null;
  branchId?: string | null;
  locationId?: string | null;
  saleId?: string | null;
  warrantyDays: number;
  receivedAt: string;
  repairedAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  parts?: MaintenanceTicketPart[];
}
