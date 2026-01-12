import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import { Quick } from '../../core/decorators/quick.decorator';
import { QModel } from '../../core/models/quick.model';

/**
 * Tool to simulate how QuickModel transforms data.
 * This allows the agent to "preview" what the library does.
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

	async execute(args: {
		data: Record<string, any>;
		options: Record<string, any>;
	}): Promise<{ result: any }> {
		// Simulate async work
		await Promise.resolve();

		const hydratedOptions = this.hydrateOptions(args.options);

		@Quick(hydratedOptions)
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const instance = DynamicModel.create(args.data);

		// We return the entries because the instance itself might be complex to serialize
		// converting to plain object to ensure JSON serializability for the MCP response
		return { result: JSON.parse(JSON.stringify(instance)) };
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
