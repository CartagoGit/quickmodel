import { describe, expect, test } from 'bun:test';

import { QModel, Quick } from '@/index';

export function describeBench(): void {
	describe('Benchmark #6 — Task #17: objetivos de rendimiento', () => {
		test('10k Date objects transformados en < 100ms', () => {
			interface IDateHolder {
				dates: Date[];
			}

			@Quick({ dates: [Date] })
			class DateHolder extends QModel<IDateHolder> {
				declare dates: Date[];
			}

			const input = {
				dates: Array.from(
					{ length: 10_000 },
					() => '2024-03-15T10:00:00.000Z'
				),
			};

			const start = performance.now();
			const holder = new DateHolder(input as unknown as IDateHolder);
			const elapsed = performance.now() - start;

			console.log(`\n[BENCH #6] 10k Dates: ${elapsed.toFixed(2)}ms`);
			console.log(
				`  → ${Math.round((10_000 / elapsed) * 1000).toLocaleString()} transforms/sec`
			);

			expect(holder.dates[0]).toBeInstanceOf(Date);
			expect(holder.dates[9_999]).toBeInstanceOf(Date);
			expect(elapsed).toBeLessThan(100);
		});

		test('Roundtrip serialize+deserialize de 1k models en < 50ms', () => {
			interface IPayment {
				amount: bigint;
				createdAt: Date;
			}

			@Quick({ amount: 'bigint', createdAt: Date })
			class Payment extends QModel<IPayment> {
				declare amount: bigint;
				declare createdAt: Date;
			}

			const rawData = Array.from({ length: 1_000 }, () => ({
				amount: '9999999999',
				createdAt: '2024-01-01T00:00:00.000Z',
			}));

			const start = performance.now();
			const models = rawData.map(
				(raw) => new Payment(raw as unknown as IPayment)
			);
			models.forEach((model) => model.serialize());
			const elapsed = performance.now() - start;

			console.log(
				`\n[BENCH #6] 1k roundtrip (create + serialize): ${elapsed.toFixed(2)}ms`
			);
			expect(elapsed).toBeLessThan(50);
		});
	});
}
