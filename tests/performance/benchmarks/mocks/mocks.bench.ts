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
			console.log(
				`\n[BENCH #5] QuickModel: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			console.log(
				'  ✅ Genera instancias completas y tipadas sin configuración'
			);
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
			console.log(
				`\n[BENCH #5] faker (manual): ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			console.log(
				'  🔧 Requiere @faker-js/faker instalado + factory manual por modelo'
			);
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
			console.log(
				`\n[BENCH #5] Plain JS: ${res.opsPerSec.toLocaleString()} ops/sec | ${res.avgMicros.toFixed(2)}μs avg`
			);
			console.log('  ⚠️  Sin datos aleatorios — solo valores hardcoded');
			expect(res.totalMs).toBeLessThan(10_000);
		});

		test('🚫 TypeBox / valibot / Zod / class-transformer / yup — N/A', () => {
			console.log(`
[BENCH #5] Mocks tipados — STATUS POR LIBRERÍA:
  ✅ QuickModel:         SimpleUser.mock().random() — built-in, zero deps
  🔧 faker (manual):    factory function con @faker-js/faker — requiere setup manual
  🔧 Plain JS:          factory function hardcoded — sin aleatoriedad real
  ❌ TypeBox:            Sin mocks nativos → necesita faker + mapeo manual
  ❌ valibot:            Sin mocks nativos → necesita faker + mapeo manual
  ❌ Zod:                Sin mocks nativos → necesita faker + mapeo manual
  ❌ class-transformer:  Sin mocks nativos → necesita faker + mapeo manual
  ❌ yup:                Sin mocks nativos → necesita faker + mapeo manual

  💡 QuickModel es la única librería con generación de mocks tipados integrada.
`);
			expect(true).toBe(true);
		});
	});
}
