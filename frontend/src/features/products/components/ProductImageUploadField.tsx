import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { compressImage } from '@/shared/utils/image-compressor';
import { toast } from '@/shared/components/system-alert';
import { UploadIcon, Trash2Icon, RefreshCwIcon } from '@/shared/components/icons/AppIcons';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [compressNote, setCompressNote] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.warning('يرجى اختيار ملف صورة صالح (JPEG, PNG, WebP)');
      return;
    }

    try {
      setIsProcessing(true);
      setCompressNote('جاري ضغط ومعالجة الصورة...');

      const result = await compressImage(file, {
        maxWidth: 600,
        maxHeight: 600,
        initialQuality: 0.8,
        maxSizeKb: 45,
      });

      onChange(result.dataUrl);
      setCompressNote(`تم الضغط: ${result.originalSizeKb}KB ← ${result.compressedSizeKb}KB`);
      toast.success(`تم ضغط وحفظ صورة الصنف بنجاح (${result.compressedSizeKb} KB)`);
      setTimeout(() => setCompressNote(null), 4000);
    } catch (err: any) {
      toast.error(`فشل ضغط الصورة: ${err?.message || 'خطأ غير متوقع'}`);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setCompressNote(null);
  };

  return (
    <div style={{ direction: 'rtl', textAlign: 'right' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#1e293b' }}>
          {t('products.image_upload.title', 'صورة الصنف (الكاشير والمتجر)')}
        </span>
        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
          {compressNote || t('products.image_upload.hint', 'تظهر مباشرة في الكاشير والمتجر')}
        </span>
      </label>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
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
          minHeight: '62px',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s ease',
        }}
      >
        {/* Thumbnail Preview or Placeholder */}
        <div
          onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '8px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled || isProcessing ? 'default' : 'pointer',
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
          {isProcessing && (
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
              <RefreshCwIcon size={16} color="#170e5e" className="spin" />
            </div>
          )}
        </div>

        {/* Text and Actions */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {value ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#1e293b',
                  cursor: disabled || isProcessing ? 'default' : 'pointer',
                }}
              >
                {t('products.image_upload.change', 'تغيير الصورة')}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled || isProcessing}
                style={{
                  background: 'transparent',
                  border: '1px solid #fee2e2',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#dc2626',
                  cursor: disabled || isProcessing ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Trash2Icon size={13} color="#dc2626" />
                <span>{t('products.image_upload.remove', 'حذف')}</span>
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
                disabled={disabled || isProcessing}
                style={{
                  background: '#170e5e',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#ffffff',
                  cursor: disabled || isProcessing ? 'default' : 'pointer',
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
