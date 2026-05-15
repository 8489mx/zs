export interface HrMasterDataRecord {
  id: string;
  name: string;
  code?: string;
  description?: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleName?: string;
  branchId?: string;
  branchName?: string;
  locationId?: string;
  locationName?: string;
  isActive?: boolean;
}
