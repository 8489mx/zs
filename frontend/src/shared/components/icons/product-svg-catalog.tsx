import React from 'react';

export interface ProductIconItem {
  id: string;
  name: string;
  category: string;
  svg: (props: { size?: number; color?: string; className?: string }) => React.ReactElement;
}

export interface IconCategoryMeta {
  id: string;
  title: string;
  iconName: string;
}

export const PRODUCT_ICON_CATEGORIES: IconCategoryMeta[] = [
  { id: 'spices', title: 'عطارة وبقوليات ومحامص', iconName: 'spice-mortar' },
  { id: 'fashion', title: 'ملابس وأحذية وأزياء', iconName: 'tshirt' },
  { id: 'perfumes', title: 'عطور ومستحضرات تجميل', iconName: 'perfume-spray' },
  { id: 'pharmacy', title: 'صيدلية ومستلزمات طبية', iconName: 'pill-capsule' },
  { id: 'electronics', title: 'موبايلات وإلكترونيات', iconName: 'smartphone' },
  { id: 'supermarket', title: 'سوبرماركت وبقالة', iconName: 'can-food' },
  { id: 'cafe', title: 'كافيهات ومطاعم', iconName: 'coffee-cup' },
  { id: 'general', title: 'عام وتجاري', iconName: 'box-package' },
];

function SvgWrap({ size = 20, color = 'currentColor', className, children }: { size?: number; color?: string; className?: string; children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  );
}

export const PRODUCT_SVG_ICONS: ProductIconItem[] = [
  // Spices & Herbs & Roasteries
  {
    id: 'spice-mortar',
    name: 'هون بهارات وتوابل',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M4 10a8 8 0 0 0 16 0H4z"/><path d="M12 2l2 8"/><path d="M8 20h8"/></SvgWrap>
  },
  {
    id: 'spices-bowl',
    name: 'صحن أعشاب وتوابل',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M3 11a9 9 0 0 0 18 0H3z"/><path d="M7 11c1-3 3-4 5-4s4 1 5 4"/><path d="M8 20h8"/></SvgWrap>
  },
  {
    id: 'wheat-sack',
    name: 'شوال حبوب وبقوليات',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M6 8c0-2 2-4 6-4s6 2 6 4c2 4 3 9 1 12H5C3 17 4 12 6 8z"/><path d="M10 4l4 4"/><path d="M14 4l-4 4"/></SvgWrap>
  },
  {
    id: 'herb-leaf',
    name: 'ورق أعشاب طبيعية',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M11 20A7 7 0 0 1 4 13C4 7 10 3 20 3c0 10-4 16-9 17Z"/><path d="M11 20v-7"/></SvgWrap>
  },
  {
    id: 'coffee-beans',
    name: 'حبوب بن ومحامص',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><ellipse cx="12" cy="12" rx="8" ry="6" transform="rotate(-30 12 12)"/><path d="M8.5 7.5c2 3 5 6 7 9"/></SvgWrap>
  },
  {
    id: 'nuts-almond',
    name: 'مكسرات ولوز وبندق',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 2C7 6 5 12 7 17a6 6 0 0 0 10 0c2-5 0-11-5-15z"/></SvgWrap>
  },
  {
    id: 'honey-jar',
    name: 'برطمان عسل طبيعي',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M6 7h12v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z"/><path d="M8 4h8v3H8z"/><path d="M10 11a2 2 0 1 0 4 0"/></SvgWrap>
  },
  {
    id: 'oil-bottle',
    name: 'زيت زيتون وزيوت طبيعية',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M10 2h4v4h-4z"/><path d="M10 6L7 10v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V10l-3-4"/><circle cx="12" cy="15" r="2"/></SvgWrap>
  },
  {
    id: 'scale-weight',
    name: 'ميزان عطارة ووزن',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 3v18"/><path d="M6 7l6-2 6 2"/><path d="M6 7l-3 6h6z"/><path d="M18 7l-3 6h6z"/><path d="M8 21h8"/></SvgWrap>
  },
  {
    id: 'jar-glass',
    name: 'برطمان زجاجي عطارة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M8 3h8v4H8z"/><line x1="9" y1="12" x2="15" y2="12"/></SvgWrap>
  },
  {
    id: 'tea-leaves',
    name: 'شاي وأعشاب مغلية',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><path d="M10 2c1 2 0 4-1 5"/></SvgWrap>
  },
  {
    id: 'clove-seed',
    name: 'قرنفل وحبهان ومستكة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="7" r="3"/><path d="M12 10v11"/><path d="M9 13l3 2 3-2"/></SvgWrap>
  },

  // Fashion & Apparel
  {
    id: 'tshirt',
    name: 'تيشيرت كاجوال',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></SvgWrap>
  },
  {
    id: 'shirt-formal',
    name: 'قميص كلاسيك ورسمي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M6 4h12l2 4-3 1v11H7V9L4 8z"/><path d="M9 4l3 5 3-5"/><circle cx="12" cy="13" r="0.8"/><circle cx="12" cy="17" r="0.8"/></SvgWrap>
  },
  {
    id: 'pants-jeans',
    name: 'بنطلون جينز وقماش',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 4h16l-1 16h-5l-2-10-2 10H5z"/></SvgWrap>
  },
  {
    id: 'dress-fashion',
    name: 'فستان وأزياء نسائية',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M9 4h6l2 4-2 2 4 10H5l4-10-2-2z"/><path d="M9 4a3 3 0 0 0 6 0"/></SvgWrap>
  },
  {
    id: 'shoe-sneaker',
    name: 'حذاء رياضي / كوتشي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 14l3-6 5 2 5-1 5 3v4H3z"/><path d="M3 16h18v2H3z"/><circle cx="8" cy="11" r="0.6"/></SvgWrap>
  },
  {
    id: 'shoe-heel',
    name: 'حذاء كلاسيك وكعب',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 16h12l4-8-3-1-3 5-4 1-6 1z"/><path d="M19 16v5h-2v-5"/></SvgWrap>
  },
  {
    id: 'jacket-coat',
    name: 'جاكيت وبليزر ومعطف',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M6 3h12l3 5-2 1v12H5V9L3 8z"/><path d="M12 3v18"/><path d="M6 3l6 6 6-6"/></SvgWrap>
  },
  {
    id: 'suit-tie',
    name: 'بدلة رجالي وكرافات',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 3l3 6 3-6"/><path d="M12 9l1 4-1 3-1-3z"/></SvgWrap>
  },
  {
    id: 'hat-cap',
    name: 'كاب وقبعة رأس',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 14h18"/><path d="M5 14a7 7 0 0 1 14 0"/><path d="M16 14c2-2 4-2 6 0"/></SvgWrap>
  },
  {
    id: 'bag-handbag',
    name: 'حقيبة يد وشنطة',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 9h16l-1 11H5z"/><path d="M8 9V6a4 4 0 0 1 8 0v3"/></SvgWrap>
  },
  {
    id: 'belt-leather',
    name: 'حزام جلد وإكسسوار',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="9" width="18" height="6" rx="1"/><rect x="5" y="7" width="5" height="10" rx="1"/><line x1="8" y1="9" x2="8" y2="15"/></SvgWrap>
  },
  {
    id: 'glasses-sunglasses',
    name: 'نظارة شمسية ونظر',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><circle cx="6" cy="12" r="3"/><circle cx="18" cy="12" r="3"/><path d="M9 12h6"/><path d="M3 12l2-4"/><path d="M21 12l-2-4"/></SvgWrap>
  },

  // Perfumes & Cosmetics
  {
    id: 'perfume-spray',
    name: 'زجاجة عطر وبخاخ',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="9" width="12" height="12" rx="3"/><path d="M10 5h4v4h-4z"/><line x1="12" y1="2" x2="12" y2="5"/><path d="M16 2a2 2 0 0 1 2 2"/></SvgWrap>
  },
  {
    id: 'perfume-bottle',
    name: 'قنينة عطر شرقي فاخر',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M7 10h10l-1 11H8z"/><rect x="9" y="5" width="6" height="5" rx="1"/><circle cx="12" cy="15" r="2"/></SvgWrap>
  },
  {
    id: 'soap-bar',
    name: 'صابون طبيعي وعناية',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="8" width="16" height="10" rx="4"/><path d="M7 11h10"/><circle cx="8" cy="4" r="1.5"/><circle cx="14" cy="5" r="1"/></SvgWrap>
  },
  {
    id: 'lotion-pump',
    name: 'لوشن وضاغط مرطب',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="10" width="10" height="11" rx="2"/><path d="M10 7h4v3h-4z"/><path d="M12 7V3h5"/><path d="M14 3h-4"/></SvgWrap>
  },
  {
    id: 'spray-cleaner',
    name: 'بخاخ منظف ومعطر جو',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M8 9h7l-1 12H7z"/><path d="M10 5h4v4h-4z"/><path d="M14 5l3-2"/><path d="M10 5L7 7"/></SvgWrap>
  },
  {
    id: 'detergent-bottle',
    name: 'مسحوق وجركن منظفات',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M8 4h6v3h-6z"/><path d="M8 7L5 10v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10l-3-3"/><path d="M14 10v5h-2"/></SvgWrap>
  },
  {
    id: 'dropper-oil',
    name: 'قطارة زيت عطري ومركز',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M10 2h4v3h-4z"/><path d="M9 8l2-3h2l2 3v9l-3 4-3-4z"/><circle cx="12" cy="13" r="1"/></SvgWrap>
  },
  {
    id: 'candle-scented',
    name: 'شمعة معطرة',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="9" width="10" height="12" rx="1"/><path d="M12 2c1 2 0 4-1 5"/><line x1="12" y1="7" x2="12" y2="9"/></SvgWrap>
  },
  {
    id: 'makeup-lipstick',
    name: 'مكياج وأحمر شفاه',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="8" y="12" width="8" height="9" rx="1"/><path d="M9 12V6l6-3v9"/></SvgWrap>
  },
  {
    id: 'cream-jar',
    name: 'عبوة كريم وبشرة',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M4 11h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><rect x="5" y="6" width="14" height="5" rx="1"/></SvgWrap>
  },

  // Pharmacy & Medical
  {
    id: 'pill-capsule',
    name: 'كبسولات علاجية',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></SvgWrap>
  },
  {
    id: 'pill-tablet',
    name: 'أقراص وشريط دواء',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><circle cx="8" cy="8" r="4"/><line x1="5.2" y1="5.2" x2="10.8" y2="10.8"/><circle cx="16" cy="16" r="4"/><line x1="13.2" y1="13.2" x2="18.8" y2="18.8"/></SvgWrap>
  },
  {
    id: 'medicine-syrup',
    name: 'زجاجة شراب دوائي',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="8" width="10" height="13" rx="2"/><path d="M9 4h6v4H9z"/><path d="M12 11v6"/><path d="M9 14h6"/></SvgWrap>
  },
  {
    id: 'stethoscope',
    name: 'سماعة طبية وفحص',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M4 3v6a5 5 0 0 0 10 0V3"/><circle cx="19" cy="10" r="2"/><path d="M9 14v4a3 3 0 0 0 6 0v-6h4"/></SvgWrap>
  },
  {
    id: 'first-aid',
    name: 'حقيبة إسعافات أولية',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></SvgWrap>
  },
  {
    id: 'syringe',
    name: 'حقنة وسرنجة طبية',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M18 2l4 4"/><path d="M17 7l-9 9-4-1 5-5"/><path d="M5 19l-3 3"/><path d="M14 4l3 3"/></SvgWrap>
  },
  {
    id: 'bandage-gauze',
    name: 'شاش وبلاستر طبي',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="4" y1="4" x2="20" y2="20"/><circle cx="12" cy="12" r="1.5"/></SvgWrap>
  },
  {
    id: 'eye-dropper',
    name: 'قطرة ومحلول طبي',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M10 2h4v3h-4z"/><path d="M8 8l3-3h2l3 3v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z"/></SvgWrap>
  },
  {
    id: 'thermometer',
    name: 'مقياس حرارة',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M14 4a2 2 0 0 0-4 0v10a4 4 0 1 0 4 0V4z"/><circle cx="12" cy="17" r="1.5"/></SvgWrap>
  },
  {
    id: 'inhaler',
    name: 'بخاخ تنفسي واستنشاق',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M7 4h6v12H7z"/><path d="M13 10h6v6h-6z"/><circle cx="10" cy="4" r="1"/></SvgWrap>
  },

  // Electronics & Mobile Store
  {
    id: 'smartphone',
    name: 'هاتف ذكي وموبايل',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12.01" y2="18"/></SvgWrap>
  },
  {
    id: 'laptop',
    name: 'كمبيوتر ولابتوب',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="11" rx="1"/><path d="M2 19h20l-2-4H4z"/></SvgWrap>
  },
  {
    id: 'tablet-device',
    name: 'تابلت وآيباد',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><circle cx="12" cy="18" r="0.8"/></SvgWrap>
  },
  {
    id: 'headphones',
    name: 'سماعة رأس وإيربودز',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7a9 9 0 0 1 18 0v7h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></SvgWrap>
  },
  {
    id: 'charger-cable',
    name: 'شاحن ووصلة USB',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="6" width="10" height="12" rx="2"/><line x1="9" y1="2" x2="9" y2="6"/><line x1="15" y1="2" x2="15" y2="6"/><path d="M12 18v4"/></SvgWrap>
  },
  {
    id: 'powerbank',
    name: 'باوربانك وبنك طاقة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="4" width="12" height="16" rx="2"/><circle cx="10" cy="8" r="0.6"/><circle cx="14" cy="8" r="0.6"/><path d="M10 14l2-3 2 3"/></SvgWrap>
  },
  {
    id: 'smartwatch',
    name: 'ساعة ذكية وسوار',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="6" width="10" height="12" rx="2"/><path d="M9 6V2h6v4"/><path d="M9 18v4h6v-4"/></SvgWrap>
  },
  {
    id: 'screen-display',
    name: 'شاشة وإسكرينة حماية',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="3" width="18" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></SvgWrap>
  },
  {
    id: 'battery-charge',
    name: 'بطارية أجهزة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="2" y="7" width="18" height="10" rx="2"/><line x1="22" y1="11" x2="22" y2="13"/><path d="M10 9l-2 3h4l-2 3"/></SvgWrap>
  },
  {
    id: 'wrench-repair',
    name: 'صيانة وقطع غيار',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></SvgWrap>
  },

  // Supermarket & Food
  {
    id: 'can-food',
    name: 'معلبات وتونة وأغذية',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.66 3.13 3 7 3s7-1.34 7-3V5"/></SvgWrap>
  },
  {
    id: 'milk-carton',
    name: 'حليب وألبان ومعلبات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M7 8h10l-2-5H9z"/><rect x="7" y="8" width="10" height="13" rx="1"/><line x1="7" y1="13" x2="17" y2="13"/></SvgWrap>
  },
  {
    id: 'bread-loaf',
    name: 'خبز وتوست ومخبوزات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M4 11c0-4 3.5-7 8-7s8 3 8 7c0 4-1 9-3 9H7c-2 0-3-5-3-9z"/><line x1="9" y1="7" x2="9" y2="11"/><line x1="15" y1="7" x2="15" y2="11"/></SvgWrap>
  },
  {
    id: 'apple-fruit',
    name: 'فواكه وخضروات طازجة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M12 20.5c-4.5 0-7-3.5-7-8a6 6 0 0 1 11-3.5A6 6 0 0 1 19 12.5c0 4.5-2.5 8-7 8Z"/><path d="M12 3a3 3 0 0 0 3-3"/></SvgWrap>
  },
  {
    id: 'cheese-wedge',
    name: 'أجبان ومنتجات بقالة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M3 14l18-5-4-5-14 3z"/><path d="M3 14v5l18-3v-7"/><circle cx="10" cy="15" r="1"/></SvgWrap>
  },
  {
    id: 'water-bottle',
    name: 'مياه معدنية وزجاجات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="8" y="7" width="8" height="14" rx="2"/><path d="M9 3h6v4H9z"/><path d="M8 12c2 1 6 1 8 0"/></SvgWrap>
  },
  {
    id: 'juice-box',
    name: 'عصائر ومشروبات جاهزة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="1"/><path d="M14 2l-2 6"/><line x1="6" y1="13" x2="18" y2="13"/></SvgWrap>
  },
  {
    id: 'egg-carton',
    name: 'بيض ومزارع',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M12 2C8 2 6 8 6 13a6 6 0 0 0 12 0c0-5-2-11-6-11Z"/></SvgWrap>
  },
  {
    id: 'cookie-snack',
    name: 'بسكويت وشيبسي ومقرمشات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="12" cy="15" r="1"/></SvgWrap>
  },
  {
    id: 'oil-can',
    name: 'زيت طعام وسمن نباتي',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="8" width="10" height="13" rx="1"/><path d="M9 4h6v4H9z"/><circle cx="12" cy="14" r="2"/></SvgWrap>
  },

  // Cafe & Restaurants
  {
    id: 'coffee-cup',
    name: 'كوب قهوة ومشروبات ساخنة',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></SvgWrap>
  },
  {
    id: 'espresso-cup',
    name: 'فنجان اسبريسو تركي',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M17 9h1a3 3 0 0 1 0 6h-1"/><path d="M4 9h13v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3Z"/><line x1="2" y1="21" x2="19" y2="21"/></SvgWrap>
  },
  {
    id: 'croissant',
    name: 'كرواسون ومخبوزات كافيه',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M4 18c3-1 6-5 8-12 2 7 5 11 8 12-4-1-8-1-16 0z"/><path d="M7 16c2-1 3-3 5-6 2 3 3 5 5 6"/></SvgWrap>
  },
  {
    id: 'burger-fastfood',
    name: 'برجر ووجبات سريعة',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M4 11a8 8 0 0 1 16 0H4z"/><rect x="3" y="14" width="18" height="3" rx="1"/><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2H4z"/><line x1="5" y1="12.5" x2="19" y2="12.5"/></SvgWrap>
  },
  {
    id: 'pizza-slice',
    name: 'بيتزا وفطائر',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M12 2l9 17a12 12 0 0 1-18 0z"/><circle cx="12" cy="10" r="1"/><circle cx="10" cy="14" r="1"/><circle cx="14" cy="15" r="1"/></SvgWrap>
  },
  {
    id: 'sandwich',
    name: 'سندوتش وكلوب ساندوتش',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 18l18-9v6l-18 3z"/><path d="M3 12l18-9v6l-18 3z"/></SvgWrap>
  },
  {
    id: 'fries',
    name: 'بطاطس مقلية ومقبلات',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M5 11l2 10h10l2-10"/><path d="M8 11V3h2v8"/><path d="M11 11V5h2v6"/><path d="M14 11V2h2v9"/></SvgWrap>
  },
  {
    id: 'donut',
    name: 'دونتس وحلويات غربية',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><circle cx="8" cy="8" r="0.5"/><circle cx="16" cy="8" r="0.5"/><circle cx="8" cy="16" r="0.5"/></SvgWrap>
  },
  {
    id: 'ice-cream',
    name: 'آيس كريم وجيلاتي',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M7 11a5 5 0 0 1 10 0z"/><path d="M7 11l5 11 5-11"/></SvgWrap>
  },
  {
    id: 'cocktail-drink',
    name: 'كوكتيل وعصائر مثلجة',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M6 3h12l-6 8v8"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="3" x2="18" y2="1"/></SvgWrap>
  },

  // General & Retail
  {
    id: 'box-package',
    name: 'طرد وصندوق بضاعة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></SvgWrap>
  },
  {
    id: 'barcode-tag',
    name: 'بطاقة سعر وتصنيف',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r="1.5"/></SvgWrap>
  },
  {
    id: 'star-gift',
    name: 'هدية وعرض ترويجي',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M12 8a3 3 0 0 0-3-3c-1.5 0-2 1-2 2s1.5 1 5 1z"/><path d="M12 8a3 3 0 0 1 3-3c1.5 0 2 1 2 2s-1.5 1-5 1z"/></SvgWrap>
  },
  {
    id: 'percent-discount',
    name: 'نسبة وتخفيضات',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></SvgWrap>
  },
  {
    id: 'cart-shopping',
    name: 'عربة تسوق وسلة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></SvgWrap>
  },
  {
    id: 'truck-delivery',
    name: 'شحن وتوصيل طلبات',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></SvgWrap>
  },
  {
    id: 'shield-check',
    name: 'ضمان وجودة معتمدة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></SvgWrap>
  },
  {
    id: 'cube-3d',
    name: 'صنف ومجسم ثلاثي',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></SvgWrap>
  },
];

const ICONS_MAP = new Map<string, ProductIconItem>(PRODUCT_SVG_ICONS.map((i) => [i.id, i]));

export function ProductIcon({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  fallback = true,
}: {
  name?: string | null;
  size?: number;
  color?: string;
  className?: string;
  fallback?: boolean;
}) {
  if (!name) {
    if (!fallback) return null;
    const defaultIcon = ICONS_MAP.get('box-package');
    return defaultIcon ? defaultIcon.svg({ size, color, className }) : null;
  }

  const iconItem = ICONS_MAP.get(name);
  if (!iconItem) {
    if (!fallback) return null;
    const defaultIcon = ICONS_MAP.get('box-package');
    return defaultIcon ? defaultIcon.svg({ size, color, className }) : null;
  }

  return iconItem.svg({ size, color, className });
}
