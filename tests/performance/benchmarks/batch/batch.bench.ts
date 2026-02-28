// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import {
	runBench,
	notInstalled,
	printComparison,
	typeboxValueMod,
	valibotMod,
	arktypeMod,
	joiMod,
	buildTypeboxSchemas,
	buildValibotSchemas,
	buildArktypeSchemas,
	buildYupSchemas,
	buildJoiSchemas,
} from '../_shared';
import { SimpleUser, zodSimpleUser, type ISimpleUser } from '../_models';

export function describeBench(): void {
	describe('Benchmark #4 — Validación batch 1k objetos', () => {
		const CYCLES = 10;
		const BATCH = 1_000;

		const dataset = Array.from({ length: BATCH }, (_, idx) => ({
			id: `usr-${idx}`,
			name: `User ${idx}`,
			email: `user${idx}@test.com`,
			age: 20 + (idx % 60),
			active: idx % 2 === 0,
		}));

		test('TypeBox — Value.Check × 1k', () => {
			const schemas = buildTypeboxSchemas();
			if (!schemas || !typeboxValueMod) {
				notInstalled('TypeBox');
				expect(true).toBe(true);
				return;
			}
			const check = typeboxValueMod.Value.Check as (
				s: unknown,
				v: unknown
			) => boolean;
			const res = runBench('Benchmark 4: TypeBox batch', CYCLES, () => {
				for (const item of dataset) check(schemas.simpleSchema, item);
			});
			console.log(
				`\n[BENCH #4] TypeBox: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('valibot — safeParse × 1k', () => {
			const schemas = buildValibotSchemas();
			if (!schemas || !valibotMod) {
				notInstalled('valibot');
				expect(true).toBe(true);
				return;
			}
			const vbSafe = valibotMod.safeParse as (
				s: unknown,
				v: unknown
			) => unknown;
			const res = runBench('Benchmark 4: valibot batch', CYCLES, () => {
				for (const item of dataset) vbSafe(schemas.simpleSchema, item);
			});
			console.log(
				`\n[BENCH #4] valibot: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('Zod — safeParse × 1k', () => {
			const res = runBench('Benchmark 4: Zod batch', CYCLES, () => {
				for (const item of dataset) zodSimpleUser.safeParse(item);
			});
			console.log(
				`\n[BENCH #4] Zod: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('yup — validateSync × 1k', () => {
			const schemas = buildYupSchemas();
			if (!schemas) {
				notInstalled('yup');
				expect(true).toBe(true);
				return;
			}
			const validate = schemas.simpleSchema.validateSync.bind(
				schemas.simpleSchema
			) as (v: unknown) => unknown;
			const res = runBench('Benchmark 4: yup batch', CYCLES, () => {
				for (const item of dataset) validate(item);
			});
			console.log(
				`\n[BENCH #4] yup: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('arktype — validate() × 1k', () => {
			const schemas = buildArktypeSchemas();
			if (!schemas || !arktypeMod) {
				notInstalled('arktype');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 4: arktype batch', CYCLES, () => {
				for (const item of dataset) schemas.simpleSchema(item);
			});
			console.log(
				`\n[BENCH #4] arktype: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('joi — validate() × 1k', () => {
			const schemas = buildJoiSchemas();
			if (!schemas || !joiMod) {
				notInstalled('joi');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 4: joi batch', CYCLES, () => {
				for (const item of dataset)
					schemas.simpleSchema.validate(item, { abortEarly: false });
			});
			console.log(
				`\n[BENCH #4] joi: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('QuickModel — isValid() × 1k', () => {
			const models = dataset.map(
				(item) => new SimpleUser(item as unknown as ISimpleUser)
			);
			const res = runBench(
				'Benchmark 4: QuickModel batch',
				CYCLES,
				() => {
					for (const model of models) model.isValid();
				}
			);
			console.log(
				`\n[BENCH #4] QuickModel: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('[baseline] Plain JS — typeof manual por campo (sin schema)', () => {
			const res = runBench('Benchmark 4: Plain JS', CYCLES, () => {
				for (const item of dataset) {
					void (
						typeof item.id === 'string' &&
						typeof item.name === 'string' &&
						typeof item.email === 'string' &&
						typeof item.age === 'number' &&
						typeof item.active === 'boolean'
					);
				}
			});
			console.log(
				`\n[BENCH #4] Plain JS: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			console.log(
				'  ⚠️  typeof manual — sin coerción, sin mensajes de error, frágil ante cambios de schema'
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('📊 Comparativa #4 — batch validation', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 4: Zod batch', CYCLES, () => {
					for (const item of dataset) zodSimpleUser.safeParse(item);
				}),
				runBench('Benchmark 4: QuickModel batch', CYCLES, () => {
					const models = dataset.map(
						(item) => new SimpleUser(item as unknown as ISimpleUser)
					);
					for (const model of models) model.isValid();
				}),
			];
			const tbSchemas = buildTypeboxSchemas();
			if (tbSchemas && typeboxValueMod) {
				const check = typeboxValueMod.Value.Check as (
					s: unknown,
					v: unknown
				) => boolean;
				allResults.splice(
					0,
					0,
					runBench('Benchmark 4: TypeBox batch', CYCLES, () => {
						for (const item of dataset)
							check(tbSchemas.simpleSchema, item);
					})
				);
			}
			const vbSchemas = buildValibotSchemas();
			if (vbSchemas && valibotMod) {
				const vbSafe = valibotMod.safeParse as (
					s: unknown,
					v: unknown
				) => unknown;
				allResults.splice(
					1,
					0,
					runBench('Benchmark 4: valibot batch', CYCLES, () => {
						for (const item of dataset)
							vbSafe(vbSchemas.simpleSchema, item);
					})
				);
			}
			const arkSchemas = buildArktypeSchemas();
			if (arkSchemas && arktypeMod) {
				allResults.splice(
					2,
					0,
					runBench('Benchmark 4: arktype batch', CYCLES, () => {
						for (const item of dataset)
							arkSchemas.simpleSchema(item);
					})
				);
			}
			const yupSchemas = buildYupSchemas();
			if (yupSchemas) {
				const validate = yupSchemas.simpleSchema.validateSync.bind(
					yupSchemas.simpleSchema
				) as (v: unknown) => unknown;
				allResults.splice(
					allResults.length - 1,
					0,
					runBench('Benchmark 4: yup batch', CYCLES, () => {
						for (const item of dataset) validate(item);
					})
				);
			}
			const joiSchemas = buildJoiSchemas();
			if (joiSchemas && joiMod) {
				allResults.splice(
					allResults.length - 1,
					0,
					runBench('Benchmark 4: joi batch', CYCLES, () => {
						for (const item of dataset)
							joiSchemas.simpleSchema.validate(item, {
								abortEarly: false,
							});
					})
				);
			}

			allResults.push(
				runBench('Benchmark 4: Plain JS', CYCLES, () => {
					for (const item of dataset) {
						void (
							typeof item.id === 'string' &&
							typeof item.name === 'string' &&
							typeof item.email === 'string' &&
							typeof item.age === 'number' &&
							typeof item.active === 'boolean'
						);
					}
				})
			);

			printComparison(
				'Benchmark #4 — Batch validation 1k obj (TypeBox/valibot/arktype/Zod/yup/joi/QuickModel/Plain JS)',
				allResults
			);
			console.log(
				'\n  ℹ️  class-transformer excluido: no valida — necesita class-validator por separado'
			);
			console.log(
				'  ⚠️  Plain JS: typeof manual — sin coerción, sin mensajes; referencia de velocidad máxima\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
