import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';
import {
	QRULE_METADATA_KEY,
	QRULE_FIELDS_KEY,
} from '../../../core/decorators/qrule.decorator';
import type { IQRulesResult } from '../../../core/decorators/qrule.decorator';

/**
 * A single rule supplied to simulate_rules.
 * The predicate is a JS expression string.
 * Variables available: `value` (field value), `data` (full data object).
 *
 * @see {@link QSimulateAsyncRulesTool} — for async rules with DB/API access
 * @see {@link QSimulateValidationTool} — for predicate validation
 * @see {@link QCheckIntegrityTool} — for transformer-level integrity checks
 */
interface ISimulatedRule {
	field: string;
	predicate: string;
	message: string;
}

/**
 * Tool to run business-logic rules through the *real* `instance.checkRules()` API.
 *
 * Unlike `simulate_validation` (which evaluates predicates standalone), this tool
 * wires predicates via `@QRule` metadata and routes them through `checkRules()`.
 * The output format is guaranteed to match the production `IQRulesResult`.
 *
 * Use `simulate_validation` for quick ad-hoc predicate checks.
 * Use this tool when you need to verify that your `@QRule` setup returns the
 * exact `{ valid, errors[] }` shape that your code expects at runtime.
 */
export class QSimulateRulesTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		rules: z.ZodArray<
			z.ZodObject<{
				field: z.ZodString;
				predicate: z.ZodString;
				message: z.ZodString;
			}>
		>;
	}>
> {
	name = 'simulate_rules';
	description =
		'Run business-logic rules through the real instance.checkRules() API. ' +
		'Applies rules via @QRule metadata so the result format matches production IQRulesResult exactly. ' +
		'Predicate strings have access to `value` (field value) and `data` (full data object). ' +
		'Use simulate_validation for standalone predicate evaluation; use this when you need to verify ' +
		'the exact @QRule + checkRules() output your code will produce at runtime. ' +
		'Returns { valid, errors[], evaluated }.';

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
						.describe('Error message shown when the rule fails'),
				})
			)
			.describe(
				'Array of rules to apply via the real @QRule + checkRules() API'
			),
	});

	/**
	 * Runs synchronous `@QRule` predicates against an in-memory QuickModel instance.
	 *
	 * @param args - Tool arguments.
	 * @param args.data - The data object to validate.
	 * @param args.rules - Array of rules with field, predicate expression, and message.
	 * @returns `{ valid, errors[], evaluated }` — `valid` is `true` when all predicates pass.
	 */
	async execute(args: {
		data: Record<string, unknown>;
		rules: ISimulatedRule[];
	}): Promise<{
		valid: boolean;
		errors: IQRulesResult['errors'];
		evaluated: number;
	}> {
		await Promise.resolve();

		const { data, rules } = args;

		// Build a dynamic class that will hold all rules.
		// @Quick({}) is intentionally minimal — no transformers needed.
		@Quick({})
		/** @internal Ephemeral model target for dynamically registered synchronous business-logic rules. */
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const proto = DynamicModel.prototype;

		// Register each rule via the same pattern as the internal `registerRule` helper.
		// Predicates are wrapped to also accept the full `data` object via closure,
		// mirroring the `data` variable available in `simulate_validation`.
		for (const rule of rules) {
			const fieldKey = rule.field;
			const predicateStr = rule.predicate;
			const capturedData = data;

			// Wrap the predicate string in a function that has both `value` and `data`
			const predicateFn = (value: unknown): boolean => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-implied-eval
					const func = new Function(
						'value',
						'data',
						`'use strict'; return !!(${predicateStr});`
					);
					return func(value, capturedData) as boolean;
				} catch {
					return false;
				}
			};

			const ruleObj = {
				predicate: predicateFn,
				message: rule.message,
			};

			// Push onto the existing rules array for this field
			const existing: (typeof ruleObj)[] =
				Reflect.getMetadata(QRULE_METADATA_KEY, proto, fieldKey) ?? [];
			existing.push(ruleObj);
			Reflect.defineMetadata(
				QRULE_METADATA_KEY,
				existing,
				proto,
				fieldKey
			);

			// Register the field name if not already present
			const fields: string[] =
				Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];
			if (!fields.includes(fieldKey)) {
				fields.push(fieldKey);
				Reflect.defineMetadata(QRULE_FIELDS_KEY, fields, proto);
			}
		}

		const instance = new DynamicModel(data);
		const result = instance.checkRules();

		return {
			valid: result.valid,
			errors: result.errors,
			evaluated: rules.length,
		};
	}
}
