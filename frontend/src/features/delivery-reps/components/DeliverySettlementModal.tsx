import { useState, useRef, useEffect } from 'react';
import { DeliveryOrder, SettleOrderPayload } from '../api/delivery-reps.api';
import { Button } from '@/shared/ui/button';

interface DeliverySettlementModalProps {
  order: DeliveryOrder | null;
  isOpen: boolean;
  isSubmitting: boolean;
  onConfirm: (payload: SettleOrderPayload) => void;
  onClose: () => void;
}

export function DeliverySettlementModal({
  order,
  isOpen,
  isSubmitting,
  onConfirm,
  onClose,
}: DeliverySettlementModalProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-acquire GPS coordinates
  useEffect(() => {
    if (isOpen && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: Number(pos.coords.latitude.toFixed(6)),
            lng: Number(pos.coords.longitude.toFixed(6)),
          });
        },
        () => undefined,
        { timeout: 5000, enableHighAccuracy: true }
      );
    }
  }, [isOpen]);

  // Canvas setup
  useEffect(() => {
    if (!isOpen) {
      setPhotoPreview(null);
      setNotes('');
      setCoords(null);
      setHasSignature(false);
      return;
    }

    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, 100);

    return () => clearTimeout(timer);
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => {
    setIsDrawing(false);
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotoPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    let signatureDataUrl: string | undefined = undefined;
    if (hasSignature && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    onConfirm({
      signatureDataUrl,
      proofPhotoUrl: photoPreview || undefined,
      gpsLat: coords?.lat,
      gpsLng: coords?.lng,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10005,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '14px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: 'min(94vh, 750px)',
          background: '#ffffff',
          borderRadius: '18px',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            background: '#16a34a',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 900 }}>تأكيد تسليم وتحصيل الشحنة</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>
              طلب رقم: #{order.docNo} • {order.customerName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '16px 18px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Amount Callout */}
          <div
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: '11.5px', color: '#166534', fontWeight: 700 }}>المبلغ المطلوب تحصيله نقداً:</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {order.customerPhone ? `هاتف: ${order.customerPhone}` : 'عميل نقدي'}
              </div>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#15803d' }}>
              {Number(order.total).toLocaleString('ar-EG')} ج.م
            </div>
          </div>

          {/* Section 1: Customer Digital Touch Signature */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#1e293b' }}>
                ✍️ توقيع العميل باللمس (اختياري):
              </label>
              {hasSignature && (
                <button
                  type="button"
                  onClick={handleClearSignature}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  مسح التوقيع ✕
                </button>
              )}
            </div>

            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '12px',
                background: '#fafafa',
                overflow: 'hidden',
                position: 'relative',
                touchAction: 'none',
              }}
            >
              <canvas
                ref={canvasRef}
                width={400}
                height={140}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={stopDraw}
                onMouseLeave={stopDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={stopDraw}
                style={{
                  width: '100%',
                  height: '130px',
                  display: 'block',
                  cursor: 'crosshair',
                }}
              />
              {!hasSignature && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '12px',
                    pointerEvents: 'none',
                  }}
                >
                  مرر الإصبع هنا للتوقيع
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Camera Photo Proof */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 800, color: '#1e293b', marginBottom: '6px' }}>
              📸 صورة إثبات التسليم (اختياري):
            </label>

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoCapture}
              style={{ display: 'none' }}
            />

            {photoPreview ? (
              <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                <img
                  src={photoPreview}
                  alt="Proof of Delivery"
                  style={{
                    width: '100%',
                    maxHeight: '140px',
                    objectFit: 'cover',
                    borderRadius: '10px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setPhotoPreview(null)}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  حذف الصورة ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>📷</span>
                <span>التقاط صورة إثبات التسليم بالكاميرا</span>
              </button>
            )}
          </div>

          {/* Section 3: Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              ملاحظات المندوب (اختياري):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: تم الاستلام من حارس العقار، كاش كامل..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* GPS Info Pill */}
          {coords && (
            <div
              style={{
                fontSize: '11px',
                color: '#059669',
                background: '#ecfdf5',
                padding: '6px 10px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>📍</span>
              <span>تم رصد إحداثيات الموقع الحالي: ({coords.lat}, {coords.lng})</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: '12px 18px',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            gap: '8px',
          }}
        >
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
          >
            إلغاء
          </Button>

          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
            style={{
              flex: 2,
              padding: '10px',
              fontSize: '13px',
              fontWeight: 800,
              background: '#16a34a',
              border: 'none',
              borderRadius: '10px',
            }}
          >
            {isSubmitting ? 'جاري التأكيد...' : 'تأكيد التسليم والتحصيل ✓'}
          </Button>
        </div>
      </div>
    </div>
  );
}
