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

/**
 * Tool to convert a raw JSON object into a QuickModel class definition.
 */
export class QJsonToModelTool extends QAbstractTool<
	z.ZodObject<{
		json: z.ZodString;
		className: z.ZodDefault<z.ZodString>;
	}>
> {
	name = 'json_to_model';
	description =
		'Convert a JSON string into a QuickModel class definition with inferred types.';
	schema = z.object({
		json: z.string().describe('The JSON string to convert'),
		className: z
			.string()
			.default('GeneratedModel')
			.describe('The name of the generated class'),
	});

	async execute(args: {
		json: string;
		className: string;
	}): Promise<{ code: string }> {
		await Promise.resolve();
		let data: any;
		try {
			data = JSON.parse(args.json);
		} catch (_e) {
			throw new Error('Invalid JSON provided');
		}

		if (typeof data !== 'object' || data === null) {
			throw new Error('JSON must be an object');
		}

		const props: string[] = [];
		const decorators: string[] = [];

		for (const [key, value] of Object.entries(data)) {
			let type = 'any';
			let transformer = '';

			if (typeof value === 'string') {
				type = 'string';
				// Simple heuristic for dates
				if (
					/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) ||
					/\d{4}-\d{2}-\d{2}/.test(value)
				) {
					transformer = 'date';
				} else {
					transformer = 'string';
				}
			} else if (typeof value === 'number') {
				type = 'number';
				transformer = 'number';
			} else if (typeof value === 'boolean') {
				type = 'boolean';
				transformer = 'boolean';
			} else if (Array.isArray(value)) {
				type = 'any[]';
				// We typically don't guess array types deep enough here for this simple tool
			} else if (typeof value === 'object') {
				type = 'any'; // Nested objects would need recursion or 'any'
			}

			if (transformer) {
				decorators.push(`    ${key}: '${transformer}'`);
			}
			props.push(`    public ${key}: ${type};`);
		}

		const decoratorString =
			decorators.length > 0
				? `@Quick({\n${decorators.join(',\n')}\n})`
				: '@Quick({})';

		const code = `import { QModel, Quick } from '@cartago-git/quickmodel';

${decoratorString}
export class ${args.className} extends QModel<${args.className}> {
${props.join('\n')}
}`;


/**
 * Tool to convert a TypeScript interface to a QuickModel class.
 */
export class QInterfaceToModelTool extends QAbstractTool<
	z.ZodObject<{
		code: z.ZodString;
	}>
> {
	name = 'interface_to_model';
	description =
		'Convert a TypeScript interface definition into a QuickModel class.';
	schema = z.object({
		code: z.string().describe('The TypeScript interface code'),
	});

	async execute(args: { code: string }): Promise<{ code: string }> {
		await Promise.resolve();
		// Naive regex parsing. In production use tsx/morph or similar.
		// Matches: interface Key { prop: type; }
		const interfaceMatch = args.code.match(
			/interface\s+(\w+)\s*{([\s\S]*?)}/
		);
		if (!interfaceMatch) {
			throw new Error('No interface found in code');
		}

		const name = interfaceMatch[1];
		const body = interfaceMatch[2];
		const props: string[] = [];
		const decorators: string[] = [];

		const lines = body?.split('\n') || [];
		for (const line of lines) {
			const trim = line.trim();
			if (!trim || trim.startsWith('//')) continue;
			// prop?: type;
			const propMatch = trim.match(/(\w+)(\??):\s*([^;]+);?/);
			if (propMatch) {
				const key = propMatch[1];
				const optional = propMatch[2] === '?';
				const tsType = propMatch[3]?.trim();
				let transformer = 'string'; // default

				if (tsType?.includes('Date')) transformer = 'date';
				else if (tsType?.includes('number')) transformer = 'number';
				else if (tsType?.includes('boolean')) transformer = 'boolean';
				// else if ... more complex logic

				decorators.push(`    ${key}: '${transformer}'`);
				props.push(
					`    public ${key}${optional ? '?' : ''}: ${tsType};`
				);
			}
		}

		const decoratorString =
			decorators.length > 0
				? `@Quick({\n${decorators.join(',\n')}\n})`
				: '@Quick({})';

		return {
			code: `import { QModel, Quick } from '@cartago-git/quickmodel';

${decoratorString}
export class ${name}Model extends QModel<${name}Model> {
${props.join('\n')}
}`,
		};
	}
}

/**
 * Tool to export a QuickModel to JSON Schema.
 */
export class QExportJsonSchemaTool extends QAbstractTool<
	z.ZodObject<{
		code: z.ZodString;
	}>
> {
	name = 'export_json_schema';
	description = 'Generate a JSON Schema Definition from a QuickModel class.';
	schema = z.object({
		code: z.string().describe('The QuickModel class code'),
	});

	async execute(args: { code: string }): Promise<{ schema: object }> {
		// Use inspect logic to get structure, then map to standard JSON Schema
		const tool = new QInspectModelTool();
		const inspectResult = await tool.execute({ code: args.code });
		const decorators = inspectResult.transformers; // e.g. ['string', 'date']
		// We need the keys too. QInspectModelTool currently only returns values in some regex way,
		// let's parse the structure property which was the config object string.
		// Actually, let's just re-parse here better for schema.

		const schema: any = {
			type: 'object',
			properties: {},
			required: [],
			title: inspectResult.name,
		};

		// Parse @Quick({ func: 'type' })
		// Flexible regex for keys and values
		const matches = args.code.matchAll(/(\w+):\s*['"](\w+)['"]/g);
		for (const m of matches) {
			const key = m[1]; // prop name
			const type = m[2]; // transformer name

			let jsonType: any = { type: 'string' };
			if (type === 'number' || type === 'integer')
				jsonType = { type: 'number' };
			else if (type === 'boolean') jsonType = { type: 'boolean' };
			else if (type === 'date')
				jsonType = { type: 'string', format: 'date-time' };

			if (key) {
				schema.properties[key] = jsonType;
				// Assume required for now unless we parse '?'
				schema.required.push(key);
			}
		}

		return { schema };
	}
}

/**
 * Tool to explain validation errors in plain language.
 */
export class QExplainErrorTool extends QAbstractTool<
	z.ZodObject<{
		error: z.ZodString;
	}>
> {
	name = 'explain_error';
	description =
		'Explain a QuickModel validation error in human-readable language.';
	schema = z.object({
		error: z.string().describe('The JSON string of the validation error'),
	});

	async execute(args: { error: string }): Promise<{ explanation: string }> {
		await Promise.resolve();
		let errObj: any;
		try {
			errObj = JSON.parse(args.error);
		} catch (_e) {
			return { explanation: 'Could not parse error JSON.' };
		}

		// QuickModel errors usually have structure { code, message, path, ... } or "errors": []
		// Let's handle a standard shape or the specific library shape.
		// Assuming we see standard QuickModel validation error shape.

		const explanations: string[] = [];

		const processError = (e: any) => {
			if (e.code === 'INVALID_TYPE') {
				return `Field '${e.path}' expected ${e.expected} but got ${e.received}.`;
			}
			if (e.code === 'REQUIRED') {
				return `Field '${e.path}' is required but was missing.`;
			}
			if (e.message) return e.message;
			return JSON.stringify(e);
		};

		if (Array.isArray(errObj)) {
			explanations.push(...errObj.map(processError));
		} else if (errObj.errors && Array.isArray(errObj.errors)) {
			explanations.push(...errObj.errors.map(processError));
		} else {
			explanations.push(processError(errObj));
		}

		return {
			explanation: `Found ${explanations.length} issues:\n- ${explanations.join('\n- ')}`,
		};
	}
}
