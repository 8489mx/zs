import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ar from '../locales/ar.json';
import en from '../locales/en.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('zsystems_lang') : 'ar';
const defaultLang = savedLang === 'en' ? 'en' : 'ar';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      en: { translation: en }
    },
    lng: defaultLang,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === 'en' ? 'ltr' : 'rtl';
  localStorage.setItem('zsystems_lang', lng);
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = defaultLang;
  document.documentElement.dir = defaultLang === 'en' ? 'ltr' : 'rtl';
}

export default i18n;
