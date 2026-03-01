import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * MCP tool that converts a TypeScript `interface` declaration into a
 * QuickModel class extending `QModel`.
 *
 * @remarks
 * Parses the interface body with a lightweight regex approach (no compiler).
 * Type-mapping rules per property:
 * - `Date` in the type signature → transformer `Date`
 * - `BigInt` / `bigint` → transformer `BigInt`
 * - `Set` → transformer `Set`
 * - `Map` → transformer `Map`
 * - `RegExp` → transformer `RegExp`
 * - `number` → transformer `'number'`
 * - `boolean` → transformer `'boolean'`
 * - everything else → transformer `'string'` (safe default)
 *
 * Optional properties (`prop?: …`) are preserved with `?` in the generated
 * class. All property declarations use `declare` as required by QuickModel.
 * The generated class uses an explicit `I`-prefixed interface.
 *
 * @returns `{ code: string }` — a TypeScript class with `@Quick` decorator
 * and `declare`-typed property declarations.
 *
 * @throws {Error} If no valid `interface` definition is found in the input.
 *
 * @see {@link QCreateModelTool} — create a model from a schema definition
 * @see {@link QJsonToModelTool} — infer a model from a JSON object
 * @see {@link QExportJsonSchemaTool} — export a JSON Schema from the generated model
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
		'Convert a TypeScript interface definition into a QuickModel class. ' +
		'Automatically detects and maps transformable types (Date, BigInt, Set, Map, RegExp, number, boolean). ' +
		'Generates an I-prefixed interface, @Quick decorator, and declare property declarations. ' +
		'Returns { code } — ready-to-use TypeScript source.';
	schema = z.object({
		code: z.string().describe('The TypeScript interface code'),
	});

	/**
	 * Converts a TypeScript interface to a complete QuickModel class.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript interface source code to convert.
	 * @returns `{ code }` — generated TypeScript source code of the QuickModel class.
	 * @throws {Error} When no interface declaration is found in the provided code.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QCreateModelTool} — alternative when starting from a property schema, not an interface
	 */
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
		// Strip leading 'I' prefix for the class base name (if the interface already has it)
		const baseName =
			name.startsWith('I') &&
			name.length > 1 &&
			name[1] === name[1]?.toUpperCase()
				? name.slice(1)
				: name;
		const iName = `I${baseName}`;
		const className = `${baseName}Model`;
		const body = interfaceMatch[2];
		const declareProps: string[] = [];
		const interfaceLines: string[] = [];
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
				const tsType = propMatch[3]?.trim() ?? 'string';
				const transformer = this.inferTransformer(tsType);

				if (transformer !== null) {
					// Complex types need a transformer token in @Quick
					const token = transformer;
					decorators.push(`\t${key}: ${token}`);
				}
				interfaceLines.push(
					`\t${key}${optional ? '?' : ''}: ${tsType};`
				);
				declareProps.push(
					`\tdeclare ${key}${optional ? '?' : ''}: ${tsType};`
				);
			}
		}

		const quickConfig =
			decorators.length > 0
				? `@Quick({\n${decorators.join(',\n')}\n})`
				: '@Quick({})';

		return {
			code: `import { QModel, Quick } from 'quickmodel';

interface ${iName} {
${interfaceLines.join('\n')}
}

${quickConfig}
export class ${className} extends QModel<${iName}> {
${declareProps.join('\n')}
}`,
		};
	}

	/**
	 * Infers the QuickModel transformer token for a given TypeScript type string.
	 *
	 * @param tsType - TypeScript type string (e.g. `'Date'`, `'number'`, `'Set<string>'`).
	 * @returns The transformer constructor string (e.g. `'Date'`), quoted primitive token
	 *   (e.g. `"'number'"`), or `null` when no transformer is needed (raw primitives).
	 */
	private inferTransformer(tsType: string): string | null {
		if (tsType.includes('Date')) return 'Date';
		if (tsType.includes('BigInt') || tsType === 'bigint') return 'BigInt';
		if (tsType.includes('RegExp')) return 'RegExp';
		if (tsType.startsWith('Set')) return 'Set';
		if (tsType.startsWith('Map')) return 'Map';
		if (tsType.startsWith('URL')) return 'URL';
		if (tsType === 'number') return "'number'";
		if (tsType === 'boolean') return "'boolean'";
		// string and unknown types: no transformer token needed
		return null;
	}
}
