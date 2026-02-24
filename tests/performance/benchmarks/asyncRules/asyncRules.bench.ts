import { describe, expect, test } from 'bun:test';

import { qCheckRulesAsync } from '@/forms';

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
						.validate(validSignupData, { abortEarly: false })
						.catch(() => {});
				}
			);
			console.log(
				`\n[BENCH #12] yup async: ${res.opsPerSec.toLocaleString()} ops/sec`
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
			console.log(
				`\n[BENCH #12] joi async: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			expect(res.totalMs).toBeLessThan(30_000);
		});

		test('QuickModel — qCheckRulesAsync() parallel mode (4 async @QRule) ✅', async () => {
			const res = await runBenchAsync(
				'Benchmark 12: QuickModel async',
				ITERS,
				async () => {
					await qCheckRulesAsync(asyncFormInstance, {
						mode: 'parallel',
					});
				}
			);
			console.log(
				`\n[BENCH #12] QuickModel async: ${res.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'  ✅ parallel mode — Promise.allSettled sobre todos los @QRule async; timeoutMs por regla soportado'
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
						await qCheckRulesAsync(asyncForm2, {
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
								.validate(validSignupData, {
									abortEarly: false,
								})
								.catch(() => {});
						}
					)
				);
			}

			if (allResults.length > 0) {
				printComparison(
					'Benchmark #12 — Async rules (QuickModel parallel / joi / yup)',
					allResults
				);
			}
			console.log(
				'\n  ✅ QM parallel mode: Promise.allSettled — todas las reglas concurrentes'
			);
			console.log(
				'  💡 serial mode también disponible para reglas dependientes'
			);
			console.log(
				'  💡 timeoutMs por regla — ideal para predicados DB/API con timeout\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
