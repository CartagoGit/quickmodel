/**
 * Tipos compartidos para el sistema de benchmarks modular.
 * Este archivo es puro (sin imports de runtime) — importable por VitePress.
 */

export interface IBenchScenario {
	key: string;
	/** Número del BENCH # en el archivo .bench.ts correspondiente */
	benchNum: number;
	appTypes: string[]; // 'all' | 'api' | 'ddd' | 'testing' | 'data' | 'mock'
	values: Record<string, number | null>; // null = N/A para esa librería
}

export interface IBenchResult {
	name: string;
	iterations: number;
	totalMs: number;
	opsPerSec: number;
	avgMicros: number;
}

export interface IBenchModule {
	/** Datos del escenario para el chart — importados desde la .def.ts. Opcional para benches sin comparativa (ej. performanceTargets). */
	scenario?: IBenchScenario;
	/** Función que registra el describe() de Bun con todos sus tests */
	describeBench: () => void;
}
