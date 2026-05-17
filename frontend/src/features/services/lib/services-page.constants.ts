export type ServicePresetKey = 'computer' | 'printing' | 'beauty' | 'mobile' | 'general' | 'manual';

export interface PresetServiceDraft {
  id: string;
  name: string;
  amountInput: string;
}

export interface ServiceCatalogItem {
  name: string;
  defaultAmount?: number | null;
}

export interface ServicePresetOption {
  key: ServicePresetKey;
  label: string;
  services: string[];
}

export const SERVICE_PRESETS: ServicePresetOption[] = [
  { key: 'computer', label: 'محل كمبيوتر', services: ['صيانة', 'تثبيت ويندوز', 'تعريفات وبرامج', 'طباعة', 'سكانر', 'كتابة ملفات', 'نسخ ملفات', 'استرجاع بيانات'] },
  { key: 'printing', label: 'مكتبة / طباعة', services: ['طباعة', 'تصوير مستندات', 'سكانر', 'تغليف', 'تجليد', 'كتابة أبحاث', 'طباعة ألوان', 'طباعة أبيض وأسود'] },
  { key: 'beauty', label: 'صالون / تجميل', services: ['قص شعر', 'استشوار', 'صبغة', 'تنظيف بشرة', 'مكياج', 'عناية أظافر', 'حلاقة', 'باقة عناية'] },
  { key: 'mobile', label: 'صيانة موبايلات', services: ['كشف عطل', 'تغيير شاشة', 'تغيير بطارية', 'سوفت وير', 'تنظيف سماعة', 'تغيير سوكت شحن', 'تركيب إسكرينة', 'نقل بيانات'] },
  { key: 'general', label: 'مركز خدمات عام', services: ['خدمة توصيل', 'تركيب', 'صيانة', 'استشارة', 'معاينة', 'تغليف', 'خدمة إضافية'] },
  { key: 'manual', label: 'تخصيص يدوي', services: [] },
];

export const serviceFilterOptions = [
  { value: 'all', label: 'الكل' },
  { value: 'today', label: 'اليوم' },
  { value: 'high', label: 'الأعلى قيمة' },
  { value: 'notes', label: 'بملاحظات' },
] as const;
