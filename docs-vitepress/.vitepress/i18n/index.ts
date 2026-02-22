import { en } from './en';
import { es } from './es';

export type ILocale = keyof typeof translations;

const translations = { en, es } as const;

export const getTranslations = (locale: ILocale) =>
	translations[locale] ?? translations.en;
