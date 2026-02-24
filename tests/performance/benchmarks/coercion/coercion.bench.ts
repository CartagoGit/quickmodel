import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import {
	runBench,
	notInstalled,
	printComparison,
	ctMod,
	valibotMod,
	cvMod,
	buildValibotSchemas,
} from '../_shared';
import {
	ComplexUser,
	CTComplexUser,
	CTSimpleUser,
	zodComplexUser,
	complexUserRaw,
	simpleUserData,
	type IComplexUser,
} from '../_models';

export function describeBench(): void {
	describe('Benchmark #2 — Coerción tipos complejos: Date + BigInt + Map + Set (1k it.)', () => {
		const ITERS = 1_000;

		test('valibot — pipe+transform manual (full: Date+BigInt+Map+Set)', () => {
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
			const res = runBench(
				'Benchmark 2: valibot (all transforms)',
				ITERS,
				() => {
					vbSafe(schemas.complexSchema, complexUserRaw);
				}
			);
			console.log(
				`\n[BENCH #2] valibot: ${res.opsPerSec.toLocaleString()} ops/sec — Date+BigInt+Map+Set manual`
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('Zod — z.coerce.date() + z.string().transform(BigInt) + array→Set/Map', () => {
			const res = runBench(
				'Benchmark 2: Zod (all transforms)',
				ITERS,
				() => {
					zodComplexUser.safeParse(complexUserRaw);
				}
			);
			console.log(
				`\n[BENCH #2] Zod: ${res.opsPerSec.toLocaleString()} ops/sec — Date+BigInt+Map+Set manual`
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('class-transformer — @Type(Date) solo (sin soporte BigInt/Map/Set)', () => {
			if (!ctMod) {
				notInstalled('class-transformer');
				expect(true).toBe(true);
				return;
			}
			const pti = ctMod.plainToInstance as (
				cls: unknown,
				plain: unknown
			) => unknown;
			const res = runBench(
				'Benchmark 2: class-transformer (Date only)',
				ITERS,
				() => {
					pti(CTComplexUser, complexUserRaw);
				}
			);
			console.log(
				`\n[BENCH #2] class-transformer: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  Solo mapea Date via @Type — BigInt, Map y Set quedan como string/array/array'
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('class-validator — validate() standalone (solo primitivos, no coerciona)', () => {
			if (!cvMod) {
				notInstalled('class-validator');
				expect(true).toBe(true);
				return;
			}
			const validateSync = cvMod.validateSync as (
				obj: object
			) => unknown[];
			const obj = Object.assign(new CTSimpleUser(), simpleUserData);
			const res = runBench('Benchmark 2: class-validator', ITERS, () => {
				validateSync(obj);
			});
			console.log(
				`\n[BENCH #2] class-validator: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  No coerciona tipos — solo valida que los valores ya tratados sean correctos'
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('QuickModel — @Quick({ createdAt: Date, balance: "bigint", ... }) automático ✅', () => {
			const res = runBench(
				'Benchmark 2: QuickModel (automatic)',
				ITERS,
				() => {
					void new ComplexUser(
						complexUserRaw as unknown as IComplexUser
					);
				}
			);
			console.log(
				`\n[BENCH #2] QuickModel: ${res.opsPerSec.toLocaleString()} ops/sec — Date+BigInt+Map+Set automático`
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('📊 Comparativa #2 — coerción tipos complejos', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 2: Zod (manual)', ITERS, () => {
					zodComplexUser.safeParse(complexUserRaw);
				}),
				runBench('Benchmark 2: QuickModel (auto)', ITERS, () => {
					void new ComplexUser(
						complexUserRaw as unknown as IComplexUser
					);
				}),
			];
			const vbSchemas = buildValibotSchemas();
			if (vbSchemas && valibotMod) {
				const vbSafe = valibotMod.safeParse as (
					s: unknown,
					v: unknown
				) => unknown;
				allResults.splice(
					0,
					0,
					runBench('Benchmark 2: valibot (manual)', ITERS, () => {
						vbSafe(vbSchemas.complexSchema, complexUserRaw);
					})
				);
			}
			if (ctMod) {
				const pti = ctMod.plainToInstance as (
					cls: unknown,
					plain: unknown
				) => unknown;
				allResults.splice(
					allResults.length - 1,
					0,
					runBench(
						'Benchmark 2: class-transformer (partial)',
						ITERS,
						() => {
							pti(CTComplexUser, complexUserRaw);
						}
					)
				);
			}
			if (cvMod && ctMod) {
				const pti = ctMod.plainToInstance as (
					cls: unknown,
					plain: unknown
				) => unknown;
				const validateSync = cvMod.validateSync as (
					obj: object
				) => unknown[];
				allResults.splice(
					allResults.length - 1,
					0,
					runBench('Benchmark 2: CT+CV combo', ITERS, () => {
						const inst = pti(
							CTComplexUser,
							complexUserRaw
						) as Record<string, unknown>;
						validateSync(inst);
					})
				);
			}

			printComparison(
				'Benchmark #2 — Coerción tipos complejos (valibot/Zod/CT/CT+CV vs QuickModel)',
				allResults
			);
			console.log(
				'\n  ✅ QuickModel: un solo decorador @Quick({...}) — cero código adicional'
			);
			console.log(
				'  ⚠️  valibot/Zod: requieren pipe(transform()) / z.coerce por cada campo'
			);
			console.log(
				'  ⚠️  class-transformer: solo Date via @Type — BigInt/Map/Set no soportados'
			);
			console.log(
				'  ⚠️  CT+CV combo: coerción parcial (Date) + validación — 2 librerías para lo que QM hace con 1'
			);
			console.log(
				'  🚫 Plain JS / TypeBox / yup: no soportan esta conversión\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
