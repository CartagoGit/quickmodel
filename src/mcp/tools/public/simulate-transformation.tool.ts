import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { Quick } from '../../../core/decorators/quick.decorator';
import { QModel } from '../../../core/models/quick.model';

/**
 * Tool to simulate how QuickModel transforms data.
 * This allows the agent to "preview" what the library does.
 *
 * @see {@link QRoundtripTool} — verify full round-trip losslessness
 * @see {@link QListTransformersTool} — list all available transformer types
 * @see {@link QCheckIntegrityTool} — check transformer-level integrity constraints
 */
export class QSimulateTransformationTool extends QAbstractTool<
	z.ZodObject<{
		data: z.ZodRecord<z.ZodString, z.ZodAny>;
		options: z.ZodRecord<z.ZodString, z.ZodAny>;
	}>
> {
	name = 'simulate_transformation';
	description =
		'Simulates a QuickModel data transformation given an input object and a configuration map.';
	schema = z.object({
		data: z
			.record(z.string(), z.any())
			.describe('The raw input data object'),
		options: z
			.record(z.string(), z.any())
			.describe(
				'The configuration object typically passed to @Quick() (e.g. { field: "Date", list: ["Date"] })'
			),
	});

	/**
	 * Hydrates a dynamic QuickModel with the provided data and transformer options,
	 * then returns the fully serialized output.
	 *
	 * @param args - Tool arguments.
	 * @param args.data - Raw input data (e.g. `{ createdAt: '2024-01-01' }`).
	 * @param args.options - Transformer config in `@Quick()` format (e.g. `{ createdAt: 'Date' }`).
	 * @returns `{ result }` — the fully serialized plain object after transformation.
	 */
	async execute(args: {
		data: Record<string, unknown>;
		options: Record<string, unknown>;
	}): Promise<{ result: unknown }> {
		await Promise.resolve();

		const hydratedOptions = this.hydrateOptions(args.options);

		@Quick(hydratedOptions)
		/** @internal Ephemeral model built from caller-supplied options to simulate a single transformation. */
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const instance = DynamicModel.create(args.data);

		// QModel.toJSON() returns a serialized JSON string.
		// We parse it back to an object to return structured data to the MCP client.
		// This ensures all complex types (Date, BigInt, Set) are properly converted to their JSON representations.
		return { result: JSON.parse(instance.toJSON()) };
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
			return options.map((item) => this.hydrateOptions(item));
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
