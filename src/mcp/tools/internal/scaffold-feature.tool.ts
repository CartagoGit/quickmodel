import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, dirname, resolve, sep } from 'path';

/**
 * Tool to scaffold boilerplate code for new features.
 * Currently supports: 'transformer', 'tool'.
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
		'Generate boilerplate code for new features (transformers, tools).';
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

	async execute(args: {
		type: 'transformer' | 'tool';
		name: string;
		location?: string;
	}): Promise<{ path: string; message: string }> {
		await Promise.resolve();
		const cwd = process.cwd();
		const safeName = args.name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
		const pascalName = args.name
			.split('-')
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('');

		let targetPath = '';
		let content = '';

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
			content = `import { ValueTransformer } from '../core/services/value-transformer.service';

export const ${safeName}Transformer: ValueTransformer<any> = {
    name: '${safeName}',
    to: (value: any) => {
        // Transform value for quickmodel storage/usage
        return String(value);
    },
    from: (value: any) => {
        // Transform value back to original format
        return value;
    }
};
`;
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
			content = `import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

export class Q${pascalName}Tool extends QAbstractTool<z.ZodObject<{ input: z.ZodString }>> {
    name = '${safeName.replace(/-/g, '_')}';
    description = 'Description for ${safeName} tool.';
    schema = z.object({
        input: z.string().describe('Input argument'),
    });

    async execute(args: { input: string }): Promise<{ result: string }> {
        return { result: \`Processed \${args.input}\` };
    }
}
`;
		}

		if (!targetPath) {
			throw new Error('Could not determine target path');
		}

		if (this._fs.existsSync(targetPath)) {
			throw new Error(`File already exists: ${targetPath}`);
		}

		this._fs.mkdirSync(dirname(targetPath), { recursive: true });
		this._fs.writeFileSync(targetPath, content);

		return {
			path: targetPath,
			message: `Scaffolding complete for ${args.type} '${args.name}'`,
		};
	}
}
