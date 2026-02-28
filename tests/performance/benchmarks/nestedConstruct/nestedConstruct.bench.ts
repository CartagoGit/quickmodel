// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, notInstalled, printComparison, ctMod } from '../_shared';
import { Order, CTOrder, orderRaw, type IOrder } from '../_models';

export function describeBench(): void {
	describe('Benchmark #11 — Nested model construction: @Quick auto-coercion vs manual (1k it.)', () => {
		const ITERS = 1_000;

		test('[baseline] Plain JS — manual deep mapping', () => {
			const res = runBench('Benchmark 11: Plain JS', ITERS, () => {
				void {
					id: orderRaw.id,
					total: BigInt(orderRaw.total),
					placedAt: new Date(orderRaw.placedAt),
					customer: { ...orderRaw.customer },
					items: orderRaw.items.map((item) => ({ ...item })),
				};
			});
			console.log(
				`\n[BENCH #11] Plain JS: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  🔧 Manual BigInt/Date construction per field — brittle bajo cambios de schema'
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('class-transformer — plainToInstance() (BigInt queda como string sin @Transform)', () => {
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
				'Benchmark 11: class-transformer',
				ITERS,
				() => {
					pti(CTOrder, orderRaw);
				}
			);
			console.log(
				`\n[BENCH #11] class-transformer: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  total permanece como string — BigInt no soportado sin @Transform manual'
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('QuickModel — @Quick({ total: "bigint", placedAt: Date }) automático ✅', () => {
			const res = runBench(
				'Benchmark 11: QuickModel nested',
				ITERS,
				() => {
					void new Order(orderRaw as unknown as IOrder);
				}
			);
			console.log(
				`\n[BENCH #11] QuickModel: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ Un solo decorador @Quick — BigInt + Date + nested objects en una llamada'
			);
			expect(res.totalMs).toBeLessThan(5000);
		});

		test('📊 Comparativa #11 — nested construction', () => {
			const allResults: IBenchResult[] = [
				runBench('Benchmark 11: Plain JS', ITERS, () => {
					void {
						id: orderRaw.id,
						total: BigInt(orderRaw.total),
						placedAt: new Date(orderRaw.placedAt),
						customer: { ...orderRaw.customer },
						items: orderRaw.items.map((item) => ({ ...item })),
					};
				}),
				runBench('Benchmark 11: QuickModel nested', ITERS, () => {
					void new Order(orderRaw as unknown as IOrder);
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
					runBench('Benchmark 11: class-transformer', ITERS, () => {
						pti(CTOrder, orderRaw);
					})
				);
			}

			printComparison(
				'Benchmark #11 — Nested construction (Plain JS / CT / QuickModel)',
				allResults
			);
			console.log(
				'\n  ✅ QuickModel: un @Quick por clase padre — cero clases auxiliares ni decoradores extra'
			);
			console.log(
				'  ⚠️  class-transformer: @Type decorator por propiedad anidada, BigInt no soportado'
			);
			console.log(
				'  🔧 Plain JS: mapeo manual profundo, frágil ante cambios de schema\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
