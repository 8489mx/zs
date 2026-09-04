import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { compressImage, CompressionResult } from '@/shared/utils/image-compressor';
import { getAutoProductPhoto, generatePremiumProductSvg } from '../lib/storefront-photo-matcher';

interface StorefrontProductStudioProps {
  slug: string;
}

export function StorefrontProductStudio({ slug }: StorefrontProductStudioProps) {
  const queryClient = useQueryClient();
  const [studioMode, setStudioMode] = useState<'products' | 'categories'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [activeUploadingId, setActiveUploadingId] = useState<number | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<Record<number, string>>({});
  const [activeUploadingCatId, setActiveUploadingCatId] = useState<number | null>(null);
  const [catUploadFeedback, setCatUploadFeedback] = useState<Record<number, string>>({});

  const catalogQuery = useQuery({
    queryKey: ['storefront-catalog', slug],
    queryFn: () => storefrontApi.getCatalog(slug),
    enabled: Boolean(slug),
  });

  const updateImageMutation = useMutation({
    mutationFn: ({ id, imageUrl }: { id: number; imageUrl: string }) =>
      storefrontApi.updateProductImage(id, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-catalog'] });
      setActiveUploadingId(null);
    },
    onError: (err: any) => {
      alert(`حدث خطأ أثناء حفظ الصورة: ${err.message || 'خطأ غير متوقع'}`);
      setActiveUploadingId(null);
    },
  });

  const updateCatImageMutation = useMutation({
    mutationFn: ({ id, imageUrl }: { id: number; imageUrl: string }) =>
      storefrontApi.updateCategoryImage(id, imageUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storefront-catalog'] });
      setActiveUploadingCatId(null);
    },
    onError: (err: any) => {
      alert(`حدث خطأ أثناء حفظ صورة القسم: ${err.message || 'خطأ غير متوقع'}`);
      setActiveUploadingCatId(null);
    },
  });

  const handleFileChange = async (productId: number, file: File) => {
    try {
      setActiveUploadingId(productId);
      setUploadFeedback((prev) => ({ ...prev, [productId]: 'جاري ضغط ومعالجة الصورة...' }));

      const result: CompressionResult = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        initialQuality: 0.75,
        maxSizeKb: 35,
      });

      setUploadFeedback((prev) => ({
        ...prev,
        [productId]: `✓ تم ضغط الصورة (${result.originalSizeKb}KB → ${result.compressedSizeKb}KB)`,
      }));

      await updateImageMutation.mutateAsync({ id: productId, imageUrl: result.dataUrl });

      setTimeout(() => {
        setUploadFeedback((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      alert(`فشل ضغط الصورة: ${err.message || 'خطأ غير معروف'}`);
      setActiveUploadingId(null);
    }
  };

  const handleRemoveImage = async (productId: number) => {
    if (!window.confirm('هل تريد حذف صورة هذا الصنف؟')) return;
    setActiveUploadingId(productId);
    await updateImageMutation.mutateAsync({ id: productId, imageUrl: '' });
  };

  const handleCategoryFileChange = async (categoryId: number, file: File) => {
    try {
      setActiveUploadingCatId(categoryId);
      setCatUploadFeedback((prev) => ({ ...prev, [categoryId]: 'جاري ضغط ومعالجة صورة القسم...' }));

      const result: CompressionResult = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        initialQuality: 0.75,
        maxSizeKb: 35,
      });

      setCatUploadFeedback((prev) => ({
        ...prev,
        [categoryId]: `✓ تم الضغط (${result.originalSizeKb}KB → ${result.compressedSizeKb}KB)`,
      }));

      await updateCatImageMutation.mutateAsync({ id: categoryId, imageUrl: result.dataUrl });

      setTimeout(() => {
        setCatUploadFeedback((prev) => {
          const next = { ...prev };
          delete next[categoryId];
          return next;
        });
      }, 3000);
    } catch (err: any) {
      alert(`فشل ضغط صورة القسم: ${err.message || 'خطأ غير معروف'}`);
      setActiveUploadingCatId(null);
    }
  };

  const handleRemoveCatImage = async (categoryId: number) => {
    if (!window.confirm('هل تريد حذف صورة هذا القسم والعودة للصورة التلقائية؟')) return;
    setActiveUploadingCatId(categoryId);
    await updateCatImageMutation.mutateAsync({ id: categoryId, imageUrl: '' });
  };

  const products = catalogQuery.data?.products || [];
  const categories = catalogQuery.data?.categories || [];

  const filtered = useMemo(() => {
    let list = [...products];
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.barcode.includes(q));
    }
    return list;
  }, [products, selectedCategory, searchTerm]);

  return (
    <div style={{ direction: 'rtl', marginTop: '12px', width: '100%' }}>
      {/* Studio Header Card - Institutional ERP SaaS (No Dark Obsidian Banners) */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#170e5e' }}>
              استوديو وسائط المتجر الإلكتروني (Media Studio)
            </h2>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                background: '#f0fdf4',
                color: '#166534',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid #bbf7d0',
              }}
            >
              WebP فائق السرعة
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
            ارفع صور حقيقية للأصناف والأقسام. يقوم المحرك بضغط الصور تلقائياً لأقل من 35KB للحفاظ على سرعة المتجر.
          </p>
        </div>

        {/* View Toggle: Products vs Categories */}
        <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '8px' }}>
          <button
            type="button"
            onClick={() => setStudioMode('products')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: studioMode === 'products' ? '1px solid #170e5e' : 'none',
              background: studioMode === 'products' ? '#170e5e' : 'transparent',
              color: studioMode === 'products' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            صور الأصناف ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStudioMode('categories')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: studioMode === 'categories' ? '1px solid #170e5e' : 'none',
              background: studioMode === 'categories' ? '#170e5e' : 'transparent',
              color: studioMode === 'categories' ? '#ffffff' : '#475569',
              transition: 'all 0.15s ease',
            }}
          >
            صور الأقسام ({categories.length})
          </button>
        </div>
      </div>

      {/* Mode 1: Products Studio */}
      {studioMode === 'products' && (
        <>
          {/* Controls Bar */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '12px 16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث باسم الصنف أو الباركود لرفع صورته..."
                style={{
                  width: '100%',
                  maxWidth: '340px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
              <span style={{ fontSize: '12.5px', color: '#64748b', whiteSpace: 'nowrap', fontWeight: 700 }}>
                ({filtered.length} صنف)
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '100%' }}>
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedCategory === 'all' ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                  background: selectedCategory === 'all' ? '#170e5e' : '#f8fafc',
                  color: selectedCategory === 'all' ? '#ffffff' : '#475569',
                  whiteSpace: 'nowrap',
                }}
              >
                الكل
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: selectedCategory === c.id ? '1.5px solid #170e5e' : '1px solid #e2e8f0',
                    background: selectedCategory === c.id ? '#170e5e' : '#f8fafc',
                    color: selectedCategory === c.id ? '#ffffff' : '#475569',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid for Fast Bulk Image Upload */}
          {catalogQuery.isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>جاري تحميل الأصناف...</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              لا توجد أصناف مطابقة للبحث
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                gap: '14px',
              }}
            >
              {filtered.map((product) => {
                const displayPhoto = product.imageUrl || getAutoProductPhoto(product.name, product.categoryName);
                const feedback = uploadFeedback[product.id];
                const isUploading = activeUploadingId === product.id;

                return (
                  <div
                    key={product.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div>
                      {/* Image View Box */}
                      <div
                        style={{
                          width: '100%',
                          height: '130px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f8fafc',
                          marginBottom: '10px',
                          border: '1px solid #f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                        }}
                      >
                        <img
                          src={displayPhoto}
                          alt={product.name}
                          onError={(e) => {
                            e.currentTarget.src = generatePremiumProductSvg(product.name, product.categoryName);
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />

                        {product.imageUrl ? (
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(4, 120, 87, 0.9)',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            صورة مخصصة ✓
                          </div>
                        ) : (
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: 'rgba(23, 14, 94, 0.85)',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            صورة ذكية
                          </div>
                        )}

                        {product.imageUrl && (
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(product.id)}
                            disabled={isUploading}
                            title="حذف الصورة والعودة للصورة التلقائية"
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              background: 'rgba(239, 68, 68, 0.9)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              width: '22px',
                              height: '22px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Category & Title */}
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: '#64748b',
                          background: '#f1f5f9',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 700,
                        }}
                      >
                        {product.categoryName || 'عام'}
                      </span>
                      <h4
                        style={{
                          margin: '5px 0 3px',
                          fontSize: '13px',
                          fontWeight: 800,
                          color: '#0f172a',
                          lineHeight: '1.3',
                          minHeight: '34px',
                        }}
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#170e5e' }}>
                        {product.price > 0 ? `${product.price} ج.م` : 'غير مسعر'}
                      </div>
                    </div>

                    {/* Upload Action */}
                    <div style={{ marginTop: '10px' }}>
                      {feedback && (
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#047857',
                            background: '#ecfdf5',
                            padding: '4px 6px',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            textAlign: 'center',
                          }}
                        >
                          {feedback}
                        </div>
                      )}

                      <label
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: product.imageUrl ? '#f8fafc' : '#170e5e',
                          color: product.imageUrl ? '#0f172a' : '#ffffff',
                          border: product.imageUrl ? '1px solid #cbd5e1' : 'none',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: isUploading ? 'wait' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          disabled={isUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileChange(product.id, file);
                            e.target.value = '';
                          }}
                        />
                        <span>{isUploading ? 'جاري الحفظ...' : product.imageUrl ? 'تغيير صورة الصنف' : 'رفع صورة الصنف'}</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Mode 2: Categories Studio */}
      {studioMode === 'categories' && (
        <div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
              gap: '16px',
            }}
          >
            {categories.map((cat) => {
              const photoUrl = cat.imageUrl || getAutoProductPhoto(cat.name, cat.name);
              const isUploading = activeUploadingCatId === cat.id;
              const feedback = catUploadFeedback[cat.id];
              const count = products.filter((p) => p.categoryId === cat.id).length;

              return (
                <div
                  key={cat.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '10px',
                    }}
                  >
                    <div>
                      <h3 style={{ margin: '0 0 2px', fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                        {cat.name}
                      </h3>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>{count} صنف</span>
                    </div>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: cat.imageUrl ? '#ecfdf5' : '#f1f5f9',
                        color: cat.imageUrl ? '#047857' : '#64748b',
                        border: cat.imageUrl ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                      }}
                    >
                      {cat.imageUrl ? 'صورة مخصصة ✓' : 'صورة تلقائية'}
                    </span>
                  </div>

                  <div
                    style={{
                      width: '100%',
                      height: '140px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#f8fafc',
                      marginBottom: '12px',
                      border: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={photoUrl}
                      alt={cat.name}
                      onError={(e) => {
                        e.currentTarget.src = generatePremiumProductSvg(cat.name, cat.name);
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </div>

                  {feedback && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#047857',
                        background: '#ecfdf5',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        marginBottom: '8px',
                        textAlign: 'center',
                      }}
                    >
                      {feedback}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto' }}>
                    <label
                      style={{
                        flex: 1,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '7px 12px',
                        borderRadius: '6px',
                        background: '#170e5e',
                        color: '#ffffff',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: isUploading ? 'wait' : 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={isUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleCategoryFileChange(cat.id, file);
                          e.target.value = '';
                        }}
                      />
                      <span>{isUploading ? 'جاري الرفع...' : cat.imageUrl ? 'تغيير صورة القسم' : 'رفع صورة للقسم'}</span>
                    </label>

                    {cat.imageUrl && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCatImage(cat.id)}
                        disabled={isUploading}
                        title="حذف الصورة والعودة للصورة التلقائية"
                        style={{
                          padding: '7px 10px',
                          borderRadius: '6px',
                          background: '#fff1f2',
                          border: '1px solid #fecdd3',
                          color: '#e11d48',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
