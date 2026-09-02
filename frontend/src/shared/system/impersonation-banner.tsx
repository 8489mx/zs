import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { saasAdminApi } from '@/features/saas-admin/api/saas-admin.api';
import { resetAuthenticatedClient } from '@/lib/query-client-session';
import { setLocalSessionFallback, clearLocalSessionFallback } from '@/lib/http';
import { EyeIcon } from '@/shared/components/icons/AppIcons';

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
      const res = await saasAdminApi.exitImpersonation(originalSessionId);
      window.localStorage.removeItem('zs.impersonationOriginalSession');
      if (res?.sessionId) {
        setLocalSessionFallback(res.sessionId);
      } else if (originalSessionId) {
        setLocalSessionFallback(originalSessionId);
      } else {
        clearLocalSessionFallback();
      }
      await resetAuthenticatedClient(queryClient, clearSession);
      window.location.href = '/saas-admin/tenants';
    } catch (err) {
      console.error('Failed to exit impersonation gracefully, performing fallback redirect', err);
      window.localStorage.removeItem('zs.impersonationOriginalSession');
      if (originalSessionId) {
        setLocalSessionFallback(originalSessionId);
      } else {
        clearLocalSessionFallback();
      }
      await resetAuthenticatedClient(queryClient, clearSession);
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
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRight: '4px solid #4f46e5',
        color: '#1e293b',
        padding: '7px 14px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        margin: '0 0 10px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span
          style={{
            background: '#e0e7ff',
            color: '#4338ca',
            padding: '3px 9px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
          }}
        >
          <EyeIcon size={14} color="#4338ca" />
          <span>وضع تصفح المستأجر</span>
        </span>
        <span style={{ fontSize: '12.5px', color: '#475569', fontWeight: 500 }}>
          أنت تتصفح حالياً منشأة <strong style={{ color: '#0f172a', fontWeight: 700 }}>{targetName}</strong> بصلاحية المالك <strong style={{ color: '#0f172a', fontWeight: 700 }}>({ownerName})</strong>
        </span>
      </div>

      <button
        type="button"
        onClick={handleExit}
        disabled={isExiting}
        style={{
          background: '#0f172a',
          color: '#ffffff',
          border: 'none',
          padding: '6px 14px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: isExiting ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
          transition: 'background 0.15s ease, transform 0.1s ease',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.15)',
        }}
        onMouseEnter={(e) => { if (!isExiting) e.currentTarget.style.background = '#1e293b'; }}
        onMouseLeave={(e) => { if (!isExiting) e.currentTarget.style.background = '#0f172a'; }}
      >
        <span>{isExiting ? 'جاري العودة...' : 'العودة إلى لوحة المنصة (Super Admin)'}</span>
      </button>
    </div>
  );
}
