import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';
import {
	QRULE_METADATA_KEY,
	QRULE_FIELDS_KEY,
} from '../../../core/decorators/qrule.decorator';
import type {
	IQRulesResult,
	IQRulesAsyncOptions,
} from '../../../core/decorators/qrule.decorator';

/**
 * A single rule supplied to simulate_async_rules.
 * The predicate is a JS expression string that may return a Promise.
 * Variables available: `value` (field value), `data` (full data object).
 */
interface IAsyncSimulatedRule {
	field: string;
	predicate: string;
	message: string;
}

/**
 * Tool to run async business-logic rules through the *real* `instance.checkRulesAsync()` API.
 *
 * ⚠️ ASYNC-ONLY: Use this tool only when predicates genuinely need to be async
 * (e.g. simulating database lookups, external API calls, or async validators).
 * For synchronous rules, use `simulate_rules` — it is simpler and faster.
 *
 * Predicates are JS expression strings that may return `Promise<boolean>` or `boolean`.
 * Both are accepted for backward compatibility.
 */
export class QSimulateAsyncRulesTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		rules: z.ZodArray<
			z.ZodObject<{
				field: z.ZodString;
				predicate: z.ZodString;
				message: z.ZodString;
			}>
		>;
		options: z.ZodOptional<
			z.ZodObject<{
				timeoutMs: z.ZodOptional<z.ZodNumber>;
				timeoutMessage: z.ZodOptional<z.ZodString>;
				mode: z.ZodOptional<
					z.ZodEnum<{ parallel: 'parallel'; serial: 'serial' }>
				>;
			}>
		>;
	}>
> {
	name = 'simulate_async_rules';
	description =
		'⚠️ ASYNC-ONLY: Run async business-logic rules through the real instance.checkRulesAsync() API. ' +
		'Use this ONLY when predicates genuinely require async operations (e.g. simulating DB lookups, API calls). ' +
		'For synchronous rules, use simulate_rules instead — it is simpler and faster. ' +
		'Predicates can return Promise<boolean> or boolean. ' +
		'Supports timeoutMs (abort slow predicates), timeoutMessage, and mode: "parallel" | "serial". ' +
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
							'JS expression returning boolean or Promise<boolean>. ' +
								'Available vars: `value` (field value), `data` (full object). ' +
								'E.g. "Promise.resolve(value.includes(\'@\'))"'
						),
					message: z
						.string()
						.describe('Error message shown when the rule fails'),
				})
			)
			.describe(
				'Array of async rules to apply via @QRule + checkRulesAsync()'
			),
		options: z
			.object({
				timeoutMs: z
					.number()
					.optional()
					.describe(
						'Maximum wait time per predicate in ms. Omit to await indefinitely.'
					),
				timeoutMessage: z
					.string()
					.optional()
					.describe('Message used when a predicate times out'),
				mode: z
					.enum(['parallel', 'serial'])
					.optional()
					.describe(
						'"parallel" (default): all predicates run concurrently. ' +
							'"serial": predicates run one by one, stops at first failure.'
					),
			})
			.optional()
			.describe('Options forwarded to checkRulesAsync()'),
	});

	async execute(args: {
		data: Record<string, any>;
		rules: IAsyncSimulatedRule[];
		options?: IQRulesAsyncOptions;
	}): Promise<{
		valid: boolean;
		errors: IQRulesResult['errors'];
		evaluated: number;
	}> {
		const { data, rules, options } = args;

		@Quick({})
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const proto = DynamicModel.prototype;

		for (const rule of rules) {
			const fieldKey = rule.field;
			const predicateStr = rule.predicate;
			const capturedData = data;

			// Wrap predicate as async function so it supports both sync and async expressions
			const predicateFn = async (value: unknown): Promise<boolean> => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-implied-eval
					const func = new Function(
						'value',
						'data',
						`'use strict'; return (${predicateStr});`
					);
					const outcome = func(value, capturedData);
					return Boolean(await Promise.resolve(outcome));
				} catch {
					return false;
				}
			};

			const ruleObj = {
				predicate: predicateFn,
				message: rule.message,
			};

			const existing: (typeof ruleObj)[] =
				Reflect.getMetadata(QRULE_METADATA_KEY, proto, fieldKey) ?? [];
			existing.push(ruleObj);
			Reflect.defineMetadata(
				QRULE_METADATA_KEY,
				existing,
				proto,
				fieldKey
			);

			const fields: string[] =
				Reflect.getMetadata(QRULE_FIELDS_KEY, proto) ?? [];
			if (!fields.includes(fieldKey)) {
				fields.push(fieldKey);
				Reflect.defineMetadata(QRULE_FIELDS_KEY, fields, proto);
			}
		}

		const instance = new DynamicModel(data);
		const result = await instance.checkRulesAsync(options);

		return {
			valid: result.valid,
			errors: result.errors,
			evaluated: rules.length,
		};
	}
}
