import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * MCP tool that infers a QuickModel class definition from a raw JSON string.
 *
 * @remarks
 * Type inference rules applied per-key:
 * - `number`  → transformer `"number"`
 * - `boolean` → transformer `"boolean"`
 * - ISO-8601 date strings → transformer `"date"`
 * - everything else → transformer `"string"` (safe default)
 *
 * The class name defaults to `"GeneratedModel"` when not supplied and is
 * validated against a safe identifier pattern before code generation.
 *
 * @returns `{ code: string }` — a fully-formed TypeScript class extending
 * `QModel` with `@Quick` decorator configuration.
 *
 * @throws {Error} If the JSON is invalid, if the root value is not an object,
 * or if the supplied class name is not a valid identifier.
 *
 * @internal Registered on the MCP server; not part of the public library API.
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
		className?: string;
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

		// Apply default className if not provided
		const className = args.className || 'GeneratedModel';

		// SECURITY: Validate class name
		if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(className)) {
			throw new Error(
				`Invalid class name: "${className}". Must be a valid identifier.`
			);
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

			// Handle key safety
			let safeKey = key;
			const isSimpleIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key);

			if (!isSimpleIdentifier) {
				safeKey = JSON.stringify(key);
			}

			if (transformer) {
				decorators.push(`    ${safeKey}: '${transformer}'`);
			}
			props.push(`    public ${safeKey}: ${type};`);
		}

		const decoratorString =
			decorators.length > 0
				? `@Quick({\n${decorators.join(',\n')}\n})`
				: '@Quick({})';

		const code = `import { QModel, Quick } from 'quickmodel';

${decoratorString}
export class ${className} extends QModel<${className}> {
${props.join('\n')}
}`;

		return { code };
	}
}
