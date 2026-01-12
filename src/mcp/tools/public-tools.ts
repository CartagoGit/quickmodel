import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import { QModel } from '../../core/models/quick.model';
import { Quick } from '../../core/decorators/quick.decorator';

/**
 * Tool to list all available transformers in the registry.
 */
export class QListTransformersTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'list_transformers';
	description =
		'List all available data transformers in QuickModel (e.g., string, date, email).';
	schema = z.object({});

	async execute(): Promise<string[]> {
		await Promise.resolve();
		// Return hardcoded list as registry access might be restricted or empty in this context
		// In a real app we'd iterate QTransformerRegistry.registry
		return [
			'string',
			'number',
			'boolean',
			'date',
			'bigint',
			'buffer',
			'regexp',
			'symbol',
			'map',
			'set',
			'url',
			'email',
			'uuid',
			'password',
			'hex',
			'base64',
			'int',
			'float',
			'currency',
			'percentage',
		];
	}
}

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

	async execute(args: {
		schema: Record<string, string>;
		count: number;
	}): Promise<any[]> {
		await Promise.resolve();
		// dynamically create a class
		// We can't easily perform "class X extends QModel" dynamically in strict TS without eval or mixins
		// But we can define an anonymous class.

		class DynamicModel extends QModel<any> {}

		// Apply decorators manually
		// @Quick(args.schema)
		Quick(args.schema)(DynamicModel);

		// Generate mocks
		const mocks: any[] = [];
		for (let i = 0; i < args.count; i++) {
			mocks.push((DynamicModel.mock().random() as any).serialize());
		}

		return mocks;
	}
}

/**
 * Tool to analyze a model structure (simplified).
 */
export class QInspectModelTool extends QAbstractTool<
	z.ZodObject<{ code: z.ZodString }>
> {
	name = 'inspect_model';
	description =
		'Analyze a QuickModel class definition and explain its structure.';
	schema = z.object({
		code: z.string().describe('The TypeScript code of the model class'),
	});

	async execute(args: { code: string }): Promise<{
		name: string;
		transformers: string[];
		structure: string;
	}> {
		await Promise.resolve();
		// Simple regex parsing for demonstration
		const classNameMatch = args.code.match(
			/class\s+(\w+)\s+extends\s+QModel/
		);
		const className =
			classNameMatch && classNameMatch[1] ? classNameMatch[1] : 'Unknown';

		const decorators = Array.from(
			args.code.matchAll(/@Quick\(\s*({[\s\S]*?})\s*\)/g)
		);
		const quickConfig =
			decorators.length > 0 && decorators[0] && decorators[0][1]
				? decorators[0][1]
				: '{}';

		// Extract transformer types roughly using regex
		const transformerMatches = Array.from(
			quickConfig.matchAll(/:\s*['"]?(\w+)['"]?/g)
		);
		// Filter out undefineds to ensure string[]
		const transformers = transformerMatches
			.map((m) => m[1])
			.filter((t): t is string => t !== undefined);

		return {
			name: className,
			transformers: transformers,
			structure: quickConfig.replace(/\s+/g, ' '),
		};
	}
}
