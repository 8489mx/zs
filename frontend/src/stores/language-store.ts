import { create } from 'zustand';

interface LanguageState {
  language: 'ar' | 'en';
  setLanguage: (lang: 'ar' | 'en') => void;
}

export const useLanguageStore = create<LanguageState>((set) => {
  const initialLang = (typeof window !== 'undefined' ? localStorage.getItem('zsystems_lang') : 'ar') as 'ar' | 'en';
  const finalLang = initialLang === 'en' ? 'en' : 'ar';
  
  if (typeof document !== 'undefined') {
    document.documentElement.dir = finalLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = finalLang;
  }

  return {
    language: finalLang,
    setLanguage: (lang) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('zsystems_lang', lang);
      }
      if (typeof document !== 'undefined') {
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
      }
      set({ language: lang });
    },
  };
});
