export interface HrDocument {
  id: string;
  employeeId: string;
  title: string;
  documentType?: string;
  fileUrl?: string;
  expiryDate?: string;
  notes?: string;
  uploadedByName?: string;
}
