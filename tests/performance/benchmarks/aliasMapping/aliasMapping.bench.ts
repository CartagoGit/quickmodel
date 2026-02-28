// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, notInstalled, printComparison, ctMod } from '../_shared';
import {
	ApiProfile,
	CTApiProfile,
	apiProfileSnakeRaw,
	type IProfileCamel,
} from '../_models';

export function describeBench(): void {
	describe('Benchmark #9 — API field mapping: @QAlias vs manual remap (2k it.)', () => {
		const ITERS = 2_000;

		test('[baseline] Plain JS — manual property rename (hardcoded mapper)', () => {
			const res = runBench('Benchmark 9: Plain JS', ITERS, () => {
				void {
					firstName: apiProfileSnakeRaw.first_name,
					lastName: apiProfileSnakeRaw.last_name,
					emailAddress: apiProfileSnakeRaw.email_address,
					isActive: apiProfileSnakeRaw.is_active,
				};
			});
			expect(res.totalMs).toBeLessThan(2000);
		});

		test('class-transformer — plainToInstance() (no auto-rename without @Expose+@Transform)', () => {
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
				'Benchmark 9: class-transformer',
				ITERS,
				() => {
					pti(CTApiProfile, apiProfileSnakeRaw);
				}
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('QuickModel — @QAlias("first_name") auto-mapping on instantiation ✅', () => {
			const res = runBench(
				'Benchmark 9: QuickModel @QAlias',
				ITERS,
				() => {
					void new ApiProfile(
						apiProfileSnakeRaw as unknown as IProfileCamel
					);
				}
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('📊 Comparativa #9 — field alias mapping', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 9: Plain JS', ITERS, () => {
					void {
						firstName: apiProfileSnakeRaw.first_name,
						lastName: apiProfileSnakeRaw.last_name,
						emailAddress: apiProfileSnakeRaw.email_address,
						isActive: apiProfileSnakeRaw.is_active,
					};
				}),
				runBench('Benchmark 9: QuickModel @QAlias', ITERS, () => {
					void new ApiProfile(
						apiProfileSnakeRaw as unknown as IProfileCamel
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
					runBench('Benchmark 9: class-transformer', ITERS, () => {
						pti(CTApiProfile, apiProfileSnakeRaw);
					})
				);
			}

			printComparison(
				'Benchmark #9 — Field alias mapping (Plain JS / CT / QuickModel)',
				allResults
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
