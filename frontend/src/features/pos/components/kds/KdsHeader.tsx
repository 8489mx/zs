import { useTranslation } from 'react-i18next';
import React from 'react';
import { DisplayLanguageToggle } from '@/shared/components/DisplayLanguageToggle';
import { UtensilsIcon, BellIcon, BellOffIcon, Maximize2Icon, ArrowRightIcon, BanIcon } from '@/shared/components/icons/AppIcons';

interface KdsHeaderProps {
  currentTime: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onRecallLastServed: () => void;
  isRecalling: boolean;
  onToggleFullscreen: () => void;
  onBack?: () => void;
  onOpen86Modal?: () => void;
  active86Count?: number;
  currentLang?: string;
  onToggleLanguage?: () => void;
}

export const KdsHeader: React.FC<KdsHeaderProps> = ({
  currentTime,
  soundEnabled,
  onToggleSound,
  onRecallLastServed,
  isRecalling,
  onToggleFullscreen,
  onBack,
  onOpen86Modal,
  active86Count = 0,
  currentLang,
  onToggleLanguage,
}) => {
  const { t } = useTranslation();
  return (
    <header
      style={{
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '14px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
      }}
    >
      {/* Brand & Live Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: '#170e5e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(23, 14, 94, 0.25)',
          }}
        >
          <UtensilsIcon size={20} color="#ffffff" strokeWidth={2} />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              {t('pos.kds.kds_header.s0', "شاشة المطبخ التفاعلية (KDS)")}
            </h1>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                backgroundColor: '#170e5e',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '6px',
                letterSpacing: '0.5px',
              }}
            >
              LIVE
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontWeight: 600 }}>
            {t('pos.kds.kds_header.s1', "نظام إدارة وتوجيه طلبات المطبخ الذكي • Z-Kitchen Operations")}
          </div>
        </div>
      </div>

      {/* Live Clock & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ textAlign: 'left', direction: 'ltr' }}>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: '#170e5e',
              letterSpacing: '0.5px',
            }}
          >
            {currentTime}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Back to System Button */}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                backgroundColor: '#170e5e',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '7px 14px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 6px rgba(23, 14, 94, 0.2)',
                transition: 'all 0.15s ease',
              }}
              title={t('pos.kds.kds_header.s2', "العودة للنظام (Esc)")}
            >
              <ArrowRightIcon size={14} color="#ffffff" strokeWidth={2.5} />
              <span>{t('pos.kds.kds_header.s3', "العودة للنظام")}</span>
            </button>
          )}

          {/* 86 Items Fast Exclusion */}
          {onOpen86Modal && (
            <button
              type="button"
              onClick={onOpen86Modal}
              style={{
                backgroundColor: active86Count > 0 ? '#fee2e2' : '#f8fafc',
                color: active86Count > 0 ? '#991b1b' : '#334155',
                border: active86Count > 0 ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '7px 12px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title={t('pos.kds.kds_header.s4', "إدارة واستبعاد الأصناف النافذة بالمطبخ (86'd Items)")}
            >
              <BanIcon size={14} color={active86Count > 0 ? '#dc2626' : '#64748b'} />
              <span>{t('pos.kds.kds_header.s5', "أصناف 86")}</span>
              {active86Count > 0 && (
                <span
                  style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 900,
                    padding: '1px 6px',
                    borderRadius: '999px',
                  }}
                >
                  {active86Count}
                </span>
              )}
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={onToggleSound}
            style={{
              backgroundColor: soundEnabled ? '#eff6ff' : '#f8fafc',
              color: soundEnabled ? '#170e5e' : '#64748b',
              border: `1px solid ${soundEnabled ? '#bfdbfe' : '#cbd5e1'}`,
              borderRadius: '8px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
            title={t('pos.kds.kds_header.s6', "تفعيل/كتم صوت جرس التنبيه")}
          >
            {soundEnabled ? <BellIcon size={14} color="#170e5e" /> : <BellOffIcon size={14} color="#64748b" />}
            <span>{soundEnabled ? t('pos.kds.kds_header.s7', "التنبيه مفعّل") : t('pos.kds.kds_header.s8', "مكتوم")}</span>
          </button>

          {/* Recall Last Served */}
          <button
            type="button"
            onClick={onRecallLastServed}
            disabled={isRecalling}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
              transition: 'all 0.15s ease',
            }}
            title={t('pos.kds.kds_header.s9', "استرجاع آخر طلب مكتمل")}
          >
            <span>{t('pos.kds.kds_header.s10', "استرجاع آخر طلب")}</span>
          </button>

          {onToggleLanguage && (
            <DisplayLanguageToggle
              currentLang={currentLang || 'ar'}
              onToggle={onToggleLanguage}
            />
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={onToggleFullscreen}
            style={{
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 10px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
            }}
            title={t('pos.kds.kds_header.s11', "ملء الشاشة")}
          >
            <Maximize2Icon size={16} color="#334155" />
          </button>
        </div>
      </div>
    </header>
  );
};
