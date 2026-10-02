import { useState } from 'react';
import { MaritimeSettingsTab } from '../components/MaritimeSettingsTab';
import { MaritimePipelineSettingsTab } from '../components/MaritimePipelineSettingsTab';
import { SlidersIcon, MailIcon } from '@/shared/components/icons/AppIcons';

export function MaritimeSettingsPage() {
  const [subTab, setSubTab] = useState<'pipeline' | 'mail'>('pipeline');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <style>{`
        @media (max-width: 768px) {
          .maritime-settings-subtabs {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
            padding: 6px 8px !important;
          }
          .maritime-settings-subtab-btn {
            height: 36px !important;
            padding: 0 8px !important;
            font-size: 0.76rem !important;
            justify-content: center !important;
            gap: 6px !important;
            white-space: nowrap !important;
          }
          .maritime-settings-subtab-btn svg {
            flex-shrink: 0 !important;
          }
        }
      `}</style>

      {/* شريط التبويبات الفرعية للإعدادات */}
      <div
        className="maritime-settings-subtabs"
        style={{
          background: '#ffffff',
          padding: '8px 12px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          className="maritime-settings-subtab-btn"
          onClick={() => setSubTab('pipeline')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            border: subTab === 'pipeline' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: subTab === 'pipeline' ? '#170e5e' : '#f8fafc',
            color: subTab === 'pipeline' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <SlidersIcon size={16} />
          <span>
            <span className="desktop-only-inline">قواعد وسياسات الشحن وهامش الربح (Shipping Policies & Margins)</span>
            <span className="mobile-only-inline">سياسات وهوامش الشحن</span>
          </span>
        </button>

        <button
          type="button"
          className="maritime-settings-subtab-btn"
          onClick={() => setSubTab('mail')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            border: subTab === 'mail' ? '1px solid #170e5e' : '1px solid #e2e8f0',
            background: subTab === 'mail' ? '#170e5e' : '#f8fafc',
            color: subTab === 'mail' ? '#ffffff' : '#475569',
            fontWeight: 600,
            fontSize: '0.8125rem',
            cursor: 'pointer',
          }}
        >
          <MailIcon size={16} />
          <span>
            <span className="desktop-only-inline">خوادم البريد الإلكتروني والمراسلات (Mail & SMTP/IMAP)</span>
            <span className="mobile-only-inline">خوادم البريد والمراسلات</span>
          </span>
        </button>
      </div>

      {/* المحتوى مع الحفاظ على الكاش والـ Keep-Alive */}
      <div style={{ display: subTab === 'pipeline' ? 'block' : 'none' }}>
        <MaritimePipelineSettingsTab />
      </div>
      <div style={{ display: subTab === 'mail' ? 'block' : 'none' }}>
        <MaritimeSettingsTab />
      </div>
    </div>
  );
}

export default MaritimeSettingsPage;
