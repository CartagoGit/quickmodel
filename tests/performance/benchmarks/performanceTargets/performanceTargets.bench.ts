// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
import { describe, expect, test } from 'bun:test';
import 'reflect-metadata';
import { Type } from 'class-transformer';

import { QModel, Quick } from '@/index';
import { ctMod, notInstalled } from '../_shared';

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

			const _transformsPerSec = Math.round((10_000 / elapsed) * 1_000);

			expect(holder.dates[0]).toBeInstanceOf(Date);
			expect(holder.dates[9_999]).toBeInstanceOf(Date);
			expect(elapsed).toBeLessThan(100);
		});

		test('class-transformer — plainToInstance() con @Type(() => Date) (10k strings → Date)', () => {
			if (!ctMod) {
				notInstalled('class-transformer');
				expect(true).toBe(true);
				return;
			}

			class CTDateHolder {
				@Type(() => Date)
				dates!: Date[];
			}

			const input = {
				dates: Array.from(
					{ length: 10_000 },
					() => '2024-03-15T10:00:00.000Z'
				),
			};

			const pti = ctMod.plainToInstance as (
				cls: unknown,
				plain: unknown
			) => CTDateHolder;

			// warmup
			for (let idx = 0; idx < 3; idx++) pti(CTDateHolder, input);

			const start = performance.now();
			const holder = pti(CTDateHolder, input);
			const elapsed = performance.now() - start;

			const _transformsPerSec = Math.round((10_000 / elapsed) * 1_000);

			expect(holder.dates[0]).toBeInstanceOf(Date);
			expect(holder.dates[9_999]).toBeInstanceOf(Date);
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

			const _opsPerSec = Math.round((1_000 / elapsed) * 1_000);
			expect(elapsed).toBeLessThan(50);
		});
	});
}
