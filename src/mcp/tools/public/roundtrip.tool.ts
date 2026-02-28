import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';

/**
 * Tool to verify that a QuickModel round-trip (serialize → re-create → re-serialize)
 * produces an identical plain object, proving lossless transformation.
 *
 * A round-trip is:
 *   1. `s1 = new DynamicModel(data).serialize()`
 *   2. `s2 = new DynamicModel(s1).serialize()`
 *   3. `lossless = JSON.stringify(s1) === JSON.stringify(s2)`
 *
 * When `lossless` is `false`, the `diff` object maps each differing key to
 * `{ expected, got }` so the agent can diagnose the mismatch.
 */
export class QRoundtripTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		options: z.ZodRecord<z.ZodString, z.ZodAny>;
	}>
> {
	name = 'roundtrip';
	description =
		'Verifies that serializing and re-creating a QuickModel instance is lossless. ' +
		'Runs: s1 = new Model(data).serialize() → s2 = new Model(s1).serialize() ' +
		'and reports whether s1 === s2. ' +
		'Returns { lossless, input, serialized, roundtrip_serialized, diff, summary }.';

	schema = z.object({
		data: z
			.record(z.string(), z.any())
			.describe('Raw input data to populate the model'),
		options: z
			.record(z.string(), z.any())
			.describe(
				'@Quick() configuration options (e.g. { field: "Date" }). ' +
					'Type names must match the same strings accepted by simulate_transformation.'
			),
	});

	async execute(args: {
		data: Record<string, any>;
		options: Record<string, any>;
	}): Promise<{
		lossless: boolean;
		input: Record<string, any>;
		serialized: Record<string, unknown>;
		roundtrip_serialized: Record<string, unknown>;
		diff: Record<string, { expected: unknown; got: unknown }>;
		summary: string;
	}> {
		await Promise.resolve();

		const hydratedOptions = this.hydrateOptions(args.options);

		@Quick(hydratedOptions)
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const serial1 = new DynamicModel(args.data).serialize() as Record<
			string,
			unknown
		>;
		const serial2 = new DynamicModel(serial1 as any).serialize() as Record<
			string,
			unknown
		>;

		const diff = this.computeDiff(serial1, serial2);
		const lossless = Object.keys(diff).length === 0;

		const summary = lossless
			? 'Round-trip is lossless. Serialized output is stable across multiple serialize/create cycles.'
			: `Round-trip has ${Object.keys(diff).length} differing field(s): ${Object.keys(diff).join(', ')}. Review the diff for details.`;

		return {
			lossless,
			input: args.data,
			serialized: serial1,
			roundtrip_serialized: serial2,
			diff,
			summary,
		};
	}

	/**
	 * Computes a field-level diff between two plain objects.
	 *
	 * @param obj1 - Expected object (e.g. first serialization)
	 * @param obj2 - Actual object (e.g. round-trip serialization)
	 * @returns Record of differing keys with `{ expected, got }` values
	 */
	private computeDiff(
		obj1: Record<string, unknown>,
		obj2: Record<string, unknown>
	): Record<string, { expected: unknown; got: unknown }> {
		const result: Record<string, { expected: unknown; got: unknown }> = {};
		const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

		for (const key of allKeys) {
			if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
				result[key] = { expected: obj1[key], got: obj2[key] };
			}
		}

		return result;
	}

	/**
	 * Hydrates a string type token into the corresponding global constructor.
	 *
	 * @param options - String token (e.g. `'Date'`) or already-hydrated value
	 * @returns The resolved constructor or the original value if not a known token
	 */
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
				case 'URL':
					return URL;
				case 'URLSearchParams':
					return URLSearchParams;
				default:
					return options;
			}
		}

		if (Array.isArray(options)) {
			return options.map((item: any) => this.hydrateOptions(item));
		}

		if (options && typeof options === 'object') {
			const result: Record<string, any> = {};
			for (const [key, value] of Object.entries(options)) {
				result[key] = this.hydrateOptions(value);
			}
			return result;
		}

		return options;
	}
}
