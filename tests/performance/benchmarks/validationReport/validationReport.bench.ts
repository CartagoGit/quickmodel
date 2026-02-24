import { describe, expect, test } from 'bun:test';

import type { IBenchResult } from '../bench.types';
import { runBench, printComparison, yupMod, joiMod } from '../_shared';
import {
	SignupReportModel,
	zodSignupReportSchema,
	signupReportRaw,
} from '../_models';

export function describeBench(): void {
	describe('Benchmark #15 — Structured error report: validationReport() vs Zod, yup, joi (3k it.)', () => {
		const ITERATIONS = 3_000;
		const invalidData = signupReportRaw;

		test('QuickModel — validationReport(): integridad + reglas en una llamada ✅', () => {
			const instance = new SignupReportModel(invalidData);
			const result = runBench(
				'[BENCH #15] QuickModel',
				ITERATIONS,
				() => {
					instance.validationReport();
				}
			);
			console.log(
				`  ✅ QuickModel: ${result.opsPerSec.toLocaleString()} ops/sec`
			);
			console.log(
				'     Retorna: { valid, integrity[], rules: { valid, errors[] } } — todo tipado'
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('Zod — safeParse() (sync, ZodError.issues) ⚠️', () => {
			const result = runBench('[BENCH #15] Zod', ITERATIONS, () => {
				zodSignupReportSchema.safeParse(invalidData);
			});
			console.log(
				`  ⚠️  Zod: ${result.opsPerSec.toLocaleString()} ops/sec (solo validación, sin coerción ni integridad)`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('yup — validateSync() con abortEarly:false (captura todos los errores) ⚠️', () => {
			if (!yupMod) {
				console.log('  yup no instalado — skipping');
				return;
			}
			const yupSignupSchema = yupMod
				.object({
					name: yupMod.string().min(2, 'Name too short'),
					email: yupMod.string().email('Invalid email'),
					password: yupMod
						.string()
						.min(8, 'Password too short')
						.matches(/[A-Z]/, 'Needs uppercase'),
					age: yupMod.number().min(18, 'Must be 18+'),
				})
				.noUnknown();
			const result = runBench('[BENCH #15] yup', ITERATIONS, () => {
				try {
					yupSignupSchema.validateSync(invalidData, {
						abortEarly: false,
					});
				} catch (_err) {
					// ValidationError esperado con datos inválidos
				}
			});
			console.log(
				`  ⚠️  yup: ${result.opsPerSec.toLocaleString()} ops/sec`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('joi — compile().validate() (sync, errors.details) ⚠️', () => {
			if (!joiMod) {
				console.log('  joi no instalado — skipping');
				return;
			}
			const joiSignupSchema = joiMod.object({
				name: joiMod
					.string()
					.min(2)
					.required()
					.messages({ 'string.min': 'Name too short' }),
				email: joiMod
					.string()
					.email({ tlds: { allow: false } })
					.required()
					.messages({ 'string.email': 'Invalid email' }),
				password: joiMod
					.string()
					.min(8)
					.pattern(/[A-Z]/)
					.required()
					.messages({
						'string.min': 'Password too short',
						'string.pattern.base': 'Needs uppercase',
					}),
				age: joiMod
					.number()
					.min(18)
					.required()
					.messages({ 'number.min': 'Must be 18+' }),
			});
			const result = runBench('[BENCH #15] joi', ITERATIONS, () => {
				joiSignupSchema.validate(invalidData, { abortEarly: false });
			});
			console.log(
				`  ⚠️  joi: ${result.opsPerSec.toLocaleString()} ops/sec`
			);
			expect(result.opsPerSec).toBeGreaterThan(0);
		});

		test('Resumen Benchmark #15 — comparativa + estructura de errores', () => {
			const allResults: IBenchResult[] = [];

			const instance = new SignupReportModel(invalidData);
			allResults.push(
				runBench('[BENCH #15] QuickModel', ITERATIONS, () =>
					instance.validationReport()
				)
			);
			allResults.push(
				runBench('[BENCH #15] Zod', ITERATIONS, () =>
					zodSignupReportSchema.safeParse(invalidData)
				)
			);

			if (yupMod) {
				const yupSch = yupMod
					.object({
						name: yupMod.string().min(2),
						email: yupMod.string().email(),
						password: yupMod.string().min(8).matches(/[A-Z]/),
						age: yupMod.number().min(18),
					})
					.noUnknown();
				allResults.push(
					runBench('[BENCH #15] yup', ITERATIONS, () => {
						try {
							yupSch.validateSync(invalidData, {
								abortEarly: false,
							});
						} catch (_err) {
							// ValidationError esperado con datos inválidos
						}
					})
				);
			}

			if (joiMod) {
				const joiSch = joiMod.object({
					name: joiMod.string().min(2).required(),
					email: joiMod
						.string()
						.email({ tlds: { allow: false } })
						.required(),
					password: joiMod
						.string()
						.min(8)
						.pattern(/[A-Z]/)
						.required(),
					age: joiMod.number().min(18).required(),
				});
				allResults.push(
					runBench('[BENCH #15] joi', ITERATIONS, () =>
						joiSch.validate(invalidData, { abortEarly: false })
					)
				);
			}

			printComparison(
				'Benchmark #15 — Structured error report (QuickModel / Zod / yup / joi)',
				allResults
			);
			console.log(
				'  ✅ QuickModel validationReport(): { valid, integrity[], rules: { valid, errors[] } }'
			);
			console.log(
				'     — integrity: errores de tipos/coerción | rules: errores de @QRule — TODO en 1 llamada'
			);
			console.log(
				'  ⚠️  Zod/yup/joi: solo errores de validación, sin categorías integridad vs reglas de negocio\n'
			);

			expect(allResults.length).toBeGreaterThan(0);
		});
	});
}
