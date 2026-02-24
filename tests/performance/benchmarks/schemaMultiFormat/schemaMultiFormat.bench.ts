import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, printComparison, typeboxMod } from '../_shared';
import { ProductModel } from '../_models';

const ALL_FORMATS = [
	'json',
	'zod',
	'openapi',
	'typescript',
	'graphql',
	'mongo',
	'ajv',
] as const;

export function describeBench(): void {
	describe('Benchmark #14 — Schema multi-format: getSchema() 7 formatos vs alternativas (2k it.)', () => {
		const ITERATIONS = 2_000;

		test('QuickModel — ProductModel.getSchema() × 7 formatos ✅', () => {
			const result = runBench(
				'[BENCH #14] QuickModel',
				ITERATIONS,
				() => {
					for (const fmt of ALL_FORMATS) {
						ProductModel.getSchema(fmt);
					}
				}
			);
			console.log(
				`  ✅ QuickModel: ${result.opsPerSec.toLocaleString()} ops/sec (× 7 formatos por iteración)`
			);
			console.log(
				`     Equivalente a ~${(result.opsPerSec * 7).toLocaleString()} exports/sec`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('TypeBox — JSON Schema nativo (1 formato: stringify del Type) ⚠️', () => {
			if (!typeboxMod) {
				console.log('  TypeBox no instalado — skipping');
				return;
			}
			const tbox = typeboxMod;
			const tbSchemaProduct = tbox.Type.Object({
				id: tbox.Type.Number(),
				name: tbox.Type.String(),
				price: tbox.Type.Number(),
				createdAt: tbox.Type.String({ format: 'date-time' }),
			});
			const result = runBench('[BENCH #14] TypeBox', ITERATIONS, () => {
				JSON.stringify(tbSchemaProduct);
			});
			console.log(
				`  ⚠️  TypeBox: ${result.opsPerSec.toLocaleString()} ops/sec (solo 1 formato: JSON Schema)`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('Plain JS — construir JSON Schema manualmente (1 formato) ⚠️', () => {
			const result = runBench('[BENCH #14] Plain JS', ITERATIONS, () => {
				const schema = {
					$schema: 'http://json-schema.org/draft-07/schema#',
					type: 'object',
					title: 'ProductModel',
					properties: {
						id: { type: 'number' },
						name: { type: 'string' },
						price: { type: 'number' },
						createdAt: { type: 'string', format: 'date-time' },
					},
					required: ['id', 'name', 'price', 'createdAt'],
				};
				void schema;
			});
			console.log(
				`  ⚠️  Plain JS: ${result.opsPerSec.toLocaleString()} ops/sec (solo 1 formato: JSON Schema manual)`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('Resumen Benchmark #14 — comparativa + notas', () => {
			const allResults: IBenchResult[] = [];

			const qmResult = runBench(
				'[BENCH #14] QuickModel',
				ITERATIONS,
				() => {
					for (const fmt of ALL_FORMATS) ProductModel.getSchema(fmt);
				}
			);
			allResults.push(qmResult);

			if (typeboxMod) {
				const tbox = typeboxMod;
				const tbSch = tbox.Type.Object({
					id: tbox.Type.Number(),
					name: tbox.Type.String(),
					price: tbox.Type.Number(),
					createdAt: tbox.Type.String({ format: 'date-time' }),
				});
				allResults.push(
					runBench('[BENCH #14] TypeBox', ITERATIONS, () =>
						JSON.stringify(tbSch)
					)
				);
			}

			allResults.push(
				runBench('[BENCH #14] Plain JS', ITERATIONS, () => {
					const sch = {
						$schema: 'http://json-schema.org/draft-07/schema#',
						type: 'object',
						properties: {
							id: { type: 'number' },
							name: { type: 'string' },
							price: { type: 'number' },
							createdAt: { type: 'string', format: 'date-time' },
						},
						required: ['id', 'name', 'price', 'createdAt'],
					};
					void sch;
				})
			);

			printComparison(
				'Benchmark #14 — Schema multi-format (QM × 7 / TypeBox × 1 / Plain JS × 1)',
				allResults
			);
			console.log(
				`  ✅ QuickModel genera ${ALL_FORMATS.length} formatos por llamada: JSON Schema, Zod, OpenAPI 3.0, TypeScript, GraphQL SDL, MongoDB, AJV`
			);
			console.log(
				`  ✅ Equivalente en exports/sec: ~${(qmResult.opsPerSec * ALL_FORMATS.length).toLocaleString()}`
			);
			console.log(
				'  ⚠️  TypeBox: el Type object ES el schema — acceso O(1), pero solo JSON Schema nativo'
			);
			console.log(
				'  ⚠️  Plain JS: object literal estático, 1 formato, sin reutilización ni decoradores\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
