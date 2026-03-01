// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
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
			complexUserRaw as unknown as IComplexUser // @quickmodel-rule-ignore: no-as-unknown
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
				const result = sjn.$qSerialize(superjsonFullObj);
				sjn.deserialize(result);
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('QuickModel — JSON crudo → tipado → serialize() → deserialize()', () => {
			const res = runBench(
				'Benchmark 7: QuickModel (full pipeline)',
				ITERS,
				() => {
					const inst = new ComplexUser(
						complexUserRaw as unknown as IComplexUser // @quickmodel-rule-ignore: no-as-unknown
					);
					ComplexUser.deserialize(inst.$qSerialize());
				}
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('📊 Comparativa #7 — fidelidad de tipos en serialización', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 7: Plain JSON (baseline)', ITERS, () => {
					JSON.parse(JSON.stringify({ ...complexUserRaw }));
				}),
				runBench('Benchmark 7: QuickModel (pipeline)', ITERS, () => {
					ComplexUser.deserialize(complexUserInstance.$qSerialize());
				}),
			];
			if (superjsonMod) {
				const sjn = superjsonMod.default ?? superjsonMod;
				allResults.splice(
					1,
					0,
					runBench('Benchmark 7: superjson', ITERS, () => {
						sjn.deserialize(sjn.$qSerialize(superjsonFullObj));
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

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
