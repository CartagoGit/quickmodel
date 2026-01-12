import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join, basename } from 'path';

const execAsync = promisify(exec);

/**
 * Tool to trigger documentation updates.
 * Useful for internal workflows when docs need to be refreshed.
 */
export class QUpdateDocsTool extends QAbstractTool<
	z.ZodObject<{
		action: z.ZodUnion<
			readonly [z.ZodLiteral<'build'>, z.ZodLiteral<'clean'>]
		>;
	}>
> {
	name = 'update_docs';
	description = 'Internal tool to run documentation build scripts.';
	schema = z.object({
		action: z
			.union([z.literal('build'), z.literal('clean')])
			.describe('The action to perform'),
	});

	async execute(args: { action: 'build' | 'clean' }): Promise<{
		stdout: string;
		stderr: string;
	}> {
		const command =
			args.action === 'build'
				? 'bun run docs:build'
				: 'bun run docs:clean';
		try {
			const { stdout, stderr } = await execAsync(command, {
				cwd: process.cwd(),
			});
			return { stdout, stderr };
		} catch (error: any) {
			return { stdout: '', stderr: error.message };
		}
	}
}

/**
 * Tool to scaffold a test file for a given source file.
 */
export class QGenerateTestTool extends QAbstractTool<
	z.ZodObject<{ sourceFile: z.ZodString }>
> {
	name = 'generate_test';
	description =
		'Internal tool to generate a starter test file for a source component.';
	schema = z.object({
		sourceFile: z
			.string()
			.describe(
				'Absolute path to the source file (e.g., src/core/user.ts)'
			),
	});

	async execute(args: { sourceFile: string }): Promise<{
		path: string;
		content: string;
	}> {
		// Simulate async work
		await Promise.resolve();

		if (!existsSync(args.sourceFile)) {
			throw new Error(`Source file not found: ${args.sourceFile}`);
		}

		const fileName = basename(args.sourceFile);
		const testFileName = fileName.replace(/\.ts$/, '.test.ts');
		// Heuristic: try to place it in tests/unit mirroring structure or just flat for now
		// For simplicity, we suggest a path in tests/generated/
		const testPath = join(
			process.cwd(),
			'tests',
			'generated',
			'mcp',
			testFileName
		);

		const content = `
import { describe, it, expect } from 'bun:test';
// TODO: Import your class from ${args.sourceFile}
// import { YourClass } from '@/...';

describe('${fileName} (Generated)', () => {
    it('should be testable', () => {
        expect(true).toBe(true);
    });
});
        `.trim();

		// We don't write it automatically to avoid overwriting; we return the content.
		return { path: testPath, content };
	}
}
