import { z } from 'zod';
import { QAbstractTool } from './abstract-tool';
import * as fs from 'fs';
import { join, resolve as pathResolve, dirname } from 'path';

export const spawnCommand = async (
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

	// Dependency Injection point for testing
	// Using explicit property so tests can override it without spying on global modules
	protected _spawn = spawnCommand;

	async execute(args: { action: 'build' | 'clean' }): Promise<{
		stdout: string;
		stderr: string;
	}> {
		const script = args.action === 'build' ? 'docs:build' : 'docs:clean';
		try {
			const { stdout, stderr } = await this._spawn(
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

	// Dependency Injection for FS
	protected _fs = fs;

	async execute(args: {
		sourceFile: string;
	}): Promise<{ path: string; content: string; message?: string }> {
		await Promise.resolve();

		// 1. Resolve and Normalize Path
		const fullPath = pathResolve(process.cwd(), args.sourceFile);
		const cwd = process.cwd();

		// 2. SECURITY CHECK: Ensure path is within the project root
		// Note: We use process.cwd() directly here, but _fs is used for file ops.
		// If we wanted to be 100% DI we would inject cwd too, but fs is the main pain point.
		if (!fullPath.startsWith(cwd)) {
			return {
				path: '',
				content: '',
				message: `Security Error: Path traverses outside the project root.`,
			};
		}

		if (!this._fs.existsSync(fullPath)) {
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

		if (this._fs.existsSync(testPath)) {
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

			this._fs.mkdirSync(dirname(testPath), { recursive: true });
			this._fs.writeFileSync(testPath, content);

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

	protected _fs = fs;

	async execute(): Promise<{
		filesWithMissingDocs: string[];
		summary: string;
	}> {
		const missingDocs: string[] = [];
		const self = this;

		function scanDir(dir: string) {
			const files = self._fs.readdirSync(dir);
			for (const file of files) {
				// readdirSync returns string[] | Buffer[] or Dirent[] based on options.
				// Default is string[]. We assume string[].
				const fileName = String(file);
				const fullPath = join(dir, fileName);

				if (self._fs.statSync(fullPath).isDirectory()) {
					scanDir(fullPath);
				} else if (
					fileName.endsWith('.ts') &&
					!fileName.endsWith('.d.ts')
				) {
					const content = self._fs.readFileSync(fullPath, 'utf-8');
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
			// Start scan on src
			// Note: "src" is hardcoded here relative to cwd
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

	protected _spawn = spawnCommand;

	async execute(): Promise<{ status: 'ok' | 'error'; output: string }> {
		try {
			const { stdout, stderr } = await this._spawn('bun', [
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

	protected _spawn = spawnCommand;

	async execute(): Promise<{ summary: string }> {
		try {
			const { stdout, stderr } = await this._spawn('bun', [
				'run',
				'test:coverage',
			]);
			return { summary: stdout + stderr };
		} catch (error: any) {
			return { summary: error.stdout + error.stderr || error.message };
		}
	}
}

/**
 * Tool to synchronize documentation content with code.
 * Automatically updates:
 * - Public Tools reference
 * - Internal Tools reference
 * - Transformers reference
 */
export class QSyncDocsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'update_docs_content';
	description =
		'Auto-generate documentation files for Tools and Transformers based on current code.';
	schema = z.object({});

	protected _fs = fs;

	async execute(): Promise<{ summary: string; updatedFiles: string[] }> {
		const updatedFiles: string[] = [];
		const cwd = process.cwd();

		// 1. Get Tools via dynamic import to avoid circular dependency
		// Note: We assume the server exports QMcpServer class
		const { QMcpServer } = await import('../server');
		const tools = QMcpServer.getDefaultTools();

		// Separate Public vs Internal
		// Heuristic: Internal tools usually are in internal-tools.ts or have names like 'check_', 'generate_test', 'update_docs'
		// We can categorize by checking if they are instance of classes in this file, but that's hard dynamically.
		// Better heuristic: internal tools start with 'check_', 'generate_test', 'update_', 'get_coverage'
		// Or simply hardcode the list or check descriptions?
		// Let's use a "public" vs "internal" classification based on names for now, or assume all in public-tools.ts are public.
		// Since we have instances, we can check their class names? No, minification might break it.
		// Let's use the names.
		const internalPrefixes = [
			'check_',
			'update_',
			'generate_test',
			'get_coverage',
		];
		const internalTools = tools.filter((t: any) =>
			internalPrefixes.some((p) => t.name.startsWith(p))
		);
		const publicTools = tools.filter(
			(t: any) => !internalPrefixes.some((p) => t.name.startsWith(p))
		);

		// 2. Generate Tools Documentation
		const publicDocs = this.generateToolMd(publicTools, 'Public MCP Tools');
		const internalDocs = this.generateToolMd(
			internalTools,
			'Internal MCP Tools'
		);

		this.writeDoc(
			pathResolve(cwd, 'docs-vitepress/en/mcp/public/tools.md'),
			publicDocs,
			updatedFiles
		);
		this.writeDoc(
			pathResolve(cwd, 'docs-vitepress/en/mcp/internal/tools.md'),
			internalDocs,
			updatedFiles
		);

		// 3. Generate Transformers Documentation
		const { TransformerLookupService } =
			await import('../../core/services/transformer-lookup.service');
		const transformers =
			new TransformerLookupService().getAvailableTransformers();
		const transformerDocs = this.generateTransformerMd(transformers);

		this.writeDoc(
			pathResolve(cwd, 'docs-vitepress/en/guide/transformers.md'),
			transformerDocs,
			updatedFiles
		);

		return {
			summary: `Successfully updated ${updatedFiles.length} documentation files.`,
			updatedFiles,
		};
	}

	private generateToolMd(tools: any[], title: string): string {
		let md = `# ${title}\n\n`;
		md += `_Auto-generated by QSyncDocsTool. Do not edit manually._\n\n`;

		for (const tool of tools) {
			md += `## \`${tool.name}\`\n\n`;
			md += `${tool.description}\n\n`;
			md += `### Input Schema\n\n`;
			md += `\`\`\`json\n`;
			// format zod schema if possible?
			// tool.schema is a ZodObject. We can use zod-to-json-schema if installed, or just simple introspection
			// For now, let's just describe it or omit strict JSON schema to avoid huge deps if not needed.
			// Let's try to print a simplified view.
			const shape = tool.schema.shape || {};
			const simpleSchema: any = {};
			for (const key in shape) {
				const def = shape[key];
				simpleSchema[key] = {
					type: def._def.typeName,
					description: def.description,
				};
				if (def.isOptional && def.isOptional()) {
					simpleSchema[key].optional = true;
				}
			}
			md += JSON.stringify(simpleSchema, null, 2);
			md += `\n\`\`\`\n\n`;
		}
		return md;
	}

	private generateTransformerMd(transformers: string[]): string {
		let md = `# Built-in Transformers\n\n`;
		md += `QuickModel comes with a set of built-in transformers to handle common data types.\n\n`;
		md += `_Auto-generated by QSyncDocsTool._\n\n`;

		md += `| Transformer | Description |\n`;
		md += `| :--- | :--- |\n`;

		for (const t of transformers.sort()) {
			// We don't have descriptions in the registry yet, so just list them
			md += `| \`${t}\` | Handles \`${t}\` data types. |\n`;
		}

		md += `\n\nSee [Custom Transformers](./custom-transformers.md) to add your own.\n`;
		return md;
	}

	private writeDoc(path: string, content: string, updatedFiles: string[]) {
		// Ensure dir exists
		this._fs.mkdirSync(dirname(path), { recursive: true });
		this._fs.writeFileSync(path, content);
		updatedFiles.push(path);
	}
}
