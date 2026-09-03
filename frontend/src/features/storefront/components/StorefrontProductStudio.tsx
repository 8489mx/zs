import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storefrontApi } from '../api/storefront.api';
import { compressImage, CompressionResult } from '@/shared/utils/image-compressor';
import { getAutoProductPhoto } from '../lib/storefront-photo-matcher';

interface StorefrontProductStudioProps {
  slug: string;
}

export function StorefrontProductStudio({ slug }: StorefrontProductStudioProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [activeUploadingId, setActiveUploadingId] = useState<number | null>(null);
  const [uploadFeedback, setUploadFeedback] = useState<Record<number, string>>({});

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

  const handleFileChange = async (productId: number, file: File) => {
    try {
      setActiveUploadingId(productId);
      setUploadFeedback((prev) => ({ ...prev, [productId]: 'جاري ضغط الصورة ومعالجتها...' }));

      // Compress aggressively to ~20KB-35KB WebP
      const result: CompressionResult = await compressImage(file, {
        maxWidth: 500,
        maxHeight: 500,
        initialQuality: 0.75,
        maxSizeKb: 35,
      });

      setUploadFeedback((prev) => ({
        ...prev,
        [productId]: `تم ضغط الصورة بنجاح من ${result.originalSizeKb}KB إلى ${result.compressedSizeKb}KB (${result.compressionRatio}% وفر)`,
      }));

      // Upload Base64 compressed image to product metadata
      await updateImageMutation.mutateAsync({ id: productId, imageUrl: result.dataUrl });

      setTimeout(() => {
        setUploadFeedback((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }, 4000);
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
    <div style={{ direction: 'rtl', marginTop: '20px' }}>
      {/* Studio Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: '#ffffff',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
            استوديو صور المنتجات (Smart Image Studio) 📸
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
            ارفع صور حقيقية لمنتجاتك بضغطة زر واحدة. المحرك يقوم بضغط الصور تلقائياً بنسبة تصل إلى 99% (أقل من 30KB) للحفاظ التام على سرعة المتجر وحجم قاعدة البيانات!
          </p>
        </div>
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12.5px',
            color: '#34d399',
            fontWeight: 700,
          }}
        >
          ⚡ محرك ضغط WebP فائق القوة مفعل
        </div>
      </div>

      {/* Controls Bar */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الصنف لرفع صورته..."
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13.5px',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
          <span style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
            ({filtered.length} صنف)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', maxWidth: '100%' }}>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '12.5px',
              fontWeight: 700,
              cursor: 'pointer',
              border: selectedCategory === 'all' ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
              background: selectedCategory === 'all' ? '#0f172a' : '#f8fafc',
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
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedCategory === c.id ? '1.5px solid #0f172a' : '1px solid #e2e8f0',
                background: selectedCategory === c.id ? '#0f172a' : '#f8fafc',
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
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px' }}>
          لا توجد أصناف مطابقة للبحث
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '18px',
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
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div>
                  {/* Image View Box */}
                  <div
                    style={{
                      width: '100%',
                      height: '140px',
                      borderRadius: '12px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                      marginBottom: '10px',
                    }}
                  >
                    <img
                      src={displayPhoto}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />

                    {product.imageUrl ? (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: '#16a34a',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        صورتك الخاصة ✓
                      </div>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: '#ffffff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px',
                        }}
                      >
                        صورة ذكية تلقائية ✨
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
                          borderRadius: '6px',
                          width: '24px',
                          height: '24px',
                          fontSize: '12px',
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
                      fontSize: '11px',
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
                      margin: '6px 0 4px',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#0f172a',
                      lineHeight: '1.35',
                      minHeight: '36px',
                    }}
                    title={product.name}
                  >
                    {product.name}
                  </h4>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                    {product.price > 0 ? `${product.price} ج.م` : 'غير مسعر'}
                  </div>
                </div>

                {/* Upload Action */}
                <div style={{ marginTop: '12px' }}>
                  {feedback && (
                    <div
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#047857',
                        background: '#ecfdf5',
                        padding: '4px 6px',
                        borderRadius: '6px',
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
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: product.imageUrl ? '#f8fafc' : '#0f172a',
                      color: product.imageUrl ? '#0f172a' : '#ffffff',
                      border: product.imageUrl ? '1.5px solid #cbd5e1' : 'none',
                      fontSize: '12px',
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
                    <span>{isUploading ? 'جاري الحفظ...' : product.imageUrl ? '📷 تغيير الصورة' : '📷 رفع صورة الصنف'}</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
