import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { useAuthStore } from '@/stores/auth-store';
import { getLanguageMeta, DEFAULT_LANGUAGE } from './languages';

import ar from '../locales/ar.json';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import bn from '../locales/bn.json';
import ur from '../locales/ur.json';
import hi from '../locales/hi.json';
import tl from '../locales/tl.json';
import fr from '../locales/fr.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('zsystems_lang') : DEFAULT_LANGUAGE;
const activeMeta = getLanguageMeta(savedLang);

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en },
      zh: { translation: zh },
      bn: { translation: bn },
      ur: { translation: ur },
      hi: { translation: hi },
      tl: { translation: tl },
      fr: { translation: fr },
    },
    lng: activeMeta.code,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

i18n.on('languageChanged', (lng) => {
  const meta = getLanguageMeta(lng);
  document.documentElement.lang = meta.code;
  document.documentElement.dir = meta.dir;
  localStorage.setItem('zsystems_lang', meta.code);
  try {
    useAuthStore.getState().updateSessionMeta({ language: meta.code as any });
  } catch {}
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = activeMeta.code;
  document.documentElement.dir = activeMeta.dir;
}

export default i18n;
