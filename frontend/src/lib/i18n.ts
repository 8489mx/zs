import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import { getLanguageMeta, DEFAULT_LANGUAGE } from './languages';

import { initAutoTranslator, translateUiText } from './auto-translator';
import ar from '../locales/ar.json';
import en from '../locales/en.json';

const savedLang = typeof window !== 'undefined' 
  ? (localStorage.getItem('zsystems_lang') || localStorage.getItem('zs.uiLanguage') || DEFAULT_LANGUAGE) 
  : DEFAULT_LANGUAGE;
const activeMeta = getLanguageMeta(savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
    },
    lng: activeMeta.code,
    fallbackLng: {
      en: [],
      default: ['ar'],
    },
    interpolation: {
      escapeValue: false
    },
    parseMissingKeyHandler: (key: string, defaultValue?: string) => {
      if (i18n.language?.startsWith('en')) {
        const textToTranslate = (defaultValue && defaultValue !== key) ? defaultValue : key;
        const translated = translateUiText(textToTranslate);
        if (translated) {
          return translated;
        }
      }
      return defaultValue || key;
    },
  });

i18n.on('languageChanged', (lng) => {
  const meta = getLanguageMeta(lng);
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
  if (typeof window !== 'undefined' && !sessionStorage.getItem('zs_isolated_screen_lang')) {
    localStorage.setItem('zsystems_lang', meta.code);
    localStorage.setItem('zs.uiLanguage', meta.code);
    try {
      useAuthStore.getState().updateSessionMeta({ language: meta.code as any });
    } catch {}
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = activeMeta.code;
  document.documentElement.dir = activeMeta.dir;
}

initAutoTranslator(i18n);

export default i18n;
