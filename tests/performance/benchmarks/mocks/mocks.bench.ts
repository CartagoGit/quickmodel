import { describe, expect, test } from 'bun:test';

import { runBench, notInstalled, fakerMod } from '../_shared';
import { SimpleUser } from '../_models';

export function describeBench(): void {
	describe('[QuickModel Exclusive] Benchmark #5 — Generación de mocks tipados', () => {
		test('QuickModel — SimpleUser.mock().random() (typed, zero-setup) ✅', () => {
			const ITERS = 100;
			const res = runBench('Benchmark 5: QuickModel mocks', ITERS, () => {
				SimpleUser.mock().random();
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('faker (manual) — factory function con @faker-js/faker 🔧', () => {
			if (!fakerMod) {
				notInstalled('@faker-js/faker');
				expect(true).toBe(true);
				return;
			}
			const { faker } = fakerMod as typeof import('@faker-js/faker');
			const ITERS = 100;
			const res = runBench('Benchmark 5: faker (manual)', ITERS, () => {
				const _obj = {
					id: faker.string.uuid(),
					name: faker.person.fullName(),
					email: faker.internet.email(),
					age: faker.number.int({ min: 18, max: 80 }),
					active: faker.datatype.boolean(),
				};
				void _obj;
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('Plain JS — factory function hardcoded (sin tipado dinámico)', () => {
			const ITERS = 100;
			let cnt = 0;
			const res = runBench('Benchmark 5: Plain JS mock', ITERS, () => {
				cnt++;
				const _obj = {
					id: `user-${cnt}`,
					name: 'John Doe',
					email: `user${cnt}@example.com`,
					age: 30,
					active: true,
				};
				void _obj;
			});
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('🚫 TypeBox / valibot / Zod / class-transformer / yup — N/A', () => {
			expect(true).toBe(true);
		});
	});
}
