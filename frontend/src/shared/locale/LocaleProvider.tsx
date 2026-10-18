import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/query-keys';
import { settingsApi } from '@/features/settings/api/settings.api';
import { useAuthStore } from '@/stores/auth-store';
import {
  applyDocumentLanguage,
  getStoredUiLanguage,
  normalizeUiLanguage,
  persistUiLanguage,
  type UiLanguage,
} from '@/shared/locale/locale-preference';

import i18n from '@/lib/i18n';

type LocaleContextValue = {
  language: UiLanguage;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: UiLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const activeI18nLang = (i18n.language && i18n.language.startsWith('en')) ? 'en' : 'ar';
  const [language, setLanguageState] = useState<UiLanguage>(() => {
    return activeI18nLang as UiLanguage || getStoredUiLanguage();
  });

  const isExcludedRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/van-sales') ||
    window.location.pathname.startsWith('/driver') ||
    window.location.pathname.startsWith('/login') ||
    window.location.pathname.startsWith('/track') ||
    window.location.pathname.startsWith('/portal')
  );

  const settingsQuery = useQuery({
    queryKey: queryKeys.settings,
    queryFn: settingsApi.settings,
    enabled: Boolean(user) && !isExcludedRoute,
    staleTime: 60_000,
    retry: false,
  });

  // Keep LocaleProvider in sync whenever i18n language changes
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const normalized = normalizeUiLanguage(lng);
      setLanguageState(normalized);
    };
    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  // Only take backend uiLanguage if the user has NOT explicitly stored a preference
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasExplicitLocalPref = Boolean(
      window.localStorage.getItem('zsystems_lang') ||
      window.localStorage.getItem('zs.uiLanguage')
    );
    if (hasExplicitLocalPref) return;

    const settingsLanguage = settingsQuery.data?.uiLanguage;
    if (settingsLanguage === 'ar' || settingsLanguage === 'en') {
      const next = normalizeUiLanguage(settingsLanguage);
      setLanguageState(next);
      void i18n.changeLanguage(next);
    }
  }, [settingsQuery.data?.uiLanguage]);

  useEffect(() => {
    persistUiLanguage(language);
    applyDocumentLanguage(language);
  }, [language]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    direction: language === 'en' ? 'ltr' : 'rtl',
    setLanguage: (next) => {
      const normalized = normalizeUiLanguage(next);
      setLanguageState(normalized);
      void i18n.changeLanguage(normalized);
    },
  }), [language]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocalePreference() {
  const context = useContext(LocaleContext);
  if (!context) {
    return {
      language: getStoredUiLanguage(),
      direction: getStoredUiLanguage() === 'en' ? 'ltr' as const : 'rtl' as const,
      setLanguage: (language: UiLanguage) => {
        persistUiLanguage(language);
        applyDocumentLanguage(language);
      },
    };
  }
  return context;
}
