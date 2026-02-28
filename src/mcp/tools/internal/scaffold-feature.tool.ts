import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, dirname, resolve, sep } from 'path';

/**
 * Tool to scaffold boilerplate code for new features.
 * Currently supports: 'transformer', 'tool'.
 *
 * Always generates both the source file **and** its paired test skeleton so
 * TDD can begin immediately without extra steps.
 *
 * @see {@link QCreateModelTool} — scaffold a new QModel class
 * @see {@link QGenerateTestTool} — generate test boilerplate for a source file
 * @see {@link QCheckProjectRulesTool} — verify scaffolded code follows project rules
 */
export class QScaffoldFeatureTool extends QAbstractTool<
	z.ZodObject<{
		type: z.ZodUnion<
			readonly [z.ZodLiteral<'transformer'>, z.ZodLiteral<'tool'>]
		>;
		name: z.ZodString;
		location: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'scaffold_feature';
	description =
		'Generate boilerplate for a new transformer or MCP tool, including a paired test skeleton. ' +
		'Always call this first when creating a new tool or transformer before writing any code.';
	schema = z.object({
		type: z
			.union([z.literal('transformer'), z.literal('tool')])
			.describe('Type of feature to scaffold'),
		name: z
			.string()
			.describe('Name of the feature (e.g., "email", "validate-user")'),
		location: z
			.string()
			.optional()
			.describe(
				'Target directory (relative to project root). Defaults to standard locations.'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Scaffolds a source file and a paired test skeleton for a new transformer
	 * or MCP tool.
	 *
	 * @param args - Scaffolding options.
	 * @param args.type - Feature type: `'transformer'` → `src/transformers/`;
	 * `'tool'` → `src/mcp/tools/internal/`.
	 * @param args.name - Kebab-case feature name (e.g. `'email'`,
	 * `'validate-user'`). Used to derive the file name and PascalCase class name.
	 * @param args.location - Target directory relative to project root.
	 * Overrides the default placement for `type`.
	 * @returns `{ path, testPath, message }` — absolute paths of both generated
	 * files and a human-readable summary.
	 * @throws {Error} When the resolved target path is outside the project root
	 * (path-traversal guard).
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QGenerateTestTool} — alternative for existing files without a scaffold
	 */
	async execute(args: {
		type: 'transformer' | 'tool';
		name: string;
		location?: string;
	}): Promise<{ path: string; testPath: string; message: string }> {
		await Promise.resolve();
		const cwd = process.cwd();
		const safeName = args.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		const pascalName = args.name
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('');

		let targetPath = '';
		let content = '';
		let testPath = '';
		let testContent = '';

		if (args.type === 'transformer') {
			const dir = args.location
				? resolve(cwd, args.location)
				: join(cwd, 'src/transformers');

			const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
			const safeDir = dir.endsWith(sep) ? dir : dir + sep;
			if (!safeDir.startsWith(safeCwd)) {
				throw new Error(
					'Security Error: Target path is outside project root.'
				);
			}

			targetPath = join(dir, `${safeName}.transformer.ts`);
			content = this.buildTransformerContent(safeName, pascalName);
			if (!args.location) {
				testPath = join(
					cwd,
					'tests/unit/transformers',
					`${safeName}.transformer.test.ts`
				);
				testContent = this.buildTransformerTestContent(
					safeName,
					pascalName
				);
			}
		} else if (args.type === 'tool') {
			const dir = args.location
				? resolve(cwd, args.location)
				: join(cwd, 'src/mcp/tools/internal');

			const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
			const safeDir = dir.endsWith(sep) ? dir : dir + sep;
			if (!safeDir.startsWith(safeCwd)) {
				throw new Error(
					'Security Error: Target path is outside project root.'
				);
			}

			targetPath = join(dir, `${safeName}.tool.ts`);
			content = this.buildToolContent(safeName, pascalName);
			if (!args.location) {
				testPath = join(
					cwd,
					'tests/mcp/unit/internal',
					`${safeName}.tool.test.ts`
				);
				testContent = this.buildToolTestContent(safeName, pascalName);
			}
		}

		if (!targetPath) {
			throw new Error('Could not determine target path');
		}

		if (this._fs.existsSync(targetPath)) {
			throw new Error(`File already exists: ${targetPath}`);
		}

		this._fs.mkdirSync(dirname(targetPath), { recursive: true });
		this._fs.writeFileSync(targetPath, content);

		if (testPath && testContent && !this._fs.existsSync(testPath)) {
			this._fs.mkdirSync(dirname(testPath), { recursive: true });
			this._fs.writeFileSync(testPath, testContent);
		}

		const testLine = testPath
			? `  Test   : ${testPath}\n`
			: `  Test   : not generated (custom location — create it manually)\n`;

		return {
			path: targetPath,
			testPath,
			message:
				`Scaffolded ${args.type} '${args.name}'.\n` +
				`  Source : ${targetPath}\n` +
				testLine +
				`\nNext steps:\n` +
				`  1. Open the test file and write your failing assertions (bun test <testPath>)\n` +
				`  2. Fill in the STEP comments in the source file\n` +
				`  3. Run lint_check + typecheck to confirm compliance`,
		};
	}

	/** @internal */
	private buildTransformerContent(
		safeName: string,
		pascalName: string
	): string {
		return `import { BaseTransformer } from '@/core/bases/base-transformer';
import type { IQTransformContext } from '@/core/interfaces/transformer.interface';
// import { QTransformerRegistry } from '@/core/registry/transformer.registry';

/**
 * ${pascalName}Transformer — custom transformer for the '${safeName}' type.
 *
 * Register once at app startup:
 *   QTransformerRegistry.register(${pascalName}, new ${pascalName}Transformer());
 *
 * Then reference the constructor in any @Quick config:
 *   @Quick({ myField: ${pascalName} })
 */
export class ${pascalName}Transformer extends BaseTransformer<
	// STEP 1 — Replace with your runtime type (e.g. Decimal, Date, URL)
	unknown,
	// STEP 2 — Replace with the serialized form stored in your DB/JSON (e.g. string, number)
	unknown
> {
	deserialize(
		value: unknown,
		_propertyKey: string,
		_className: string,
		_context?: IQTransformContext
	): unknown {
		if (value == null) return null;
		// STEP 3 — Convert the raw serialized value to your runtime type
		// Example: return new Decimal(String(value));
		return value;
	}

	serialize(value: unknown): unknown {
		if (value == null) return null;
		// STEP 4 — Convert the runtime value to a JSON-safe form
		// Example: return (value as Decimal).toFixed(2);
		return value;
	}
}
`;
	}

	/** @internal */
	private buildToolContent(safeName: string, pascalName: string): string {
		const toolName = safeName.replace(/-/g, '_');
		return `import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

/**
 * Q${pascalName}Tool — [add brief one-line description].
 *
 * @remarks
 * [Describe what this tool does, its inputs, and expected outputs.]
 *
 * ⚠️  After creating this file, register it in \`src/mcp/server.ts\`:
 *   import { Q${pascalName}Tool } from '@mcp/tools/internal/${safeName}.tool';
 *   // Then add: new Q${pascalName}Tool() to the tools array.
 *
 * @internal
 */
export class Q${pascalName}Tool extends QAbstractTool<
	z.ZodObject<{
		// STEP 1 — Define your input schema fields
		input: z.ZodString;
	}>
> {
	name = '${toolName}';
	title = '${pascalName} — [add short display title]';
	description =
		'[Add clear English description of what this tool does. This text is read by AI agents to decide when to call it.]';
	schema = z.object({
		// STEP 2 — Add your input fields with .describe() for each
		input: z.string().describe('[Describe this input field]'),
	});

	async execute(args: { input: string }): Promise<{ result: string }> {
		// STEP 3 — Implement the tool logic; remove unused args when done
		return { result: args.input };
	}
}
`;
	}

	/** @internal */
	private buildTransformerTestContent(
		safeName: string,
		pascalName: string
	): string {
		return `import { describe, it, expect, beforeEach } from 'bun:test';
import { ${pascalName}Transformer } from '@/transformers/${safeName}.transformer';

describe('${pascalName}Transformer', () => {
	let transformer: ${pascalName}Transformer;

	beforeEach(() => {
		transformer = new ${pascalName}Transformer();
	});

	describe('deserialize()', () => {
		it('returns null when value is null', () => {
			expect(transformer.deserialize(null, 'field', 'Model')).toBeNull();
		});

		it('returns null when value is undefined', () => {
			expect(transformer.deserialize(undefined, 'field', 'Model')).toBeNull();
		});

		it('transforms a valid serialized value to the runtime type', () => {
			// STEP — Replace with a real assertion once STEP 3 is implemented
			const result = transformer.deserialize('input', 'field', 'Model');
			expect(result).toBeDefined();
		});
	});

	describe('serialize()', () => {
		it('returns null when value is null', () => {
			expect(transformer.serialize(null)).toBeNull();
		});

		it('converts the runtime value to a serialized form', () => {
			// STEP — Replace with a real assertion once STEP 4 is implemented
			const result = transformer.serialize('value' as never);
			expect(result).toBeDefined();
		});
	});
});
`;
	}

	/** @internal */
	private buildToolTestContent(safeName: string, pascalName: string): string {
		const toolName = safeName.replace(/-/g, '_');
		return `import { describe, it, expect } from 'bun:test';
import { Q${pascalName}Tool } from '@mcp/tools/internal/${safeName}.tool';

describe('Q${pascalName}Tool', () => {
	const tool = new Q${pascalName}Tool();

	it('has the correct name', () => {
		expect(tool.name).toBe('${toolName}');
	});

	it('returns a result for valid input', async () => {
		// STEP — Replace with real assertions once STEP 3 is implemented
		const result = await tool.execute({ input: 'test' });
		expect(result).toBeDefined();
	});

	it('result has expected shape', async () => {
		const result = await tool.execute({ input: 'hello' });
		// STEP — Adjust property assertions to match your actual return type
		expect(result).toHaveProperty('result');
	});
});
`;
	}
}
