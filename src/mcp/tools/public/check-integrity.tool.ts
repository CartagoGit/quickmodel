import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';

/**
 * Tool to run transformer-level integrity checks on sample data.
 * Complements `simulate_validation` (@QRule checks) by testing transformer constraints:
 * invalid Date ranges, oversized BigInt, malformed RegExp, etc.
 */
export class QCheckIntegrityTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		options: z.ZodRecord<z.ZodString, z.ZodAny>;
	}>
> {
	name = 'check_integrity';
	description =
		'Run transformer-level integrity checks on a data object. ' +
		'Detects invalid Date values, oversized BigInts, malformed RegExps, etc. ' +
		'Complements simulate_validation (which covers @QRule business-logic predicates). ' +
		'Returns { valid, errors[], evaluated }.';

	schema = z.object({
		data: z
			.record(z.string(), z.any())
			.describe('The data object to check'),
		options: z
			.record(z.string(), z.any())
			.describe(
				'Type configuration — same format as @Quick() (e.g. { birth: "Date", balance: "BigInt" })'
			),
	});

	async execute(args: {
		data: Record<string, any>;
		options: Record<string, any>;
	}): Promise<{
		valid: boolean;
		errors: Array<{ isValid: boolean; error?: string }>;
		evaluated: number;
		summary: string;
	}> {
		await Promise.resolve();

		const hydratedOptions = this.hydrateOptions(args.options);
		const results: Array<{ isValid: boolean; error?: string }> = [];

		// Evaluate each field independently so all failures are collected,
		// even when the transformer throws during construction (e.g. invalid Date).
		for (const field of Object.keys(hydratedOptions)) {
			const singleOption = { [field]: hydratedOptions[field] };

			@Quick(singleOption)
			class DynamicField extends QModel<any> {
				[key: string]: any;
			}

			const value = Object.prototype.hasOwnProperty.call(args.data, field)
				? args.data[field]
				: undefined;

			try {
				const instance = new DynamicField({ [field]: value });
				const fieldResults = instance.checkIntegrity();
				results.push(...fieldResults);
			} catch (err) {
				// Transformer threw during construction (e.g. invalid Date string).
				// Treat it as a failed integrity check for this field.
				const message =
					err instanceof Error ? err.message : String(err);
				results.push({ isValid: false, error: message });
			}
		}

		const errors = results.filter((res) => !res.isValid);
		const valid = errors.length === 0;
		const evaluated = results.length;

		const summary = valid
			? `All ${evaluated} integrity check(s) passed.`
			: `${errors.length} integrity failure(s) out of ${evaluated} check(s).`;

		return { valid, errors, evaluated, summary };
	}

	private hydrateOptions(options: any): any {
		if (typeof options === 'string') {
			switch (options) {
				case 'Date':
					return Date;
				case 'BigInt':
					return BigInt;
				case 'RegExp':
					return RegExp;
				case 'Set':
					return Set;
				case 'Map':
					return Map;
				case 'ArrayBuffer':
					return ArrayBuffer;
				case 'Int8Array':
					return Int8Array;
				case 'Uint8Array':
					return Uint8Array;
				case 'Uint8ClampedArray':
					return Uint8ClampedArray;
				case 'Int16Array':
					return Int16Array;
				case 'Uint16Array':
					return Uint16Array;
				case 'Int32Array':
					return Int32Array;
				case 'Uint32Array':
					return Uint32Array;
				case 'Float32Array':
					return Float32Array;
				case 'Float64Array':
					return Float64Array;
				case 'BigInt64Array':
					return BigInt64Array;
				case 'BigUint64Array':
					return BigUint64Array;
				case 'Symbol':
					return Symbol;
				case 'URL':
					return URL;
				default:
					return options;
			}
		}
		if (Array.isArray(options)) {
			return options.map((item: unknown) => this.hydrateOptions(item));
		}
		if (typeof options === 'object' && options !== null) {
			const result: Record<string, unknown> = {};
			for (const key of Object.keys(options)) {
				result[key] = this.hydrateOptions(options[key]);
			}
			return result;
		}
		return options;
	}
}
