import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * A single validation rule to be simulated.
 */
interface IValidationRule {
	/** The field in `data` to validate. */
	field: string;
	/**
	 * A JS expression evaluated as a predicate.
	 * Has access to `value` (the field value) and `data` (the full data object).
	 * Example: `value >= 18`, `value.length > 0`, `value === data.password`
	 */
	predicate: string;
	/** Error message returned when the predicate evaluates to false. */
	message: string;
	/** Optional group name; when `options.group` is set, only this group's rules run. */
	group?: string;
}

/**
 * Tool to simulate running `@QRule`-style predicates over a data object.
 * Returns a validation report with errors, without requiring actual decorated classes.
 */
export class QSimulateValidationTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		rules: z.ZodArray<
			z.ZodObject<{
				field: z.ZodString;
				predicate: z.ZodString;
				message: z.ZodString;
				group: z.ZodOptional<z.ZodString>;
			}>
		>;
		group: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'simulate_validation';
	description =
		'Simulates @QRule-style predicate validation on a data object. ' +
		'Each rule has a `predicate` (JS expression with `value` and `data` vars) and a `message`. ' +
		'Returns a validation report: { valid, errors, evaluated }.';

	schema = z.object({
		data: z
			.record(z.string(), z.any())
			.describe('The data object to validate'),
		rules: z
			.array(
				z.object({
					field: z.string().describe('Field name in the data object'),
					predicate: z
						.string()
						.describe(
							'JS expression returning boolean. Available vars: `value` (field value), `data` (full object). E.g. "value >= 18"'
						),
					message: z
						.string()
						.describe('Error message shown when rule fails'),
					group: z
						.string()
						.optional()
						.describe('Optional group name for rule filtering'),
				})
			)
			.describe('Array of validation rules to apply'),
		group: z
			.string()
			.optional()
			.describe(
				'When provided, only rules matching this group will be evaluated'
			),
	});

	async execute(args: {
		data: Record<string, any>;
		rules: IValidationRule[];
		group?: string;
	}): Promise<{
		valid: boolean;
		errors: Array<{ field: string; message: string; value: unknown }>;
		evaluated: number;
	}> {
		await Promise.resolve();

		const { data, rules, group } = args;

		const activeRules = group
			? rules.filter((rule) => rule.group === group)
			: rules;

		const errors: Array<{
			field: string;
			message: string;
			value: unknown;
		}> = [];

		for (const rule of activeRules) {
			const value = data[rule.field];
			let passed = false;

			try {
				// eslint-disable-next-line @typescript-eslint/no-implied-eval
				const ruleFn = new Function(
					'value',
					'data',
					`'use strict'; return !!(${rule.predicate});`
				);
				passed = ruleFn(value, data) as boolean;
			} catch {
				// Treat evaluation errors (e.g. null dereference) as rule failure
				passed = false;
			}

			if (!passed) {
				errors.push({
					field: rule.field,
					message: rule.message,
					value,
				});
			}
		}

		return {
			valid: errors.length === 0,
			errors,
			evaluated: activeRules.length,
		};
	}
}
