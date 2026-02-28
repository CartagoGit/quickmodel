import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, isAbsolute } from 'path';

/**
 * A single issue found in an `@example` block.
 * @see {@link QValidateExamplesTool} — tool that produces these issue objects
 * @internal
 */
interface IExampleIssue {
	file: string;
	symbol: string;
	line: number;
	issue: string;
	severity: 'error' | 'warning';
}

/**
 * Result returned by {@link QValidateExamplesTool}.
 * @see {@link QValidateExamplesTool} — tool whose `execute` returns this shape
 * @internal
 */
interface IValidateExamplesResult {
	issues: IExampleIssue[];
	totalExamples: number;
	passed: boolean;
	summary: string;
}

/**
 * Patterns that indicate a forbidden or incorrect API usage.
 * @see {@link QValidateExamplesTool} — tool that uses these patterns for `@example` validation
 * @internal
 */
const FORBIDDEN_PATTERNS: Array<{
	pattern: RegExp;
	message: string;
	severity: 'error' | 'warning';
}> = [
	{
		pattern: /@QType\s*\(/,
		message: 'Use @Quick({...}) instead of @QType(...) in examples',
		severity: 'error',
	},
	{
		pattern: /from ['"]quickmodel['"]/,
		message:
			"Import from 'quickmodel' barrel is forbidden in src/; use internal path aliases",
		severity: 'error',
	},
	{
		pattern: /console\.log/,
		message:
			'console.log in @example — prefer structured data or omit logging',
		severity: 'warning',
	},
	{
		pattern: /extends\s+QModel\s*[^<]/,
		message: 'QModel should be generic: extends QModel<IYourInterface>',
		severity: 'warning',
	},
];

/**
 * Internal MCP tool that scans TypeScript source files for JSDoc `@example`
 * blocks and validates them for common QuickModel API misuse.
 *
 * @remarks
 * Does **not** compile or execute examples (that would require a full build).
 * Instead it applies static pattern checks:
 * - `@QType(...)` usage (forbidden — use `@Quick({...})`)
 * - `import ... from 'quickmodel'` (barrel import forbidden in `src/`)
 * - `console.log` in examples (warning)
 * - `extends QModel` without generic parameter (warning)
 *
 * @returns `{ issues, totalExamples, passed, summary }` — `passed` is `true`
 * when no `error`-severity issues are found.
 *
 * @see {@link QCheckMissingJSDocsTool} — find exports missing JSDoc altogether
 * @see {@link QPatchJSDocTool} — fix issues found by patching the JSDoc
 * @see {@link QCheckDocDriftTool} — detect JSDoc that hasn't kept up with code changes
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QValidateExamplesTool extends QAbstractTool<
	z.ZodObject<{
		target_dir: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'validate_examples';
	description =
		'Scan TypeScript source files for JSDoc @example blocks and validate them ' +
		'for common QuickModel API misuse: @QType usage, forbidden barrel imports, ' +
		'missing QModel generics, and console.log in examples. ' +
		'Returns { issues, totalExamples, passed, summary }. ' +
		'Does not compile examples — uses static pattern analysis.';

	schema = z.object({
		target_dir: z
			.string()
			.optional()
			.describe(
				'Directory to scan (defaults to "src"). Relative to project root.'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Scans source files for @example blocks and validates them.
	 *
	 * @param args - Tool arguments.
	 * @param args.target_dir - Directory to scan (default: `src`).
	 * @returns `{ issues, totalExamples, passed, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		target_dir?: string;
	}): Promise<IValidateExamplesResult> {
		await Promise.resolve();
		const cwd = process.cwd();
		const rawDir = args.target_dir ?? 'src';
		const targetDir = isAbsolute(rawDir) ? rawDir : join(cwd, rawDir);
		const issues: IExampleIssue[] = [];
		let totalExamples = 0;

		const tsFiles = this.collectTsFiles(targetDir);

		for (const filePath of tsFiles) {
			const relativePath = filePath.replace(cwd + '/', '');
			const fileContent = this._fs.readFileSync(filePath, 'utf-8');
			const fileIssues = this.validateFile(relativePath, fileContent);
			totalExamples += fileIssues.count;
			issues.push(...fileIssues.issues);
		}

		const errorCount = issues.filter(
			(iss) => iss.severity === 'error'
		).length;
		const warnCount = issues.filter(
			(iss) => iss.severity === 'warning'
		).length;
		const passed = errorCount === 0;

		const summary = passed
			? `✅ ${totalExamples} @example block(s) validated — ${warnCount} warning(s), no errors`
			: `❌ ${errorCount} error(s) and ${warnCount} warning(s) found in ${totalExamples} @example block(s)`;

		return { issues, totalExamples, passed, summary };
	}

	/**
	 * Validates all @example blocks in a single file.
	 *
	 * @param relativePath - Relative file path (for reporting).
	 * @param content - File content string.
	 * @returns `{ count, issues }` — count of examples found and issues detected.
	 */
	private validateFile(
		relativePath: string,
		content: string
	): { count: number; issues: IExampleIssue[] } {
		const issues: IExampleIssue[] = [];
		let count = 0;

		// Match JSDoc blocks
		const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
		let jsdocMatch = jsdocRegex.exec(content);

		while (jsdocMatch !== null) {
			const jsdocBody = jsdocMatch[1] ?? '';
			// Only stop at JSDoc-level tags (always lowercase, preceded by "* ")
			// — @QType, @Quick etc start with uppercase and must NOT stop the match
			const exampleRegex =
				/@example([\s\S]*?)(?=\n[ \t]*\*[ \t]+@[a-z]|$)/g;
			let exampleMatch = exampleRegex.exec(jsdocBody);

			while (exampleMatch !== null) {
				count++;
				const exampleBody = exampleMatch[1] ?? '';
				// Find line number of the @example tag in the file
				const offsetInFile =
					(jsdocMatch.index ?? 0) +
					jsdocBody.indexOf('@example' + exampleBody.slice(0, 0));
				const lineNum = content
					.slice(0, offsetInFile)
					.split('\n').length;
				// Find the symbol name (look for the line after the JSDoc end)
				const symbolName = this.findSymbolAfterJsdoc(
					content,
					(jsdocMatch.index ?? 0) + jsdocMatch[0].length
				);

				for (const rule of FORBIDDEN_PATTERNS) {
					if (rule.pattern.test(exampleBody)) {
						issues.push({
							file: relativePath,
							symbol: symbolName,
							line: lineNum,
							issue: rule.message,
							severity: rule.severity,
						});
					}
				}

				exampleMatch = exampleRegex.exec(jsdocBody);
			}

			jsdocMatch = jsdocRegex.exec(content);
		}

		return { count, issues };
	}

	/**
	 * Extracts the symbol name from the declaration following a JSDoc block.
	 *
	 * @param content - Full file content.
	 * @param afterIdx - Character index after the closing `*‌/` of the JSDoc.
	 * @returns Symbol name string or `'(unknown)'` when not found.
	 */
	private findSymbolAfterJsdoc(content: string, afterIdx: number): string {
		const rest = content.slice(afterIdx).trimStart();
		const declMatch =
			// eslint-disable-next-line security/detect-unsafe-regex
			/(?:export\s+(?:default\s+)?(?:abstract\s+)?(?:class|function|const|interface|type|enum)\s+)(\w+)/.exec(
				rest
			);
		return declMatch ? (declMatch[1] ?? '(unknown)') : '(unknown)';
	}

	/**
	 * Recursively collects all `.ts` files (excluding `.d.ts`) under a directory.
	 *
	 * @param dir - Absolute path to the directory.
	 * @returns Array of absolute file paths.
	 */
	private collectTsFiles(dir: string): string[] {
		if (!this._fs.existsSync(dir)) {
			return [];
		}
		const result: string[] = [];
		const entries = this._fs.readdirSync(dir).map(String);
		for (const entry of entries) {
			const fullPath = join(dir, entry);
			if (this._fs.statSync(fullPath).isDirectory()) {
				result.push(...this.collectTsFiles(fullPath));
			} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
				result.push(fullPath);
			}
		}
		return result;
	}
}
