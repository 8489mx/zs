import { useState, useEffect, useMemo, useCallback } from 'react';
import '@/styles/partials/storefront.css';
import { useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontSubNav } from '../components/StorefrontSubNav';
import { StorefrontCategoryShowcase } from '../components/StorefrontCategoryShowcase';
import { StorefrontBannerCarousel } from '../components/StorefrontBannerCarousel';
import { StorefrontMultiRowHome } from '../components/StorefrontMultiRowHome';
import { StorefrontFilteredGrid } from '../components/StorefrontFilteredGrid';
import { StorefrontModals } from '../components/StorefrontModals';
import { StorefrontDeliveryInfoBar } from '../components/StorefrontDeliveryInfoBar';
import { StorefrontSkeleton } from '../components/StorefrontSkeleton';
import { initStorefrontPixels, trackStorefrontEvent } from '../lib/storefront-pixel-tracker';
import type { StorefrontProduct } from '../types/storefront.types';
import { usePublicStorefront, ITEMS_PER_PAGE } from '../hooks/usePublicStorefront';
import { useStorefrontSeo } from '../hooks/useStorefrontSeo';
import { IconStore } from '../components/StorefrontIcons';
import { UtensilsIcon } from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';
import { saveCustomerOrderRef } from '../lib/customer-order-refs';

export function PublicStorefrontPage() {
  const { slug, tableNo, productId, orderNumber: trackOrderNumber } = useParams<{ slug?: string; tableNo?: string; productId?: string; orderNumber?: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tableParam = (tableNo || searchParams.get('table') || '').trim();
  const cleanSlug = String(slug || 'default').trim();
  const [quickViewProduct, setQuickViewProduct] = useState<StorefrontProduct | null>(null);

  /**
   * جذر المتجر الحالي (`/st/:slug` أو `/store/:slug` أو `/shop/:slug`).
   * يُشتق من المسار الفعلي حتى يبقى العميل على نفس البادئة التي دخل منها.
   */
  const storeBasePath = useMemo(() => {
    const match = location.pathname.match(/^\/(st|store|shop)\/[^/]+/);
    return match ? match[0] : `/st/${cleanSlug}`;
  }, [location.pathname, cleanSlug]);

  /** فتح منتج = تغيير الرابط؛ المودال يتبع الرابط لا العكس. */
  const openProduct = useCallback(
    (product: StorefrontProduct) => {
      navigate(`${storeBasePath}/p/${product.id}`);
    },
    [navigate, storeBasePath],
  );

  /** الإغلاق يرجع خطوة في التاريخ حتى يعمل زر الرجوع طبيعياً. */
  const closeProduct = useCallback(() => {
    if (productId) navigate(storeBasePath, { replace: false });
    else setQuickViewProduct(null);
  }, [navigate, productId, storeBasePath]);

  const {
    infoQuery,
    catalogQuery,
    info,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    inStockOnly,
    setInStockOnly,
    onlyDeals,
    setOnlyDeals,
    sortBy,
    setSortBy,
    setVisibleCount,
    isCategoriesModalOpen,
    setIsCategoriesModalOpen,
    isCartOpen,
    setIsCartOpen,
    isCheckoutOpen,
    setIsCheckoutOpen,
    isMyOrdersOpen,
    setIsMyOrdersOpen,
    editingOrderNumber,
    setEditingOrderNumber,
    confirmedOrder,
    setConfirmedOrder,
    reviewProduct,
    setReviewProduct,
    isReviewModalOpen,
    setIsReviewModalOpen,
    favoriteIds,
    onlyFavorites,
    setOnlyFavorites,
    handleToggleFavorite,
    handleToggleFavorites,
    handleOpenReviewModal,
    handleReviewSubmitted,
    cartItems,
    cartMap,
    cartCount,
    cartSubtotal,
    handleAddToCart,
    handleUpdateQuantity,
    handleClearCart,
    handleGoHome,
    handleEditOrder,
    handleReorder,
    categories,
    dealsProducts,
    smartDealProductIds,
    categoryCounts,
    filteredProducts,
    topHomepageSections,
    paginatedProducts,
    hasMore,
    isHomepageMultiRow,
  } = usePublicStorefront(cleanSlug);

  /*
   * رابط التتبع: يسجّل الطلب على هذا الجهاز (فيظهر في «طلباتي» هنا أيضاً) ثم يفتح «طلباتي»،
   * ويمسح التوكن من شريط العنوان فوراً حتى لا يُنسخ أو يُشارك بالخطأ مع رابط المتجر.
   */
  useEffect(() => {
    if (!trackOrderNumber) return;
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const token = hashParams.get('t');
    if (token) saveCustomerOrderRef(cleanSlug, trackOrderNumber, token);
    navigate(storeBasePath, { replace: true });
    setIsMyOrdersOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackOrderNumber]);

  // عنوان التبويب ووسوم المشاركة تتبع المنتج المفتوح إن وُجد
  useStorefrontSeo({ info, product: quickViewProduct });

  useEffect(() => {
    if (info) {
      initStorefrontPixels(info);
      trackStorefrontEvent('ViewContent', {
        contentName: info.title || info.businessName || 'المتجر الإلكتروني',
      });
      if (info.brandColor) {
        document.documentElement.style.setProperty('--storefront-primary-color', info.brandColor);
      }
    }
  }, [info]);

  useEffect(() => {
    if (!catalogQuery.data?.products) return;
    const hash = window.location.hash;
    const productParam = searchParams.get('product') || (hash.startsWith('#product-') ? hash.replace('#product-', '') : null);
    if (productParam) {
      const found = (catalogQuery.data.products as StorefrontProduct[]).find((p) => String(p.id) === String(productParam));
      if (found) {
        setQuickViewProduct(found);
      }
    }
  }, [catalogQuery.data?.products, searchParams]);

  /*
   * مزامنة المودال مع الرابط: الرابط هو مصدر الحقيقة.
   * يفتح `/p/:productId` المنتج مباشرة عند الدخول من لينك مشارَك أو إعلان،
   * ويغلقه الرجوع للجذر — فيعمل زر الرجوع في المتصفح كما يتوقع المستخدم.
   * البحث في الكتالوج الكامل لا في المفلتر، وإلا لن يُفتح منتج خارج الفلتر النشط.
   */
  useEffect(() => {
    if (!productId) {
      setQuickViewProduct(null);
      return;
    }
    const products = catalogQuery.data?.products as StorefrontProduct[] | undefined;
    if (!products) return;
    const found = products.find((p) => String(p.id) === String(productId));
    setQuickViewProduct(found || null);
  }, [productId, catalogQuery.data?.products]);

  if (catalogQuery.isLoading || infoQuery.isLoading) {
    // Page-shaped placeholder instead of a spinner; uses the store colour as soon as /info is in.
    return <StorefrontSkeleton brandColor={infoQuery.data?.brandColor} />;
  }

  // If storefront is explicitly disabled by merchant
  if (infoQuery.data && infoQuery.data.enabled === false) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <IconStore size={48} color="#94a3b8" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          عفواً، المتجر متوقف حالياً
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px' }}>
          المتجر غير متاح لاستقبال الطلبات في الوقت الحالي. تواصل مع إدارة المتجر لمزيد من التفاصيل.
        </p>
      </div>
    );
  }

  // If offline, connection error, or invalid link
  if (catalogQuery.isError || infoQuery.isError || !infoQuery.data || !catalogQuery.data) {
    return (
      <div
        dir="rtl"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8fafc',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
          <IconStore size={48} color="#94a3b8" />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
          عفواً، المتجر غير متاح حالياً
        </h2>
        <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px' }}>
          تأكد من اتصالك بالإنترنت وصحة الرابط، أو تواصل مع إدارة المتجر لمزيد من التفاصيل.
        </p>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        color: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'inherit',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <StorefrontHeader
        info={info}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        cartCount={cartCount}
        cartTotal={cartSubtotal}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenOrders={() => setIsMyOrdersOpen(true)}
        onGoHome={handleGoHome}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setOnlyDeals(false);
          setOnlyFavorites(false);
        }}
        onSelectProduct={openProduct}
        onAddToCart={handleAddToCart}
      />

      {/* إشارات التوصيل (المدة، الرسوم، أقل طلب) قبل أي تصفح */}
      <StorefrontDeliveryInfoBar info={info} />

      {/* Dine-In QR Table Banner */}
      {tableParam && (
        <div
          style={{
            background: 'linear-gradient(90deg, #15803d, #16a34a)',
            color: '#ffffff',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <UtensilsIcon size={18} color="#ffffff" strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '13.5px' }}>
                أهلاً بك! أنت تطلب الآن مباشرة من <strong>طاولة رقم ({tableParam})</strong>
              </div>
              <div style={{ fontSize: '11px', opacity: 0.9 }}>
                اختر وجبتك وأرسل الطلب، وسيقوم المطبخ بتحضيره وتقديمه لطاولتك فوراً
              </div>
            </div>
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: '20px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            طلب صالة
          </div>
        </div>
      )}

      {/* Top Promotional Billboard Banner Carousel */}
      {!searchTerm && ((info.bannerUrls && info.bannerUrls.length > 0) || info.bannerUrl) && (
        <StorefrontBannerCarousel
          banners={info.bannerUrls && info.bannerUrls.length > 0 ? info.bannerUrls : (info.bannerUrl ? [info.bannerUrl] : [])}
          title={info.title || info.businessName}
          bannerFit={info.bannerFit || 'contain'}
          bannerPosition={info.bannerPosition || 'center'}
          bannerPositions={info.bannerPositions}
          bannerIntervalSeconds={info.bannerIntervalSeconds || 4}
        />
      )}

      {/* Sub-Header Utility Navigation Bar (Amazon Quick Bar) */}
      <StorefrontSubNav
        categories={categories}
        selectedCategoryId={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setOnlyDeals(false);
          setOnlyFavorites(false);
        }}
        onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
        onlyDeals={onlyDeals}
        onToggleDeals={() => {
          setOnlyDeals(!onlyDeals);
          setOnlyFavorites(false);
          setSelectedCategory('all');
        }}
        inStockOnly={inStockOnly}
        onToggleInStock={() => setInStockOnly(!inStockOnly)}
        dealsCount={dealsProducts.length}
        onlyFavorites={onlyFavorites}
        onToggleFavorites={handleToggleFavorites}
        favoritesCount={favoriteIds.size}
        onClearFilters={() => {
          setOnlyDeals(false);
          setOnlyFavorites(false);
          setInStockOnly(false);
          setSelectedCategory('all');
        }}
      />

      {/* Horizontal Circular Category Showcase - Always visible unless searching */}
      {!searchTerm && (
        <StorefrontCategoryShowcase
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={(id) => {
            setSelectedCategory(id);
            setOnlyDeals(false);
            setOnlyFavorites(false);
          }}
          onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
          categoryCounts={categoryCounts}
        />
      )}

      {/* Main Content Area */}

      <main
        className="storefront-main-content"
        style={{
          flex: 1,
          maxWidth: 'var(--storefront-container, 1440px)',
          width: '100%',
          margin: '0 auto',
          padding: '20px 20px 80px',
        }}
      >
        {isHomepageMultiRow ? (
          <StorefrontMultiRowHome
            dealsProducts={dealsProducts}
            topHomepageSections={topHomepageSections}
            categories={categories}
            cartMap={cartMap}
            info={info}
            favoriteIds={favoriteIds}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onOpenReviewModal={handleOpenReviewModal}
            onToggleFavorite={handleToggleFavorite}
            onQuickView={openProduct}
            onSelectDeals={() => setOnlyDeals(true)}
            onSelectCategory={(id) => setSelectedCategory(id)}
            onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
          />
        ) : (
          <StorefrontFilteredGrid
            searchTerm={searchTerm}
            onlyFavorites={onlyFavorites}
            onlyDeals={onlyDeals}
            selectedCategory={selectedCategory}
            categories={categories}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onGoHome={handleGoHome}
            filteredProducts={filteredProducts}
            paginatedProducts={paginatedProducts}
            hasMore={hasMore}
            onLoadMore={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
            cartMap={cartMap}
            info={info}
            smartDealProductIds={smartDealProductIds}
            favoriteIds={favoriteIds}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onOpenReviewModal={handleOpenReviewModal}
            onToggleFavorite={handleToggleFavorite}
            onQuickView={openProduct}
          />
        )}
      </main>

      {/* Modals & Live Cart */}
      <StorefrontModals
        allProducts={filteredProducts || []}
        onAddToCart={handleAddToCart}
        quickViewProduct={quickViewProduct}
        onCloseQuickView={closeProduct}
        isCategoriesModalOpen={isCategoriesModalOpen}
        onCloseCategoriesModal={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategory={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setOnlyDeals(false);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
        cartItems={cartItems}
        info={info}
        isCartOpen={isCartOpen}
        onOpenCart={() => setIsCartOpen(true)}
        onCloseCart={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        isCheckoutOpen={isCheckoutOpen}
        onCloseCheckout={() => {
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
        }}
        cleanSlug={cleanSlug}
        editingOrderNumber={editingOrderNumber}
        tableParam={tableParam}
        onEditSuccess={() => {
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
          handleClearCart();
          setIsMyOrdersOpen(true);
        }}
        onOrderSuccess={(orderData) => {
          setConfirmedOrder(orderData);
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
          handleClearCart();
        }}
        confirmedOrder={confirmedOrder}
        onCloseSuccessModal={() => setConfirmedOrder(null)}
        onTrackOrder={() => {
          setConfirmedOrder(null);
          setIsMyOrdersOpen(true);
        }}
        isMyOrdersOpen={isMyOrdersOpen}
        onCloseMyOrders={() => setIsMyOrdersOpen(false)}
        onEditOrder={handleEditOrder}
        onReorder={(order) => {
          const { added, skipped } = handleReorder(order);
          if (added === 0) {
            toast.warning('أصناف هذا الطلب غير متاحة حالياً في المتجر.');
            return;
          }
          setIsMyOrdersOpen(false);
          if (skipped.length > 0) {
            toast.info(`أضفنا ${added} صنف للسلة. غير متاح حالياً: ${skipped.join('، ')}`);
          }
        }}
        isReviewModalOpen={isReviewModalOpen}
        reviewProduct={reviewProduct}
        onCloseReviewModal={() => {
          setIsReviewModalOpen(false);
          setReviewProduct(null);
        }}
        onReviewSubmitted={handleReviewSubmitted}
      />
    </div>
  );
}
