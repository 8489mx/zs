import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StorefrontProduct, StorefrontCategory, StorefrontInfo } from '../types/storefront.types';
import { StorefrontShelfSection } from './StorefrontShelfSection';
import { StorefrontMidBannerCard } from './StorefrontMidBannerCard';
import { IconFolder } from './StorefrontIcons';

interface TopHomepageSection {
  categoryId: number;
  categoryName: string;
  products: StorefrontProduct[];
  totalCount: number;
}

interface StorefrontMultiRowHomeProps {
  dealsProducts: StorefrontProduct[];
  topHomepageSections: TopHomepageSection[];
  categories: StorefrontCategory[];
  cartMap: Map<number, number>;
  info: StorefrontInfo;
  favoriteIds: Set<number>;
  onAddToCart: (product: StorefrontProduct) => void;
  onUpdateQuantity: (productId: number, qty: number) => void;
  onOpenReviewModal: (product: StorefrontProduct) => void;
  onToggleFavorite: (productId: number) => void;
  onQuickView?: (product: StorefrontProduct) => void;
  onSelectDeals: () => void;
  onSelectCategory: (categoryId: number) => void;
  onOpenCategoriesModal: () => void;
}

export function StorefrontMultiRowHome({
  dealsProducts,
  topHomepageSections,
  categories,
  cartMap,
  info,
  favoriteIds,
  onAddToCart,
  onUpdateQuantity,
  onOpenReviewModal,
  onToggleFavorite,
  onQuickView,
  onSelectDeals,
  onSelectCategory,
  onOpenCategoriesModal,
}: StorefrontMultiRowHomeProps) {
  const { t } = useTranslation();

  const isMidBannersActive = info.midBannersEnabled !== false;
  const validMidBanners = isMidBannersActive && Array.isArray(info.midBanners)
    ? info.midBanners.filter((b) => b && b.imageUrl && b.isEnabled !== false)
    : [];

  const getBannersForSlot = (slot: string, fallbackIdx?: number) => {
    const matched = validMidBanners.filter((b) => b.slot === slot);
    if (matched.length > 0) return matched;
    if (fallbackIdx !== undefined && validMidBanners[fallbackIdx] && !validMidBanners[fallbackIdx].slot) {
      return [validMidBanners[fallbackIdx]];
    }
    return [];
  };

  const afterDealsBanners = getBannersForSlot('after_deals', 0);
  const bottomBanners = getBannersForSlot('bottom', validMidBanners.length > 3 ? 3 : undefined);

  return (
    <div className="storefront-homepage-sections">
      {/* Row 1: Deals Spotlight */}
      {dealsProducts.length > 0 && (
        <StorefrontShelfSection
          badge={t('storefront.storefront_multi_row_home.s0', "عروض وتخفيضات حصرية")}
          subtitle={t('storefront.storefront_multi_row_home.s1', "أقوى الخصومات والأسعار المخفضة")}
          viewAllLabel={`عرض كل العروض (${dealsProducts.length})`}
          products={dealsProducts.slice(0, 12)}
          cartMap={cartMap}
          whatsappPhone={info.whatsappPhone}
          favoriteIds={favoriteIds}
          isSmartDeal
          onAddToCart={onAddToCart}
          onUpdateQuantity={onUpdateQuantity}
          onOpenReviewModal={onOpenReviewModal}
          onToggleFavorite={onToggleFavorite}
          onQuickView={onQuickView}
          onViewAll={onSelectDeals}
        />
      )}

      {/* Mid Banner Slot: After Deals */}
      {afterDealsBanners.map((banner) => (
        <StorefrontMidBannerCard
          key={banner.id}
          banner={banner}
          categories={categories}
          onSelectCategory={onSelectCategory}
          onSelectDeals={onSelectDeals}
        />
      ))}

      {/* Wide Horizontal Category Cards (Full Width Shelves) */}
      {topHomepageSections.map((section, idx) => {
        const slotKey = idx === 0 ? 'after_row_1' : idx === 1 ? 'after_row_2' : `after_row_${idx + 1}`;
        const slotFallbackIdx = idx === 0 ? 1 : idx === 1 ? 2 : undefined;
        const bannersAfterThis = getBannersForSlot(slotKey, slotFallbackIdx);

        return (
          <React.Fragment key={section.categoryId}>
            <StorefrontShelfSection
              badge={section.categoryName}
              subtitle={t('storefront.multi_row.category_subtitle', 'تشكيلة مختارة من أرقى منتجات {{category}}', { category: section.categoryName })}
              viewAllLabel={`عرض كل أصناف القسم (${section.totalCount})`}
              products={section.products.slice(0, 12)}
              cartMap={cartMap}
              whatsappPhone={info.whatsappPhone}
              favoriteIds={favoriteIds}
              onAddToCart={onAddToCart}
              onUpdateQuantity={onUpdateQuantity}
              onOpenReviewModal={onOpenReviewModal}
              onToggleFavorite={onToggleFavorite}
              onQuickView={onQuickView}
              onViewAll={() => {
                onSelectCategory(section.categoryId);
                window.scrollTo({ top: 120, behavior: 'smooth' });
              }}
            />

            {bannersAfterThis.map((banner) => (
              <StorefrontMidBannerCard
                key={banner.id}
                banner={banner}
                categories={categories}
                onSelectCategory={onSelectCategory}
                onSelectDeals={onSelectDeals}
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* Mid Banner Slot: Bottom */}
      {bottomBanners.map((banner) => (
        <StorefrontMidBannerCard
          key={banner.id}
          banner={banner}
          categories={categories}
          onSelectCategory={onSelectCategory}
          onSelectDeals={onSelectDeals}
        />
      ))}

      {/* Bottom Invitation Banner to browse remaining categories */}
      <div
        className="storefront-explore-banner"
        style={{
          background: '#ffffff',
          border: '1.5px dashed #cbd5e1',
          borderRadius: '16px',
          padding: '28px 20px',
          textAlign: 'center',
        }}
      >
        <h4
          style={{
            margin: '0 0 8px',
            fontSize: '15.5px',
            fontWeight: 800,
            color: '#0f172a',
            lineHeight: 1.45,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            columnGap: '6px',
            rowGap: '2px',
          }}
        >
          <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
            {t('storefront.storefront_multi_row_home.s2', "استكشف باقي أقسام المتجر")}
          </span>
          <span
            style={{
              display: 'inline-block',
              whiteSpace: 'nowrap',
              color: 'var(--storefront-primary-color, #170e5e)',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            ({categories.length} {t('storefront.storefront_multi_row_home.s3', "قسم متاح)")}
          </span>
        </h4>
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
          {info?.bio || t('storefront.storefront_multi_row_home.s4', "تصفح كافة الأقسام والمنتجات المتاحة واطلب ما تحتاجه بكل سهولة مع خدمة التوصيل المباشر")}
        </p>
        <button
          type="button"
          onClick={onOpenCategoriesModal}
          style={{
            padding: '10px 24px',
            borderRadius: '10px',
            background: 'var(--storefront-primary-color, #170e5e)',
            color: 'var(--storefront-primary-contrast, #ffffff)',
            border: 'none',
            fontSize: '13.5px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 2px 8px var(--storefront-primary-subtle, rgba(23, 14, 94, 0.2))',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'filter 0.15s ease, transform 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.filter = 'brightness(1.08)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.filter = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <IconFolder size={16} strokeWidth={2} />
          <span>{t('storefront.storefront_multi_row_home.s5', "تصفح جميع الأقسام والمنتجات")}</span>
        </button>
      </div>
    </div>
  );
}
