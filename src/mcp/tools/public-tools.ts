import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import { QModel } from '../../core/models/quick.model';
import { Quick } from '../../core/decorators/quick.decorator';
import { TransformerLookupService } from '../../core/services/transformer-lookup.service';

/**
 * Tool to list all available transformers in the registry.
 */
export class QListTransformersTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'list_transformers';
	description =
		'List all available data transformers in QuickModel (e.g., string, date, email).';
	schema = z.object({});

	execute(): Promise<string[]> {
		// Use the service to get the real list
		const service = new TransformerLookupService();
		const transformers = service.getAvailableTransformers();

		// If empty (shouldn't happen as default ones are registered in constructor), fallback
		if (transformers.length === 0) {
			return Promise.resolve([
				'string',
				'number',
				'boolean',
				'date',
				'bigint',
			]);
		}

		return Promise.resolve(transformers.sort());
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

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

/**
 * Tool to search the documentation.
 */
export class QSearchDocsTool extends QAbstractTool<
	z.ZodObject<{ query: z.ZodString }>
> {
	name = 'search_docs';
	description = 'Search the QuickModel documentation for a query string.';
	schema = z.object({
		query: z.string().describe('The search term or phrase'),
	});

	async execute(args: { query: string }): Promise<{ matches: string[] }> {
		try {
			// Grep recursively in docs/ folder, case insensitive, show line number
			const cmd = `grep -rnC 2 -i "${args.query.replace(
				/"/g,
				'"'
			)}" docs/ docs-vitepress/guide`;
			const { stdout } = await execAsync(cmd).catch((e) => ({
				stdout: e.stdout || '',
			}));
			const lines = stdout
				.split('\n')
				.filter((block: string) => block.length > 0)
				.slice(0, 20); // Limit results
			return { matches: lines };
		} catch (_error) {
			return { matches: [] };
		}
	}
}
