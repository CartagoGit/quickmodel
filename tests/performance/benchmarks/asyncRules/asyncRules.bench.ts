import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import {
	runBenchAsync,
	notInstalled,
	printComparison,
	yupMod,
	joiMod,
	buildJoiSchemas,
} from '../_shared';
import { AsyncSignupForm, validSignupData } from '../_models';
import { $qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

export function describeBench(): void {
	describe('Benchmark #12 — Async rule orchestration: qCheckRulesAsync parallel vs alternativas (1k it.)', () => {
		const ITERS = 1_000;
		const asyncFormInstance = Object.assign(
			new AsyncSignupForm(),
			validSignupData
		);

		test('yup — validate() async (4 reglas)', async () => {
			if (!yupMod) {
				notInstalled('yup');
				expect(true).toBe(true);
				return;
			}
			const asyncYupSchema = yupMod.object({
				name: yupMod.string().min(2).required(),
				email: yupMod.string().email().required(),
				password: yupMod.string().min(8).matches(/[A-Z]/).required(),
			});
			const res = await runBenchAsync(
				'Benchmark 12: yup async',
				ITERS,
				async () => {
					await asyncYupSchema
						.$qValidate(validSignupData, { abortEarly: false })
						.catch(() => {});
				}
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('joi — validateAsync() (4 reglas)', async () => {
			const joiSchemas = buildJoiSchemas();
			if (!joiSchemas || !joiMod) {
				notInstalled('joi');
				expect(true).toBe(true);
				return;
			}
			const res = await runBenchAsync(
				'Benchmark 12: joi async',
				ITERS,
				async () => {
					await joiSchemas.rulesSchema
						.validateAsync(validSignupData, { abortEarly: false })
						.catch(() => {});
				}
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('QuickModel — qCheckRulesAsync() parallel mode (4 async @QRule) ✅', async () => {
			const res = await runBenchAsync(
				'Benchmark 12: QuickModel async',
				ITERS,
				async () => {
					await $qCheckRulesAsync(asyncFormInstance, {
						mode: 'parallel',
					});
				}
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('[baseline] Plain JS — Promise.all manual (async checks sin decoradores)', async () => {
			const res = await runBenchAsync(
				'Benchmark 12: Plain JS',
				ITERS,
				async () => {
					const results = await Promise.all([
						Promise.resolve(validSignupData.name.length >= 2),
						Promise.resolve(
							/^[^@]+@[^@]+\.[^@]+$/.test(validSignupData.email)
						),
						Promise.resolve(validSignupData.password.length >= 8),
						Promise.resolve(/[A-Z]/.test(validSignupData.password)),
					]);
					void results;
				}
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('📊 Comparativa #12 — async rule orchestration', async () => {
			const asyncForm2 = Object.assign(
				new AsyncSignupForm(),
				validSignupData
			);
			const allResults: IBenchResult[] = [];

			allResults.push(
				await runBenchAsync(
					'Benchmark 12: QuickModel async',
					ITERS,
					async () => {
						await $qCheckRulesAsync(asyncForm2, {
							mode: 'parallel',
						});
					}
				)
			);

			if (joiMod) {
				const joiSchemas = buildJoiSchemas();
				if (joiSchemas) {
					allResults.push(
						await runBenchAsync(
							'Benchmark 12: joi async',
							ITERS,
							async () => {
								await joiSchemas.rulesSchema
									.validateAsync(validSignupData, {
										abortEarly: false,
									})
									.catch(() => {});
							}
						)
					);
				}
			}

			if (yupMod) {
				const asyncYupSchema2 = yupMod.object({
					name: yupMod.string().min(2).required(),
					email: yupMod.string().email().required(),
					password: yupMod
						.string()
						.min(8)
						.matches(/[A-Z]/)
						.required(),
				});
				allResults.push(
					await runBenchAsync(
						'Benchmark 12: yup async',
						ITERS,
						async () => {
							await asyncYupSchema2
								.$qValidate(validSignupData, {
									abortEarly: false,
								})
								.catch(() => {});
						}
					)
				);
			}

			allResults.push(
				await runBenchAsync(
					'Benchmark 12: Plain JS',
					ITERS,
					async () => {
						const checks = await Promise.all([
							Promise.resolve(validSignupData.name.length >= 2),
							Promise.resolve(
								/^[^@]+@[^@]+\.[^@]+$/.test(
									validSignupData.email
								)
							),
							Promise.resolve(
								validSignupData.password.length >= 8
							),
							Promise.resolve(
								/[A-Z]/.test(validSignupData.password)
							),
						]);
						void checks;
					}
				)
			);

			if (allResults.length > 0) {
				printComparison(
					'Benchmark #12 — Async rules (QuickModel parallel / joi / yup / Plain JS)',
					allResults
				);
			}

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
