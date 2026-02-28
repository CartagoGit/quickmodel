import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { QModel } from '../../../core/models/quick.model';
import { Quick } from '../../../core/decorators/quick.decorator';

/**
 * Tool to generate mock data based on a simple schema definition.
 * This demonstrates the power of QModel.mock() dynamically.
 */
export class QGenerateMockDataTool extends QAbstractTool<
	z.ZodObject<{
		schema: z.ZodRecord<z.ZodString, z.ZodString>;
		count: z.ZodDefault<z.ZodNumber>;
	}>
> {
	name = 'generate_mock';
	description =
		'Generate mock data for a given schema definition using QuickModel.';
	schema = z.object({
		schema: z
			.record(z.string(), z.string())
			.describe(
				'Key-value pairs where key is field name and value is transformer type (e.g. { "birth": "date", "name": "string" })'
			),
		count: z
			.number()
			.default(1)
			.describe('Number of mock objects to generate'),
	});

	/**
	 * Generates mock data instances for a dynamic QuickModel schema.
	 *
	 * @param args - Tool arguments.
	 * @param args.schema - Type configuration in `@Quick()` format (e.g. `{ createdAt: 'Date' }`).
	 * @param args.count - Number of mock objects to generate.
	 * @returns Array of serialized plain objects, one per requested mock instance.
	 */
	async execute(args: {
		schema: Record<string, unknown>;
		count: number;
	}): Promise<unknown[]> {
		await Promise.resolve();
		// dynamically create a class
		// We can't easily perform "class X extends QModel" dynamically in strict TS without eval or mixins
		// But we can define an anonymous class.

		/** @internal Ephemeral model built dynamically to apply the caller-supplied schema. */
		class DynamicModel extends QModel<any> {}

		// Apply decorators manually
		// @Quick(args.schema)
		Quick(args.schema as any)(DynamicModel);

		// Generate mocks
		const mocks: any[] = [];
		for (let idx = 0; idx < args.count; idx++) {
			mocks.push((DynamicModel.mock().random() as any).serialize());
		}

		return mocks;
	}
}
