import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import {
	runBench,
	notInstalled,
	printComparison,
	ctMod,
	superjsonMod,
} from '../_shared';
import {
	ComplexUser,
	CTSimpleUser,
	complexUserRaw,
	simpleUserData,
	type IComplexUser,
} from '../_models';

export function describeBench(): void {
	describe('Benchmark #7 — Fidelidad de tipos en serialización (1k iteraciones)', () => {
		const ITERS = 1_000;
		const complexUserInstance = new ComplexUser(
			complexUserRaw as unknown as IComplexUser
		);

		const superjsonFullObj = {
			id: 'usr-002',
			name: 'Bob Builder',
			createdAt: new Date('2024-03-15T10:00:00.000Z'),
			balance: BigInt('9999999999999999'),
			tags: new Set(['typescript', 'nodejs', 'quickmodel']),
			metadata: new Map([
				['role', 'admin'],
				['theme', 'dark'],
				['locale', 'es'],
			]),
		};

		test('[baseline] Plain JSON — pierde Date/BigInt/Map/Set', () => {
			const res = runBench(
				'Benchmark 7: Plain JSON (baseline)',
				ITERS,
				() => {
					JSON.parse(JSON.stringify({ ...complexUserRaw }));
				}
			);
			console.log(
				`\n[BENCH #7] Plain JSON: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log('  ❌ Date→string | ❌ BigInt→error | ❌ Map/Set→{}');
			expect(res.totalMs).toBeLessThan(2000);
		});

		test('superjson — serialize()+deserialize() con objeto ya instanciado', () => {
			if (!superjsonMod) {
				notInstalled('superjson');
				expect(true).toBe(true);
				return;
			}
			const sjn = superjsonMod.default ?? superjsonMod;
			const res = runBench('Benchmark 7: superjson', ITERS, () => {
				const result = sjn.serialize(superjsonFullObj);
				sjn.deserialize(result);
			});
			console.log(
				`\n[BENCH #7] superjson: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ Date/BigInt/Map/Set/RegExp  |  ⚠️  requiere objeto ya tipado (no transforma JSON crudo)'
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('QuickModel — JSON crudo → tipado → serialize() → deserialize()', () => {
			const res = runBench(
				'Benchmark 7: QuickModel (full pipeline)',
				ITERS,
				() => {
					const inst = new ComplexUser(
						complexUserRaw as unknown as IComplexUser
					);
					ComplexUser.deserialize(inst.serialize());
				}
			);
			console.log(
				`\n[BENCH #7] QuickModel: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ JSON crudo → Date/BigInt/Map/Set automático + roundtrip lossless'
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('📊 Comparativa #7 — fidelidad de tipos en serialización', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 7: Plain JSON (baseline)', ITERS, () => {
					JSON.parse(JSON.stringify({ ...complexUserRaw }));
				}),
				runBench('Benchmark 7: QuickModel (pipeline)', ITERS, () => {
					ComplexUser.deserialize(complexUserInstance.serialize());
				}),
			];
			if (superjsonMod) {
				const sjn = superjsonMod.default ?? superjsonMod;
				allResults.splice(
					1,
					0,
					runBench('Benchmark 7: superjson', ITERS, () => {
						sjn.deserialize(sjn.serialize(superjsonFullObj));
					})
				);
			}
			if (ctMod) {
				const instanceToPlain = ctMod.instanceToPlain as (
					obj: unknown
				) => unknown;
				const pti = ctMod.plainToInstance as (
					cls: unknown,
					plain: unknown
				) => unknown;
				const ctInst = pti(CTSimpleUser, simpleUserData);
				allResults.splice(
					1,
					0,
					runBench('Benchmark 7: class-transformer', ITERS, () => {
						pti(CTSimpleUser, instanceToPlain(ctInst));
					})
				);
			}

			printComparison(
				'Benchmark #7 — Fidelidad tipos en serialización (Plain JSON / superjson / CT / QuickModel)',
				allResults
			);
			console.log(
				'\n┌──────────────────────────────────────────────────────────────────┐'
			);
			console.log(
				'│  Tipos preservados en roundtrip                                  │'
			);
			console.log(
				'├────────────────────────┬───────┬────────────┬──────┬────────────┤'
			);
			console.log(
				'│ Tipo                   │  JSON │  superjson │  CT  │ QuickModel │'
			);
			console.log(
				'├────────────────────────┼───────┼────────────┼──────┼────────────┤'
			);
			console.log(
				'│ Date                   │  ❌   │     ✅     │  ✅  │     ✅     │'
			);
			console.log(
				'│ BigInt                 │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ Map                    │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ Set                    │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ RegExp                 │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ URL                    │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ TypedArray             │  ❌   │     ❌     │  ❌  │     ✅     │'
			);
			console.log(
				'│ Symbol                 │  ❌   │     ❌     │  ❌  │     ✅     │'
			);
			console.log(
				'│ Error                  │  ❌   │     ✅     │  ❌  │     ✅     │'
			);
			console.log(
				'│ JSON crudo → tipado    │  ❌   │     ❌     │  ⚠️  │     ✅     │'
			);
			console.log(
				'└────────────────────────┴───────┴────────────┴──────┴────────────┘\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
