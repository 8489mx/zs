import { useRef, useState, ChangeEvent } from 'react';
import { triggerHaptic } from '@/shared/utils/haptics';

interface CameraCaptureUploadProps {
  label?: string;
  onFileSelect?: (file: File, base64Preview?: string) => void;
  onRemove?: () => void;
  previewUrl?: string | null;
  className?: string;
}

export function CameraCaptureUpload({
  label = 'صورة الفاتورة / الإيصال الورقي',
  onFileSelect,
  onRemove,
  previewUrl = null,
  className = '',
}: CameraCaptureUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(previewUrl);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    triggerHaptic('success');

    // Generate local preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (loadEvt) => {
        const base64 = loadEvt.target?.result as string;
        setLocalPreview(base64);
        onFileSelect?.(file, base64);
      };
      reader.readAsDataURL(file);
    } else {
      setLocalPreview(null);
      onFileSelect?.(file);
    }
  };

  const handleClear = () => {
    setLocalPreview(null);
    setFileName(null);
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (fileInputRef.current) fileInputRef.current.value = '';
    triggerHaptic('light');
    onRemove?.();
  };

  const displayPreview = previewUrl || localPreview;

  return (
    <div className={`camera-capture-upload-root ${className}`} dir="rtl">
      {label && <label className="camera-capture-label">{label}</label>}

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFile}
        style={{ display: 'none' }}
      />

      {/* When Image is Selected -> Show Card Preview */}
      {displayPreview ? (
        <div className="camera-capture-preview-card">
          <div className="camera-capture-preview-img-wrap">
            <img src={displayPreview} alt="معاينة المرفق" className="camera-capture-preview-img" />
          </div>
          <div className="camera-capture-preview-info">
            <span className="camera-capture-file-name">{fileName || 'صورة الإيصال المرفقة'}</span>
            <div className="camera-capture-preview-actions">
              <button
                type="button"
                className="camera-capture-btn-change"
                onClick={() => cameraInputRef.current?.click()}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                  <span>إعادة التصوير</span>
                </span>
              </button>
              <button
                type="button"
                className="camera-capture-btn-remove"
                onClick={handleClear}
                aria-label="حذف المرفق"
              >
                ✕ حذف
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Action Buttons When No File Selected */
        <div className="camera-capture-buttons-row">
          <button
            type="button"
            className="camera-capture-btn camera-primary"
            onClick={() => {
              triggerHaptic('selection');
              cameraInputRef.current?.click();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span>تصوير بالكاميرا</span>
          </button>

          <button
            type="button"
            className="camera-capture-btn camera-secondary"
            onClick={() => {
              triggerHaptic('light');
              fileInputRef.current?.click();
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            <span>اختيار ملف / صورة</span>
          </button>
        </div>
      )}
    </div>
  );
}
