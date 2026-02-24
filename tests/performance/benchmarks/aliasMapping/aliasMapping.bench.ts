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
			console.log(
				`\n[BENCH #9] Plain JS: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  🔧 Hardcoded mapper — breaks on every field name change'
			);
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
			console.log(
				`\n[BENCH #9] class-transformer: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  Keeps original snake_case keys — real rename needs @Expose({name}) + excludeExtraneousValues'
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
			console.log(
				`\n[BENCH #9] QuickModel @QAlias: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ @QAlias("first_name") → firstName — zero-boilerplate, compatible con coerción + validation'
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
			console.log(
				'\n  ✅ QuickModel @QAlias: zero glue code, works with coerción de tipos integrada'
			);
			console.log(
				'  ⚠️  class-transformer: sin @Expose+@Transform no renombra — requiere setup por campo'
			);
			console.log(
				'  🔧 Plain JS: mapper manual brittle — se rompe con cada cambio de campo\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
