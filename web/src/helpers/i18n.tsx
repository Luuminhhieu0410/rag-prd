import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';
import en from '@/locales/en.json';
import vi from '@/locales/vi.json';

export type Language = 'en' | 'vi';

export const languages = [
    {value: 'en', label: 'English'},
    {value: 'vi', label: 'Tiếng Việt'},
] as const;

function getInitialLanguage(): Language {
    return localStorage.getItem('language') === 'vi' ? 'vi' : 'en';
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            en: {translation: en},
            vi: {translation: vi},
        },
        lng: getInitialLanguage(),
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false,
            prefix: '{',
            suffix: '}',
        },
    });

i18n.on('languageChanged', (language) => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
});

document.documentElement.lang = i18n.language;

export default i18n;
