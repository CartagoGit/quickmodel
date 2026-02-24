/**
 * Registry de módulos de benchmark para el test runner de Bun.
 *
 * IMPORTANTE: Este archivo importa `.bench.ts` y NO es VitePress-safe.
 * Para VitePress, usar `registry.ts` (solo escenarios puros).
 */

import type { IBenchModule } from './bench.types';

// ─── Scenarios (.def.ts) — para asociar a cada bench module ─────────────────

import { scenario as validationDef } from './validation/validation.def';
import { scenario as coercionDef } from './coercion/coercion.def';
import { scenario as serializationDef } from './serialization/serialization.def';
import { scenario as batchDef } from './batch/batch.def';
import { scenario as mocksDef } from './mocks/mocks.def';
import { scenario as typeSerializationDef } from './typeSerialization/typeSerialization.def';
import { scenario as rulesDef } from './rules/rules.def';
import { scenario as aliasMappingDef } from './aliasMapping/aliasMapping.def';
import { scenario as isDirtyDef } from './isDirty/isDirty.def';
import { scenario as nestedConstructDef } from './nestedConstruct/nestedConstruct.def';
import { scenario as asyncRulesDef } from './asyncRules/asyncRules.def';
import { scenario as bulkConstructDef } from './bulkConstruct/bulkConstruct.def';
import { scenario as schemaMultiFormatDef } from './schemaMultiFormat/schemaMultiFormat.def';
import { scenario as validationReportDef } from './validationReport/validationReport.def';

// ─── Bench functions (.bench.ts) — Bun-only ─────────────────────────────────

import { describeBench as validationBench } from './validation/validation.bench';
import { describeBench as coercionBench } from './coercion/coercion.bench';
import { describeBench as serializationBench } from './serialization/serialization.bench';
import { describeBench as batchBench } from './batch/batch.bench';
import { describeBench as mocksBench } from './mocks/mocks.bench';
import { describeBench as performanceTargetsBench } from './performanceTargets/performanceTargets.bench';
import { describeBench as typeSerializationBench } from './typeSerialization/typeSerialization.bench';
import { describeBench as rulesBench } from './rules/rules.bench';
import { describeBench as aliasMappingBench } from './aliasMapping/aliasMapping.bench';
import { describeBench as isDirtyBench } from './isDirty/isDirty.bench';
import { describeBench as nestedConstructBench } from './nestedConstruct/nestedConstruct.bench';
import { describeBench as asyncRulesBench } from './asyncRules/asyncRules.bench';
import { describeBench as bulkConstructBench } from './bulkConstruct/bulkConstruct.bench';
import { describeBench as schemaMultiFormatBench } from './schemaMultiFormat/schemaMultiFormat.bench';
import { describeBench as validationReportBench } from './validationReport/validationReport.bench';
import { describeBench as featureMatrixBench } from './featureMatrix/featureMatrix.bench';

/**
 * Todos los módulos de benchmark en el orden de ejecución original.
 * bench #6 (performanceTargets) no tiene escenario comparativo → `scenario` omitido.
 */
export const allBenches: IBenchModule[] = [
	{ scenario: validationDef, describeBench: validationBench },
	{ scenario: coercionDef, describeBench: coercionBench },
	{ scenario: serializationDef, describeBench: serializationBench },
	{ scenario: batchDef, describeBench: batchBench },
	{ scenario: mocksDef, describeBench: mocksBench },
	{ describeBench: performanceTargetsBench }, // bench #6 — sin comparativa
	{ scenario: typeSerializationDef, describeBench: typeSerializationBench },
	{ scenario: rulesDef, describeBench: rulesBench },
	{ scenario: aliasMappingDef, describeBench: aliasMappingBench },
	{ scenario: isDirtyDef, describeBench: isDirtyBench },
	{ scenario: nestedConstructDef, describeBench: nestedConstructBench },
	{ scenario: asyncRulesDef, describeBench: asyncRulesBench },
	{ scenario: bulkConstructDef, describeBench: bulkConstructBench },
	{ scenario: schemaMultiFormatDef, describeBench: schemaMultiFormatBench },
	{ scenario: validationReportDef, describeBench: validationReportBench },
	{ describeBench: featureMatrixBench }, // resumen final — feature matrix comparativa
];
