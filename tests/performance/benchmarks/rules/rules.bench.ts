// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
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
			expect(res.totalMs).toBeLessThan(15_000);
		});

		test('[baseline] Plain JS — if/else manual por campo (sin decoradores)', () => {
			const res = runBench('Benchmark 8: Plain JS', ITERS, () => {
				const errors: string[] = [];
				if (validSignupData.name.length < 2)
					errors.push('Name too short');
				if (!/^[^@]+@[^@]+\.[^@]+$/.test(validSignupData.email))
					errors.push('Invalid email');
				if (validSignupData.password.length < 8)
					errors.push('Password too short');
				if (!/[A-Z]/.test(validSignupData.password))
					errors.push('Must contain uppercase');
				void errors;
			});
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
				) as unknown as Record<string, unknown>; // @quickmodel-rule-ignore: no-as-unknown
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

			allResults.push(
				runBench('Benchmark 8: Plain JS', ITERS, () => {
					const errors: string[] = [];
					if (validSignupData.name.length < 2)
						errors.push('Name too short');
					if (!/^[^@]+@[^@]+\.[^@]+$/.test(validSignupData.email))
						errors.push('Invalid email');
					if (validSignupData.password.length < 8)
						errors.push('Password too short');
					if (!/[A-Z]/.test(validSignupData.password))
						errors.push('Must contain uppercase');
					void errors;
				})
			);

			if (allResults.length > 1) {
				printComparison(
					'Benchmark #8 — Rules / Forms (class-validator / vest / joi / QuickModel / Plain JS)',
					allResults
				);
			}

			const _cvIcon = cvMod ? '✅' : 'N/I';
			const _vestIcon = vestMod ? '⚠️ ' : 'N/I';
			const _joiIcon = joiMod ? '⚠️ ' : 'N/I';

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
