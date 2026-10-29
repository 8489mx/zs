import React from 'react';
import { IconShoppingCart } from './StorefrontIcons';

interface StorefrontMobileBottomNavProps {
  activeTab: 'home' | 'categories' | 'deals' | 'favorites' | 'cart';
  cartCount: number;
  favoritesCount: number;
  dealsCount: number;
  onGoHome: () => void;
  onOpenCategories: () => void;
  onToggleDeals: () => void;
  onToggleFavorites: () => void;
  onOpenCart: () => void;
}

export const StorefrontMobileBottomNav = React.memo(function StorefrontMobileBottomNav({
  activeTab,
  cartCount,
  favoritesCount,
  dealsCount,
  onGoHome,
  onOpenCategories,
  onToggleDeals,
  onToggleFavorites,
  onOpenCart,
}: StorefrontMobileBottomNavProps) {
  return (
    <nav
      className="storefront-mobile-bottom-nav"
      aria-label="التنقل السريع للموبايل"
      dir="rtl"
    >
      {/* 1. Home */}
      <button
        type="button"
        onClick={onGoHome}
        className={`storefront-mobile-nav-item ${activeTab === 'home' ? 'active' : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <span>الرئيسية</span>
      </button>

      {/* 2. Categories */}
      <button
        type="button"
        onClick={onOpenCategories}
        className={`storefront-mobile-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
        </svg>
        <span>الأقسام</span>
      </button>

      {/* 3. Deals */}
      <button
        type="button"
        onClick={onToggleDeals}
        className={`storefront-mobile-nav-item ${activeTab === 'deals' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
          </svg>
          {dealsCount > 0 && (
            <span className="storefront-mobile-nav-badge deals">
              {dealsCount}
            </span>
          )}
        </div>
        <span>العروض</span>
      </button>

      {/* 4. Favorites */}
      <button
        type="button"
        onClick={onToggleFavorites}
        className={`storefront-mobile-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill={activeTab === 'favorites' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          {favoritesCount > 0 && (
            <span className="storefront-mobile-nav-badge fav">
              {favoritesCount}
            </span>
          )}
        </div>
        <span>المفضلة</span>
      </button>

      {/* 5. Cart */}
      <button
        type="button"
        onClick={onOpenCart}
        className={`storefront-mobile-nav-item ${activeTab === 'cart' ? 'active' : ''}`}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <IconShoppingCart size={20} strokeWidth={2.2} />
          {cartCount > 0 && (
            <span className="storefront-mobile-nav-badge cart">
              {cartCount}
            </span>
          )}
        </div>
        <span>السلة</span>
      </button>
    </nav>
  );
});
