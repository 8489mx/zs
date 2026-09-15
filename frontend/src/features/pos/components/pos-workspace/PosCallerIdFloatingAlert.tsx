import { useEffect, useState } from 'react';
import { callerIdService, type CallerIdCallEvent } from '@/features/pos/lib/pos-caller-id-service';
import { playNotificationChime } from '@/lib/audio-chime';
import { PhoneIncomingIcon, XIcon, CheckCircleIcon } from '@/shared/components/icons/AppIcons';
import { Button } from '@/shared/ui/button';

interface PosCallerIdFloatingAlertProps {
  onOpenPhoneOrder: (phone: string, callerName?: string) => void;
}

export function PosCallerIdFloatingAlert({ onOpenPhoneOrder }: PosCallerIdFloatingAlertProps) {
  const [activeCall, setActiveCall] = useState<CallerIdCallEvent | null>(null);

  useEffect(() => {
    const unsubscribe = callerIdService.subscribe((event) => {
      playNotificationChime();
      setActiveCall(event);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeCall) return;
    const timer = setTimeout(() => {
      setActiveCall(null);
    }, 45000); // auto-hide after 45s
    return () => clearTimeout(timer);
  }, [activeCall]);

  if (!activeCall) return null;

  return (
    <div
      dir="rtl"
      className="pos-caller-id-floating-alert"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '24px',
        zIndex: 999999,
        background: '#170e5e',
        color: '#ffffff',
        padding: '16px 20px',
        borderRadius: '14px',
        boxShadow: '0 12px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        minWidth: '340px',
        maxWidth: '420px',
        animation: 'slideInUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <PhoneIncomingIcon size={24} color="#60a5fa" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#93c5fd', textTransform: 'uppercase' }}>
            اتصال هاتفي وارد (Caller ID)
          </span>
        </div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.5px', marginTop: '2px' }}>
          {activeCall.phone}
        </div>
        {activeCall.callerName && (
          <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeCall.callerName}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <Button
          size="sm"
          style={{
            background: '#2563eb',
            color: '#ffffff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
            padding: '6px 14px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
          }}
          onClick={() => {
            const phone = activeCall.phone;
            const name = activeCall.callerName;
            setActiveCall(null);
            onOpenPhoneOrder(phone, name);
          }}
        >
          <CheckCircleIcon size={15} style={{ marginLeft: '4px' }} />
          فتح الطلب
        </Button>
        <Button
          size="sm"
          variant="secondary"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: '6px',
          }}
          onClick={() => setActiveCall(null)}
        >
          <XIcon size={14} style={{ marginLeft: '3px' }} />
          تجاهل
        </Button>
      </div>
    </div>
  );
}
