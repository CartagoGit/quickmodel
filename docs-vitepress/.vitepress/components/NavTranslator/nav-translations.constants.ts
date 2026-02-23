/**
 * Pares de traducción para los enlaces de la barra de navegación.
 * Añadir nuevas entradas aquí para extender sin modificar la lógica de traducción.
 */
export interface INavTranslationEntry {
	en: string;
	es: string;
}

export const NAV_TRANSLATIONS: INavTranslationEntry[] = [
	{ en: 'Guide', es: 'Guía' },
	{ en: 'AI (MCP/Skills)', es: 'IA (MCP/Skills)' },
	{ en: 'Examples', es: 'Ejemplos' },
	{ en: 'Integrations', es: 'Integraciones' },
];
