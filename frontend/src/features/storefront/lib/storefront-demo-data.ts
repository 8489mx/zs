import type { StorefrontInfo, StorefrontCatalogResponse, StorefrontCategory, StorefrontProduct } from '../types/storefront.types';

function svgDataUri(svgContent: string): string {
  const cleaned = svgContent.trim().replace(/\s+/g, ' ');
  return `data:image/svg+xml;utf8,${encodeURIComponent(cleaned)}`;
}

// Bespoke Multi-Layered Studio Vector Illustrations for Categories (Rich Cover Artwork for Bento & Category Circles)
export const CAT_FASHION_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="400" height="400" fill="#ffffff"/>
  <path d="M125 95 L165 75 L235 75 L275 95 L335 145 L302 192 L265 168 L265 325 L135 325 L135 168 L98 192 L65 145 Z" fill="#1e293b" stroke="#0f172a" stroke-width="4" stroke-linejoin="round"/>
  <path d="M165 75 L200 125 L235 75" fill="#e2e8f0" stroke="#0f172a" stroke-width="3"/>
  <circle cx="200" cy="155" r="4.5" fill="#f8fafc"/>
  <circle cx="200" cy="195" r="4.5" fill="#f8fafc"/>
  <circle cx="200" cy="235" r="4.5" fill="#f8fafc"/>
  <circle cx="200" cy="275" r="4.5" fill="#f8fafc"/>
</svg>
`);

export const CAT_TECH_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="400" height="400" fill="#ffffff"/>
  <rect x="135" y="75" width="130" height="250" rx="26" fill="#0f172a" stroke="#475569" stroke-width="6"/>
  <rect x="147" y="92" width="106" height="216" rx="16" fill="#0284c7" opacity="0.22"/>
  <rect x="180" y="84" width="40" height="6" rx="3" fill="#0f172a"/>
  <circle cx="200" cy="185" r="36" fill="none" stroke="#38bdf8" stroke-width="4" opacity="0.8"/>
  <path d="M186 185 L196 195 L216 175" fill="none" stroke="#7dd3fc" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>
`);

export const CAT_SHOES_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="400" height="400" fill="#ffffff"/>
  <path d="M75 245 Q90 185 155 180 L215 135 Q235 125 250 155 L285 160 Q325 180 330 245 Z" fill="#e11d48"/>
  <rect x="68" y="242" width="268" height="28" rx="14" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
  <path d="M135 215 L255 185" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.9"/>
  <line x1="175" y1="168" x2="195" y2="180" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  <line x1="195" y1="154" x2="215" y2="166" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
</svg>
`);

export const CAT_PERFUME_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="400" height="400" fill="#ffffff"/>
  <rect x="176" y="76" width="48" height="28" rx="6" fill="#d97706"/>
  <rect x="186" y="104" width="28" height="18" fill="#b45309"/>
  <rect x="128" y="122" width="144" height="190" rx="28" fill="#78350f" stroke="#f59e0b" stroke-width="4"/>
  <rect x="152" y="158" width="96" height="110" rx="10" fill="#1e1b4b" stroke="#fbbf24" stroke-width="2.5"/>
  <circle cx="200" cy="213" r="22" fill="none" stroke="#fbbf24" stroke-width="2"/>
  <path d="M190 213 L200 198 L210 213 L200 228 Z" fill="#fbbf24"/>
</svg>
`);

export const CAT_WATCHES_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <rect width="400" height="400" fill="#ffffff"/>
  <rect x="168" y="60" width="64" height="280" rx="16" fill="#78350f"/>
  <circle cx="200" cy="200" r="78" fill="#f59e0b" stroke="#fef3c7" stroke-width="4"/>
  <circle cx="200" cy="200" r="64" fill="#0f172a"/>
  <line x1="200" y1="200" x2="200" y2="156" stroke="#fbbf24" stroke-width="5" stroke-linecap="round"/>
  <line x1="200" y1="200" x2="234" y2="214" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  <circle cx="200" cy="200" r="6" fill="#fbbf24"/>
</svg>
`);

// Bespoke Studio Product Illustrations on Pure #ffffff Seamless Background (600x600, 100% Pure Vector — Zero Bitmap Filters)
export const PROD_LINEN_SHIRT_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p1Fabric" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="512" rx="136" ry="14" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="512" rx="96" ry="8" fill="#cbd5e1" opacity="0.65"/>
  <g>
    <path d="M210 143 L258 120 L342 120 L390 143 L478 213 L436 276 L392 246 L392 483 C392 493 384 500 374 500 L226 500 C216 500 208 493 208 483 L208 246 L164 276 L122 213 Z" fill="#0f172a" opacity="0.08"/>
    <path d="M210 135 L258 112 L342 112 L390 135 L478 205 L436 268 L392 238 L392 475 C392 485 384 492 374 492 L226 492 C216 492 208 485 208 475 L208 238 L164 268 L122 205 Z" fill="url(#p1Fabric)" stroke="#0f172a" stroke-width="2" stroke-linejoin="round"/>
    <path d="M258 112 L300 178 L342 112 Z" fill="#e2e8f0"/>
    <path d="M242 120 L300 184 L274 204 L218 136 Z" fill="#334155"/>
    <path d="M358 120 L300 184 L326 204 L382 136 Z" fill="#334155"/>
    <line x1="300" y1="184" x2="300" y2="490" stroke="#334155" stroke-width="3"/>
    <rect x="322" y="232" width="46" height="52" rx="6" fill="none" stroke="#64748b" stroke-width="3"/>
    <circle cx="300" cy="218" r="6" fill="#f8fafc"/>
    <circle cx="300" cy="268" r="6" fill="#f8fafc"/>
    <circle cx="300" cy="318" r="6" fill="#f8fafc"/>
    <circle cx="300" cy="368" r="6" fill="#f8fafc"/>
    <circle cx="300" cy="418" r="6" fill="#f8fafc"/>
  </g>
</svg>
`);

export const PROD_SNEAKER_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p2Upper" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#e11d48"/>
      <stop offset="60%" stop-color="#be123c"/>
      <stop offset="100%" stop-color="#881337"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="452" rx="196" ry="15" fill="#e2e8f0" opacity="0.65"/>
  <ellipse cx="300" cy="452" rx="145" ry="9" fill="#cbd5e1" opacity="0.55"/>
  <g>
    <path d="M95 365 C105 280 185 270 235 255 L318 188 C338 172 365 182 376 218 C400 230 432 230 452 220 C488 242 508 302 512 365 Z" fill="url(#p2Upper)" stroke="#9f1239" stroke-width="2" stroke-linejoin="round"/>
    <path d="M84 360 L518 360 C526 360 532 372 528 386 L516 408 C510 418 496 422 480 422 L104 422 C84 422 72 406 74 384 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="3.5"/>
    <path d="M94 402 L508 402" stroke="#f43f5e" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M185 330 Q285 315 395 268" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
    <line x1="258" y1="242" x2="288" y2="262" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
    <line x1="282" y1="222" x2="312" y2="242" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
    <line x1="306" y1="202" x2="336" y2="222" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round"/>
  </g>
</svg>
`);

export const PROD_SMARTWATCH_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p3Case" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="50%" stop-color="#64748b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="524" rx="116" ry="13" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="524" rx="76" ry="7" fill="#cbd5e1" opacity="0.6"/>
  <g>
    <path d="M238 85 L362 85 L376 185 L224 185 Z" fill="#ea580c"/>
    <path d="M224 415 L376 415 L362 505 L238 505 Z" fill="#c2410c"/>
    <rect x="400" y="225" width="14" height="44" rx="6" fill="#ea580c"/>
    <rect x="192" y="168" width="216" height="264" rx="54" fill="url(#p3Case)" stroke="#94a3b8" stroke-width="4"/>
    <rect x="208" y="184" width="184" height="232" rx="42" fill="#090d16"/>
    <circle cx="300" cy="278" r="62" fill="none" stroke="#1e293b" stroke-width="10"/>
    <circle cx="300" cy="278" r="62" fill="none" stroke="#38bdf8" stroke-width="10" stroke-dasharray="290 400" stroke-linecap="round"/>
    <circle cx="300" cy="278" r="44" fill="none" stroke="#22c55e" stroke-width="8" stroke-dasharray="200 300" stroke-linecap="round"/>
    <text x="300" y="289" text-anchor="middle" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="35">09:41</text>
    <rect x="248" y="362" width="104" height="24" rx="12" fill="#1e293b"/>
    <circle cx="268" cy="374" r="5" fill="#f43f5e"/>
    <text x="308" y="379" text-anchor="middle" fill="#e2e8f0" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="13.5">98 BPM</text>
  </g>
</svg>
`);

export const PROD_PERFUME_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p4Bottle" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#451a03"/>
      <stop offset="50%" stop-color="#78350f"/>
      <stop offset="100%" stop-color="#1c1917"/>
    </linearGradient>
    <linearGradient id="p4Gold" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#b45309"/>
      <stop offset="50%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="510" rx="135" ry="14" fill="#e2e8f0" opacity="0.75"/>
  <ellipse cx="300" cy="510" rx="92" ry="8" fill="#cbd5e1" opacity="0.65"/>
  <g>
    <polygon points="260,95 340,95 356,145 244,145" fill="url(#p4Gold)" stroke="#b45309" stroke-width="1.5"/>
    <rect x="276" y="145" width="48" height="32" fill="url(#p4Gold)" stroke="#b45309" stroke-width="1.5"/>
    <rect x="190" y="177" width="220" height="305" rx="34" fill="url(#p4Bottle)" stroke="url(#p4Gold)" stroke-width="5"/>
    <rect x="226" y="232" width="148" height="186" rx="14" fill="#1c1917" stroke="url(#p4Gold)" stroke-width="3.5"/>
    <circle cx="300" cy="296" r="28" fill="none" stroke="url(#p4Gold)" stroke-width="2.5"/>
    <path d="M286 296 L300 276 L314 296 L300 316 Z" fill="url(#p4Gold)"/>
    <rect x="252" y="346" width="96" height="6" rx="3" fill="url(#p4Gold)"/>
    <rect x="268" y="364" width="64" height="4" rx="2" fill="url(#p4Gold)" opacity="0.8"/>
  </g>
</svg>
`);

export const PROD_HEADPHONES_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p5Metal" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#312e81"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="510" rx="150" ry="14" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="510" rx="100" ry="8" fill="#cbd5e1" opacity="0.6"/>
  <g>
    <path d="M156 320 C156 175 444 175 444 320" fill="none" stroke="url(#p5Metal)" stroke-width="28" stroke-linecap="round"/>
    <path d="M180 280 C180 195 420 195 420 280" fill="none" stroke="#6366f1" stroke-width="6" stroke-linecap="round" opacity="0.7"/>
    <rect x="122" y="285" width="68" height="145" rx="34" fill="url(#p5Metal)" stroke="#818cf8" stroke-width="3.5"/>
    <rect x="168" y="298" width="28" height="118" rx="14" fill="#334155"/>
    <rect x="410" y="285" width="68" height="145" rx="34" fill="url(#p5Metal)" stroke="#818cf8" stroke-width="3.5"/>
    <rect x="404" y="298" width="28" height="118" rx="14" fill="#334155"/>
  </g>
</svg>
`);

export const PROD_BACKPACK_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p6Bag" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="510" rx="140" ry="14" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="510" rx="95" ry="8" fill="#cbd5e1" opacity="0.6"/>
  <g>
    <path d="M255 125 C255 92 345 92 345 125" fill="none" stroke="#1e293b" stroke-width="16" stroke-linecap="round"/>
    <rect x="175" y="125" width="250" height="350" rx="56" fill="url(#p6Bag)" stroke="#475569" stroke-width="4"/>
    <rect x="206" y="285" width="188" height="155" rx="28" fill="#1e293b" stroke="#64748b" stroke-width="3.5"/>
    <line x1="226" y1="325" x2="374" y2="325" stroke="#94a3b8" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="268" y="195" width="64" height="28" rx="6" fill="#d97706"/>
  </g>
</svg>
`);

export const PROD_SUNGLASSES_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p7Lens" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="430" rx="180" ry="14" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="430" rx="120" ry="8" fill="#cbd5e1" opacity="0.6"/>
  <g>
    <path d="M78 245 L522 245" stroke="#d97706" stroke-width="8.5" stroke-linecap="round"/>
    <rect x="96" y="242" width="176" height="118" rx="44" fill="url(#p7Lens)" stroke="#f59e0b" stroke-width="7.5"/>
    <rect x="328" y="242" width="176" height="118" rx="44" fill="url(#p7Lens)" stroke="#f59e0b" stroke-width="7.5"/>
    <path d="M272 272 Q300 254 328 272" fill="none" stroke="#f59e0b" stroke-width="7.5"/>
    <line x1="132" y1="268" x2="178" y2="332" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" opacity="0.4"/>
    <line x1="364" y1="268" x2="410" y2="332" stroke="#ffffff" stroke-width="6.5" stroke-linecap="round" opacity="0.4"/>
  </g>
</svg>
`);

export const PROD_JACKET_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="100%" height="100%" shape-rendering="geometricPrecision" text-rendering="geometricPrecision">
  <defs>
    <linearGradient id="p8Coat" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="50%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#022c22"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="#ffffff"/>
  <ellipse cx="300" cy="515" rx="150" ry="14" fill="#e2e8f0" opacity="0.7"/>
  <ellipse cx="300" cy="515" rx="100" ry="8" fill="#cbd5e1" opacity="0.6"/>
  <g>
    <path d="M205 125 L252 98 L348 98 L395 125 L485 225 L438 272 L396 225 L396 485 L204 485 L204 225 L162 272 L115 225 Z" fill="url(#p8Coat)" stroke="#047857" stroke-width="4" stroke-linejoin="round"/>
    <line x1="204" y1="210" x2="396" y2="210" stroke="#047857" stroke-width="4"/>
    <line x1="204" y1="280" x2="396" y2="280" stroke="#047857" stroke-width="4"/>
    <line x1="204" y1="350" x2="396" y2="350" stroke="#047857" stroke-width="4"/>
    <line x1="204" y1="420" x2="396" y2="420" stroke="#047857" stroke-width="4"/>
    <line x1="300" y1="115" x2="300" y2="485" stroke="#fbbf24" stroke-width="5"/>
  </g>
</svg>
`);

const HERO_BANNER_1_SVG = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 480" width="100%" height="100%">
  <defs>
    <linearGradient id="hb1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#312e81"/>
    </linearGradient>
  </defs>
  <rect width="1440" height="480" fill="url(#hb1)"/>
  <circle cx="260" cy="240" r="290" fill="#4f46e5" opacity="0.18"/>
  <circle cx="1150" cy="120" r="220" fill="#d97706" opacity="0.14"/>
</svg>
`);

import {
  SHIRT_PHOTO,
  SNEAKER_PHOTO,
  SMARTWATCH_PHOTO,
  PERFUME_PHOTO,
  HEADPHONES_PHOTO,
  BACKPACK_PHOTO,
  SUNGLASSES_PHOTO,
  JACKET_PHOTO,
  IPHONE_PHOTO,
  WATCH_CLASSIC_PHOTO,
} from './product-photos-registry';

export const DEMO_STOREFRONT_CATEGORIES: StorefrontCategory[] = [
  { id: 1, name: 'أزياء وملابس', imageUrl: SHIRT_PHOTO },
  { id: 2, name: 'إلكترونيات وهواتف', imageUrl: IPHONE_PHOTO },
  { id: 3, name: 'أحذية وحقائب', imageUrl: SNEAKER_PHOTO },
  { id: 4, name: 'عطور ومستحضرات', imageUrl: PERFUME_PHOTO },
  { id: 5, name: 'ساعات وإكسسوارات', imageUrl: WATCH_CLASSIC_PHOTO },
];

export const DEMO_STOREFRONT_PRODUCTS: StorefrontProduct[] = [
  {
    id: 101,
    name: 'قميص كتان بريميوم كاجوال عصري',
    barcode: 'FASH-00101',
    price: 450,
    originalPrice: 600,
    hasDiscount: true,
    discountPercent: 25,
    offerBadge: 'خصم 25%',
    categoryId: 1,
    categoryName: 'أزياء وملابس',
    stockQty: 45,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: SHIRT_PHOTO,
    description: 'قميص كتان طبيعي ناعم ومريح مناسب لجميع الأوقات، خياطة متقنة وجودة فاخرة تمنحك حضوراً أنيقاً.',
    rating: 4.9,
    reviewCount: 142,
    variants: [
      { name: 'كحلي ملكي - M', price: 450 },
      { name: 'كحلي ملكي - L', price: 450 },
      { name: 'أبيض لؤلؤي - L', price: 450 },
      { name: 'بيج رملي - XL', price: 480 },
    ],
  },
  {
    id: 102,
    name: 'حذاء رياضي خفيف ومقاوم للصدمات',
    barcode: 'SHOE-00102',
    price: 790,
    originalPrice: 950,
    hasDiscount: true,
    discountPercent: 17,
    offerBadge: 'الأكثر طلباً',
    categoryId: 3,
    categoryName: 'أحذية وحقائب',
    stockQty: 28,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: SNEAKER_PHOTO,
    description: 'حذاء جري خفيف بنعل فوم مرن ديناميكي لتوفير أقصى درجات الراحة طوال اليوم وأثناء الحركة السريعة.',
    rating: 4.9,
    reviewCount: 96,
    variants: [
      { name: 'مقاس 41', price: 790 },
      { name: 'مقاس 42', price: 790 },
      { name: 'مقاس 43', price: 790 },
      { name: 'مقاس 44', price: 790 },
    ],
  },
  {
    id: 103,
    name: 'ساعة يد ذكية Smartwatch Ultra V8',
    barcode: 'ELEC-00103',
    price: 1250,
    originalPrice: 1600,
    hasDiscount: true,
    discountPercent: 22,
    offerBadge: 'صفقة اليوم',
    categoryId: 2,
    categoryName: 'إلكترونيات وهواتف',
    stockQty: 18,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: SMARTWATCH_PHOTO,
    description: 'ساعة ذكية بإطار معدني وشاشة AMOLED فائقة الوضوح، مستشعرات حيوية دقيقة، ومقاومة كاملة للماء.',
    rating: 5.0,
    reviewCount: 215,
  },
  {
    id: 104,
    name: 'عطر العود الملكي الأصلي 100 مل',
    barcode: 'PERF-00104',
    price: 680,
    originalPrice: 890,
    hasDiscount: true,
    discountPercent: 24,
    offerBadge: 'إصدار خاص',
    categoryId: 4,
    categoryName: 'عطور ومستحضرات',
    stockQty: 35,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: PERFUME_PHOTO,
    description: 'مزيج فاخر من دهن العود المعتق والمسك الأبيض والعنبر الملكي، ثبات يدوم لأكثر من 48 ساعة.',
    rating: 4.8,
    reviewCount: 84,
  },
  {
    id: 105,
    name: 'سماعات لاسلكية Pro عازلة للضوضاء',
    barcode: 'ELEC-00105',
    price: 890,
    originalPrice: 1100,
    hasDiscount: true,
    discountPercent: 19,
    offerBadge: 'خصم 19%',
    categoryId: 2,
    categoryName: 'إلكترونيات وهواتف',
    stockQty: 40,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: HEADPHONES_PHOTO,
    description: 'صوت محيطي فائق النقاء مع تقنية إلغاء الضوضاء النشطة ANC وبطارية تدوم حتى 36 ساعة تشغيل متواصل.',
    rating: 4.9,
    reviewCount: 168,
  },
  {
    id: 106,
    name: 'حقيبة ظهر كلاسيكية مضادة للماء للابتوب',
    barcode: 'BAG-00106',
    price: 520,
    originalPrice: 650,
    hasDiscount: true,
    discountPercent: 20,
    offerBadge: 'وصل حديثاً',
    categoryId: 3,
    categoryName: 'أحذية وحقائب',
    stockQty: 22,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: BACKPACK_PHOTO,
    description: 'حقيبة عملية مبطنة لحماية أجهزة اللابتوب حتى 16 بوصة مع جيوب ذكية متعددة ومنفذ شحن مدمج.',
    rating: 4.7,
    reviewCount: 52,
  },
  {
    id: 107,
    name: 'نظارة شمسية كلاسيكية مستقطبة UV400',
    barcode: 'ACC-00107',
    price: 340,
    originalPrice: 450,
    hasDiscount: true,
    discountPercent: 24,
    offerBadge: 'خصم 24%',
    categoryId: 5,
    categoryName: 'ساعات وإكسسوارات',
    stockQty: 50,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: SUNGLASSES_PHOTO,
    description: 'عدسات مستقطبة عالية الدقة لحماية العين من الأشعة فوق البنفسجية بإطار معدني مذهب خفيف الوزن.',
    rating: 4.8,
    reviewCount: 47,
  },
  {
    id: 108,
    name: 'جاكيت شتوي كاجوال مبطن ضد المطر',
    barcode: 'FASH-00108',
    price: 1150,
    originalPrice: 1450,
    hasDiscount: true,
    discountPercent: 21,
    offerBadge: 'خصم 21%',
    categoryId: 1,
    categoryName: 'أزياء وملابس',
    stockQty: 5,
    inStock: true,
    icon: 'PackageIcon',
    imageUrl: JACKET_PHOTO,
    description: 'جاكيت حراري دافئ بخامات معالجة مقاومة للماء والرياح لإطلالة شتوية عصرية وفخمة.',
    rating: 4.9,
    reviewCount: 89,
    variants: [
      { name: 'كحلي كلاسيكي - L', price: 1150 },
      { name: 'كحلي كلاسيكي - XL', price: 1150 },
      { name: 'أسود مطفي - L', price: 1150 },
    ],
  },
];

export const DEMO_STOREFRONT_INFO: StorefrontInfo = {
  tenantId: 'demo-tenant',
  slug: 'demo',
  businessName: 'Z-Systems ERP',
  title: 'Z-Systems ERP',
  enabled: true,
  bio: 'تشكيلة متنوعة من المنتجات المختارة بعناية، اطلب أونلاين بسهولة واستلم طلبك في أسرع وقت.',
  announcement: 'توصيل سريع لجميع المناطق • شحن مجاني للطلبات فوق 300 ج.م',
  address: 'التجمع الخامس - شارع التسعين الشمالي، القاهرة',
  bannerUrl: HERO_BANNER_1_SVG,
  bannerUrls: [HERO_BANNER_1_SVG],
  bannerFit: 'cover',
  logoUrl: '/logo.png',
  logo_url: '/logo.png',
  brandColor: '#2d68c4',
  brandSecondaryColor: '#2353a0',
  brandSurfaceColor: '#f8fafc',
  themePreset: 'modern-navy',
  currency: 'EGP',
  countryCode: 'EG',
  deliveryFee: 35,
  freeShippingEnabled: true,
  freeShippingMinOrder: 300,
  minOrder: 50,
  whatsappPhone: '+201000000000',
  smartDealsEnabled: true,
  onlinePaymentEnabled: true,
  pickupEnabled: true,
  allowOutOfStockOrders: false,
  showOutOfStockProducts: true,
  heroBannerFullBleed: true,
};

export const DEMO_STOREFRONT_CATALOG: StorefrontCatalogResponse = {
  categories: DEMO_STOREFRONT_CATEGORIES,
  products: DEMO_STOREFRONT_PRODUCTS,
};
