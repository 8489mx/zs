import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useEffect } from 'react';
import { StandardDialog } from '@/shared/components/StandardDialog';
import { Button } from '@/shared/ui/button';
import {
  CheckCircleIcon,
  XIcon,
  EditIcon,
  UserIcon,
  PhoneIcon,
  BriefcaseIcon,
  RefreshCwIcon,
} from '@/shared/components/icons/AppIcons';

export interface RecipientSignatureData {
  recipientName: string;
  recipientPhone: string;
  recipientRole: string;
  recipientSignature: string; // Base64 data URL
}

export interface VanSignaturePadModalProps {
  open: boolean;
  onClose: () => void;
  customerName?: string;
  totalAmount?: number;
  initialData?: Partial<RecipientSignatureData>;
  onConfirm: (data: RecipientSignatureData) => void;
}

const RECIPIENT_ROLES = [
  'صاحب المحل',
  'الشريك المفوض',
  'المدير المسئول',
  'الكاشير / المحاسب',
  'أمين المخزن / مستلم البضاعة',
];

export const VanSignaturePadModal: React.FC<VanSignaturePadModalProps> = ({
  open,
  onClose,
  customerName = '',
  totalAmount = 0,
  initialData,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [recipientName, setRecipientName] = useState(initialData?.recipientName || customerName || '');
  const [recipientPhone, setRecipientPhone] = useState(initialData?.recipientPhone || '');
  const [recipientRole, setRecipientRole] = useState(initialData?.recipientRole || 'صاحب المحل');
  const [errorMsg, setErrorMsg] = useState('');
  const [hasDrawn, setHasDrawn] = useState(Boolean(initialData?.recipientSignature));

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setRecipientName(initialData?.recipientName || customerName || '');
      setRecipientPhone(initialData?.recipientPhone || '');
      setRecipientRole(initialData?.recipientRole || 'صاحب المحل');
      setErrorMsg('');
      setHasDrawn(Boolean(initialData?.recipientSignature));

      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * (window.devicePixelRatio || 1);
        canvas.height = rect.height * (window.devicePixelRatio || 1);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = '#0f172a';
          if (initialData?.recipientSignature) {
            const img = new Image();
            img.onload = () => {
              ctx.drawImage(img, 0, 0, rect.width, rect.height);
            };
            img.src = initialData.recipientSignature;
          }
        }
      }, 100);
    }
  }, [open, customerName, initialData]);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    isDrawingRef.current = true;
    setHasDrawn(true);
    setErrorMsg('');
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    setErrorMsg('');
    const trimmedName = recipientName.trim();
    if (!trimmedName) {
      setErrorMsg('يرجى كتابة اسم المستلم الثلاثي أو الرباعي');
      return;
    }
    if (!hasDrawn) {
      setErrorMsg('يرجى توقيع المستلم على الشاشة بالأصبع لتأكيد الاستلام القانوني');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureDataUrl = canvas.toDataURL('image/png');

    onConfirm({
      recipientName: trimmedName,
      recipientPhone: recipientPhone.trim(),
      recipientRole,
      recipientSignature: signatureDataUrl,
    });
    onClose();
  };

  return (
    <StandardDialog
      open={open}
      onClose={onClose}
      title={t('delivery_reps.van_signature_pad_modal.s0', "توقيع واستلام العميل على الشاشة")}
      subtitle={t('delivery_reps.van_signature_pad_modal.s1', "توثيق هوية المستلم وتوقيعه الحي لحماية الشركة ومنع إنكار استلام البضاعة الآجلة")}
      badge={t('delivery_reps.van_signature_pad_modal.s2', "حماية الاستلام")}
      compact={true}
      width="min(480px, 95vw)"
      bodyStyle={{ padding: '12px 14px' }}
      footer={
        <div
          dir="rtl"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: '10px',
          }}
        >
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            style={{
              height: '38px',
              fontSize: '12.5px',
              fontWeight: 700,
              padding: '0 16px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              borderRadius: '8px',
            }}
          >
            <XIcon size={14} color="#475569" />
            <span>{t('delivery_reps.van_signature_pad_modal.s3', "إلغاء")}</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleSave}
            style={{
              flex: 1,
              height: '40px',
              backgroundColor: '#170e5e',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 800,
              padding: '0 18px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(23, 14, 94, 0.25)',
            }}
          >
            <CheckCircleIcon size={15} color="#ffffff" />
            <span>{t('delivery_reps.van_signature_pad_modal.s4', "اعتماد وتثبيت التوقيع")}</span>
          </Button>
        </div>
      }
    >
      <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {totalAmount > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '8px 12px',
            }}
          >
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{t('delivery_reps.van_signature_pad_modal.s5', "إجمالي الفاتورة المطلوب استلامها:")}</span>
              <span style={{ fontSize: '14px', fontWeight: 900, color: '#170e5e' }}>{totalAmount.toFixed(2)} {t('delivery_reps.van_signature_pad_modal.s6', "ج.م")}</span>
            </div>
            {customerName && (
              <div style={{ textAlign: 'left' }}>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{t('delivery_reps.van_signature_pad_modal.s7', "المحل / العميل:")}</span>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>{customerName}</span>
              </div>
            )}
          </div>
        )}

        {/* Identity Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              <UserIcon size={12} color="#170e5e" />
              <span>{t('delivery_reps.van_signature_pad_modal.s8', "اسم المستلم الفعلي *")}</span>
            </label>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={t('delivery_reps.van_signature_pad_modal.s9', "الاسم الثلاثي أو الرباعي")}
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
              <PhoneIcon size={12} color="#170e5e" />
              <span>{t('delivery_reps.van_signature_pad_modal.s10', "رقم هاتف المستلم")}</span>
            </label>
            <input
              type="tel"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              placeholder="01xxxxxxxxx"
              style={{
                width: '100%',
                height: '34px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                direction: 'ltr',
                textAlign: 'right',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
            <BriefcaseIcon size={12} color="#170e5e" />
            <span>{t('delivery_reps.van_signature_pad_modal.s11', "صفة المستلم وعلاقته بالمحل *")}</span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {RECIPIENT_ROLES.map((role) => {
              const active = recipientRole === role;
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRecipientRole(role)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: active ? '1.5px solid #170e5e' : '1px solid #cbd5e1',
                    backgroundColor: active ? '#eef2ff' : '#ffffff',
                    color: active ? '#170e5e' : '#475569',
                  }}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas Signature Pad */}
        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>
              <EditIcon size={12} color="#170e5e" />
              <span>{t('delivery_reps.van_signature_pad_modal.s12', "توقيع المستلم الحي بالأصبع على الشاشة:")}</span>
            </span>
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              <RefreshCwIcon size={11} color="#dc2626" />
              <span>{t('delivery_reps.van_signature_pad_modal.s13', "مسح التوقيع")}</span>
            </button>
          </div>

          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '150px',
              borderRadius: '8px',
              border: hasDrawn ? '1.5px solid #170e5e' : '1.5px dashed #94a3b8',
              backgroundColor: '#ffffff',
              touchAction: 'none',
              overflow: 'hidden',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair' }}
            />
            {!hasDrawn && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {t('delivery_reps.van_signature_pad_modal.s14', "وقع هنا بالأصبع (Sign Here)")}
              </div>
            )}
          </div>
        </div>

        {errorMsg && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11.5px',
              fontWeight: 700,
            }}
          >
            {errorMsg}
          </div>
        )}
      </div>
    </StandardDialog>
  );
};
