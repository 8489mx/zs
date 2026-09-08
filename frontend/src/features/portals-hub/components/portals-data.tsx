import React from 'react';
import {
  UsersIcon,
  SmartphoneIcon,
  TruckIcon,
  PackageIcon,
  UtensilsIcon,
  MonitorIcon,
  TagIcon,
  QrCodeIcon,
  BarChartIcon,
  BuildingIcon,
} from '@/shared/components/icons/AppIcons';

export interface PortalItem {
  id: string;
  title: string;
  category: 'staff' | 'field' | 'branch' | 'management';
  categoryName: string;
  description: string;
  path: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badgeText?: string;
  keywords: string[];
}

export const PORTALS_LIST: PortalItem[] = [
  // 1. Employee Self-Service
  {
    id: 'employee-portal',
    title: 'بوابة الموظف الذاتية',
    category: 'staff',
    categoryName: 'خدمة ذاتية',
    description: 'استعراض مسيرات الرواتب، أرصدة الإجازات، طلب سلفة، وتفاصيل العقد.',
    path: '/portal',
    icon: <UsersIcon size={20} color="#170e5e" />,
    iconBg: '#eff6ff',
    iconColor: '#170e5e',
    badgeText: 'للموظفين',
    keywords: ['موظف', 'رواتب', 'إجازات', 'سلف', 'عقد', 'حضور', 'portal', 'ess'],
  },
  {
    id: 'mobile-punch',
    title: 'بصمة الموبايل الذكية (GPS)',
    category: 'staff',
    categoryName: 'خدمة ذاتية',
    description: 'تسجيل الحضور والانصراف بالسيلفي وفحص النطاق الجغرافي للفرع.',
    path: '/punch',
    icon: <SmartphoneIcon size={20} color="#16a34a" />,
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    badgeText: 'سيلفي + GPS',
    keywords: ['بصمة', 'حضور', 'انصراف', 'موبايل', 'سيلفي', 'gps', 'punch'],
  },

  // 2. Field & Delivery
  {
    id: 'driver-portal',
    title: 'بوابة مندوبي التوصيل',
    category: 'field',
    categoryName: 'توصيل وميداني',
    description: 'استلام أوردرات الدليفري، تحديث التسليم، والاتصال المباشر بالعملاء.',
    path: '/driver',
    icon: <TruckIcon size={20} color="#ea580c" />,
    iconBg: '#fff7ed',
    iconColor: '#ea580c',
    badgeText: 'طيارين الدليفري',
    keywords: ['طيار', 'مندوب', 'توصيل', 'دليفري', 'شحنات', 'أوردر', 'driver'],
  },
  {
    id: 'van-sales',
    title: 'مبيعات سيارات التوزيع والفان',
    category: 'field',
    categoryName: 'توصيل وميداني',
    description: 'محطة بيع وفواتير متنقلة لمندوبي الفان، جرد السيارة والتحصيل الميداني.',
    path: '/van-sales',
    icon: <PackageIcon size={20} color="#0284c7" />,
    iconBg: '#f0f9ff',
    iconColor: '#0284c7',
    badgeText: 'فان كاشير',
    keywords: ['فان', 'سيارة', 'توزيع', 'مبيعات متنقلة', 'مندوب كاشير', 'van'],
  },

  // 3. Branch & POS Displays
  {
    id: 'kds',
    title: 'شاشة المطبخ (KDS)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'متابعة أوامر تحضير وتجهيز الوجبات بالمطاعم والكافيهات لحظياً.',
    path: '/kds',
    icon: <UtensilsIcon size={20} color="#d97706" />,
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    badgeText: 'شاشة تحضير',
    keywords: ['مطبخ', 'تحضير', 'وجبات', 'طلبات', 'كافيه', 'مطعم', 'kds'],
  },
  {
    id: 'customer-display',
    title: 'شاشة العميل بنقطة البيع (CFD)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'شاشة كاونتر لعرض تفاصيل الفاتورة الحية، السعر، وعروض الولاء للمشتري.',
    path: '/pos/customer-display',
    icon: <MonitorIcon size={20} color="#059669" />,
    iconBg: '#ecfdf5',
    iconColor: '#059669',
    badgeText: 'كاونتر الكاشير',
    keywords: ['عميل', 'شاشة عميل', 'كاونتر', 'كاشير', 'عرض أسعار', 'cfd', 'display'],
  },
  {
    id: 'digital-signage',
    title: 'شاشة العروض الرقمية (Signage)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'لوحة تفاعلية لشاشات التلفزيون بالمعرض لعرض الأسعار والخصومات التسويقية.',
    path: '/signage',
    icon: <TagIcon size={20} color="#7c3aed" />,
    iconBg: '#faf5ff',
    iconColor: '#7c3aed',
    badgeText: 'شاشة المعرض',
    keywords: ['عروض', 'تلفزيون', 'شاشة عرض', 'أسعار', 'معرض', 'signage'],
  },
  {
    id: 'table-qr',
    title: 'الطلب الذاتي من الطاولة (QR)',
    category: 'branch',
    categoryName: 'صالة وعمليات',
    description: 'تصفح المنيو والطلب الفوري من طاولة الصالة عبر مسح كود الـ QR بالهاتف.',
    path: '/table/1',
    icon: <QrCodeIcon size={20} color="#db2777" />,
    iconBg: '#fdf2f8',
    iconColor: '#db2777',
    badgeText: 'منيو الطاولة',
    keywords: ['طاولة', 'qr', 'منيو', 'طلب ذاتي', 'طاولات', 'table'],
  },

  // 4. Management & Enterprise
  {
    id: 'owner-companion',
    title: 'رادار متابعة المالك المتنقل',
    category: 'management',
    categoryName: 'إدارة ورقابة',
    description: 'مؤشرات أداء سريعة، مبيعات الفروع الحية، ومراجعة الخزينة من الهاتف.',
    path: '/owner-companion',
    icon: <BarChartIcon size={20} color="#170e5e" />,
    iconBg: '#f1f5f9',
    iconColor: '#170e5e',
    badgeText: 'للمدير التنفيذي',
    keywords: ['مالك', 'رادار', 'مؤشرات', 'مبيعات', 'موبايل', 'owner', 'companion'],
  },
  {
    id: 'storefront',
    title: 'المتجر الإلكتروني العام',
    category: 'management',
    categoryName: 'إدارة ورقابة',
    description: 'كتالوج المنتجات السحابي للجمهور مع سلة الشراء والطلب أونلاين.',
    path: '/store',
    icon: <BuildingIcon size={20} color="#0891b2" />,
    iconBg: '#ecfeff',
    iconColor: '#0891b2',
    badgeText: 'للعملاء أونلاين',
    keywords: ['متجر', 'أونلاين', 'كتالوج', 'سلة', 'طلبات', 'store', 'ecommerce'],
  },
];
