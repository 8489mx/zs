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

type LocaleContextValue = {
  language: UiLanguage;
  direction: 'rtl' | 'ltr';
  setLanguage: (language: UiLanguage) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const user = useAuthStore((state) => state.user);
  const [language, setLanguageState] = useState<UiLanguage>(() => getStoredUiLanguage());

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

  useEffect(() => {
    const settingsLanguage = settingsQuery.data?.uiLanguage;
    if (settingsLanguage === 'ar' || settingsLanguage === 'en') {
      setLanguageState(normalizeUiLanguage(settingsLanguage));
    }
  }, [settingsQuery.data?.uiLanguage]);

  useEffect(() => {
    persistUiLanguage(language);
    applyDocumentLanguage(language);
  }, [language]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    direction: language === 'en' ? 'ltr' : 'rtl',
    setLanguage: (next) => setLanguageState(normalizeUiLanguage(next)),
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
