import React, { useState, useEffect, useRef } from 'react';
import { IconSearch } from './StorefrontIcons';
import { XIcon, TagIcon, PlusIcon, ArrowRightIcon } from '@/shared/components/icons/AppIcons';
import { CurrencySymbol } from '@/shared/ui/currency-symbol';
import { storefrontApi } from '../api/storefront.api';
import type { StorefrontProduct } from '../types/storefront.types';

interface StorefrontPredictiveSearchProps {
  slug: string;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onSelectCategory?: (categoryId: number) => void;
  onSelectProduct?: (product: StorefrontProduct) => void;
  onAddToCart?: (product: StorefrontProduct) => void;
}

export function StorefrontPredictiveSearch({
  slug,
  searchTerm,
  onSearchChange,
  onSelectCategory,
  onSelectProduct,
  onAddToCart,
}: StorefrontPredictiveSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    categories: Array<{ id: number; name: string }>;
    products: Array<any>;
  }>({ categories: [], products: [] });

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<any>(null);

  useEffect(() => {
    const q = searchTerm.trim();
    if (q.length < 2) {
      setSuggestions({ categories: [], products: [] });
      setIsOpen(false);
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await storefrontApi.getSearchSuggestions(slug, q);
        setSuggestions({
          categories: res?.categories || [],
          products: res?.products || [],
        });
        setIsOpen(Boolean((res?.categories && res.categories.length > 0) || (res?.products && res.products.length > 0)));
      } catch {
        setSuggestions({ categories: [], products: [] });
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, slug]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      ref={containerRef}
      className="storefront-search-wrapper"
      style={{
        flex: 1,
        maxWidth: '640px',
        margin: '0 16px',
        position: 'relative',
      }}
    >
      <div
        className="storefront-search-box"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#f8fafc',
          borderRadius: '10px',
          padding: '4px 6px 4px 14px',
          border: isOpen ? '1.5px solid #170e5e' : '1.5px solid #cbd5e1',
          transition: 'all 0.2s ease',
          boxShadow: isOpen ? '0 4px 16px rgba(23, 14, 94, 0.1)' : '0 1px 4px rgba(15, 23, 42, 0.04)',
        }}
      >
        <input
          className="storefront-search-input"
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => {
            if (suggestions.categories.length > 0 || suggestions.products.length > 0) {
              setIsOpen(true);
            }
          }}
          placeholder="ابحث عن أي منتج، كود، أو تصنيف..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: '13.5px',
            fontWeight: 600,
            color: '#0f172a',
            background: 'transparent',
            padding: '7px 6px',
            fontFamily: 'inherit',
            minWidth: 0,
          }}
        />

        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              onSearchChange('');
              setIsOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 6px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
            }}
            title="مسح البحث"
          >
            <XIcon size={15} />
          </button>
        )}

        <button
          className="storefront-search-btn"
          type="button"
          onClick={() => setIsOpen(false)}
          style={{
            background: '#170e5e',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <IconSearch size={15} strokeWidth={2.2} />
          <span className="storefront-search-btn-text">بحث</span>
        </button>
      </div>

      {/* Instant Dropdown Results */}
      {isOpen && (
        <div
          className="storefront-predictive-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.12)',
            zIndex: 200,
            maxHeight: '440px',
            overflowY: 'auto',
            padding: '8px',
          }}
        >
          {/* Matched Categories */}
          {suggestions.categories.length > 0 && (
            <div style={{ marginBottom: '10px', padding: '4px 6px' }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <TagIcon size={12} />
                <span>أقسام مطابقة:</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {suggestions.categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      onSelectCategory?.(cat.id);
                      setIsOpen(false);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#1e293b',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#e2e8f0';
                      e.currentTarget.style.color = '#170e5e';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#f1f5f9';
                      e.currentTarget.style.color = '#1e293b';
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Matched Products */}
          {suggestions.products.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64748b',
                  padding: '4px 6px',
                  marginBottom: '4px',
                }}
              >
                المنتجات المقترحة:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {suggestions.products.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      onSelectProduct?.(prod);
                      setIsOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 8px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.name}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            background: '#f1f5f9',
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#94a3b8',
                            flexShrink: 0,
                          }}
                        >
                          صورة
                        </div>
                      )}

                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 800,
                            color: '#0f172a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {prod.name}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                          {prod.categoryName || 'عام'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'left' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#170e5e' }}>
                          {Number(prod.price || 0).toLocaleString()}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b', marginRight: '2px' }}>
                          <CurrencySymbol />
                        </span>
                      </div>

                      {prod.inStock && onAddToCart && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(prod);
                          }}
                          style={{
                            background: '#170e5e',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            width: '28px',
                            height: '28px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          title="إضافة للسلة"
                        >
                          <PlusIcon size={14} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* View All Matches Footer */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              marginTop: '6px',
              padding: '8px 10px',
              borderTop: '1px solid #f1f5f9',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 800,
              color: '#170e5e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            <span>عرض نتائج البحث عن "{searchTerm}"</span>
            <ArrowRightIcon size={13} style={{ transform: 'rotate(180deg)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
