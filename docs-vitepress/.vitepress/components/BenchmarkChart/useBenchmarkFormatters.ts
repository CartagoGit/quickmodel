import type { Ref } from 'vue';
import type {
	IBenchScenario,
	IFeatureValue,
} from './benchmark-chart.constants';

const OPS_MILLION_THRESHOLD = 1_000_000;
const OPS_KILO_THRESHOLD = 1_000;

export interface IBenchmarkFormattersResult {
	formatOps: (lib: string) => string;
	featureIcon: (val: IFeatureValue | undefined) => string;
	formatNote: (scenario: IBenchScenario) => string;
}

/**
 * Formatea valores del gráfico para su presentación (SRP: sólo responsable del formato).
 */
export function useBenchmarkFormatters(
	currentScenario: Ref<IBenchScenario>,
	lang: Ref<string>
): IBenchmarkFormattersResult {
	function formatOps(lib: string): string {
		const val = currentScenario.value.values[lib];
		if (val === null || val === undefined) return 'N/A';
		if (val >= OPS_MILLION_THRESHOLD)
			return (val / OPS_MILLION_THRESHOLD).toFixed(1) + 'M ops/s';
		if (val >= OPS_KILO_THRESHOLD)
			return (val / OPS_KILO_THRESHOLD).toFixed(0) + 'k ops/s';
		return val + ' ops/s';
	}

	function featureIcon(val: IFeatureValue | undefined): string {
		if (val === true) return '✅';
		if (val === 'partial') return '⚠️';
		return '❌';
	}

	function formatNote(scenario: IBenchScenario): string {
		const key = ('notes' +
			lang.value.charAt(0).toUpperCase() +
			lang.value.slice(1)) as keyof IBenchScenario;
		return (scenario[key] as string | undefined) ?? scenario.notesEn;
	}

	return { formatOps, featureIcon, formatNote };
}
