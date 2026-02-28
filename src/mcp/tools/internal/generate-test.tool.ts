import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, resolve as pathResolve, dirname } from 'path';

/**
 * Internal MCP tool that generates a boilerplate Bun-compatible test file
 * for a given TypeScript source file.
 *
 * @remarks
 * The generated file is placed in `tests/unit/` mirroring the source path.
 * Includes a path-traversal security check — the resolved path must remain
 * inside the project root.
 *
 * If the target test file already exists, the tool returns it unchanged
 * (no overwriting).
 *
 * @returns `{ path: string, content: string, message?: string }` — `path` is
 * the absolute path of the generated (or existing) test file; `message`
 * carries security or not-found error details on failure.
 *
 * @internal Registered on the MCP server; not part of the public library API.
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
	/** @internal `fs` module reference; can be overridden in tests to inject a mock filesystem. */
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
