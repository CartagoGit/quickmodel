// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, notInstalled, printComparison, ctMod } from '../_shared';
import {
	SimpleUser,
	CTSimpleUser,
	zodSimpleUser,
	type ISimpleUser,
} from '../_models';

export function describeBench(): void {
	describe('Benchmark #13 — Bulk typed construction: createMany vs alternativas (5 ciclos 500 obj)', () => {
		const CYCLES = 5;
		const BULK = 500;

		const bulkDataset = Array.from({ length: BULK }, (_, idx) => ({
			id: `usr-${idx}`,
			name: `User ${idx}`,
			email: `user${idx}@test.com`,
			age: 20 + (idx % 60),
			active: idx % 2 === 0,
		}));

		test('[baseline] Plain JS — array.map() spread (sin validación ni tipos)', () => {
			const res = runBench('Benchmark 13: Plain JS', CYCLES, () => {
				bulkDataset.map((item) => ({ ...item }));
			});
			console.log(
				`\n[BENCH #13] Plain JS: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('class-transformer — plainToInstance(CTSimpleUser, array) (sin validación)', () => {
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
				'Benchmark 13: class-transformer',
				CYCLES,
				() => {
					pti(CTSimpleUser, bulkDataset);
				}
			);
			console.log(
				`\n[BENCH #13] class-transformer: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			console.log(
				'  ⚠️  Solo mapea a clase — sin integridad, sin reglas, BigInt/Map/Set no soportado'
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('Zod — safeParse() per item (validación, retorna plain objects)', () => {
			const res = runBench('Benchmark 13: Zod', CYCLES, () => {
				bulkDataset.map((item) => zodSimpleUser.safeParse(item));
			});
			console.log(
				`\n[BENCH #13] Zod: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			console.log(
				'  ⚠️  Valida pero retorna plain objects — no instancias tipadas con métodos'
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('QuickModel — createMany() con integridad + reglas en una llamada ✅', () => {
			const res = runBench(
				'Benchmark 13: QuickModel createMany',
				CYCLES,
				() => {
					SimpleUser.createMany(
						bulkDataset as unknown as ISimpleUser[]
					);
				}
			);
			console.log(
				`\n[BENCH #13] QuickModel createMany: ${res.opsPerSec.toLocaleString()} cycles/sec`
			);
			console.log(
				'  ✅ Instancias tipadas + integridad + reglas; separa válidos/inválidos automáticamente'
			);
			expect(res.opsPerSec).toBeGreaterThan(0);
		});

		test('📊 Comparativa #13 — bulk construction', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 13: Plain JS', CYCLES, () => {
					bulkDataset.map((item) => ({ ...item }));
				}),
				runBench('Benchmark 13: Zod', CYCLES, () => {
					bulkDataset.map((item) => zodSimpleUser.safeParse(item));
				}),
				runBench('Benchmark 13: QuickModel createMany', CYCLES, () => {
					SimpleUser.createMany(
						bulkDataset as unknown as ISimpleUser[]
					);
				}),
			];

			if (ctMod) {
				const pti = ctMod.plainToInstance as (
					cls: unknown,
					plain: unknown
				) => unknown;
				allResults.splice(
					1,
					0,
					runBench('Benchmark 13: class-transformer', CYCLES, () => {
						pti(CTSimpleUser, bulkDataset);
					})
				);
			}

			printComparison(
				'Benchmark #13 — Bulk construction (Plain JS / CT / Zod / QuickModel)',
				allResults
			);
			console.log(
				'\n  ✅ QuickModel createMany: instancias tipadas + validación completa + separación válidos/inválidos'
			);
			console.log(
				'  ⚠️  class-transformer: solo mapeo a clase — sin integridad, sin reglas, BigInt/Map/Set no soportado'
			);
			console.log(
				'  ⚠️  Zod.safeParse: valida pero retorna plain objects — no instancias con métodos\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
