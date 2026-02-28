import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/** A single lint issue (error or warning) */
interface ILintIssue {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: 'error' | 'warning';
}

/** Shape of each message in the ESLint JSON output */
interface IEslintMessage {
	ruleId: string | null;
	severity: number;
	message: string;
	line: number;
	column: number;
}

/** Shape of each file entry in the ESLint JSON output */
interface IEslintFileResult {
	filePath: string;
	messages: IEslintMessage[];
	errorCount: number;
	warningCount: number;
}

/**
 * Internal tool to run ESLint on specific files or a directory and return
 * structured lint issues (errors and warnings).
 * Use this BEFORE declaring any implementation finished to enforce coding standards.
 *
 * @see {@link QTypecheckTool} — TypeScript type-checking
 * @see {@link QCheckProjectRulesTool} — project-specific rules (id-length, naming, etc.)
 * @see {@link QCheckProjectHealthTool} — combined lint + typecheck + tests
 */
export class QLintCheckTool extends QAbstractTool<
	z.ZodObject<{
		targetDir: z.ZodOptional<z.ZodString>;
		targetFiles: z.ZodOptional<z.ZodArray<z.ZodString>>;
	}>
> {
	name = 'lint_check';
	description =
		'Run ESLint on specific files or a directory and return structured lint issues. ' +
		'Returns errors (id-length, no-implied-eval, max-params, no-console, etc.) and warnings ' +
		'separately so you can fix them before declaring the implementation done. ' +
		'Provide either targetFiles (array of paths) or targetDir (directory path). ' +
		'Returns { passed, errors[], warnings[], total_errors, total_warnings, summary }.';

	schema = z.object({
		targetDir: z
			.string()
			.optional()
			.describe(
				'Directory to lint (e.g. "src/mcp/tools"). Defaults to "src" if neither targetDir nor targetFiles is provided.'
			),
		targetFiles: z
			.array(z.string())
			.optional()
			.describe(
				'Array of specific file paths to lint (e.g. ["src/mcp/tools/public/my-tool.ts"]).'
			),
	});

	/** @internal Command spawner, overridable in tests. */
	protected _spawn = spawnCommand;

	/**
	 * Runs ESLint on the specified files or directory and returns structured
	 * lint issues split by severity.
	 *
	 * @param args - Lint target options.
	 * @param args.targetDir - Directory to lint (e.g. `'src/mcp/tools'`).
	 * Defaults to `'src'` when neither `targetDir` nor `targetFiles` is given.
	 * @param args.targetFiles - Array of specific file paths to lint. Takes
	 * precedence over `targetDir` when both are provided.
	 * @returns `{ passed, errors, warnings, total_errors, total_warnings, summary }` —
	 * `errors` and `warnings` are `ILintIssue[]` with file, line, column, rule,
	 * and message; `passed` is `true` only when `total_errors === 0`.
	 */
	async execute(args: {
		targetDir?: string;
		targetFiles?: string[];
	}): Promise<{
		passed: boolean;
		errors: ILintIssue[];
		warnings: ILintIssue[];
		total_errors: number;
		total_warnings: number;
		summary: string;
	}> {
		const targets = this.buildTargets(args);

		let rawOutput = '';

		try {
			const { stdout } = await this._spawn(
				'npx',
				['eslint', '--format', 'json', ...targets],
				process.cwd()
			);
			rawOutput = stdout;
		} catch (err: unknown) {
			rawOutput =
				(err as { stdout?: string }).stdout ??
				(err as { message?: string }).message ??
				'';
		}

		return this.parseResult(rawOutput);
	}

	/**
	 * Resolves the ESLint target paths from tool arguments.
	 *
	 * @param args - Tool arguments with optional `targetDir` and `targetFiles`
	 * @returns Array of paths to pass to ESLint
	 */
	private buildTargets(args: {
		targetDir?: string;
		targetFiles?: string[];
	}): string[] {
		if (args.targetFiles && args.targetFiles.length > 0) {
			return args.targetFiles;
		}
		return [args.targetDir ?? 'src'];
	}

	/**
	 * Parses ESLint JSON output into a structured lint result.
	 *
	 * @param rawOutput - Raw ESLint `--format=json` stdout string
	 * @returns Structured object with `passed`, `errors`, `warnings`, and a human-readable `summary`
	 */
	private parseResult(rawOutput: string): {
		passed: boolean;
		errors: ILintIssue[];
		warnings: ILintIssue[];
		total_errors: number;
		total_warnings: number;
		summary: string;
	} {
		const errors: ILintIssue[] = [];
		const warnings: ILintIssue[] = [];

		try {
			const results: IEslintFileResult[] = JSON.parse(rawOutput || '[]');

			for (const fileResult of results) {
				for (const msg of fileResult.messages) {
					const issue: ILintIssue = {
						file: fileResult.filePath,
						line: msg.line,
						column: msg.column,
						rule: msg.ruleId ?? 'unknown',
						message: msg.message,
						severity: msg.severity === 2 ? 'error' : 'warning',
					};

					if (msg.severity === 2) {
						errors.push(issue);
					} else {
						warnings.push(issue);
					}
				}
			}
		} catch {
			// JSON parse failure — no structured output available
		}

		const totalErrors = errors.length;
		const totalWarnings = warnings.length;
		const passed = totalErrors === 0;
		const summary = passed
			? `✅ Lint passed — ${totalWarnings} warning(s)`
			: `❌ Lint failed — ${totalErrors} error(s), ${totalWarnings} warning(s). Fix all errors before declaring the implementation done.`;

		return {
			passed,
			errors,
			warnings,
			total_errors: totalErrors,
			total_warnings: totalWarnings,
			summary,
		};
	}
}
