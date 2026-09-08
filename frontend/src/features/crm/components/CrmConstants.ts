import type { DealStage, DealPriority } from '../api/crm.api';

export const STAGES: Array<{ key: DealStage; label: string; defaultProbability: number; color: string; bg: string }> = [
  { key: 'new', label: 'جديد', defaultProbability: 20, color: '#0284c7', bg: 'rgba(2, 132, 199, 0.08)' },
  { key: 'contacted', label: 'تم التواصل', defaultProbability: 40, color: '#7c3aed', bg: 'rgba(124, 58, 237, 0.08)' },
  { key: 'qualified', label: 'مؤهل للشراء', defaultProbability: 60, color: '#d97706', bg: 'rgba(217, 119, 6, 0.08)' },
  { key: 'proposal', label: 'عرض سعر مرسل', defaultProbability: 75, color: '#2563eb', bg: 'rgba(37, 99, 235, 0.08)' },
  { key: 'negotiation', label: 'قيد التفاوض', defaultProbability: 90, color: '#ea580c', bg: 'rgba(234, 88, 12, 0.08)' },
  { key: 'won', label: 'تمت الصفقة بنجاح', defaultProbability: 100, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.08)' },
  { key: 'lost', label: 'صفقة خاسرة', defaultProbability: 0, color: '#dc2626', bg: 'rgba(220, 38, 38, 0.08)' },
];

export const PRIORITIES: Record<DealPriority, { label: string; color: string; bg: string }> = {
  low: { label: 'منخفضة', color: '#64748b', bg: '#f1f5f9' },
  medium: { label: 'متوسطة', color: '#0284c7', bg: '#e0f2fe' },
  high: { label: 'مرتفعة', color: '#ea580c', bg: '#ffedd5' },
  urgent: { label: 'عاجلة جداً', color: '#dc2626', bg: '#fee2e2' },
};

export const ACTIVITY_LABELS: Record<string, string> = {
  call: 'مكالمة هاتفية',
  meeting: 'اجتماع عمل',
  task: 'مهمة متابعة',
  note: 'ملاحظة',
  stage_change: 'تغيير مرحلة',
  converted: 'تحويل إلى عميل',
};
