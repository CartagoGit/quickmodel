import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * MCP tool that converts a TypeScript `interface` declaration into a
 * QuickModel class extending `QModel`.
 *
 * @remarks
 * Parses the interface body with a lightweight regex approach (no compiler).
 * Type-mapping rules per property:
 * - `Date` in the type signature → transformer `"date"`
 * - `number` → transformer `"number"`
 * - `boolean` → transformer `"boolean"`
 * - everything else → transformer `"string"` (safe default)
 *
 * Optional properties (`prop?: …`) are preserved with `?` in the generated
 * class.
 *
 * @returns `{ code: string }` — a TypeScript class with `@Quick` decorator
 * and typed property declarations.
 *
 * @throws {Error} If no valid `interface` definition is found in the input.
 *
 * @internal Registered on the MCP server; not part of the public library API.
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
			code: `import { QModel, Quick } from 'quickmodel';

${decoratorString}
export class ${name}Model extends QModel<${name}Model> {
${props.join('\n')}
}`,
		};
	}
}
