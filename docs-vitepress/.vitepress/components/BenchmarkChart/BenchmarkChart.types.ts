/** Identificadores de las pestañas disponibles en el BenchmarkChart. */
export type ITab = 'features' | 'coverage' | 'performance';

/** Props opcionales para filtrar el BenchmarkChart cuando se incrusta en páginas. */
export interface IBenchmarkChartProps {
	/** Whitelist de scenario keys. undefined = mostrar todos. */
	onlyScenarios?: string[];
	/** Whitelist de nombres de librerías. undefined = mostrar todas. */
	onlyLibs?: string[];
	/** Whitelist de categorías de featureRows visibles en el tab Características. undefined = mostrar todas. */
	onlyFeatureCategories?: string[];
	/** Whitelist de tabs visibles. undefined = mostrar los tres. */
	onlyTabs?: ITab[];
	/** Tab activo inicial. Default: primer tab de onlyTabs o 'features'. */
	defaultTab?: ITab;
}
