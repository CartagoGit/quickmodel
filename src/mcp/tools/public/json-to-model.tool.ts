import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

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

		return { code };
	}
}
