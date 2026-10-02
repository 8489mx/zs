import type { CSSProperties, ReactNode } from 'react';

export type BusinessVertical =
  | 'maritime'
  | 'contracting'
  | 'wholesale_van'
  | 'manufacturing'
  | 'restaurant'
  | 'pharmacy'
  | 'maintenance'
  | 'services'
  | 'retail_general';

export interface MobileNavItemConfig {
  to: string;
  label: string;
  iconType: 'home' | 'sales' | 'maritime-jobs' | 'contracting-projects' | 'contracting-invoices' | 'van-sales' | 'manufacturing-orders' | 'pos' | 'inventory' | 'quotations';
  activeMatchPrefixes: string[];
}

export interface MobileBottomNavConfig {
  home: MobileNavItemConfig;
  secondary: MobileNavItemConfig;
  centerActionLabel: string;
  primary: MobileNavItemConfig;
}

export interface MobileQuickActionItem {
  id: string;
  title: string;
  subtitle: string;
  to?: string;
  actionKey?: 'quickProduct' | 'priceChecker';
  bg: string;
  color: string;
  iconType:
    | 'ship'
    | 'container'
    | 'inquiry'
    | 'quotation'
    | 'customer'
    | 'treasury'
    | 'project'
    | 'ipc'
    | 'dailyLog'
    | 'changeOrder'
    | 'supplier'
    | 'truck'
    | 'invoice'
    | 'checker'
    | 'reps'
    | 'gear'
    | 'bom'
    | 'purchase'
    | 'pos'
    | 'product'
    | 'inventory';
}

/**
 * Single source of truth to resolve the tenant's primary business vertical.
 */
export function resolveCurrentVertical(tenant?: any, settings?: any): BusinessVertical {
  const candidates = [
    settings?.businessIndustry,
    tenant?.activityType,
    settings?.activityType,
    tenant?.pillar,
    tenant?.businessName,
    settings?.storeName,
    settings?.brandName,
    (settings as any)?.companyName,
  ]
    .map((v) => String(v || '').trim().toLowerCase())
    .filter(Boolean);

  const raw = candidates.find((a) => a !== 'retail_general' && a !== 'general' && a !== 'retail') || candidates[0] || 'retail_general';

  if (
    raw === 'maritime_freight' ||
    raw === 'maritime' ||
    raw === 'freight' ||
    raw === 'shipping' ||
    raw === 'شحن' ||
    raw.includes('شحن') ||
    raw.includes('maritime') ||
    raw.includes('freight') ||
    settings?.maritimeFreightModuleEnabled === true
  ) {
    return 'maritime';
  }

  if (
    raw === 'contracting' ||
    raw === 'construction' ||
    raw === 'مقاولات' ||
    raw.includes('مقاول') ||
    raw.includes('تشييد') ||
    settings?.contractingModuleEnabled === true
  ) {
    return 'contracting';
  }

  if (
    raw === 'wholesale_van' ||
    raw === 'wholesale' ||
    raw === 'distribution' ||
    raw === 'توزيع' ||
    raw === 'فان' ||
    raw === 'مناديب' ||
    raw === 'جملة' ||
    raw === 'جملة_وتوزيع' ||
    raw.includes('توزيع') ||
    raw.includes('فان') ||
    raw.includes('مناديب') ||
    raw.includes('جمل') ||
    raw.includes('موزع')
  ) {
    return 'wholesale_van';
  }

  if (
    raw === 'manufacturing' ||
    raw === 'production' ||
    raw === 'تصنيع' ||
    raw === 'مصنع' ||
    raw.includes('تصنيع') ||
    raw.includes('إنتاج') ||
    settings?.manufacturingModuleEnabled === true
  ) {
    return 'manufacturing';
  }

  if (
    raw === 'restaurant' ||
    raw === 'cafe' ||
    raw === 'مطعم' ||
    raw === 'كافيه' ||
    raw.includes('مطعم') ||
    settings?.restaurantModuleEnabled === true
  ) {
    return 'restaurant';
  }

  if (
    raw === 'pharmacy' ||
    raw === 'صيدلية' ||
    raw === 'صيدليات' ||
    raw.includes('صيدل') ||
    settings?.pharmacyModuleEnabled === true
  ) {
    return 'pharmacy';
  }

  if (
    raw === 'electronics' ||
    raw === 'maintenance' ||
    raw === 'repair' ||
    raw === 'صيانة' ||
    raw.includes('صيانة')
  ) {
    return 'maintenance';
  }

  if (raw === 'services' || raw.includes('خدمات')) {
    return 'services';
  }

  return 'retail_general';
}

function normalizeKey(target: string): string {
  const trimmed = String(target || '').trim();
  if (!trimmed || trimmed === '/') return '/';
  return trimmed.replace(/^\//, '').replace(/\/$/, '') || '/';
}

/**
 * Universal Vertical Isolation Check:
 * Enforces strict boundaries between business models across desktop, mobile, search, and routes.
 */
export function isRouteAllowedInVertical(vertical: BusinessVertical, target: string, settings?: any): boolean {
  const key = normalizeKey(target);

  // Common universal infrastructure routes (always permitted for all verticals)
  if (
    key === '/' ||
    key === 'dashboard' ||
    key === 'login' ||
    key === 'onboarding' ||
    key === 'settings' ||
    key.startsWith('settings/') ||
    key.startsWith('settings-') ||
    key === 'audit' ||
    key === 'apps' ||
    key.startsWith('saas-admin') ||
    key.startsWith('hr') ||
    key === 'treasury' ||
    key === 'expenses' ||
    key.startsWith('accounting') ||
    key === 'accounts' ||
    key === 'vat-declaration'
  ) {
    return true;
  }

  switch (vertical) {
    case 'maritime': {
      // Strictly block retail POS, barcode, pricing center, general retail stock, other verticals
      const blockedKeys = [
        'pos',
        'cash-drawer',
        'online-orders',
        'kds',
        'displays',
        'signage',
        'product-modifiers',
        'pricing-center',
        'products',
        'products/new',
        'product-new',
        'product-categories',
        'products/categories',
        'inventory',
        'inventory-warehouses',
        'inventory/warehouses',
        'inventory-bins',
        'inventory/bins',
        'inventory-tree',
        'inventory/tree',
        'inventory-issue-orders',
        'inventory/issue-orders',
        'inventory-issue-order-new',
        'inventory/issue-orders/new',
        'inventory/van-sales',
        'reports-inventory',
        'reports/inventory',
        'delivery-reps',
        'van-sales-admin',
        'van-sales',
        'trade-in',
        'imei-history',
        'maintenance',
        'clothing',
        'sales-orders',
        'sales/orders',
        'price-lists',
        'sales/price-lists',
        'contracting',
        'pharmacy',
        'manufacturing',
      ];

      if (blockedKeys.some((b) => key === b || key.startsWith(`${b}/`))) {
        return false;
      }
      if (key.startsWith('contracting-') || key.startsWith('contracting/')) return false;
      if (key.startsWith('pharmacy-') || key.startsWith('pharmacy/')) return false;
      if (key.startsWith('manufacturing-') || key.startsWith('manufacturing/')) return false;

      return true;
    }

    case 'contracting': {
      const blockedKeys = [
        'pos',
        'cash-drawer',
        'online-orders',
        'kds',
        'displays',
        'signage',
        'product-modifiers',
        'pricing-center',
        'delivery-reps',
        'van-sales-admin',
        'van-sales',
        'trade-in',
        'imei-history',
        'maintenance',
        'clothing',
        'sales-orders',
        'price-lists',
        'maritime',
        'pharmacy',
        'manufacturing',
      ];

      if (blockedKeys.some((b) => key === b || key.startsWith(`${b}/`))) {
        return false;
      }
      if (key.startsWith('maritime-') || key.startsWith('maritime/')) return false;
      if (key.startsWith('pharmacy-') || key.startsWith('pharmacy/')) return false;
      if (key.startsWith('manufacturing-') || key.startsWith('manufacturing/')) return false;

      return true;
    }

    case 'wholesale_van': {
      const blockedKeys = [
        'pos',
        'maritime',
        'contracting',
        'kds',
        'displays',
        'signage',
        'pharmacy',
        'manufacturing',
        'maintenance',
        'trade-in',
      ];

      if (blockedKeys.some((b) => key === b || key.startsWith(`${b}/`))) {
        return false;
      }
      if (key.startsWith('maritime-') || key.startsWith('maritime/')) return false;
      if (key.startsWith('contracting-') || key.startsWith('contracting/')) return false;
      if (key.startsWith('pharmacy-') || key.startsWith('pharmacy/')) return false;
      if (key.startsWith('manufacturing-') || key.startsWith('manufacturing/')) return false;

      return true;
    }

    case 'manufacturing': {
      const blockedKeys = [
        'pos',
        'cash-drawer',
        'online-orders',
        'kds',
        'displays',
        'signage',
        'product-modifiers',
        'delivery-reps',
        'van-sales-admin',
        'trade-in',
        'imei-history',
        'maintenance',
        'clothing',
        'maritime',
        'contracting',
        'pharmacy',
      ];

      if (blockedKeys.some((b) => key === b || key.startsWith(`${b}/`))) {
        return false;
      }
      if (key.startsWith('maritime-') || key.startsWith('maritime/')) return false;
      if (key.startsWith('contracting-') || key.startsWith('contracting/')) return false;
      if (key.startsWith('pharmacy-') || key.startsWith('pharmacy/')) return false;

      return true;
    }

    case 'retail_general':
    default: {
      // General retail blocks deep vertical suites unless explicitly activated
      if (key.startsWith('maritime-') || key.startsWith('maritime/')) {
        return settings?.maritimeFreightModuleEnabled === true;
      }
      if (key.startsWith('contracting-') || key.startsWith('contracting/')) {
        return settings?.contractingModuleEnabled === true;
      }
      if (key.startsWith('manufacturing-') || key.startsWith('manufacturing/')) {
        return settings?.manufacturingModuleEnabled === true;
      }
      if (key.startsWith('pharmacy-') || key.startsWith('pharmacy/')) {
        return settings?.pharmacyModuleEnabled === true;
      }
      return true;
    }
  }
}

/**
 * Mobile Bottom Navigation Configuration per Vertical
 */
export function getMobileBottomNavConfig(vertical: BusinessVertical, settings?: any): MobileBottomNavConfig {
  const isPosActive = settings?.posModuleEnabled !== false;

  switch (vertical) {
    case 'maritime':
      return {
        home: {
          to: '/',
          label: 'الرئيسية',
          iconType: 'home',
          activeMatchPrefixes: ['/'],
        },
        secondary: {
          to: '/sales',
          label: 'الفواتير',
          iconType: 'sales',
          activeMatchPrefixes: ['/sales', '/quotations'],
        },
        centerActionLabel: 'إجراء سريع',
        primary: {
          to: '/maritime/jobs',
          label: 'أوامر التشغيل',
          iconType: 'maritime-jobs',
          activeMatchPrefixes: ['/maritime/jobs', '/maritime/containers', '/maritime'],
        },
      };

    case 'contracting':
      return {
        home: {
          to: '/',
          label: 'الرئيسية',
          iconType: 'home',
          activeMatchPrefixes: ['/'],
        },
        secondary: {
          to: '/contracting/projects',
          label: 'المشاريع',
          iconType: 'contracting-projects',
          activeMatchPrefixes: ['/contracting/projects'],
        },
        centerActionLabel: 'إجراء سريع',
        primary: {
          to: '/contracting/invoices',
          label: 'المستخلصات',
          iconType: 'contracting-invoices',
          activeMatchPrefixes: ['/contracting/invoices', '/contracting/financials', '/contracting'],
        },
      };

    case 'wholesale_van':
      return {
        home: {
          to: '/',
          label: 'الرئيسية',
          iconType: 'home',
          activeMatchPrefixes: ['/'],
        },
        secondary: {
          to: '/sales',
          label: 'فواتير الجملة',
          iconType: 'sales',
          activeMatchPrefixes: ['/sales', '/sales/orders'],
        },
        centerActionLabel: 'إجراء سريع',
        primary: {
          to: '/van-sales/admin',
          label: 'المناديب والتوزيع',
          iconType: 'van-sales',
          activeMatchPrefixes: ['/van-sales', '/delivery-reps', '/inventory/van-sales'],
        },
      };

    case 'manufacturing':
      return {
        home: {
          to: '/',
          label: 'الرئيسية',
          iconType: 'home',
          activeMatchPrefixes: ['/'],
        },
        secondary: {
          to: '/manufacturing/work-orders',
          label: 'أوامر الإنتاج',
          iconType: 'manufacturing-orders',
          activeMatchPrefixes: ['/manufacturing/work-orders', '/manufacturing'],
        },
        centerActionLabel: 'إجراء سريع',
        primary: {
          to: '/inventory',
          label: 'الخامات والمخزون',
          iconType: 'inventory',
          activeMatchPrefixes: ['/inventory', '/products'],
        },
      };

    case 'retail_general':
    default:
      return {
        home: {
          to: '/',
          label: 'الرئيسية',
          iconType: 'home',
          activeMatchPrefixes: ['/'],
        },
        secondary: {
          to: '/sales',
          label: 'الفواتير',
          iconType: 'sales',
          activeMatchPrefixes: ['/sales', '/returns'],
        },
        centerActionLabel: 'إجراء سريع',
        primary: isPosActive
          ? {
              to: '/pos',
              label: 'نقطة البيع',
              iconType: 'pos',
              activeMatchPrefixes: ['/pos'],
            }
          : {
              to: '/inventory',
              label: 'المخزون',
              iconType: 'inventory',
              activeMatchPrefixes: ['/inventory', '/products'],
            },
      };
  }
}

/**
 * Mobile Quick Actions (Center '+' Sheet) per Vertical:
 * Returns 6 highly relevant, operational actions strictly aligned with the vertical.
 */
export function getMobileQuickActionsConfig(vertical: BusinessVertical, settings?: any): MobileQuickActionItem[] {
  const isPosActive = settings?.posModuleEnabled !== false;

  switch (vertical) {
    case 'maritime':
      return [
        {
          id: 'maritime-job',
          title: 'أمر تشغيل شحنة',
          subtitle: 'إنشاء ملف شحنة وعمليات',
          to: '/maritime/jobs?action=new',
          bg: '#eef2ff',
          color: '#170e5e',
          iconType: 'ship',
        },
        {
          id: 'maritime-containers',
          title: 'تتبع الحاويات',
          subtitle: 'فحص الحاويات ومواقعها',
          to: '/maritime/containers',
          bg: '#e0f2fe',
          color: '#0369a1',
          iconType: 'container',
        },
        {
          id: 'maritime-inquiry',
          title: 'استفسار شحن جديد',
          subtitle: 'تسجيل طلب شحن لعميل',
          to: '/maritime/inquiries?action=new',
          bg: '#f3e8ff',
          color: '#7c3aed',
          iconType: 'inquiry',
        },
        {
          id: 'maritime-quotation',
          title: 'عرض أسعار لعميل',
          subtitle: 'تسعير نولون وخدمات بحرية',
          to: '/maritime/quotations?action=new',
          bg: '#dcfce7',
          color: '#15803d',
          iconType: 'quotation',
        },
        {
          id: 'maritime-customer',
          title: 'إضافة عميل جديد',
          subtitle: 'تسجيل شاحن أو مستورد',
          to: '/customers?action=new',
          bg: '#ffe4e6',
          color: '#be123c',
          iconType: 'customer',
        },
        {
          id: 'maritime-treasury',
          title: 'الخزينة والمصروفات',
          subtitle: 'سند قبض أو مصروف تشغيلي',
          to: '/treasury',
          bg: '#fef3c7',
          color: '#b45309',
          iconType: 'treasury',
        },
      ];

    case 'contracting':
      return [
        {
          id: 'contracting-project',
          title: 'مشروع جديد',
          subtitle: 'تسجيل موقع عمل أو مشروع',
          to: '/contracting/projects?action=new',
          bg: '#eef2ff',
          color: '#170e5e',
          iconType: 'project',
        },
        {
          id: 'contracting-ipc',
          title: 'مستخلص أعمال (IPC)',
          subtitle: 'إصدار مستخلص جاري أو ختامي',
          to: '/contracting/invoices?action=new',
          bg: '#dcfce7',
          color: '#15803d',
          iconType: 'ipc',
        },
        {
          id: 'contracting-daily-log',
          title: 'يوميات الموقع',
          subtitle: 'تسجيل تقرير ميداني يومي',
          to: '/contracting/daily-logs?action=new',
          bg: '#e0f2fe',
          color: '#0369a1',
          iconType: 'dailyLog',
        },
        {
          id: 'contracting-change-order',
          title: 'أمر تغيير ومطالبة',
          subtitle: 'طلب إضافة أو تعديل بنود',
          to: '/contracting/change-orders?action=new',
          bg: '#ffedd5',
          color: '#c2410c',
          iconType: 'changeOrder',
        },
        {
          id: 'contracting-subcontractor',
          title: 'إضافة مقاول / مورد',
          subtitle: 'تسجيل مقاول باطن أو مورد',
          to: '/suppliers?action=new',
          bg: '#ffe4e6',
          color: '#be123c',
          iconType: 'supplier',
        },
        {
          id: 'contracting-treasury',
          title: 'الخزينة والعهد',
          subtitle: 'سند صرف عهدة أو مستحقات',
          to: '/treasury',
          bg: '#fef3c7',
          color: '#b45309',
          iconType: 'treasury',
        },
      ];

    case 'wholesale_van':
      return [
        {
          id: 'van-load-order',
          title: 'إذن تحميل سيارة',
          subtitle: 'تحميل بضاعة لسيارة مندوب',
          to: '/inventory/van-sales',
          bg: '#eef2ff',
          color: '#170e5e',
          iconType: 'truck',
        },
        {
          id: 'van-sale-invoice',
          title: 'فاتورة بيع جملة',
          subtitle: 'تسجيل فاتورة توريد جديدة',
          to: '/sales?action=new',
          bg: '#dcfce7',
          color: '#15803d',
          iconType: 'invoice',
        },
        {
          id: 'van-customer',
          title: 'إضافة متجر / عميل',
          subtitle: 'تسجيل منفذ بيع أو بقالة',
          to: '/customers?action=new',
          bg: '#ffe4e6',
          color: '#be123c',
          iconType: 'customer',
        },
        {
          id: 'van-stock-checker',
          title: 'فاحص رصيد المخزن',
          subtitle: 'معاينة رصيد سيارة أو مخزن',
          actionKey: 'priceChecker',
          bg: '#ffedd5',
          color: '#c2410c',
          iconType: 'checker',
        },
        {
          id: 'van-collection',
          title: 'تحصيل وسند قبض',
          subtitle: 'إثبات تحصيل دفعة أو شيك',
          to: '/treasury',
          bg: '#fef3c7',
          color: '#b45309',
          iconType: 'treasury',
        },
        {
          id: 'van-reps-tracking',
          title: 'المناديب وسيارات الفان',
          subtitle: 'متابعة خطوط السير والعهد',
          to: '/delivery-reps',
          bg: '#e0f2fe',
          color: '#0369a1',
          iconType: 'reps',
        },
      ];

    case 'manufacturing':
      return [
        {
          id: 'mfg-work-order',
          title: 'أمر تشغيل وإنتاج',
          subtitle: 'إصدار أمر تشغيل على خط',
          to: '/manufacturing/work-orders?action=new',
          bg: '#eef2ff',
          color: '#170e5e',
          iconType: 'gear',
        },
        {
          id: 'mfg-bom',
          title: 'هيكل منتج (BOM)',
          subtitle: 'تعديل أو إنشاء مقادير خامات',
          to: '/manufacturing/boms?action=new',
          bg: '#dcfce7',
          color: '#15803d',
          iconType: 'bom',
        },
        {
          id: 'mfg-raw-receipt',
          title: 'استلام خامات ومشتريات',
          subtitle: 'إدخال توريدة خامات من مورد',
          to: '/purchases/new',
          bg: '#cffafe',
          color: '#0e7490',
          iconType: 'purchase',
        },
        {
          id: 'mfg-stock-checker',
          title: 'فاحص أرصدة الخامات',
          subtitle: 'مطابقة الخامات والتام',
          actionKey: 'priceChecker',
          bg: '#ffedd5',
          color: '#c2410c',
          iconType: 'checker',
        },
        {
          id: 'mfg-supplier',
          title: 'إضافة مورد خامات',
          subtitle: 'تسجيل مورد أو مقاول تصنيع',
          to: '/suppliers?action=new',
          bg: '#ffe4e6',
          color: '#be123c',
          iconType: 'supplier',
        },
        {
          id: 'mfg-treasury',
          title: 'الخزينة والمصروفات',
          subtitle: 'تسجيل تكاليف أو سند قبض',
          to: '/treasury',
          bg: '#fef3c7',
          color: '#b45309',
          iconType: 'treasury',
        },
      ];

    case 'retail_general':
    default:
      return [
        isPosActive
          ? {
              id: 'pos',
              title: 'نقطة البيع (POS)',
              subtitle: 'كاشير وبيع مباشر سريع',
              to: '/pos',
              bg: '#ede9fe',
              color: '#6d28d9',
              iconType: 'pos',
            }
          : {
              id: 'sales',
              title: 'سجل الفواتير والمبيعات',
              subtitle: 'فواتير الشركات والمبيعات',
              to: '/sales',
              bg: '#ede9fe',
              color: '#6d28d9',
              iconType: 'invoice',
            },
        {
          id: 'price-checker',
          title: 'فاحص الأسعار والمخزون',
          subtitle: 'مسح باركود ومعاينة الرصيد',
          actionKey: 'priceChecker',
          bg: '#ffedd5',
          color: '#c2410c',
          iconType: 'checker',
        },
        {
          id: 'quick-product',
          title: 'إضافة صنف جديد',
          subtitle: 'تسجيل صنف أو خدمة فوراً',
          actionKey: 'quickProduct',
          bg: '#dcfce7',
          color: '#15803d',
          iconType: 'product',
        },
        {
          id: 'new-purchase',
          title: 'فاتورة شراء جديدة',
          subtitle: 'إدخال بضاعة من مورد',
          to: '/purchases/new',
          bg: '#cffafe',
          color: '#0e7490',
          iconType: 'purchase',
        },
        {
          id: 'new-customer',
          title: 'إضافة عميل جديد',
          subtitle: 'تسجيل بيانات العميل وهاتفه',
          to: '/customers?action=new',
          bg: '#ffe4e6',
          color: '#be123c',
          iconType: 'customer',
        },
        {
          id: 'treasury-expense',
          title: 'الخزينة والمصروفات',
          subtitle: 'سند قبض أو تسجيل مصروف',
          to: '/treasury',
          bg: '#fef3c7',
          color: '#b45309',
          iconType: 'treasury',
        },
      ];
  }
}
