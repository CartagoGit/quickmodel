import { enLocale } from './en';
import { esLocale } from './es';

export type ILocale = keyof typeof translations;

const translations = { en: enLocale, es: esLocale } as const;

export const getTranslations = (locale: ILocale) =>
	translations[locale] ?? translations.en;
