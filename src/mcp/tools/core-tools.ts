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
				'The configuration object typically passed to @Quick() (e.g. { field: Date })'
			),
	});

	async execute(args: {
		data: Record<string, any>;
		options: Record<string, any>;
	}): Promise<{ result: any }> {
		// Simulate async work
		await Promise.resolve();
		// We create a temporary dynamic class to utilize the library's actual logic
		// This ensures the tool behaves EXACTLY like the real code.

		// Map string representations of types back to constructors if needed
		// NOTE: In a real advanced tool we might need a parser for "Date", "BigInt" strings if passed as JSON.
		// For now, we assume simple JSON-serializable inputs, so this simulation is limited to primitives
		// unless we add a hydration step.
		// FIXME: JSON cannot pass 'Date' constructor.
		// We will implement a basic string-to-constructor mapper for the 'options' arg.

		const hydratedOptions = this.hydrateOptions(args.options);

		@Quick(hydratedOptions)
		class DynamicModel extends QModel<any> {
			[key: string]: any;
		}

		const instance = DynamicModel.create(args.data);

		// We return the entries because the instance itself might be complex to serialize
		return { result: { ...instance } };
	}

	private hydrateOptions(options: Record<string, any>): Record<string, any> {
		const result: Record<string, any> = {};
		for (const [key, value] of Object.entries(options)) {
			if (value === 'Date') result[key] = Date;
			else if (value === 'BigInt') result[key] = BigInt;
			else if (value === 'RegExp') result[key] = RegExp;
			else result[key] = value;
		}
		return result;
	}
}
