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
import { SimpleUser, zodSimpleUser, simpleUserData } from '../_models';

export function describeBench(): void {
	describe('Benchmark #1 — Validación objetos simples (10k iteraciones)', () => {
		const ITERS = 10_000;

		test('[baseline] Plain JS — objeto literal, sin validación', () => {
			const res = runBench('Benchmark 1: Plain JS', ITERS, () => {
				void {
					id: 'usr-001',
					name: 'Alice Wonderland',
					email: 'alice@example.com',
					age: 30,
					active: true,
				};
			});
			console.log(
				`\n[BENCH #1] Plain JS (baseline): ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(100);
		});

		test('TypeBox — Value.Check() (JSON Schema compilado, más rápido)', () => {
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
			const res = runBench('Benchmark 1: TypeBox', ITERS, () => {
				check(schemas.simpleSchema, simpleUserData);
			});
			console.log(
				`\n[BENCH #1] TypeBox: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('valibot — safeParse (modular, tree-shakeable)', () => {
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
			const res = runBench('Benchmark 1: valibot', ITERS, () => {
				vbSafe(schemas.simpleSchema, simpleUserData);
			});
			console.log(
				`\n[BENCH #1] valibot: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('Zod — safeParse', () => {
			const res = runBench('Benchmark 1: Zod', ITERS, () => {
				zodSimpleUser.safeParse(simpleUserData);
			});
			console.log(
				`\n[BENCH #1] Zod: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('yup — validateSync', () => {
			const schemas = buildYupSchemas();
			if (!schemas) {
				notInstalled('yup');
				expect(true).toBe(true);
				return;
			}
			const validate = schemas.simpleSchema.validateSync.bind(
				schemas.simpleSchema
			) as (v: unknown) => unknown;
			const res = runBench('Benchmark 1: yup', ITERS, () => {
				validate(simpleUserData);
			});
			console.log(
				`\n[BENCH #1] yup: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('arktype — validate() (type-safe, TypeScript-native)', () => {
			const schemas = buildArktypeSchemas();
			if (!schemas || !arktypeMod) {
				notInstalled('arktype');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 1: arktype', ITERS, () => {
				schemas.simpleSchema(simpleUserData);
			});
			console.log(
				`\n[BENCH #1] arktype: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('joi — validate() (clásico, API fluida)', () => {
			const schemas = buildJoiSchemas();
			if (!schemas || !joiMod) {
				notInstalled('joi');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 1: joi', ITERS, () => {
				schemas.simpleSchema.validate(simpleUserData, {
					abortEarly: false,
				});
			});
			console.log(
				`\n[BENCH #1] joi: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('QuickModel — new SimpleUser() (validación + integridad en runtime)', () => {
			const res = runBench('Benchmark 1: QuickModel', ITERS, () => {
				void new SimpleUser(simpleUserData);
			});
			console.log(
				`\n[BENCH #1] QuickModel: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('📊 Comparativa #1 — validación simple', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 1: Plain JS (baseline)', ITERS, () => {
					void {
						id: 'usr-001',
						name: 'Alice',
						email: 'alice@e.com',
						age: 30,
						active: true,
					};
				}),
				runBench('Benchmark 1: Zod', ITERS, () => {
					zodSimpleUser.safeParse(simpleUserData);
				}),
				runBench('Benchmark 1: QuickModel', ITERS, () => {
					void new SimpleUser(simpleUserData);
				}),
			];

			const tbSchemas = buildTypeboxSchemas();
			if (tbSchemas && typeboxValueMod) {
				const check = typeboxValueMod.Value.Check as (
					s: unknown,
					v: unknown
				) => boolean;
				allResults.splice(
					1,
					0,
					runBench('Benchmark 1: TypeBox', ITERS, () => {
						check(tbSchemas.simpleSchema, simpleUserData);
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
					2,
					0,
					runBench('Benchmark 1: valibot', ITERS, () => {
						vbSafe(vbSchemas.simpleSchema, simpleUserData);
					})
				);
			}
			const arkSchemas = buildArktypeSchemas();
			if (arkSchemas && arktypeMod) {
				allResults.splice(
					3,
					0,
					runBench('Benchmark 1: arktype', ITERS, () => {
						arkSchemas.simpleSchema(simpleUserData);
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
					runBench('Benchmark 1: yup', ITERS, () => {
						validate(simpleUserData);
					})
				);
			}
			const joiSchemas = buildJoiSchemas();
			if (joiSchemas && joiMod) {
				allResults.splice(
					allResults.length - 1,
					0,
					runBench('Benchmark 1: joi', ITERS, () => {
						joiSchemas.simpleSchema.validate(simpleUserData, {
							abortEarly: false,
						});
					})
				);
			}

			printComparison(
				'Benchmark #1 — Validación simple (TypeBox/valibot/arktype/Zod/yup/joi/QuickModel vs Plain JS)',
				allResults
			);
			console.log(
				'\n  ℹ️  class-transformer excluido: serializa clases, no valida schemas'
			);
			console.log(
				'  ℹ️  QuickModel hace validación + coerción + integridad en una sola llamada\n'
			);

			const qmOps =
				allResults.find((res) => res.name.includes('QuickModel'))
					?.opsPerSec ?? 1;
			expect(qmOps).toBeGreaterThan(0);
		});
	});
}
