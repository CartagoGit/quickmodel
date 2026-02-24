/**
 * Registry de escenarios comparativos — PURO, VitePress-safe.
 *
 * Solo importa `.def.ts` (datos puros sin runtime de Bun).
 * Para el runner de tests, usa `registry.bench.ts`.
 *
 * Importable desde VitePress via alias `@benchmarks/registry`.
 */

import type { IBenchScenario } from './bench.types';

// ─── Scenarios (.def.ts) — pure data ────────────────────────────────────────

import { scenario as rulesDef } from './rules/rules.def';
import { scenario as isDirtyDef } from './isDirty/isDirty.def';
import { scenario as asyncRulesDef } from './asyncRules/asyncRules.def';
import { scenario as validationReportDef } from './validationReport/validationReport.def';
import { scenario as serializationDef } from './serialization/serialization.def';
import { scenario as mocksDef } from './mocks/mocks.def';
import { scenario as batchDef } from './batch/batch.def';
import { scenario as bulkConstructDef } from './bulkConstruct/bulkConstruct.def';
import { scenario as typeSerializationDef } from './typeSerialization/typeSerialization.def';
import { scenario as nestedConstructDef } from './nestedConstruct/nestedConstruct.def';
import { scenario as aliasMappingDef } from './aliasMapping/aliasMapping.def';
import { scenario as schemaMultiFormatDef } from './schemaMultiFormat/schemaMultiFormat.def';
import { scenario as coercionDef } from './coercion/coercion.def';
import { scenario as performanceTargetsDef } from './performanceTargets/performanceTargets.def';
import { scenario as validationDef } from './validation/validation.def';

/**
 * Calcula el ratio QuickModel / mejor_competidor para un escenario.
 * - Excluye claves que empiezan por 'QuickModel' (son variantes propias, no competidores).
 * - Excluye 'Plain JS' (referencia baseline, no competitor real de librería).
 * - Devuelve Infinity si no hay competidor (escenario exclusivo de QM).
 * - Devuelve 0 si QM no tiene valor (null).
 * Usado para ordenar los escenarios de mayor a menor ventaja de QuickModel.
 */
function qmRatio(scenario: IBenchScenario): number {
	const qmValue = scenario.values['QuickModel'];
	if (qmValue === null || qmValue === undefined) return 0;

	const bestCompetitor = Object.entries(scenario.values)
		.filter(
			([key, val]) =>
				!key.startsWith('QuickModel') &&
				key !== 'Plain JS' &&
				val !== null
		)
		.reduce<number>((max, [, val]) => Math.max(max, val as number), 0);

	return bestCompetitor === 0 ? Infinity : qmValue / bestCompetitor;
}

const _rawScenarios: IBenchScenario[] = [
	rulesDef,
	isDirtyDef,
	asyncRulesDef,
	validationReportDef,
	serializationDef,
	mocksDef,
	batchDef,
	bulkConstructDef,
	typeSerializationDef,
	nestedConstructDef,
	aliasMappingDef,
	schemaMultiFormatDef,
	coercionDef,
	performanceTargetsDef,
	validationDef,
];

/**
 * Escenarios comparativos ordenados automáticamente por ratio QM / mejor_competidor descendente.
 * Cuanto mayor el ratio, más ventajosa es la posición de QuickModel en ese benchmark.
 * Al añadir nuevos benchmarks solo hay que agregar su `.def.ts` a `_rawScenarios` — el orden se calcula solo.
 */
export const scenarios: IBenchScenario[] = [..._rawScenarios].sort(
	(aScenario, bScenario) => qmRatio(bScenario) - qmRatio(aScenario)
);
