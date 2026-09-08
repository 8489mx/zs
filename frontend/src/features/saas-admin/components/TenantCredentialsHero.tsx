import React from 'react';
import { XIcon } from '@/shared/components/icons/AppIcons';

interface TenantCredentialsHeroProps {
  result: {
    tenantName: string;
    username: string;
    temporaryPassword: string;
  } | null;
  onClose: () => void;
  onCopy: (text: string) => void;
}

export const TenantCredentialsHero: React.FC<TenantCredentialsHeroProps> = ({
  result,
  onClose,
  onCopy,
}) => {
  if (!result) return null;

  return (
    <div className="saas-credentials-luxury-card" dir="rtl">
      <div className="saas-credentials-hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="saas-credentials-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                تمت إعادة تعيين كلمة مرور المالك بنجاح
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                المنشأة: <strong style={{ color: '#0f172a' }}>{result.tenantName}</strong>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="saas-close-action-btn"
            onClick={onClose}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <XIcon size={14} />
            <span>إغلاق</span>
          </button>
        </div>
      </div>

      <div className="saas-credentials-grid">
        <div className="saas-credential-box">
          <span className="saas-credential-label">اسم المستخدم</span>
          <div className="saas-credential-content">
            <code className="saas-credential-code">{result.username}</code>
            <button
              type="button"
              className="saas-copy-btn"
              onClick={() => onCopy(result.username)}
            >
              نسخ
            </button>
          </div>
        </div>

        <div className="saas-credential-box">
          <span className="saas-credential-label">كلمة المرور الجديدة</span>
          <div className="saas-credential-content">
            <code className="saas-credential-code password-highlight">{result.temporaryPassword}</code>
            <button
              type="button"
              className="saas-copy-btn"
              onClick={() => onCopy(result.temporaryPassword)}
            >
              نسخ كلمة المرور
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
