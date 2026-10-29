import React from 'react';
import { useTranslation } from 'react-i18next';
import type { StorefrontProduct, StorefrontCategory, StorefrontInfo } from '../types/storefront.types';
import { StorefrontShelfSection } from './StorefrontShelfSection';
import { StorefrontMidBannerCard } from './StorefrontMidBannerCard';
import { StorefrontAmazonVibrantSection } from './StorefrontAmazonVibrantSection';

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
  categoryCounts?: Map<number | 'all', number>;
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
}: StorefrontMultiRowHomeProps) {
  const { t } = useTranslation();

  const vibrantProducts = React.useMemo(() => {
    if (dealsProducts && dealsProducts.length > 0) return dealsProducts;
    const all: StorefrontProduct[] = [];
    for (const sec of topHomepageSections) {
      all.push(...sec.products);
    }
    return all;
  }, [dealsProducts, topHomepageSections]);

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
      {/* Row 0: Vibrant Amazon-Style Campaign Cards & Quick Deal Tiles */}
      <StorefrontAmazonVibrantSection
        products={vibrantProducts}
        categories={categories}
        onSelectDeals={onSelectDeals}
        onSelectCategory={onSelectCategory}
        onQuickView={onQuickView}
      />

      {/* Row 1: Deals Spotlight Shelf */}
      {dealsProducts.length > 0 && (
        <StorefrontShelfSection
          sectionId="storefront-deals-shelf"
          badge={t('storefront.storefront_multi_row_home.s0', 'تخفيضات وعروض اليوم')}
          viewAllLabel={`عرض كل التخفيضات (${dealsProducts.length})`}
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

      {/* Wide Horizontal Category Shelves */}
      {topHomepageSections.map((section, idx) => {
        const slotKey = idx === 0 ? 'after_row_1' : idx === 1 ? 'after_row_2' : `after_row_${idx + 1}`;
        const slotFallbackIdx = idx === 0 ? 1 : idx === 1 ? 2 : undefined;
        const bannersAfterThis = getBannersForSlot(slotKey, slotFallbackIdx);

        return (
          <React.Fragment key={section.categoryId}>
            <StorefrontShelfSection
              sectionId={`storefront-category-shelf-${section.categoryId}`}
              badge={section.categoryName}
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
                window.scrollTo({ top: 180, behavior: 'smooth' });
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
    </div>
  );
}
