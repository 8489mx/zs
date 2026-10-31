import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { compressImage } from '@/shared/utils/image-compressor';
import { assertImageInputWithinLimits } from '@/shared/utils/image-input-guards';
import { knockoutWhiteStudioBackground, trimCanvasTransparentBounds } from '@/shared/utils/background-knockout';
import { toast } from '@/shared/components/system-alert';
import { UploadIcon, Trash2Icon, RefreshCwIcon, LayersIcon, SlidersIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';

export interface ProductImageUploadFieldProps {
  value?: string;
  onChange: (imageUrl: string) => void;
  disabled?: boolean;
}

export function ProductImageUploadField({
  value,
  onChange,
  disabled = false,
}: ProductImageUploadFieldProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);
  const [rawOriginalDataUrl, setRawOriginalDataUrl] = useState<string | null>(null);
  const [currentCutMode, setCurrentCutMode] = useState<'none' | 'instant' | 'ai'>('none');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [compressNote, setCompressNote] = useState<string | null>(null);

  // Synchronize initial value from database if present
  useEffect(() => {
    if (value && !rawOriginalDataUrl) {
      setRawOriginalDataUrl(value);
    }
  }, [value, rawOriginalDataUrl]);

  // When a user selects a file: Compress with NO background removal to keep raw original photo intact!
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP)');
      return;
    }

    try {
      await assertImageInputWithinLimits(file);
    } catch (err: any) {
      toast.warning(err?.message || 'تعذر التحقق من قيود الصورة');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    originalFileRef.current = file;

    try {
      setIsProcessing(true);
      setCompressNote('جاري حفظ الصورة الأصلية...');

      const result = await compressImage(file, {
        maxWidth: 1000,
        maxHeight: 1000,
        initialQuality: 0.88,
        maxSizeKb: 100,
        knockoutStudioBackground: false, // Strict: preserve original untouched photo!
      });

      setRawOriginalDataUrl(result.dataUrl);
      setCurrentCutMode('none');
      onChange(result.dataUrl);
      setCompressNote(`تم حفظ الصورة الأصلية (${result.compressedSizeKb} KB) - اختر طريقة التفريغ أدناه`);
      toast.success(`تم حفظ صورة الصنف بنجاح (${result.compressedSizeKb} KB)`);
      setTimeout(() => setCompressNote(null), 6000);
    } catch (err: any) {
      toast.error(`فشل ضغط الصورة: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Action 1: Instant Quick Knockout (0ms Canvas Engine)
  const handleInstantRemove = async () => {
    if (!value || isProcessing || isAiProcessing || disabled) return;

    try {
      setIsProcessing(true);
      setCompressNote('جاري التفريغ السريع...');

      // Always process from pristine raw original image!
      const sourceImage = rawOriginalDataUrl || value;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = () => reject(new Error('تعذر قراءة الصورة للمعالجة'));
        img.src = sourceImage;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('فشل إنشاء محرك المعالجة');

      ctx.drawImage(img, 0, 0);
      const knocked = knockoutWhiteStudioBackground(ctx, canvas.width, canvas.height);

      if (knocked) {
        const trimmed = trimCanvasTransparentBounds(canvas);
        const cutDataUrl = trimmed.toDataURL('image/webp', 0.85);
        onChange(cutDataUrl);
        setCurrentCutMode('instant');
        const sizeKb = Math.round((cutDataUrl.length * 3) / 4 / 1024);
        setCompressNote(`تم التفريغ السريع (${sizeKb} KB)`);
        toast.success('تم التفريغ السريع لخلفية الصورة بنجاح');
      } else {
        toast.info('لم يتم رصد خلفية استوديو واضحة لتفريغها، الصورة محتفظة ببياناتها');
      }
    } catch (err: any) {
      toast.error(`تعذر التفريغ السريع: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Action 2: Professional AI Studio Cutout (100% Neural Matting)
  const handleAiRemove = async () => {
    if (!value || isProcessing || isAiProcessing || disabled) return;

    try {
      setIsAiProcessing(true);
      setAiProgress(0);
      setCompressNote('جاري تجهيز استوديو الذكاء الاصطناعي...');

      const { removeBackgroundWithAi } = await import('@/shared/utils/ai-background-removal');

      // Always process from the untouched RAW original source!
      const sourceToProcess = originalFileRef.current || rawOriginalDataUrl || value;
      const resultBlob = await removeBackgroundWithAi(
        sourceToProcess,
        (prog) => {
          setAiProgress(prog.percent);
          setCompressNote(`جاري المعالجة بالذكاء الاصطناعي... ${prog.percent}%`);
        },
        {
          onSubjectWarning: () => {
            toast.warning('لم يتم العثور على منتج واضح في الصورة. يرجى مراجعة النتيجة قبل الحفظ.');
          },
        }
      );

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          onChange(dataUrl);
          setCurrentCutMode('ai');
          const sizeKb = Math.round((dataUrl.length * 3) / 4 / 1024);
          setCompressNote(`تم التفريغ بالذكاء الاصطناعي (${sizeKb} KB)`);
          toast.success('تم التفريغ الاحترافي بنجاح بواسطة الذكاء الاصطناعي');
          setTimeout(() => setCompressNote(null), 6000);
        }
      };
      reader.readAsDataURL(resultBlob);
    } catch (err: any) {
      console.error('AI Cutout error:', err);
      toast.error(`تعذر إكمال التفريغ بالذكاء الاصطناعي: ${err?.message || 'خطأ غير متوقع'}`);
      setCompressNote(null);
    } finally {
      setIsAiProcessing(false);
      setAiProgress(0);
    }
  };

  // Action 3: Restore Original Untouched Photo
  const handleRestoreOriginal = () => {
    if (!rawOriginalDataUrl) return;
    onChange(rawOriginalDataUrl);
    setCurrentCutMode('none');
    setCompressNote('تم استعادة الصورة الأصلية');
    toast.info('تم استعادة الصورة الأصلية بدون أي تفريغ');
  };

  // Action 4: Remove Product Photo
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    originalFileRef.current = null;
    setRawOriginalDataUrl(null);
    setCurrentCutMode('none');
    onChange('');
    setCompressNote(null);
  };

  return (
    <div style={{ direction: 'rtl', textAlign: 'right' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
          {t('products.image_upload.title', 'صورة الصنف (الكاشير والمتجر)')}
        </span>
        <span style={{ fontSize: '0.72rem', color: isAiProcessing ? '#6d28d9' : '#64748b', fontWeight: isAiProcessing ? 700 : 500 }}>
          {compressNote || t('products.image_upload.hint', 'تظهر مباشرة في الكاشير والمتجر')}
        </span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || isProcessing || isAiProcessing}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#ffffff',
          border: value ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
          borderRadius: '10px',
          padding: '8px 12px',
          minHeight: '64px',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Thumbnail Preview or Placeholder */}
        <div
          onClick={() => !disabled && !isProcessing && !isAiProcessing && fileInputRef.current?.click()}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: value ? 'repeating-conic-gradient(#f1f5f9 0% 25%, #ffffff 0% 50%) 50% / 10px 10px' : '#f8fafc',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
            flexShrink: 0,
            position: 'relative',
          }}
          title={value ? 'انقر لتغيير الصورة' : 'انقر لرفع صورة'}
        >
          {value ? (
            <img
              src={value}
              alt="صورة الصنف"
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <UploadIcon size={18} color="#94a3b8" />
          )}
          {(isProcessing || isAiProcessing) && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,255,255,0.85)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCwIcon size={16} color={isAiProcessing ? '#6d28d9' : '#170e5e'} className="spin" />
            </div>
          )}
        </div>

        {/* Text and Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                {/* Mode 1: Untouched original photo */}
                {currentCutMode === 'none' && (
                  <>
                    <button
                      type="button"
                      onClick={handleInstantRemove}
                      disabled={disabled || isProcessing || isAiProcessing}
                      title="تفريغ سريع وفوري لأرضية وخلفية الاستوديو في 0 ثانية"
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 9px',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: '#1e293b',
                        cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <SlidersIcon size={12} color="#475569" />
                      <span>تفريغ سريع (0ms)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAiRemove}
                      disabled={disabled || isProcessing || isAiProcessing}
                      title="تفريغ خلفية الصورة بدقة استوديو كاملة بواسطة الذكاء الاصطناعي"
                      style={{
                        background: isAiProcessing ? '#eef2ff' : '#f5f3ff',
                        border: '1px solid #ddd6fe',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#6d28d9',
                        cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      {isAiProcessing ? (
                        <RefreshCwIcon size={12} color="#6d28d9" className="spin" />
                      ) : (
                        <LayersIcon size={13} color="#6d28d9" />
                      )}
                      <span>{isAiProcessing ? `جاري القص (${aiProgress}%)` : 'قص احترافي بالذكاء الاصطناعي'}</span>
                    </button>
                  </>
                )}

                {/* Mode 2: Instant Engine Cut */}
                {currentCutMode === 'instant' && (
                  <>
                    <span
                      style={{
                        background: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        color: '#166534',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircleIcon size={11} color="#166534" />
                      <span>مفرغة بالمحرك السريع</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleAiRemove}
                      disabled={disabled || isProcessing || isAiProcessing}
                      title="ترقية القص إلى استوديو الذكاء الاصطناعي باستخدام الصورة الأصلية"
                      style={{
                        background: isAiProcessing ? '#eef2ff' : '#f5f3ff',
                        border: '1px solid #ddd6fe',
                        borderRadius: '6px',
                        padding: '4px 9px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#6d28d9',
                        cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isAiProcessing ? (
                        <RefreshCwIcon size={12} color="#6d28d9" className="spin" />
                      ) : (
                        <LayersIcon size={12} color="#6d28d9" />
                      )}
                      <span>{isAiProcessing ? `جاري القص (${aiProgress}%)` : 'ترقية لقص الذكاء الاصطناعي'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestoreOriginal}
                      disabled={disabled || isProcessing || isAiProcessing}
                      title="استعادة الصورة الأصلية بدون تفريغ"
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RefreshCwIcon size={11} color="#64748b" />
                      <span>استعادة الأصل</span>
                    </button>
                  </>
                )}

                {/* Mode 3: AI Studio Cut */}
                {currentCutMode === 'ai' && (
                  <>
                    <span
                      style={{
                        background: '#f5f3ff',
                        border: '1px solid #ddd6fe',
                        color: '#6d28d9',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <CheckCircleIcon size={11} color="#6d28d9" />
                      <span>مفرغة بالذكاء الاصطناعي</span>
                    </span>

                    <button
                      type="button"
                      onClick={handleRestoreOriginal}
                      disabled={disabled || isProcessing || isAiProcessing}
                      title="استعادة الصورة الأصلية بدون تفريغ"
                      style={{
                        background: '#f1f5f9',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        color: '#475569',
                        cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <RefreshCwIcon size={11} color="#64748b" />
                      <span>استعادة الأصل</span>
                    </button>
                  </>
                )}

                {/* Standard Utilities: Change & Remove */}
                <button
                  type="button"
                  onClick={() => !disabled && !isProcessing && !isAiProcessing && fileInputRef.current?.click()}
                  disabled={disabled || isProcessing || isAiProcessing}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 9px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                  }}
                >
                  {t('products.image_upload.change', 'تغيير')}
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  disabled={disabled || isProcessing || isAiProcessing}
                  style={{
                    background: 'transparent',
                    border: '1px solid #fee2e2',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    color: '#dc2626',
                    cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Trash2Icon size={12} color="#dc2626" />
                  <span>{t('products.image_upload.remove', 'حذف')}</span>
                </button>
              </div>

              {/* Progress bar during AI processing */}
              {isAiProcessing && (
                <div style={{ width: '100%', height: '4px', background: '#ede9fe', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(5, aiProgress)}%`,
                      height: '100%',
                      background: '#7c3aed',
                      borderRadius: '2px',
                      transition: 'width 0.25s ease',
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => !disabled && !isProcessing && !isAiProcessing && fileInputRef.current?.click()}
                disabled={disabled || isProcessing || isAiProcessing}
                style={{
                  background: '#170e5e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: disabled || isProcessing || isAiProcessing ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UploadIcon size={14} color="#ffffff" />
                <span>{isProcessing ? t('products.image_upload.processing', 'جاري الضغط...') : t('products.image_upload.btn', 'رفع صورة فوتوغرافية')}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
