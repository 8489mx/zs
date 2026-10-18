import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getLanguageMeta } from '@/lib/languages';

export function useIsolatedDisplayLanguage(storageKey: string) {
  const { i18n } = useTranslation();

  // Flag this tab/window as an isolated screen session to protect the cashier's main language
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem('zs_isolated_screen_lang', '1');
    } catch {}
  }

  const getSavedLang = useCallback((): string => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved === 'ar' || saved === 'en') return saved;
    } catch {}
    return i18n.language && i18n.language.startsWith('en') ? 'en' : 'ar';
  }, [storageKey, i18n.language]);

  const [currentLang, setCurrentLang] = useState<string>(getSavedLang);

  // Synchronize on mount and apply document direction for this window
  useEffect(() => {
    const targetLang = getSavedLang();
    if (i18n.language !== targetLang) {
      void i18n.changeLanguage(targetLang);
    }
    const meta = getLanguageMeta(targetLang);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    setCurrentLang(targetLang);
  }, [getSavedLang, i18n]);

  const setLanguage = useCallback((lang: 'ar' | 'en') => {
    try {
      localStorage.setItem(storageKey, lang);
    } catch {}
    void i18n.changeLanguage(lang);
    const meta = getLanguageMeta(lang);
    document.documentElement.lang = meta.code;
    document.documentElement.dir = meta.dir;
    setCurrentLang(lang);
  }, [storageKey, i18n]);

  const toggleLanguage = useCallback(() => {
    const nextLang = currentLang === 'en' ? 'ar' : 'en';
    setLanguage(nextLang);
  }, [currentLang, setLanguage]);

  return {
    currentLang,
    isEn: currentLang === 'en',
    setLanguage,
    toggleLanguage,
  };
}
