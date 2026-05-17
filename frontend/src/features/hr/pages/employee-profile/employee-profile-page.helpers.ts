import type { HrDocument, HrEmployeeAsset } from '@/types/domain';
import { documentStatusLabel, normalizeText } from '@/features/hr/utils/employee-profile.helpers';

export interface DocumentDraft {
  title: string;
  documentType: string;
  expiryDate: string;
  notes: string;
}

export type ProfileSection = 'overview' | 'details' | 'documents' | 'assets' | 'leaves' | 'payroll' | 'ledger' | 'all';

export const initialDocumentDraft: DocumentDraft = {
  title: '',
  documentType: '',
  expiryDate: '',
  notes: '',
};

export const PROFILE_SECTIONS: { key: ProfileSection; label: string }[] = [
  { key: 'overview', label: 'نظرة سريعة' },
  { key: 'details', label: 'البيانات' },
  { key: 'documents', label: 'المستندات' },
  { key: 'assets', label: 'العُهد' },
  { key: 'leaves', label: 'الإجازات' },
  { key: 'payroll', label: 'المرتبات والسلف' },
  { key: 'ledger', label: 'السجل المالي' },
  { key: 'all', label: 'عرض الكل' },
];

export function shouldShowProfileSection(activeSection: ProfileSection, section: ProfileSection) {
  return activeSection === 'all' || activeSection === section;
}

export function isDocumentExpired(row: HrDocument) {
  const status = documentStatusLabel(row.expiryDate);
  return status === 'منتهي' || status === 'قريب الانتهاء';
}

export function isAssetOpen(row: HrEmployeeAsset) {
  const status = normalizeText(row.status);
  return status === 'assigned' || status === 'damaged' || status === 'lost';
}
