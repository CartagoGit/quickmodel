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
			console.log(
				`\n[BENCH #10] Plain JS JSON.stringify: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  O(n) — serializa el objeto completo en cada check; costoso con objetos grandes'
			);
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
			console.log(
				`\n[BENCH #10] Immer: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ produce() retorna nueva ref si hay cambios — O(1) via structural sharing'
			);
			console.log(
				'  ⚠️  Sin getDirtyFields(), patch() ni reset() — gestión manual de estado'
			);
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
			console.log(
				`\n[BENCH #10] QuickModel isDirty: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ patch() + isDirty() — field-level Set tracking, reset() restaura al estado inicial'
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
			console.log(
				'\n  ✅ QuickModel isDirty() — O(1), campo a campo con getDirtyFields() disponible'
			);
			console.log(
				'  ⚠️  JSON.stringify — O(n): serializa todo el objeto en cada llamada'
			);
			console.log(
				'  💡 isDirty("name") verifica un solo campo — aun más rápido\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
