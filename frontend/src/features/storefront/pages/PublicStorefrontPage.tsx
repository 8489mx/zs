import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { CartItem, CreateOnlineOrderResponse, StorefrontProduct, StorefrontCategory, StorefrontInfo, OnlineOrderRecord } from '../types/storefront.types';
import { StorefrontHeader } from '../components/StorefrontHeader';
import { StorefrontSubNav } from '../components/StorefrontSubNav';
import { StorefrontCategoryShowcase } from '../components/StorefrontCategoryShowcase';
import { StorefrontCategoriesModal } from '../components/StorefrontCategoriesModal';
import { StorefrontProductCard } from '../components/StorefrontProductCard';
import { StorefrontHorizontalCarousel } from '../components/StorefrontHorizontalCarousel';
import { StorefrontCartDrawer } from '../components/StorefrontCartDrawer';
import { StorefrontLiveCartDock } from '../components/StorefrontLiveCartDock';
import { StorefrontCheckoutModal } from '../components/StorefrontCheckoutModal';
import { StorefrontSuccessModal } from '../components/StorefrontSuccessModal';
import { StorefrontBannerCarousel } from '../components/StorefrontBannerCarousel';
import { StorefrontMyOrdersModal } from '../components/StorefrontMyOrdersModal';
import { IconFlame, IconFolder, IconSearch, IconArrowLeft, IconArrowUpRight, IconStore } from '../components/StorefrontIcons';

const ITEMS_PER_PAGE = 24;
const arCollator = new Intl.Collator('ar', { sensitivity: 'base' });

export function PublicStorefrontPage() {
  const { slug } = useParams<{ slug?: string }>();
  const cleanSlug = String(slug || 'default').trim();

  const cachedInfoKey = `zs_storefront_info_${cleanSlug}`;
  const cachedCatalogKey = `zs_storefront_catalog_${cleanSlug}`;

  // Queries with Instant Offline-First Hydration
  const infoQuery = useQuery({
    queryKey: ['storefront-info', cleanSlug],
    queryFn: async () => {
      const res = await storefrontApi.getInfo(cleanSlug);
      try { localStorage.setItem(cachedInfoKey, JSON.stringify(res)); } catch {}
      return res;
    },
    initialData: () => {
      try {
        const saved = localStorage.getItem(cachedInfoKey);
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0, // Mark initialData as stale so React Query revalidates from server immediately
    refetchOnWindowFocus: true,
    enabled: Boolean(cleanSlug),
    staleTime: 5 * 1000,
  });

  const catalogQuery = useQuery({
    queryKey: ['storefront-catalog', cleanSlug],
    queryFn: async () => {
      const res = await storefrontApi.getCatalog(cleanSlug);
      try { localStorage.setItem(cachedCatalogKey, JSON.stringify(res)); } catch {}
      return res;
    },
    initialData: () => {
      try {
        const saved = localStorage.getItem(cachedCatalogKey);
        return saved ? JSON.parse(saved) : undefined;
      } catch {
        return undefined;
      }
    },
    initialDataUpdatedAt: 0, // Mark initialData as stale so React Query revalidates from server immediately
    refetchOnWindowFocus: true,
    enabled: Boolean(cleanSlug),
    staleTime: 5 * 1000,
  });

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [onlyDeals, setOnlyDeals] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [editingOrderNumber, setEditingOrderNumber] = useState<string | undefined>(undefined);
  const [confirmedOrder, setConfirmedOrder] = useState<CreateOnlineOrderResponse | null>(null);

  // Reset pagination when category or search changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [selectedCategory, searchTerm, onlyDeals]);

  // Cart State (Persisted per slug)
  const cartStorageKey = `zs_storefront_cart_${cleanSlug}`;
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(cartStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(cartStorageKey, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems, cartStorageKey]);

  // Auto-sanitize cart against active store catalog
  // Automatically purges ghost items from other tenants, old sessions, or deleted products
  useEffect(() => {
    if (!catalogQuery.data?.products || catalogQuery.data.products.length === 0) return;
    const activeProductMap = new Map<string, StorefrontProduct>();
    for (const p of catalogQuery.data.products as StorefrontProduct[]) {
      activeProductMap.set(String(p.id), p);
    }
    setCartItems((prev) => {
      let changed = false;
      const updated = prev
        .filter((item) => {
          const exists = activeProductMap.has(String(item.product.id));
          if (!exists) changed = true;
          return exists;
        })
        .map((item) => {
          const fresh = activeProductMap.get(String(item.product.id))!;
          if (fresh.price !== item.product.price || fresh.name !== item.product.name) {
            changed = true;
            return { ...item, product: fresh };
          }
          return item;
        });

      return changed ? updated : prev;
    });
  }, [catalogQuery.data?.products]);

  // Cart operations (memoized to keep React.memo effective)
  const cartMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const item of cartItems) {
      map.set(Number(item.product.id), item.quantity);
    }
    return map;
  }, [cartItems]);

  const handleAddToCart = useCallback((product: StorefrontProduct) => {
    setCartItems((prev) => {
      const pNum = Number(product.id);
      const existingIndex = prev.findIndex((i) => Number(i.product.id) === pNum);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + 1,
        };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const handleUpdateQuantity = useCallback((productId: number, qty: number) => {
    setCartItems((prev) => {
      const pNum = Number(productId);
      if (qty <= 0) {
        return prev.filter((i) => Number(i.product.id) !== pNum);
      }
      return prev.map((item) =>
        Number(item.product.id) === pNum ? { ...item, quantity: qty } : item
      );
    });
  }, []);

  const handleClearCart = useCallback(() => {
    setCartItems([]);
  }, []);

  const handleGoHome = useCallback(() => {
    setSearchTerm('');
    setSelectedCategory('all');
    setOnlyDeals(false);
    setInStockOnly(false);
    setSortBy('featured');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleEditOrder = useCallback((order: OnlineOrderRecord) => {
    const rawProds: StorefrontProduct[] = catalogQuery.data?.products || [];
    const newCart: CartItem[] = [];
    for (const item of order.items) {
      const prod = rawProds.find((p) => Number(p.id) === Number(item.productId));
      if (prod) {
        newCart.push({ product: prod, quantity: item.quantity });
      } else {
        newCart.push({
          product: {
            id: item.productId,
            name: item.name,
            price: item.unitPrice,
            costPrice: 0,
            stockQty: 999,
            unitName: 'قطعة',
            inStock: true,
          } as any,
          quantity: item.quantity,
        });
      }
    }
    setCartItems(newCart);
    setEditingOrderNumber(order.orderNumber);
    setIsCartOpen(true);
  }, [catalogQuery.data?.products]);

  // Raw Products
  const rawProducts: StorefrontProduct[] = catalogQuery.data?.products || [];
  const categories: StorefrontCategory[] = catalogQuery.data?.categories || [];

  const dealsProducts = useMemo(() => {
    return rawProducts.filter((p) => p.price > 0 && p.inStock);
  }, [rawProducts]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<number | 'all', number>();
    counts.set('all', rawProducts.length);
    for (const p of rawProducts) {
      if (p.categoryId) {
        counts.set(p.categoryId, (counts.get(p.categoryId) || 0) + 1);
      }
    }
    return counts;
  }, [rawProducts]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...rawProducts];

    // Category filter
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }

    // In-stock only filter
    if (inStockOnly) {
      list = list.filter((p) => p.inStock && p.stockQty > 0);
    }

    // Only deals
    if (onlyDeals) {
      list = list.filter((p) => p.price > 0 && p.inStock);
    }

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.categoryName.toLowerCase().includes(q)
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'featured') {
        const aScore = (a.inStock ? 2 : 0) + (a.price > 0 ? 1 : 0);
        const bScore = (b.inStock ? 2 : 0) + (b.price > 0 ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return arCollator.compare(a.name, b.name);
      }
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return arCollator.compare(a.name, b.name);
      return 0;
    });

    return list;
  }, [rawProducts, selectedCategory, inStockOnly, onlyDeals, searchTerm, sortBy]);

  // Homepage curated top categories (Limit to Top 8 categories by product count)
  const topHomepageSections = useMemo(() => {
    const groups: { categoryId: number; categoryName: string; products: StorefrontProduct[]; totalCount: number }[] = [];

    // Sort categories by product count descending
    const sortedCats = [...categories].sort(
      (a, b) => (categoryCounts.get(b.id) || 0) - (categoryCounts.get(a.id) || 0)
    );

    // Pick top 8 categories that have products
    for (const cat of sortedCats) {
      let prods = rawProducts.filter((p) => p.categoryId === cat.id);
      if (inStockOnly) {
        prods = prods.filter((p) => p.inStock && p.stockQty > 0);
      }
      if (prods.length > 0) {
        prods.sort((a, b) => {
          const aScore = (a.inStock ? 2 : 0) + (a.price > 0 ? 1 : 0);
          const bScore = (b.inStock ? 2 : 0) + (b.price > 0 ? 1 : 0);
          return bScore - aScore;
        });

        groups.push({
          categoryId: cat.id,
          categoryName: cat.name,
          products: prods.slice(0, 10), // Up to 10 for carousel, quad cards take 4
          totalCount: prods.length,
        });

        if (groups.length >= 8) break; // Maximum 8 distinct category rows on home!
      }
    }
    return groups;
  }, [categories, rawProducts, categoryCounts, inStockOnly]);

  // Totals
  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );
  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cartItems]
  );

  const isHomepageMultiRow = selectedCategory === 'all' && !searchTerm.trim() && !onlyDeals;

  if (catalogQuery.isLoading || infoQuery.isLoading) {
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
          fontFamily: 'inherit',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3.5px solid #e2e8f0',
            borderTopColor: '#170e5e',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '14px',
          }}
        />
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600 }}>جاري تجهيز المتجر بسرعة فائقة...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (catalogQuery.isError || !infoQuery.data) {
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
          تأكد من صحة الرابط أو تواصل مع إدارة المتجر لمزيد من التفاصيل.
        </p>
      </div>
    );
  }

  const info: StorefrontInfo = infoQuery.data || {
    tenantId: '',
    slug: cleanSlug,
    businessName: '',
    enabled: true,
    title: '',
    bio: '',
    announcement: '',
    bannerUrl: '',
    deliveryFee: 0,
    minOrder: 0,
    whatsappPhone: '',
    currency: 'EGP',
  };
  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProducts.length;

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
      />

      {/* Top Promotional Billboard Banner Carousel (Multi-image auto-sliding slideshow) */}
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
        }}
        onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
        onlyDeals={onlyDeals}
        onToggleDeals={() => {
          setOnlyDeals(!onlyDeals);
          setSelectedCategory('all');
        }}
        inStockOnly={inStockOnly}
        onToggleInStock={() => setInStockOnly(!inStockOnly)}
        dealsCount={dealsProducts.length}
      />

      {/* Horizontal Circular Category Showcase (Top 10 + More) */}
      {isHomepageMultiRow && (
        <StorefrontCategoryShowcase
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={setSelectedCategory}
          onOpenCategoriesModal={() => setIsCategoriesModalOpen(true)}
          categoryCounts={categoryCounts}
        />
      )}

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '20px 20px 80px',
        }}
      >
        {/* CASE 1: Curated Multi-Row Homepage (Ultra-Fast: 36 Cards Max) */}
        {isHomepageMultiRow ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            {/* Row 1: Deals Spotlight */}
            {dealsProducts.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '16px',
                  border: '1px solid #fee2e2',
                  padding: '20px',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.04)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px',
                    borderBottom: '1px solid #fef2f2',
                    paddingBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        background: '#ef4444',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <IconFlame size={14} color="#ffffff" strokeWidth={2.2} />
                      <span>عروض وتخفيضات حصرية</span>
                    </span>
                    <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                      أقوى الخصومات والأسعار المخفضة
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOnlyDeals(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span>عرض كل العروض ({dealsProducts.length})</span>
                    <IconArrowUpRight size={14} strokeWidth={2.2} />
                  </button>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '18px',
                  }}
                >
                  {dealsProducts.slice(0, 4).map((product) => (
                    <StorefrontProductCard
                      key={product.id}
                      product={product}
                      cartQuantity={cartMap.get(product.id) || 0}
                      whatsappPhone={info.whatsappPhone}
                      onAddToCart={handleAddToCart}
                      onUpdateQuantity={handleUpdateQuantity}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Wide Horizontal Category Cards (Full Width Shelves) */}
            {topHomepageSections.map((section, idx) => (
              <React.Fragment key={section.categoryId}>
                {/* Visual Accent: Section 3 renders as a smooth Horizontal Carousel */}
                {idx === 2 ? (
                  <StorefrontHorizontalCarousel
                    title={`الأكثر طلباً في قسم ${section.categoryName}`}
                    badge="رائج الآن"
                    totalCount={section.totalCount}
                    products={section.products}
                    cartMap={cartMap}
                    whatsappPhone={info.whatsappPhone}
                    onAddToCart={handleAddToCart}
                    onUpdateQuantity={handleUpdateQuantity}
                    onViewAll={() => {
                      setSelectedCategory(section.categoryId);
                      window.scrollTo({ top: 120, behavior: 'smooth' });
                    }}
                  />
                ) : (
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #e2e8f0',
                      padding: '20px',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
                    }}
                  >
                    {/* Wide Shelf Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px',
                        borderBottom: '1px solid #f1f5f9',
                        paddingBottom: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            background: '#170e5e',
                            color: '#ffffff',
                            fontSize: '13px',
                            fontWeight: 800,
                            padding: '4px 12px',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          {section.categoryName}
                        </span>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                          أفضل منتجات {section.categoryName} بأسعار الجملة
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(section.categoryId);
                          window.scrollTo({ top: 120, behavior: 'smooth' });
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#170e5e',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>عرض كل أصناف القسم ({section.totalCount})</span>
                        <IconArrowUpRight size={14} strokeWidth={2.2} />
                      </button>
                    </div>

                    {/* 4 Full Sized Product Cards in Horizontal Row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                        gap: '18px',
                      }}
                    >
                      {section.products.slice(0, 4).map((product) => (
                        <StorefrontProductCard
                          key={product.id}
                          product={product}
                          cartQuantity={cartMap.get(product.id) || 0}
                          whatsappPhone={info.whatsappPhone}
                          onAddToCart={handleAddToCart}
                          onUpdateQuantity={handleUpdateQuantity}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* Bottom Invitation Banner to browse remaining categories */}
            <div
              style={{
                background: '#ffffff',
                border: '1.5px dashed #cbd5e1',
                borderRadius: '16px',
                padding: '28px 20px',
                textAlign: 'center',
              }}
            >
              <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                استكشف باقي أقسام المتجر ({categories.length} قسم متاح)
              </h4>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>
                نوفر تشكيلة واسعة من كافة المواد الغذائية والمنظفات ومستلزمات البيت
              </p>
              <button
                type="button"
                onClick={() => setIsCategoriesModalOpen(true)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  background: '#170e5e',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '13.5px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(23, 14, 94, 0.2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <IconFolder size={16} strokeWidth={2} />
                <span>تصفح جميع الأقسام والمنتجات</span>
              </button>
            </div>
          </div>
        ) : (
          /* CASE 2: Category View / Search View (with Pagination for high performance) */
          <div>
            {/* Filter & Sorting Controls Bar */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '10px 16px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '18px',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setOnlyDeals(false);
                    setSearchTerm('');
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <IconArrowLeft size={13} strokeWidth={2.2} />
                  <span>الرئيسية</span>
                </button>

                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                  {searchTerm
                    ? `نتائج البحث عن "${searchTerm}"`
                    : onlyDeals
                    ? 'العروض والتخفيضات المتاحة'
                    : `قسم: ${categories.find((c) => c.id === selectedCategory)?.name || 'القسم المختار'}`}
                </h2>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    background: '#f0f3ff',
                    color: '#170e5e',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  {filteredProducts.length} صنف
                </span>
              </div>

              {/* Sorting Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>الترتيب:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <option value="featured">المتوفر أولاً (افتراضي)</option>
                  <option value="price-asc">السعر: من الأقل للأعلى</option>
                  <option value="price-desc">السعر: من الأعلى للأقل</option>
                  <option value="name">الاسم: أ - ي</option>
                </select>
              </div>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1px dashed #cbd5e1',
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: '#64748b',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                  <IconSearch size={36} color="#94a3b8" />
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                  لا توجد منتجات مطابقة
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#94a3b8' }}>
                  جرب البحث باسم صنف آخر أو تصفح الأقسام الأخرى.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('all');
                    setOnlyDeals(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: '#170e5e',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  العودة للصفحة الرئيسية
                </button>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '18px',
                  }}
                >
                  {paginatedProducts.map((product) => (
                    <StorefrontProductCard
                      key={product.id}
                      product={product}
                      cartQuantity={cartMap.get(product.id) || 0}
                      whatsappPhone={info.whatsappPhone}
                      onAddToCart={handleAddToCart}
                      onUpdateQuantity={handleUpdateQuantity}
                    />
                  ))}
                </div>

                {/* "Load More" Button for large categories */}
                {hasMore && (
                  <div style={{ textAlign: 'center', marginTop: '28px' }}>
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + ITEMS_PER_PAGE)}
                      style={{
                        padding: '10px 24px',
                        borderRadius: '10px',
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        color: '#0f172a',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                      }}
                    >
                      عرض المزيد من المنتجات ({filteredProducts.length - visibleCount} متبقي) ↓
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </main>

      {/* Categories Mega Modal (Amazon Style) */}
      <StorefrontCategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        categoryCounts={categoryCounts}
        selectedCategoryId={selectedCategory}
        onSelectCategory={(id) => {
          setSelectedCategory(id);
          setOnlyDeals(false);
          window.scrollTo({ top: 300, behavior: 'smooth' });
        }}
      />

      {/* Cart Drawer */}
      <StorefrontCartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        info={info}
        deliveryFee={info.deliveryFee}
        minOrder={info.minOrder}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Live Floating Cart Dock on the Left */}
      <StorefrontLiveCartDock
        cartItems={cartItems}
        info={info}
        deliveryFee={info.deliveryFee}
        minOrder={info.minOrder}
        onUpdateQuantity={handleUpdateQuantity}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal */}
      <StorefrontCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
        }}
        cartItems={cartItems}
        info={info}
        deliveryFee={info.deliveryFee}
        tenantSlug={cleanSlug}
        editingOrderNumber={editingOrderNumber}
        onEditSuccess={() => {
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
          handleClearCart();
          setIsMyOrdersOpen(true);
        }}
        onOrderSuccess={(orderData: CreateOnlineOrderResponse) => {
          setConfirmedOrder(orderData);
          setIsCheckoutOpen(false);
          setEditingOrderNumber(undefined);
          handleClearCart();
        }}
      />

      {/* Success Modal */}
      <StorefrontSuccessModal
        isOpen={Boolean(confirmedOrder)}
        orderData={confirmedOrder}
        whatsappPhone={info.whatsappPhone}
        onClose={() => setConfirmedOrder(null)}
      />

      {/* Customer My Orders Modal */}
      <StorefrontMyOrdersModal
        isOpen={isMyOrdersOpen}
        onClose={() => setIsMyOrdersOpen(false)}
        slug={cleanSlug}
        info={info}
        onEditOrder={handleEditOrder}
      />
    </div>
  );
}
