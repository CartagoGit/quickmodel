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
	describe('Benchmark #3 — Roundtrip serialización (1k iteraciones)', () => {
		const ITERS = 1_000;
		const complexUserInstance = new ComplexUser(
			complexUserRaw as unknown as IComplexUser
		);

		test('[baseline] Plain JSON — stringify + parse (pierde Date/BigInt/Map/Set)', () => {
			const obj = {
				id: 'usr-001',
				name: 'Alice',
				email: 'alice@e.com',
				age: 30,
				active: true,
			};
			const res = runBench(
				'Benchmark 3: Plain JSON (baseline)',
				ITERS,
				() => {
					JSON.parse(JSON.stringify(obj));
				}
			);
			expect(res.totalMs).toBeLessThan(2000);
		});

		test('superjson — serialize() + deserialize() (preserva Date/BigInt/Map/Set/RegExp)', () => {
			if (!superjsonMod) {
				notInstalled('superjson');
				expect(true).toBe(true);
				return;
			}
			const sjn = superjsonMod.default ?? superjsonMod;
			const obj = {
				id: 'usr-002',
				name: 'Bob',
				createdAt: new Date('2024-03-15T10:00:00.000Z'),
				balance: BigInt('9999999999999999'),
				tags: new Set(['typescript', 'nodejs']),
				metadata: new Map([['role', 'admin']]),
			};
			const res = runBench('Benchmark 3: superjson', ITERS, () => {
				const { json, meta } = sjn.serialize(obj);
				sjn.deserialize({ json, meta });
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('class-transformer — instanceToPlain() + plainToInstance() (Date ✅, BigInt/Map/Set ❌)', () => {
			if (!ctMod) {
				notInstalled('class-transformer');
				expect(true).toBe(true);
				return;
			}
			const instanceToPlain = ctMod.instanceToPlain as (
				obj: unknown
			) => unknown;
			const pti = ctMod.plainToInstance as (
				cls: unknown,
				plain: unknown
			) => unknown;
			const ctInstance = pti(CTSimpleUser, simpleUserData);
			const res = runBench(
				'Benchmark 3: class-transformer',
				ITERS,
				() => {
					const plain = instanceToPlain(ctInstance);
					pti(CTSimpleUser, plain);
				}
			);
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('QuickModel — serialize() + deserialize() con tipos preservados ✅', () => {
			const res = runBench('Benchmark 3: QuickModel', ITERS, () => {
				const serialized = complexUserInstance.serialize();
				ComplexUser.deserialize(serialized);
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('📊 Comparativa #3 — roundtrip serialización', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 3: Plain JSON (baseline)', ITERS, () => {
					JSON.parse(JSON.stringify(simpleUserData));
				}),
				runBench('Benchmark 3: QuickModel (full)', ITERS, () => {
					ComplexUser.deserialize(complexUserInstance.serialize());
				}),
			];
			if (superjsonMod) {
				const sjn = superjsonMod.default ?? superjsonMod;
				const sjObj = {
					id: 'usr-002',
					name: 'Bob',
					createdAt: new Date('2024-03-15T10:00:00.000Z'),
					balance: BigInt('9999999999999999'),
					tags: new Set(['typescript', 'nodejs', 'quickmodel']),
					metadata: new Map([
						['role', 'admin'],
						['theme', 'dark'],
					]),
				};
				allResults.splice(
					1,
					0,
					runBench('Benchmark 3: superjson', ITERS, () => {
						const { json, meta } = sjn.serialize(sjObj);
						sjn.deserialize({ json, meta });
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
					runBench('Benchmark 3: class-transformer', ITERS, () => {
						pti(CTSimpleUser, instanceToPlain(ctInst));
					})
				);
			}

			printComparison(
				'Benchmark #3 — Roundtrip serialización (Plain JSON / superjson / CT / QuickModel)',
				allResults
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
