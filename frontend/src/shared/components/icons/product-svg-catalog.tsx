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
  { id: 'spices', title: 'عطارة وبقوليات ومحامص', iconName: 'herb-leaf' },
  { id: 'fashion', title: 'ملابس وأحذية وأزياء', iconName: 'tshirt' },
  { id: 'perfumes', title: 'عطور ومستحضرات تجميل', iconName: 'perfume-spray' },
  { id: 'pharmacy', title: 'صيدلية ومستلزمات طبية', iconName: 'pill-capsule' },
  { id: 'electronics', title: 'موبايلات وإلكترونيات', iconName: 'smartphone' },
  { id: 'supermarket', title: 'سوبرماركت وبقالة', iconName: 'cart-shopping' },
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
  // ==========================================
  // 1. Spices & Herbs & Roasteries (العطارة والمحامص)
  // ==========================================
  {
    id: 'herb-leaf',
    name: 'أعشاب',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M11 20A7 7 0 0 1 4 13C4 7 10 3 20 3c0 10-4 16-9 17Z"/><path d="M11 20v-7"/></SvgWrap>
  },
  {
    id: 'tea-bag',
    name: 'باكت شاي',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M8 7l2-4h4l2 4v13H8z"/><path d="M12 3v-2"/><circle cx="12" cy="14" r="2"/></SvgWrap>
  },
  {
    id: 'coffee-beans',
    name: 'حبوب بن خام',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><ellipse cx="8" cy="12" rx="5" ry="7" transform="rotate(-25 8 12)"/><path d="M6 7c2 3 2 7 4 10"/><ellipse cx="16" cy="12" rx="5" ry="7" transform="rotate(25 16 12)"/><path d="M14 7c2 3 2 7 4 10"/></SvgWrap>
  },
  {
    id: 'coffee-ground',
    name: 'بن مطحون',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></SvgWrap>
  },
  {
    id: 'spice-mortar',
    name: 'هاون طحن بهارات',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M4 10a8 8 0 0 0 16 0H4z"/><path d="M12 2l2 8"/><path d="M8 20h8"/></SvgWrap>
  },
  {
    id: 'spices-bowl',
    name: 'بهارات',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M3 11a9 9 0 0 0 18 0H3z"/><path d="M7 11c1-3 3-4 5-4s4 1 5 4"/><path d="M8 20h8"/></SvgWrap>
  },
  {
    id: 'wheat-sack',
    name: 'شوال حبوب',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M6 8c0-2 2-4 6-4s6 2 6 4c2 4 3 9 1 12H5C3 17 4 12 6 8z"/><path d="M10 4l4 4"/><path d="M14 4l-4 4"/></SvgWrap>
  },
  {
    id: 'cinnamon-roll',
    name: 'قرفة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="4" width="4" height="16" rx="2" transform="rotate(-15 7 12)"/><rect x="13" y="4" width="4" height="16" rx="2" transform="rotate(15 15 12)"/></SvgWrap>
  },
  {
    id: 'ginger-root',
    name: 'زنجبيل',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 3c-2 0-4 2-3 5-2 1-3 3-2 5 1 2 3 2 4 4 1 2 3 4 5 4s4-2 4-4c2-1 3-3 2-6-1-2-3-3-4-4 0-2-2-4-6-4z"/></SvgWrap>
  },
  {
    id: 'hibiscus-flower',
    name: 'كركديه',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="3"/><path d="M12 2v7"/><path d="M12 15v7"/><path d="M2 12h7"/><path d="M15 12h7"/><path d="M4.93 4.93l4.95 4.95"/><path d="M14.12 14.12l4.95 4.95"/><path d="M19.07 4.93l-4.95 4.95"/><path d="M9.88 14.12l-4.95 4.95"/></SvgWrap>
  },
  {
    id: 'saffron-jar',
    name: 'زعفران',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="7" width="12" height="14" rx="3"/><path d="M8 7V4h8v3"/><path d="M10 12l2 4 2-4"/><circle cx="12" cy="14" r="1"/></SvgWrap>
  },
  {
    id: 'cumin-seeds',
    name: 'كمون',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><ellipse cx="8" cy="8" rx="2" ry="4" transform="rotate(30 8 8)"/><ellipse cx="16" cy="7" rx="2" ry="4" transform="rotate(-30 16 7)"/><ellipse cx="12" cy="15" rx="2" ry="4" transform="rotate(15 12 15)"/><ellipse cx="6" cy="17" rx="2" ry="4" transform="rotate(-45 6 17)"/><ellipse cx="18" cy="16" rx="2" ry="4" transform="rotate(45 18 16)"/></SvgWrap>
  },
  {
    id: 'anise-star',
    name: 'يانسون',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 20 12 16.5 6.5 20 8 13.5 3 9l6.5-.5z"/></SvgWrap>
  },
  {
    id: 'nigella-seeds',
    name: 'حبة البركة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><circle cx="8" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="6" r="1.5" fill="currentColor"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/><circle cx="7" cy="15" r="1.5" fill="currentColor"/><circle cx="17" cy="14" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></SvgWrap>
  },
  {
    id: 'lentils-beans',
    name: 'عدس',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><ellipse cx="9" cy="9" rx="4" ry="5"/><path d="M9 6v6"/><ellipse cx="15" cy="15" rx="4" ry="5"/><path d="M15 12v6"/></SvgWrap>
  },
  {
    id: 'dates-palms',
    name: 'تمر',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><ellipse cx="12" cy="12" rx="6" ry="9"/><path d="M12 3v18"/><path d="M8 8c2 2 6 2 8 0"/></SvgWrap>
  },
  {
    id: 'nuts-almond',
    name: 'مكسرات',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 3C7 3 4 8 4 13c0 4 3 8 8 8s8-4 8-8c0-5-3-10-8-10z"/><path d="M12 7c-2 2-2 6 0 9"/></SvgWrap>
  },
  {
    id: 'honey-jar',
    name: 'عسل نحل',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M6 8h12v11a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8z"/><path d="M8 4h8v4H8z"/><path d="M12 11v5"/><path d="M10 13h4"/></SvgWrap>
  },
  {
    id: 'olive-oil',
    name: 'زيت زيتون',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M9 8h6v12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V8z"/><path d="M10 4h4v4h-4z"/><circle cx="12" cy="14" r="2"/></SvgWrap>
  },
  {
    id: 'herbal-oil',
    name: 'زيوت عطرية',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M12 3a6 6 0 0 0-6 6c0 4 6 12 6 12s6-8 6-12a6 6 0 0 0-6-6z"/><circle cx="12" cy="9" r="2"/></SvgWrap>
  },
  {
    id: 'incense-burner',
    name: 'مبخرة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M5 14h14l-2 6H7l-2-6z"/><path d="M7 14c0-3 2-6 5-6s5 3 5 6"/><path d="M12 8V4"/><path d="M9 4c1-1 2-1 3-2 1 1 2 1 3 2"/></SvgWrap>
  },
  {
    id: 'charcoal-coals',
    name: 'فحم شيشة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><path d="M4 14l4-8 8 2 4 7-6 6-7-1z"/><path d="M8 12l5 1"/><path d="M12 8l2 8"/></SvgWrap>
  },
  {
    id: 'tahini-halawa',
    name: 'طحينة',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="8" width="14" height="13" rx="2"/><path d="M7 8V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v3"/><path d="M9 13h6"/><path d="M9 17h4"/></SvgWrap>
  },
  {
    id: 'pickles-jar',
    name: 'مخللات',
    category: 'spices',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="3"/><path d="M8 8V5h8v3"/><circle cx="10" cy="12" r="1.5"/><circle cx="14" cy="15" r="1.5"/><circle cx="10" cy="17" r="1.5"/></SvgWrap>
  },

  // ==========================================
  // 2. Supermarket & Groceries (سوبرماركت وبقالة)
  // ==========================================
  {
    id: 'cart-shopping',
    name: 'عربة تسوق',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></SvgWrap>
  },
  {
    id: 'milk-carton',
    name: 'حليب',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M7 2h10l2 4v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6l2-4z"/><path d="M7 6h10"/><rect x="9" y="11" width="6" height="6" rx="1"/></SvgWrap>
  },
  {
    id: 'cheese-wedge',
    name: 'أجبان',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M21 17l-18 2 1-8 17-5v11z"/><circle cx="8" cy="15" r="1.5"/><circle cx="14" cy="13" r="1"/><circle cx="17" cy="16" r="1.5"/></SvgWrap>
  },
  {
    id: 'yogurt-cup',
    name: 'زبادي',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M6 7l1.5 13a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2L18 7H6z"/><path d="M5 4h14v3H5z"/></SvgWrap>
  },
  {
    id: 'egg-carton',
    name: 'بيض مائدة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><ellipse cx="8" cy="10" rx="3.5" ry="5"/><ellipse cx="16" cy="10" rx="3.5" ry="5"/><path d="M3 15h18v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z"/></SvgWrap>
  },
  {
    id: 'bread-loaf',
    name: 'خبز',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M4 14C4 9 7 6 12 6s8 3 8 8a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3z"/><path d="M9 10v4"/><path d="M12 9v5"/><path d="M15 10v4"/></SvgWrap>
  },
  {
    id: 'pasta-noodles',
    name: 'مكرونة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M4 12h16"/><path d="M4 8c4 2 8-2 16 0"/><path d="M4 16c4 2 8-2 16 0"/><rect x="3" y="5" width="18" height="14" rx="2"/></SvgWrap>
  },
  {
    id: 'rice-bag',
    name: 'شيكارة أرز',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M6 7c0-2 2-3 6-3s6 1 6 3c2 4 2 11 0 14H6C4 18 4 11 6 7z"/><circle cx="12" cy="13" r="3"/><path d="M12 11v4"/></SvgWrap>
  },
  {
    id: 'canned-tuna',
    name: 'تونة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v10c0 1.66 3.58 3 8 3s8-1.34 8-3V7"/><ellipse cx="12" cy="12" rx="8" ry="3"/></SvgWrap>
  },
  {
    id: 'tomato-paste',
    name: 'صلصة طماطم',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><circle cx="12" cy="14" r="2.5"/><path d="M12 11.5v-1"/></SvgWrap>
  },
  {
    id: 'cooking-oil',
    name: 'زيت طعام',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M8 8h8v12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V8z"/><path d="M10 3h4v5h-4z"/><path d="M12 11v4"/><path d="M10 14l4-2"/></SvgWrap>
  },
  {
    id: 'chips-crisps',
    name: 'شيبسي',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M6 4l2 16h8l2-16-6 2-6-2z"/><path d="M9 11c2 2 4 0 6 2"/></SvgWrap>
  },
  {
    id: 'biscuit-cookies',
    name: 'بسكويت',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="8"/><circle cx="9" cy="9" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/><circle cx="10" cy="15" r="1.2" fill="currentColor"/><circle cx="14" cy="14" r="1.2" fill="currentColor"/></SvgWrap>
  },
  {
    id: 'chocolate-bar',
    name: 'شوكولاتة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="8" x2="20" y2="8"/><line x1="4" y1="16" x2="20" y2="16"/></SvgWrap>
  },
  {
    id: 'candy-sweet',
    name: 'حلوى',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="5"/><path d="M7 12l-4-4v8z"/><path d="M17 12l4 4V8z"/></SvgWrap>
  },
  {
    id: 'water-bottle',
    name: 'مياه معدنية',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M9 6h6v15a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V6z"/><path d="M10 2h4v4h-4z"/><path d="M9 11h6"/><path d="M9 15h6"/></SvgWrap>
  },
  {
    id: 'juice-carton',
    name: 'عصائر',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="6" width="12" height="15" rx="2"/><path d="M14 2l-3 4"/><circle cx="12" cy="13" r="2.5"/></SvgWrap>
  },
  {
    id: 'soda-can',
    name: 'مياه غازية',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="3" width="10" height="18" rx="3"/><path d="M7 8h10"/><path d="M7 16h10"/><circle cx="12" cy="12" r="2"/></SvgWrap>
  },
  {
    id: 'detergent-powder',
    name: 'مسحوق غسيل',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M6 7h12l-1.5 14h-9L6 7z"/><path d="M9 3h6v4H9z"/><path d="M10 13l2-2 2 2-2 2z"/></SvgWrap>
  },
  {
    id: 'dish-soap',
    name: 'صابون سائل',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M8 9h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V9z"/><path d="M10 5h4v4h-4z"/><path d="M12 2v3"/><path d="M9 2h4"/></SvgWrap>
  },
  {
    id: 'bleach-cleaner',
    name: 'كلور',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M7 8h10l-1 13H8L7 8z"/><path d="M9 3h6v5H9z"/><path d="M12 12v4"/><path d="M10 14h4"/></SvgWrap>
  },
  {
    id: 'tissue-paper',
    name: 'مناديل',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8c0-3 2-5 4-5s4 2 4 5"/></SvgWrap>
  },
  {
    id: 'trash-bags',
    name: 'أكياس قمامة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="6" width="16" height="14" rx="2"/><line x1="4" y1="10" x2="20" y2="10"/><circle cx="12" cy="15" r="2"/></SvgWrap>
  },
  {
    id: 'frozen-food',
    name: 'مجمدات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16"/><path d="M4 12h16"/><path d="M7 7l10 10"/><path d="M17 7L7 17"/></SvgWrap>
  },
  {
    id: 'ice-cream',
    name: 'آيس كريم',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M7 11c0-3 2-5 5-5s5 2 5 5v2H7v-2z"/><path d="M7 13l5 9 5-9"/></SvgWrap>
  },
  {
    id: 'meat-steak',
    name: 'لحوم حمراء',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M19 8c-2-3-6-4-9-2-4 2-6 6-5 10 1 3 4 5 7 5 5 0 9-4 8-9 0-1-1-3-1-4z"/><circle cx="10" cy="13" r="2"/></SvgWrap>
  },
  {
    id: 'fish-seafood',
    name: 'أسماك',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M2 16s5-1 9-5c4-4 9-5 9-5s-1 5-5 9c-4 4-5 9-5 9s-2-4-8-8z"/><circle cx="17" cy="7" r="1"/></SvgWrap>
  },
  {
    id: 'apple-fruit',
    name: 'فواكه طازجة',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M12 20.5c-4 0-7-3-7-7.5 0-4.5 3-7 7-7s7 2.5 7 7c0 4.5-3 7.5-7 7.5z"/><path d="M12 6V3c1 0 2 1 3 2"/></SvgWrap>
  },
  {
    id: 'carrot-veggie',
    name: 'خضروات',
    category: 'supermarket',
    svg: (p) => <SvgWrap {...p}><path d="M5 19l14-14"/><path d="M15 3c2 2 3 5 3 5l-8 8c-2-2-5-3-5-3l10-10z"/></SvgWrap>
  },

  // ==========================================
  // 3. Fashion & Apparel (الملابس والأزياء)
  // ==========================================
  {
    id: 'tshirt',
    name: 'تيشيرت',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M6 3l-4 3 2 4 2-1v12h12V9l2 1 2-4-4-3-3 2a4 4 0 0 1-4 0L6 3z"/></SvgWrap>
  },
  {
    id: 'shirt',
    name: 'قميص كاجوال',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 4l3-2h10l3 2v17H4V4z"/><path d="M12 2v19"/><path d="M7 2l5 4 5-4"/><circle cx="12" cy="10" r="0.8" fill="currentColor"/><circle cx="12" cy="14" r="0.8" fill="currentColor"/><circle cx="12" cy="18" r="0.8" fill="currentColor"/></SvgWrap>
  },
  {
    id: 'pants-jeans',
    name: 'بنطلون',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M5 3h14v3l-2 15h-3l-2-10-2 10H7L5 6V3z"/><line x1="5" y1="6" x2="19" y2="6"/></SvgWrap>
  },
  {
    id: 'shorts',
    name: 'شورت',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M5 4h14v2l-1 10h-4l-2-5-2 5H6L5 6V4z"/></SvgWrap>
  },
  {
    id: 'dress',
    name: 'فستان',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M9 3l3 2 3-2v4l3 14H6l3-14V3z"/><path d="M9 7h6"/></SvgWrap>
  },
  {
    id: 'abaya-robe',
    name: 'عباية',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M7 3l5 3 5-3v18H7V3z"/><path d="M12 6v15"/><path d="M7 7l-4 4 2 2 2-2"/><path d="M17 7l4 4-2 2-2-2"/></SvgWrap>
  },
  {
    id: 'skirt',
    name: 'جيبة',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M8 4h8l3 16H5L8 4z"/><line x1="8" y1="7" x2="16" y2="7"/></SvgWrap>
  },
  {
    id: 'jacket',
    name: 'جاكيت',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 5l4-2 5 4 5-4 4 2v16H3V5z"/><path d="M12 7v14"/><path d="M7 3v6"/><path d="M17 3v6"/></SvgWrap>
  },
  {
    id: 'hoodie-sweatshirt',
    name: 'هودي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M5 6l-3 4 3 3 1-2v10h12V11l1 2 3-3-3-4-4 2c-1-2-3-3-4-3s-3 1-4 3L5 6z"/><path d="M8 15h8v4H8z"/></SvgWrap>
  },
  {
    id: 'suit-formal',
    name: 'بدلة رسمية',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 4l4-2 4 6 4-6 4 2v17H4V4z"/><path d="M12 8v13"/><polygon points="12,8 10,13 12,17 14,13" fill="none"/></SvgWrap>
  },
  {
    id: 'underwear',
    name: 'ملابس داخلية',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M5 5h14v4c0 6-3 10-7 11-4-1-7-5-7-11V5z"/></SvgWrap>
  },
  {
    id: 'socks',
    name: 'شرابات',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M8 3h6v10c0 2 2 3 4 4l-2 4c-4 0-8-2-8-6V3z"/></SvgWrap>
  },
  {
    id: 'shoe-sneaker',
    name: 'كوتشي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 14l3-6 4 1 5 4 6 1v4H3v-4z"/><path d="M8 9l2 4"/><path d="M11 9.5l2 4"/></SvgWrap>
  },
  {
    id: 'shoe-classic',
    name: 'حذاء جلد كلاسيك',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M2 15l4-4 6 1 8 1 2 3v2H2v-3z"/><path d="M2 18h20"/></SvgWrap>
  },
  {
    id: 'high-heel',
    name: 'حذاء كعب عالي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 16l4-2 7 2 7-6v4l-4 3-7-1-4 3H3v-3z"/><path d="M21 14v6"/></SvgWrap>
  },
  {
    id: 'slippers-sandal',
    name: 'شبشب',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M3 17c0-3 3-5 9-5s9 2 9 5v2H3v-2z"/><path d="M7 12c1-3 3-5 5-5s4 2 5 5"/></SvgWrap>
  },
  {
    id: 'bag-handbag',
    name: 'شنطة حريمي',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M5 9h14l-1 12H6L5 9z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></SvgWrap>
  },
  {
    id: 'backpack',
    name: 'شنطة ظهر',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="7" width="14" height="14" rx="4"/><path d="M9 7V4a3 3 0 0 1 6 0v3"/><rect x="8" y="12" width="8" height="5" rx="1"/></SvgWrap>
  },
  {
    id: 'wallet-leather',
    name: 'محفظة جلد',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M16 11h5v4h-5a2 2 0 0 1 0-4z"/><circle cx="18" cy="13" r="0.8" fill="currentColor"/></SvgWrap>
  },
  {
    id: 'belt-leather',
    name: 'حزام جلد',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="9" width="18" height="6" rx="1"/><rect x="7" y="7" width="6" height="10" rx="1"/><line x1="10" y1="9" x2="10" y2="15"/></SvgWrap>
  },
  {
    id: 'cap-hat',
    name: 'كاب',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M4 14c0-5 3-8 8-8s8 3 8 8H4z"/><path d="M18 14l4 2H8"/></SvgWrap>
  },
  {
    id: 'scarf-hijab',
    name: 'طرحة',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M6 4h12l-2 16-4-3-4 3L6 4z"/><line x1="6" y1="8" x2="18" y2="8"/></SvgWrap>
  },
  {
    id: 'watch-wrist',
    name: 'ساعة يد كلاسيك',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="6"/><polyline points="12 9 12 12 14 14"/><path d="M9 6V2h6v4"/><path d="M9 18v4h6v-4"/></SvgWrap>
  },
  {
    id: 'sunglasses',
    name: 'نظارة شمسية',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><circle cx="6" cy="14" r="3.5"/><circle cx="18" cy="14" r="3.5"/><path d="M9.5 14h5"/><path d="M3 12l2-6"/><path d="M21 12l-2-6"/></SvgWrap>
  },
  {
    id: 'tie',
    name: 'كرافتة',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><path d="M10 3h4l1 3-3 2-3-2z"/><path d="M10 8l-2 10 4 3 4-3-2-10z"/></SvgWrap>
  },
  {
    id: 'jewelry-ring',
    name: 'خاتم',
    category: 'fashion',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="14" r="6"/><polygon points="12,2 15,6 9,6"/></SvgWrap>
  },

  // ==========================================
  // 4. Perfumes & Cosmetics (العطور والتجميل)
  // ==========================================
  {
    id: 'perfume-spray',
    name: 'عطر بخاخ',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="9" width="12" height="12" rx="3"/><path d="M10 9V5h4v4"/><path d="M12 2v3"/><circle cx="12" cy="15" r="2"/></SvgWrap>
  },
  {
    id: 'perfume-oil',
    name: 'زيت عطر',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M8 8h8l-1 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2L8 8z"/><rect x="9" y="3" width="6" height="5" rx="1"/></SvgWrap>
  },
  {
    id: 'cream-lotion',
    name: 'كريم مرطب',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="2"/><path d="M9 8V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"/><path d="M10 13c1-1 3-1 4 0"/></SvgWrap>
  },
  {
    id: 'lipstick',
    name: 'روج',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="11" width="10" height="10" rx="1"/><path d="M9 11V6l6-3v8z"/></SvgWrap>
  },
  {
    id: 'foundation-makeup',
    name: 'كريم أساس',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M10 9V4h4v5"/><path d="M12 2v2"/><path d="M9 2h6"/></SvgWrap>
  },
  {
    id: 'mascara-eyeliner',
    name: 'ماسكارا',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="8" width="5" height="13" rx="1"/><path d="M15 3l4 18"/><line x1="14" y1="5" x2="18" y2="6"/><line x1="14.5" y1="8" x2="18.5" y2="9"/></SvgWrap>
  },
  {
    id: 'eyeshadow-palette',
    name: 'ايشادو',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="8" cy="10" r="1.5"/><circle cx="12" cy="10" r="1.5"/><circle cx="16" cy="10" r="1.5"/><circle cx="8" cy="14" r="1.5"/><circle cx="12" cy="14" r="1.5"/><circle cx="16" cy="14" r="1.5"/></SvgWrap>
  },
  {
    id: 'makeup-brush',
    name: 'فرش مكياج',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M10 13l-6 7"/><path d="M10 13c1-2 4-5 7-5s4 3 3 5-5 3-7 1z"/><line x1="8" y1="15" x2="11" y2="12"/></SvgWrap>
  },
  {
    id: 'nail-polish',
    name: 'مانيكير',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="10" width="10" height="11" rx="2"/><rect x="10" y="3" width="4" height="7" rx="1"/></SvgWrap>
  },
  {
    id: 'shampoo-bottle',
    name: 'شامبو شعر',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M7 8h10v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8z"/><path d="M10 3h4v5h-4z"/><circle cx="12" cy="14" r="2"/></SvgWrap>
  },
  {
    id: 'conditioner-hair',
    name: 'بلسم',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="9" width="12" height="12" rx="3"/><path d="M9 9V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4"/><path d="M12 12v6"/></SvgWrap>
  },
  {
    id: 'hair-oil',
    name: 'زيت شعر',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M8 9h8l-1 11a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2L8 9z"/><path d="M10 4h4v5h-4z"/><circle cx="12" cy="15" r="1.5"/></SvgWrap>
  },
  {
    id: 'hair-spray',
    name: 'سبراي شعر',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="7" width="10" height="14" rx="2"/><path d="M10 7V4h4v3"/><path d="M12 2v2"/><line x1="6" y1="3" x2="8" y2="4"/><line x1="5" y1="5" x2="7" y2="5.5"/></SvgWrap>
  },
  {
    id: 'soap-bar',
    name: 'صابون يد',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="7" width="16" height="11" rx="4"/><path d="M8 11c2-1 6-1 8 0"/><circle cx="18" cy="5" r="2"/><circle cx="14" cy="4" r="1"/></SvgWrap>
  },
  {
    id: 'body-mist',
    name: 'بادي سبلاش',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="8" y="9" width="8" height="12" rx="2"/><path d="M10 9V5h4v4"/><line x1="12" y1="2" x2="12" y2="5"/><circle cx="17" cy="4" r="1"/><circle cx="19" cy="6" r="1"/></SvgWrap>
  },
  {
    id: 'deodorant-roll',
    name: 'مزيل عرق',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="10" width="10" height="11" rx="2"/><ellipse cx="12" cy="7" rx="4" ry="3"/></SvgWrap>
  },
  {
    id: 'skincare-serum',
    name: 'سيروم بشرة',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M10 9V5h4v4"/><path d="M12 2v3"/><circle cx="12" cy="14" r="1.5"/></SvgWrap>
  },
  {
    id: 'face-mask',
    name: 'ماسك',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><path d="M6 5c0 8 2 14 6 14s6-6 6-14c-4 1-8 1-12 0z"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><path d="M10 14c1 1 3 1 4 0"/></SvgWrap>
  },
  {
    id: 'cosmetics-jar',
    name: 'مستحضرات تجميل',
    category: 'perfumes',
    svg: (p) => <SvgWrap {...p}><ellipse cx="12" cy="7" rx="8" ry="3"/><path d="M4 7v8a8 3 0 0 0 16 0V7"/></SvgWrap>
  },

  // ==========================================
  // 5. Pharmacy & Medical (الصيدليات والطبية)
  // ==========================================
  {
    id: 'pill-capsule',
    name: 'أقراص',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></SvgWrap>
  },
  {
    id: 'effervescent-tablets',
    name: 'فوار',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/><circle cx="18" cy="5" r="1"/><circle cx="6" cy="4" r="1"/></SvgWrap>
  },
  {
    id: 'syrup-bottle',
    name: 'شراب أطفال',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="2"/><path d="M10 4h4v4h-4z"/><path d="M10 14h4"/><path d="M12 12v4"/></SvgWrap>
  },
  {
    id: 'injection-syringe',
    name: 'حقنة',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="m18 2 4 4-12 12-4-4L18 2z"/><path d="m14 6 4 4"/><path d="m4 18-2 4 4-2"/><path d="m9 11 2 2"/></SvgWrap>
  },
  {
    id: 'ointment-tube',
    name: 'مرهم',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M4 17l10-10 4 4-10 10-4-4z"/><path d="M14 7l2-2 2 2-2 2"/><path d="M2 19l2 2"/></SvgWrap>
  },
  {
    id: 'drops-eye',
    name: 'قطرة عين',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="10" width="10" height="11" rx="2"/><path d="M10 5h4v5h-4z"/><path d="M12 2v3"/><circle cx="12" cy="15" r="1.5"/></SvgWrap>
  },
  {
    id: 'inhaler-spray',
    name: 'بخاخ ربو',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M7 3h6v12h4v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V3z"/><path d="M17 17h3"/></SvgWrap>
  },
  {
    id: 'first-aid',
    name: 'شنطة إسعافات',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="6" width="18" height="14" rx="3"/><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></SvgWrap>
  },
  {
    id: 'bandage-strip',
    name: 'بلاستر طبي',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="8" width="16" height="8" rx="4" transform="rotate(-30 12 12)"/><line x1="10" y1="10" x2="14" y2="14"/><circle cx="12" cy="12" r="1" fill="currentColor"/></SvgWrap>
  },
  {
    id: 'medical-mask',
    name: 'كمامة طبية',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="8" width="14" height="9" rx="2"/><path d="M5 10C2 10 2 15 5 15"/><path d="M19 10c3 0 3 5 0 5"/><line x1="5" y1="12.5" x2="19" y2="12.5"/></SvgWrap>
  },
  {
    id: 'thermometer',
    name: 'ترمومتر',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/><circle cx="11.5" cy="17.5" r="2"/></SvgWrap>
  },
  {
    id: 'blood-pressure',
    name: 'جهاز قياس ضغط الدم',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="6" width="10" height="13" rx="2"/><circle cx="9" cy="12" r="3"/><line x1="9" y1="12" x2="11" y2="11"/><path d="M14 15h4a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4"/></SvgWrap>
  },
  {
    id: 'blood-glucose',
    name: 'جهاز قياس السكر',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="5" width="12" height="15" rx="3"/><rect x="8" y="8" width="8" height="4" rx="1"/><line x1="12" y1="20" x2="12" y2="23"/><circle cx="12" cy="15" r="1.5"/></SvgWrap>
  },
  {
    id: 'baby-diapers',
    name: 'حفاضات أطفال',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M5 6h14v5c0 6-3 9-7 9s-7-3-7-9V6z"/><path d="M5 8c2 2 4 2 7 2s5 0 7-2"/></SvgWrap>
  },
  {
    id: 'baby-formula',
    name: 'لبن أطفال',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="7" width="12" height="14" rx="2"/><ellipse cx="12" cy="7" rx="6" ry="2"/><path d="M9 13h6"/><path d="M12 11v4"/></SvgWrap>
  },
  {
    id: 'baby-bottle',
    name: 'ببرونة',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="9" width="10" height="12" rx="2"/><path d="M9 5h6v4H9z"/><path d="M10 2h4v3h-4z"/><line x1="10" y1="13" x2="14" y2="13"/><line x1="10" y1="16" x2="13" y2="16"/></SvgWrap>
  },
  {
    id: 'baby-wipes',
    name: 'مناديل مبللة',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="8" width="16" height="11" rx="3"/><ellipse cx="12" cy="13" rx="4" ry="2"/><path d="M10 13c0-3 1-5 2-5s2 2 2 5"/></SvgWrap>
  },
  {
    id: 'antiseptic-liquid',
    name: 'بيتادين',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M7 8h10l-1 12a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2L7 8z"/><rect x="9" y="3" width="6" height="5" rx="1"/><path d="M12 12v4"/><path d="M10 14h4"/></SvgWrap>
  },
  {
    id: 'toothbrush-paste',
    name: 'فرشاة',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="6" width="16" height="6" rx="2"/><path d="M6 12l2 8h8l2-8"/><line x1="8" y1="9" x2="16" y2="9"/></SvgWrap>
  },
  {
    id: 'vitamins-bottle',
    name: 'فيتامينات',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="13" rx="2"/><rect x="8" y="3" width="8" height="5" rx="1"/><circle cx="12" cy="14" r="3"/><path d="M12 12v4"/><path d="M10 14h4"/></SvgWrap>
  },
  {
    id: 'stethoscope',
    name: 'سماعة طبيب',
    category: 'pharmacy',
    svg: (p) => <SvgWrap {...p}><path d="M4.5 3v5a5.5 5.5 0 0 0 11 0V3"/><path d="M10 13.5v3.5a3 3 0 0 0 3 3h3"/><circle cx="18" cy="20" r="2"/><circle cx="4.5" cy="3" r="1"/><circle cx="15.5" cy="3" r="1"/></SvgWrap>
  },

  // ==========================================
  // 6. Electronics & Mobiles (الموبايل والإلكترونيات)
  // ==========================================
  {
    id: 'smartphone',
    name: 'موبايل',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="18" r="1"/><line x1="10" y1="5" x2="14" y2="5"/></SvgWrap>
  },
  {
    id: 'phone-case',
    name: 'جراب',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="2" width="12" height="20" rx="3"/><rect x="8" y="4" width="4" height="5" rx="1"/></SvgWrap>
  },
  {
    id: 'screen-glass',
    name: 'سكرينة زجاج',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M9 5h6"/><line x1="8" y1="18" x2="16" y2="6"/></SvgWrap>
  },
  {
    id: 'charger-head',
    name: 'رأس شاحن',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="12" rx="2"/><path d="M9 8V4"/><path d="M15 8V4"/><path d="M12 12l-1 3h2l-1 3"/></SvgWrap>
  },
  {
    id: 'charger-cable',
    name: 'وصلة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M5 6v4a7 7 0 0 0 14 0V6"/><rect x="3" y="2" width="4" height="4" rx="1"/><rect x="17" y="2" width="4" height="4" rx="1"/><path d="M12 17v5"/></SvgWrap>
  },
  {
    id: 'powerbank',
    name: 'باور بانك',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="9" cy="6" r="0.8" fill="currentColor"/><circle cx="12" cy="6" r="0.8" fill="currentColor"/><circle cx="15" cy="6" r="0.8" fill="currentColor"/><path d="M12 11l-1 3h2l-1 3"/></SvgWrap>
  },
  {
    id: 'headphones',
    name: 'سماعة رأس',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/></SvgWrap>
  },
  {
    id: 'earbuds-case',
    name: 'سماعة ايربودز',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="7" width="14" height="14" rx="4"/><line x1="5" y1="12" x2="19" y2="12"/><circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/></SvgWrap>
  },
  {
    id: 'bluetooth-speaker',
    name: 'سبيكر',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="5" y="4" width="14" height="16" rx="3"/><circle cx="12" cy="13" r="3.5"/><circle cx="12" cy="8" r="1"/></SvgWrap>
  },
  {
    id: 'tablet',
    name: 'تابلت',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="19" r="0.8"/></SvgWrap>
  },
  {
    id: 'smartwatch',
    name: 'ساعة ذكية',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="5" width="12" height="14" rx="3"/><path d="M9 2h6v3H9z"/><path d="M9 19h6v3H9z"/><circle cx="12" cy="12" r="3"/></SvgWrap>
  },
  {
    id: 'memory-card',
    name: 'كارت ميموري',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M6 2h8l4 4v16H6z"/><line x1="9" y1="5" x2="9" y2="8"/><line x1="12" y1="5" x2="12" y2="8"/><line x1="15" y1="7" x2="15" y2="8"/></SvgWrap>
  },
  {
    id: 'hard-drive',
    name: 'هارد ديسك',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1"/><line x1="16" y1="16" x2="18" y2="18"/></SvgWrap>
  },
  {
    id: 'laptop',
    name: 'لابتوب',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="12" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></SvgWrap>
  },
  {
    id: 'keyboard-mouse',
    name: 'لوحة مفاتيح',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="6" y1="9" x2="6.01" y2="9"/><line x1="10" y1="9" x2="10.01" y2="9"/><line x1="14" y1="9" x2="14.01" y2="9"/><line x1="18" y1="9" x2="18.01" y2="9"/><line x1="7" y1="14" x2="17" y2="14"/></SvgWrap>
  },
  {
    id: 'wifi-router',
    name: 'راوتر',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="13" width="18" height="8" rx="2"/><line x1="6" y1="5" x2="6" y2="13"/><line x1="18" y1="5" x2="18" y2="13"/><circle cx="8" cy="17" r="1"/><circle cx="12" cy="17" r="1"/><circle cx="16" cy="17" r="1"/></SvgWrap>
  },
  {
    id: 'tv-screen',
    name: 'شاشة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></SvgWrap>
  },
  {
    id: 'remote-control',
    name: 'ريموت كنترول',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="6" r="1.5"/><circle cx="10" cy="11" r="1"/><circle cx="14" cy="11" r="1"/><circle cx="10" cy="15" r="1"/><circle cx="14" cy="15" r="1"/></SvgWrap>
  },
  {
    id: 'car-holder',
    name: 'حامل سيارة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="4" width="10" height="12" rx="2"/><line x1="12" y1="16" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/><path d="M4 8h3v4H4z"/><path d="M17 8h3v4h-3z"/></SvgWrap>
  },
  {
    id: 'battery',
    name: 'بطارية',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="6" width="12" height="16" rx="2"/><line x1="9" y1="2" x2="15" y2="2"/><line x1="12" y1="10" x2="12" y2="16"/><line x1="9" y1="13" x2="15" y2="13"/></SvgWrap>
  },
  {
    id: 'sim-card',
    name: 'شريحة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M6 2h8l4 4v16H6z"/><rect x="9" y="9" width="6" height="8" rx="1"/></SvgWrap>
  },
  {
    id: 'camera',
    name: 'كاميرا مراقبة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></SvgWrap>
  },
  {
    id: 'printer',
    name: 'طابعة',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/></SvgWrap>
  },
  {
    id: 'screwdriver-tools',
    name: 'مفك',
    category: 'electronics',
    svg: (p) => <SvgWrap {...p}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></SvgWrap>
  },

  // Cafe & Restaurant
  {
    id: 'coffee-cup',
    name: 'قهوة',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></SvgWrap>
  },
  {
    id: 'iced-coffee',
    name: 'ايس كوفي',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><rect x="6" y="8" width="12" height="14" rx="2"/><path d="M8 8l1-5h6l1 5"/><line x1="15" y1="1" x2="17" y2="8"/><path d="M6 13c3 1 9 1 12 0"/></SvgWrap>
  },
  {
    id: 'fresh-juice',
    name: 'عصير طازج',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M6 4h12l-2 16H8z"/><path d="M6 8h12"/><line x1="12" y1="2" x2="12" y2="18"/></SvgWrap>
  },
  {
    id: 'cocktail-drink',
    name: 'كوكتيل',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M6 3h12l-6 8v8"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="3" x2="18" y2="1"/></SvgWrap>
  },
  {
    id: 'burger',
    name: 'برجر',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M4 11a8 8 0 0 1 16 0H4z"/><rect x="3" y="14" width="18" height="3" rx="1"/><path d="M4 19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2H4z"/><line x1="5" y1="12.5" x2="19" y2="12.5"/></SvgWrap>
  },
  {
    id: 'shawarma-wrap',
    name: 'شاورما',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><rect x="7" y="3" width="10" height="18" rx="5" transform="rotate(20 12 12)"/><line x1="8" y1="9" x2="16" y2="12"/></SvgWrap>
  },
  {
    id: 'crepe-wrap',
    name: 'كريب حلو',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M12 2L2 20h20z"/><path d="M12 2v18"/><path d="M7 14h10"/></SvgWrap>
  },
  {
    id: 'pizza-slice',
    name: 'بيتزا',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M12 2l9 17a12 12 0 0 1-18 0z"/><circle cx="12" cy="10" r="1"/><circle cx="10" cy="14" r="1"/><circle cx="14" cy="15" r="1"/></SvgWrap>
  },
  {
    id: 'sandwich',
    name: 'ساندوتش',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 18l18-9v6l-18 3z"/><path d="M3 12l18-9v6l-18 3z"/></SvgWrap>
  },
  {
    id: 'french-fries',
    name: 'بطاطس مقلية',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M5 11l2 10h10l2-10"/><path d="M8 11V3h2v8"/><path d="M11 11V5h2v6"/><path d="M14 11V2h2v9"/></SvgWrap>
  },
  {
    id: 'fried-chicken',
    name: 'بروستد',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M15 4a5 5 0 0 0-7 7l-4 4a2 2 0 0 0 0 3l1 1a2 2 0 0 0 3 0l4-4a5 5 0 0 0 7-7z"/><circle cx="15" cy="7" r="1.5"/></SvgWrap>
  },
  {
    id: 'grilled-meat',
    name: 'مشويات',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 21l6-6"/><circle cx="11" cy="13" r="3"/><circle cx="15" cy="9" r="3"/><circle cx="19" cy="5" r="3"/></SvgWrap>
  },
  {
    id: 'rice-meal',
    name: 'وجبة ارز',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 12c0 5 4 9 9 9s9-4 9-9H3z"/><path d="M8 9a4 4 0 0 1 8 0"/><line x1="3" y1="12" x2="21" y2="12"/></SvgWrap>
  },
  {
    id: 'pasta-meal',
    name: 'باستا',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 13c0 5 4 8 9 8s9-3 9-8H3z"/><path d="M6 13c1-4 3-6 6-6s5 2 6 6"/></SvgWrap>
  },
  {
    id: 'salad-bowl',
    name: 'سلطة خضراء',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 12c0 5 4 9 9 9s9-4 9-9H3z"/><circle cx="8" cy="9" r="2"/><circle cx="13" cy="8" r="2.5"/><circle cx="16" cy="10" r="1.5"/></SvgWrap>
  },
  {
    id: 'soup-bowl',
    name: 'شوربة عدس',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 13c0 5 4 8 9 8s9-3 9-8H3z"/><path d="M7 6c1-2 2-2 2 0s1 2 2 0"/><path d="M13 6c1-2 2-2 2 0s1 2 2 0"/></SvgWrap>
  },
  {
    id: 'cake-slice',
    name: 'تشيز كيك',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M3 18l18-7v7z"/><path d="M3 18h18"/><circle cx="12" cy="7" r="2"/><path d="M12 9v2"/></SvgWrap>
  },
  {
    id: 'waffle-pancake',
    name: 'وافل',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="4" width="16" height="16" rx="3"/><line x1="9" y1="4" x2="9" y2="20"/><line x1="15" y1="4" x2="15" y2="20"/><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/></SvgWrap>
  },
  {
    id: 'donut',
    name: 'دونات',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><circle cx="8" cy="8" r="0.5"/><circle cx="16" cy="8" r="0.5"/><circle cx="8" cy="16" r="0.5"/></SvgWrap>
  },
  {
    id: 'shisha-hookah',
    name: 'شيشة',
    category: 'cafe',
    svg: (p) => <SvgWrap {...p}><path d="M10 2h4v3h-4z"/><path d="M12 5v14"/><path d="M9 19c0 2 1.5 3 3 3s3-1 3-3-1.5-3-3-3-3 1-3 3z"/><path d="M12 10c3 0 5 2 5 5v3"/></SvgWrap>
  },

  // General & Others
  {
    id: 'gift-box',
    name: 'هدية',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13"/><path d="M3 12h18"/><path d="M12 8a3 3 0 0 0-3-3c-1.5 0-2 1-2 2s1.5 1 5 1z"/><path d="M12 8a3 3 0 0 1 3-3c1.5 0 2 1 2 2s-1.5 1-5 1z"/></SvgWrap>
  },
  {
    id: 'tools-hardware',
    name: 'عدة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M15 4l5 5-4 4-5-5z"/><path d="M11 9L3 17l4 4 8-8"/></SvgWrap>
  },
  {
    id: 'paint-roller',
    name: 'رول دهان',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><rect x="4" y="3" width="16" height="6" rx="2"/><path d="M12 9v4a2 2 0 0 1-2 2H8v5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-7"/></SvgWrap>
  },
  {
    id: 'light-bulb',
    name: 'لمبة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"/></SvgWrap>
  },
  {
    id: 'office-supplies',
    name: 'قلم',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 6h10"/><path d="M6 10h10"/></SvgWrap>
  },
  {
    id: 'sports-fitness',
    name: 'كرة',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18"/><path d="M3 12a9 9 0 0 1 18 0"/></SvgWrap>
  },
  {
    id: 'pet-food',
    name: 'دراي فود',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="M10 5a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M5 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M15 8a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/><path d="M12 11c-3 0-5 2-5 4 0 3 2 6 5 6s5-3 5-6c0-2-2-4-5-4z"/></SvgWrap>
  },
  {
    id: 'box-package',
    name: 'طرد',
    category: 'general',
    svg: (p) => <SvgWrap {...p}><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></SvgWrap>
  },
];

const ICONS_MAP = new Map<string, ProductIconItem>(PRODUCT_SVG_ICONS.map((i) => [i.id, i]));

export function ProductIcon({
  name,
  size = 20,
  color,
  className = '',
  fallback = true,
}: {
  name?: string | null;
  size?: number;
  color?: string;
  className?: string;
  fallback?: boolean;
}) {
  const iconColor = color || 'var(--product-icon-color, #2563eb)';

  if (!name) {
    if (!fallback) return null;
    const defaultIcon = ICONS_MAP.get('box-package');
    return defaultIcon ? defaultIcon.svg({ size, color: iconColor, className: `z-product-icon ${className}` }) : null;
  }

  const iconItem = ICONS_MAP.get(name);
  if (!iconItem) {
    if (!fallback) return null;
    const defaultIcon = ICONS_MAP.get('box-package');
    return defaultIcon ? defaultIcon.svg({ size, color: iconColor, className: `z-product-icon ${className}` }) : null;
  }

  return iconItem.svg({ size, color: iconColor, className: `z-product-icon ${className}` });
}
