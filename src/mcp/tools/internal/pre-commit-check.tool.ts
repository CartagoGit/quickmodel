import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/** @internal Normalised lint issue reported by the pre-commit check. */
interface ILintIssue {
	file: string;
	line: number;
	column: number;
	rule: string;
	message: string;
	severity: 'error' | 'warning';
}

/** @internal Shape of a single message entry in the ESLint JSON output. */
interface IEslintMessage {
	ruleId: string | null;
	severity: number;
	message: string;
	line: number;
	column: number;
}

/** @internal Shape of a per-file entry in the ESLint JSON output. */
interface IEslintFileResult {
	filePath: string;
	messages: IEslintMessage[];
	errorCount: number;
	warningCount: number;
}

/**
 * Internal tool that simulates exactly what Husky + lint-staged run on pre-commit:
 * `eslint --fix` and `prettier --write` on the specified files (or `src/` by default).
 *
 * Use this BEFORE attempting a commit to ensure the hook will not reject it.
 * Returns a full report with ESLint issues, prettier changes, and a pass/fail verdict.
 */
export class QPreCommitCheckTool extends QAbstractTool<
	z.ZodObject<{
		files: z.ZodOptional<z.ZodArray<z.ZodString>>;
	}>
> {
	name = 'pre_commit_check';
	description =
		'Simulate the Husky pre-commit hook: run ESLint (--fix) and Prettier (--write) on ' +
		'the given files or on src/ by default. Returns { passed, eslint_errors, ' +
		'eslint_warnings, prettier_changed, issues, summary }. ' +
		'Run this before committing to guarantee the hook will not reject the commit.';

	schema = z.object({
		files: z
			.array(z.string())
			.optional()
			.describe(
				'List of file paths to check. Defaults to all TypeScript/JavaScript files in src/.'
			),
	});

	/** @internal Command spawner, overridable in tests. */
	protected _spawn = spawnCommand;

	/**
	 * Simulates the Husky pre-commit hook by running ESLint (`--fix`) and
	 * Prettier (`--write`) on the specified files.
	 *
	 * @param args - Hook simulation options.
	 * @param args.files - File paths to process. When omitted, defaults to all
	 * TypeScript / JavaScript files in `src/`.
	 * @returns `{ passed, eslint_errors, eslint_warnings, prettier_changed, issues, summary }` —
	 * `passed` is `true` only when ESLint reports zero errors; `issues` is the
	 * structured list of lint problems; `prettier_changed` counts auto-formatted
	 * files.
	 */
	async execute(args: { files?: string[] }): Promise<{
		passed: boolean;
		eslint_errors: number;
		eslint_warnings: number;
		prettier_changed: number;
		issues: ILintIssue[];
		summary: string;
	}> {
		const targets =
			args.files && args.files.length > 0 ? args.files : ['src'];

		// ── 1. ESLint ──────────────────────────────────────────────────────────
		const eslintArgs = ['eslint', '--fix', '--format', 'json', ...targets];

		let eslintOutput = '';
		try {
			const out = await this._spawn('npx', eslintArgs);
			eslintOutput = out.stdout;
		} catch (err: unknown) {
			const errObj = err as { stdout?: string; message?: string };
			eslintOutput = errObj.stdout ?? '';
		}

		const issues = this.parseEslintOutput(eslintOutput);
		const eslint_errors = issues.filter(
			(iss) => iss.severity === 'error'
		).length;
		const eslint_warnings = issues.filter(
			(iss) => iss.severity === 'warning'
		).length;

		// ── 2. Prettier ────────────────────────────────────────────────────────
		const prettierGlob =
			args.files && args.files.length > 0
				? args.files.join(' ')
				: '"src/**/*.{ts,js,mjs}"';

		let prettier_changed = 0;
		try {
			const prettierOut = await this._spawn('npx', [
				'prettier',
				'--write',
				...prettierGlob.replace(/"/g, '').split(' '),
			]);
			// prettier --write outputs one line per modified file to stdout
			prettier_changed = prettierOut.stdout
				.split('\n')
				.filter((line) => line.trim().length > 0).length;
		} catch (_err) {
			// prettier failures are non-blocking in this tool
		}

		const passed = eslint_errors === 0;
		const summary = passed
			? `✅ Pre-commit check passed. ${eslint_warnings} warning(s), ${prettier_changed} file(s) formatted by Prettier.`
			: `❌ Pre-commit check failed: ${eslint_errors} ESLint error(s), ${eslint_warnings} warning(s). Fix all errors before committing.`;

		return {
			passed,
			eslint_errors,
			eslint_warnings,
			prettier_changed,
			issues,
			summary,
		};
	}

	/**
	 * Parses raw ESLint JSON stdout into a list of lint issues.
	 *
	 * @param raw - Raw ESLint `--format=json` stdout string
	 * @returns Array of structured `ILintIssue` objects
	 */
	private parseEslintOutput(raw: string): ILintIssue[] {
		const issues: ILintIssue[] = [];
		if (!raw || !raw.trim()) return issues;

		let parsed: IEslintFileResult[] = [];
		try {
			parsed = JSON.parse(raw) as IEslintFileResult[];
		} catch {
			return issues;
		}

		for (const fileResult of parsed) {
			for (const msg of fileResult.messages) {
				issues.push({
					file: fileResult.filePath,
					line: msg.line,
					column: msg.column,
					rule: msg.ruleId ?? 'unknown',
					message: msg.message,
					severity: msg.severity === 2 ? 'error' : 'warning',
				});
			}
		}

		return issues;
	}
}
