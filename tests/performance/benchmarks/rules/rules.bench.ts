import { describe, expect, test } from 'bun:test';

import { qCheckRules } from '@/forms';

import type { IBenchResult } from '../bench.types';
import {
	runBench,
	notInstalled,
	printComparison,
	cvMod,
	vestMod,
	joiMod,
	buildVestSuite,
	buildJoiSchemas,
} from '../_shared';
import { SignupForm, validSignupData } from '../_models';

export function describeBench(): void {
	describe('Benchmark #8 — Forms / Business rules: @QRule + @QGroup vs alternativas (5k it.)', () => {
		const ITERS = 5_000;

		test('class-validator — validateSync() solo (sin grupos nativos)', () => {
			if (!cvMod) {
				notInstalled('class-validator');
				expect(true).toBe(true);
				return;
			}
			const { validateSync, IsEmail, MinLength, Matches } = cvMod;

			@(cvMod.IsString?.() ?? (() => {}))
			class CVSignup {
				@MinLength(2, { message: 'Name too short' })
				name: string = '';

				@IsEmail({}, { message: 'Invalid email' })
				email: string = '';

				@MinLength(8, { message: 'Password too short' })
				@Matches(/[A-Z]/, { message: 'Must contain uppercase' })
				password: string = '';
			}

			const obj = Object.assign(new CVSignup(), validSignupData);
			const res = runBench('Benchmark 8: class-validator', ITERS, () => {
				validateSync(obj);
			});
			console.log(
				`\n[BENCH #8] class-validator: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  Sin grupos nativos — filtrar por @ValidationGroups requiere groups config separada'
			);
			expect(res.totalMs).toBeLessThan(15_000);
		});

		test('vest — create() suite con tests por campo', () => {
			if (!vestMod) {
				notInstalled('vest');
				expect(true).toBe(true);
				return;
			}
			const vestSuite = buildVestSuite();
			if (!vestSuite) {
				notInstalled('vest (suite no compatible)');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 8: vest', ITERS, () => {
				vestSuite.suite(validSignupData);
			});
			console.log(
				`\n[BENCH #8] vest: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ Tiene grupos via only.group() — pero require crear la suite fuera de la clase'
			);
			expect(res.totalMs).toBeLessThan(15_000);
		});

		test('joi — validate() con schema con reglas', () => {
			const joiSchemas = buildJoiSchemas();
			if (!joiSchemas || !joiMod) {
				notInstalled('joi');
				expect(true).toBe(true);
				return;
			}
			const res = runBench('Benchmark 8: joi', ITERS, () => {
				joiSchemas.rulesSchema.validate(validSignupData, {
					abortEarly: false,
				});
			});
			console.log(
				`\n[BENCH #8] joi: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ⚠️  Sin grupos nativos — require schemas separados por sección'
			);
			expect(res.totalMs).toBeLessThan(15_000);
		});

		test('QuickModel — qCheckRules() con @QRule por campo ✅', () => {
			const form = Object.assign(new SignupForm(), validSignupData);
			const res = runBench(
				'Benchmark 8: QuickModel @QRule',
				ITERS,
				() => {
					qCheckRules(form);
				}
			);
			console.log(
				`\n[BENCH #8] QuickModel @QRule: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ Decoradores co-ubicados con la clase, zero setup externo'
			);
			expect(res.totalMs).toBeLessThan(15_000);
		});

		test('📊 Comparativa #8 — Validación por reglas / forms', () => {
			const allResults: IBenchResult[] = [];

			if (cvMod) {
				const validateSync = cvMod.validateSync as (
					obj: object
				) => unknown[];
				const CVSignup2 = class {
					name: string = '';
					email: string = '';
					password: string = '';
				};
				const obj2 = Object.assign(
					new CVSignup2(),
					validSignupData
				) as unknown as Record<string, unknown>;
				allResults.push(
					runBench('Benchmark 8: class-validator', ITERS, () => {
						validateSync(obj2);
					})
				);
			}
			if (vestMod) {
				const vestSuite = buildVestSuite();
				if (vestSuite) {
					allResults.push(
						runBench('Benchmark 8: vest', ITERS, () => {
							vestSuite.suite(validSignupData);
						})
					);
				}
			}
			if (joiMod) {
				const joiSchemas = buildJoiSchemas();
				if (joiSchemas) {
					allResults.push(
						runBench('Benchmark 8: joi', ITERS, () => {
							joiSchemas.rulesSchema.validate(validSignupData, {
								abortEarly: false,
							});
						})
					);
				}
			}

			const form = Object.assign(new SignupForm(), validSignupData);
			allResults.push(
				runBench('Benchmark 8: QuickModel @QRule', ITERS, () => {
					qCheckRules(form);
				})
			);

			if (allResults.length > 1) {
				printComparison(
					'Benchmark #8 — Rules / Forms (class-validator / vest / joi / QuickModel)',
					allResults
				);
			}

			const cvIcon = cvMod ? '✅' : 'N/I';
			const vestIcon = vestMod ? '⚠️ ' : 'N/I';
			const joiIcon = joiMod ? '⚠️ ' : 'N/I';

			console.log(`
┌──────────────────────────────────────────────────────────────────────────┐
│  COMPARATIVA — API de reglas de negocio y formularios                    │
├───────────────────────────────────────┬──────┬──────┬──────┬────────────┤
│ Capacidad                             │  CV  │ vest │  joi │ QuickModel │
├───────────────────────────────────────┼──────┼──────┼──────┼────────────┤
│ Decoradores co-ubicados en la clase   │  ✅  │  ❌  │  ❌  │     ✅     │
│ Grupos de campos nativos              │  ⚠️  │  ✅  │  ❌  │     ✅     │
│ Filtrar validación por grupo          │  ⚠️  │  ✅  │  ❌  │     ✅     │
│ checkRulesByGroup() en una llamada    │  ❌  │  ⚠️  │  ❌  │     ✅     │
│ Predicados async (DB, API)            │  ❌  │  ⚠️  │  ✅  │     ✅     │
│ Timeout por predicado async           │  ❌  │  ❌  │  ❌  │     ✅     │
│ Modo serial/paralelo (async)          │  ❌  │  ❌  │  ❌  │     ✅     │
│ Schema de formulario (getFormSchema)  │  ❌  │  ❌  │  ❌  │     ✅     │
│ Integración con coerción de tipos     │  ❌  │  ❌  │  ❌  │     ✅     │
│ Works on any class (no QModel needed) │ ${cvIcon} │ ${vestIcon}│ ${joiIcon}│     ✅     │
└───────────────────────────────────────┴──────┴──────┴──────┴────────────┘
  CV = class-validator | vest = vestjs | ⚠️ = posible con config extra\n`);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
