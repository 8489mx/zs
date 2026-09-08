export interface ModuleGroupMeta {
  id: 'pos' | 'inventory' | 'specialized' | 'logistics' | 'finance';
  title: string;
  badge: string;
  desc: string;
}

export const MODULE_GROUPS: ModuleGroupMeta[] = [
  {
    id: 'pos',
    title: 'المبيعات ونقاط الخدمة والكاشير (POS)',
    badge: '5 موديولات',
    desc: 'شاشات البيع السريع، موازين الباركود، عروض الكومبو، وإدارة الطاولات وشاشات المطبخ KDS.',
  },
  {
    id: 'inventory',
    title: 'المشتريات وإدارة المخازن وسلاسل الإمداد',
    badge: '4 موديولات',
    desc: 'فواتير الشراء، حسابات الموردين، المستودعات والجرد، مقاسات الملابس، وتواريخ الصلاحية FEFO.',
  },
  {
    id: 'specialized',
    title: 'الخدمات والتخصصات التشغيلية والتصنيع',
    badge: '5 موديولات',
    desc: 'فواتير الصيانة السريعة، تتبع أرقام السيريال IMEI، خطوط الإنتاج BOM، الاستيراد، والرواتب HR.',
  },
  {
    id: 'logistics',
    title: 'اللوجستيات والتوصيل والتجارة الرقمية',
    badge: '2 موديول',
    desc: 'أسطول التوصيل ومناديب الدليفري، والمتجر الإلكتروني السحابي وبوابات الدفع الإلكتروني.',
  },
  {
    id: 'finance',
    title: 'المالية والمحاسبة والمؤسسات',
    badge: '4 موديولات',
    desc: 'دليل الحسابات الشجري والقيود، مبيعات التقسيط والديون، الفاتورة الإلكترونية، وسجل الأصول.',
  },
];

export type ModuleCategoryFilter = 'all' | 'pos' | 'inventory' | 'specialized' | 'logistics' | 'finance';

export const CATEGORY_TABS: Array<{ id: ModuleCategoryFilter; label: string }> = [
  { id: 'all', label: 'كافة الموديولات (20)' },
  { id: 'pos', label: 'المبيعات والـ POS' },
  { id: 'inventory', label: 'المشتريات والمخازن' },
  { id: 'specialized', label: 'الخدمات والتخصصات' },
  { id: 'logistics', label: 'اللوجستيات والتجارة' },
  { id: 'finance', label: 'المالية والمؤسسات' },
];
