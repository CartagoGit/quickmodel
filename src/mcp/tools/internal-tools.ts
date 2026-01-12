import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import {
	existsSync,
	mkdirSync,
	writeFileSync,
	readdirSync,
	readFileSync,
	statSync,
} from 'fs';
import { join, resolve as pathResolve, dirname } from 'path';

const spawnCommand = async (
	command: string,
	args: string[],
	cwd?: string
): Promise<{ stdout: string; stderr: string }> => {
	const { spawn } = await import('child_process');
	return new Promise((resolve, reject) => {
		const process = spawn(command, args, { cwd: cwd || undefined });
		let stdout = '';
		let stderr = '';

		process.stdout.on('data', (data) => {
			stdout += data.toString();
		});
		process.stderr.on('data', (data) => {
			stderr += data.toString();
		});

		process.on('close', (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
			} else {
				const error = new Error(`Command failed with code ${code}`);
				Object.assign(error, { stdout, stderr });
				reject(error);
			}
		});

		process.on('error', (err) => {
			Object.assign(err, { stdout, stderr });
			reject(err);
		});
	});
};

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
		const script = args.action === 'build' ? 'docs:build' : 'docs:clean';
		try {
			const { stdout, stderr } = await spawnCommand(
				'bun',
				['run', script],
				process.cwd()
			);
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
		await Promise.resolve();

		// 1. Resolve and Normalize Path
		const fullPath = pathResolve(process.cwd(), args.sourceFile);
		const cwd = process.cwd();

		// 2. SECURITY CHECK: Ensure path is within the project root
		if (!fullPath.startsWith(cwd)) {
			return {
				path: '',
				content: '',
				message: `Security Error: Path traverses outside the project root.`,
			};
		}

		if (!existsSync(fullPath)) {
			return {
				path: '',
				content: '',
				message: `File not found: ${args.sourceFile}`,
			};
		}

		// Heuristic to find test path
		// src/core/foo.ts -> tests/unit/core/foo.test.ts
		let testPath = fullPath
			.replace(join(cwd, 'src'), join(cwd, 'tests', 'unit'))
			.replace('.ts', '.test.ts');

		// If the replacement didn't happen (e.g. file not in src), handle gracefully or fallback
		if (testPath === fullPath) {
			// Fallback: just append .test.ts if not in src
			testPath = fullPath.replace('.ts', '.test.ts');
		}

		const fileName = testPath.split('/').pop()!;

		// Ensure test path is also safe (though it should be if fullPath was safe)
		if (!pathResolve(testPath).startsWith(cwd)) {
			return {
				path: '',
				content: '',
				message: `Security Error: Generated test path is outside project root.`,
			};
		}

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
			const relativePath = args.sourceFile.startsWith(cwd)
				? `./${args.sourceFile.substring(cwd.length + 1)}`
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
			await Promise.resolve(); // Async compliance if needed
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
		try {
			const { stdout, stderr } = await spawnCommand('bun', [
				'run',
				'check',
			]);
			return {
				status: 'ok',
				output: stdout + stderr,
			};
		} catch (error: any) {
			return {
				status: 'error',
				output: error.stdout + error.stderr || error.message,
			};
		}
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
		try {
			const { stdout, stderr } = await spawnCommand('bun', [
				'run',
				'test:coverage',
			]);
			return { summary: stdout + stderr };
		} catch (error: any) {
			return { summary: error.stdout + error.stderr || error.message };
		}
	}
}
