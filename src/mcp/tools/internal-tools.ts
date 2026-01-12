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

	async execute(args: {
		sourceFile: string;
	}): Promise<{ path: string; content: string; message?: string }> {
		const { existsSync } = await import('fs');
		const { join, resolve } = await import('path');

		// Resolve path relative to cwd if not absolute
		const fullPath = resolve(process.cwd(), args.sourceFile);

		if (!existsSync(fullPath)) {
			return {
				path: '',
				content: '',
				message: `File not found: ${args.sourceFile}`,
			};
		}

		// Heuristic to find test path
		// src/core/foo.ts -> tests/unit/core/foo.test.ts
		const testPath = fullPath
			.replace(
				join(process.cwd(), 'src'),
				join(process.cwd(), 'tests', 'unit')
			)
			.replace('.ts', '.test.ts');

		const fileName = testPath.split('/').pop()!;

		if (existsSync(testPath)) {
			return {
				path: testPath,
				content: '',
				message: `Test file already exists at ${testPath}`,
			};
		}

		try {
			// Derive className and relativePath for the template
			const className = fileName.replace(/\.ts$/, ''); // Simple derivation
			const relativePath = args.sourceFile.startsWith(process.cwd())
				? `./${args.sourceFile.substring(process.cwd().length + 1)}`
				: args.sourceFile;

			const content = `
import { describe, it, expect } from 'bun:test';
// import { ${className} } from '${relativePath}';

describe('${className}', () => {
    it('should be defined', () => {
        // expect(${className}).toBeDefined();
    });
});
`;
			// await fs.promises.write_file(testPath, content); // native fs not imported
			// Using bun write or console for now, but to be safe with node compat let's use console or mock
			// The original implementation had fs.writeFileSync.
			// Let's assume we want to write it.
			const { writeFileSync, mkdirSync } = await import('fs');
			const { dirname } = await import('path');
			mkdirSync(dirname(testPath), { recursive: true });
			writeFileSync(testPath, content);

			return {
				path: testPath,
				content,
				message: `Test file created at ${testPath}`,
			};
		} catch (error: any) {
			return {
				path: '',
				content: '',
				message: `Failed to generate test: ${error.message}`,
			};
		}
	}
}

/**
 * Tool to check for missing JSDocs in the codebase.
 */
export class QCheckMissingJSDocsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_jsdocs';
	description =
		'Scan the source code for exported members that are missing JSDoc documentation.';
	schema = z.object({});

	async execute(): Promise<{
		filesWithMissingDocs: string[];
		summary: string;
	}> {
		await Promise.resolve();
		// Simplified check: relying on grep/ripgrep if available or native logic.
		// Native logic:
		// Use simple recursive search using fs
		const { readdirSync, readFileSync, statSync } = await import('fs');
		const { join } = await import('path');

		const missingDocs: string[] = [];

		function scanDir(dir: string) {
			const files = readdirSync(dir);
			for (const file of files) {
				const fullPath = join(dir, file);
				if (statSync(fullPath).isDirectory()) {
					scanDir(fullPath);
				} else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
					const content = readFileSync(fullPath, 'utf-8');
					const lines = content.split('\n');
					let inComment = false;
					for (let i = 0; i < lines.length; i++) {
						const line = (lines[i] || '').trim();
						if (line.startsWith('/**')) inComment = true;
						if (line.endsWith('*/')) inComment = false;

						if (
							!inComment &&
							line.startsWith('export') &&
							!line.includes('from')
						) {
							// Check if previous line end was */
							let hasDoc = false;
							if (i > 0) {
								const prev = lines[i - 1];
								if (prev && prev.trim().endsWith('*/'))
									hasDoc = true;
							}
							if (!hasDoc) {
								missingDocs.push(
									`${fullPath}:${i + 1} ${line}`
								);
							}
						}
					}
				}
			}
		}

		try {
			// We need await Promise.resolve in execute to satisfy strict lint if no other await
			await Promise.resolve();
			scanDir(join(process.cwd(), 'src'));
		} catch (e: any) {
			return {
				filesWithMissingDocs: [],
				summary: 'Failed to scan: ' + e.message,
			};
		}

		return {
			filesWithMissingDocs: missingDocs.slice(0, 50),
			summary: `Found ${missingDocs.length} potential missing JSDocs.`,
		};
	}
}

/**
 * Tool to check project health (lint, typecheck, test).
 */
export class QCheckProjectHealthTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_project_health';
	description =
		'Run a comprehensive health check: Lint, Typecheck, and Run Tests.';
	schema = z.object({});

	async execute(): Promise<{ status: 'ok' | 'error'; output: string }> {
		return new Promise((resolve) => {
			exec('bun run check', (error, stdout, stderr) => {
				resolve({
					status: error ? 'error' : 'ok',
					output: stdout + stderr,
				});
			});
		});
	}
}

/**
 * Tool to get test coverage report.
 */
export class QGetCoverageReportTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'get_coverage_report';
	description = 'Run tests with coverage and report the summary.';
	schema = z.object({});

	async execute(): Promise<{ summary: string }> {
		return new Promise((resolve) => {
			exec('bun run test:coverage', (error, stdout, stderr) => {
				// We return stdout as it contains the table
				resolve({
					summary: stdout + stderr,
				});
			});
		});
	}
}
