import React from 'react';

interface MobilePunchCameraProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraActive: boolean;
  capturedSelfie: string | null;
  onRetake: () => void;
}

export function MobilePunchCamera({
  videoRef,
  canvasRef,
  cameraActive,
  capturedSelfie,
  onRetake,
}: MobilePunchCameraProps) {
  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px', textAlign: 'center' }}>
      <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto', borderRadius: '50%', overflow: 'hidden', border: '4px solid #170e5e', boxShadow: '0 4px 14px rgba(23, 14, 94, 0.15)', background: '#0f172a' }}>
        {capturedSelfie ? (
          <img src={capturedSelfie} alt="Selfie" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
        )}
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ marginTop: '10px' }}>
        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
          {capturedSelfie ? 'تم التقاط الصورة بنجاح' : cameraActive ? 'وجه وجهك للكاميرا لتسجيل البصمة' : 'الكاميرا غير متاحة'}
        </span>
        {capturedSelfie && (
          <button
            type="button"
            onClick={onRetake}
            style={{ display: 'block', margin: '4px auto 0', border: 'none', background: 'transparent', color: '#170e5e', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
          >
            إعادة التقاط الصورة
          </button>
        )}
      </div>
    </div>
  );
}
