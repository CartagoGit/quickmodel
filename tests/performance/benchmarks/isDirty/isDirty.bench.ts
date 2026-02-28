import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, printComparison, notInstalled, immerMod } from '../_shared';
import { SimpleUser, simpleUserData } from '../_models';

export function describeBench(): void {
	describe('Benchmark #10 — isDirty change detection: patch+isDirty vs JSON.stringify (5k it.)', () => {
		const ITERS = 5_000;

		test('[baseline] Plain JS — JSON.stringify comparison (pattern habitual)', () => {
			const snapshot = JSON.stringify(simpleUserData);
			const mutated = { ...simpleUserData, name: 'Bob Builder', age: 31 };
			const res = runBench('Benchmark 10: Plain JS', ITERS, () => {
				void (JSON.stringify(mutated) !== snapshot);
			});
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('Immer — produce() + reference check (structural sharing) ✅', () => {
			if (!immerMod) {
				notInstalled('Immer');
				expect(true).toBe(true);
				return;
			}
			type IProduceFn = <T>(base: T, recipe: (draft: T) => void) => T;
			const produce = immerMod.produce as IProduceFn;
			const baseState = { ...simpleUserData };
			const res = runBench('Benchmark 10: Immer', ITERS, () => {
				const next = produce(baseState, (draft) => {
					draft.name = 'Bob Builder';
					draft.age = 31;
				});
				void (next !== baseState);
			});
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('QuickModel — patch() + isDirty() (O(1) field tracking) ✅', () => {
			const user = new SimpleUser(simpleUserData);
			const res = runBench(
				'Benchmark 10: QuickModel isDirty',
				ITERS,
				() => {
					user.patch({ name: 'Bob Builder', age: 31 });
					void user.isDirty();
					user.reset();
				}
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('📊 Comparativa #10 — isDirty change detection', () => {
			const snapshot = JSON.stringify(simpleUserData);
			const mutated = { ...simpleUserData, name: 'Bob Builder', age: 31 };
			const user = new SimpleUser(simpleUserData);
			type IProduceFn = <T>(base: T, recipe: (draft: T) => void) => T;
			const produce = immerMod ? (immerMod.produce as IProduceFn) : null;
			const baseState = { ...simpleUserData };

			const allResults: IBenchResult[] = [
				runBench('Benchmark 10: Plain JS', ITERS, () => {
					void (JSON.stringify(mutated) !== snapshot);
				}),
				...(produce
					? [
							runBench('Benchmark 10: Immer', ITERS, () => {
								const next = produce(baseState, (draft) => {
									draft.name = 'Bob Builder';
									draft.age = 31;
								});
								void (next !== baseState);
							}),
						]
					: []),
				runBench('Benchmark 10: QuickModel isDirty', ITERS, () => {
					user.patch({ name: 'Bob Builder', age: 31 });
					void user.isDirty();
					user.reset();
				}),
			];
			printComparison(
				'Benchmark #10 — Change detection (Plain JS JSON.stringify vs QuickModel isDirty)',
				allResults
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
