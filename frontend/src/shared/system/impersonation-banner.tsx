import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { saasAdminApi } from '@/features/saas-admin/api/saas-admin.api';
import { resetAuthenticatedClient } from '@/lib/query-client-session';

export function ImpersonationBanner() {
  const user = useAuthStore((state) => state.user);
  const tenant = useAuthStore((state) => state.tenant);
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const [isExiting, setIsExiting] = useState(false);

  const originalSessionId = typeof window !== 'undefined'
    ? window.localStorage.getItem('zs.impersonationOriginalSession')
    : null;

  if (!originalSessionId) return null;

  const targetName = tenant?.businessName || tenant?.slug || 'النسخة الحالية';
  const ownerName = user?.displayName || user?.username || 'المالك';

  const handleExit = async () => {
    setIsExiting(true);
    try {
      await saasAdminApi.exitImpersonation(originalSessionId);
      window.localStorage.removeItem('zs.impersonationOriginalSession');
      await resetAuthenticatedClient(queryClient, clearSession);
      window.location.href = '/saas-admin/tenants';
    } catch (err) {
      console.error('Failed to exit impersonation gracefully, performing fallback redirect', err);
      window.localStorage.removeItem('zs.impersonationOriginalSession');
      window.location.href = '/saas-admin/tenants';
    } finally {
      setIsExiting(false);
    }
  };

  return (
    <div
      dir="rtl"
      className="impersonation-banner"
      style={{
        background: 'linear-gradient(90deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
        color: '#ffffff',
        border: '1px solid #6366f1',
        padding: '10px 18px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 4px 14px rgba(30, 27, 75, 0.35)',
        margin: '0 0 12px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>👁️</span>
        <strong style={{ color: '#93c5fd', fontSize: '0.95rem' }}>وضع تصفح النسخة كمسؤول:</strong>
        <span style={{ fontSize: '0.9rem' }}>
          أنت الآن تتصفح نظام <strong>{targetName}</strong> كالمستخدم (<strong>{ownerName}</strong>).
        </span>
      </div>
      <button
        type="button"
        onClick={handleExit}
        disabled={isExiting}
        style={{
          background: '#4f46e5',
          color: '#ffffff',
          border: '1px solid #a5b4fc',
          padding: '6px 16px',
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: 700,
          cursor: isExiting ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease',
          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
        }}
        onMouseEnter={(e) => {
          if (!isExiting) (e.currentTarget as HTMLElement).style.background = '#4338ca';
        }}
        onMouseLeave={(e) => {
          if (!isExiting) (e.currentTarget as HTMLElement).style.background = '#4f46e5';
        }}
      >
        <span style={{ fontSize: '1rem', lineHeight: 1 }}>⬅</span>
        <span>{isExiting ? 'جاري العودة...' : 'العودة إلى لوحة المنصة (Super Admin)'}</span>
      </button>
    </div>
  );
}
