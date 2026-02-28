import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Internal tool that returns the list of files currently staged for commit
 * (equivalent to `git diff --cached --name-only`).
 * Use this before running lint_check or pre_commit_check to know exactly
 * which files are about to be committed.
 *
 * @see {@link QPreCommitCheckTool} — run pre-commit checks on staged files
 * @see {@link QLintCheckTool} — run ESLint on specific files
 * @see {@link QTypecheckTool} — run TypeScript type-checking on specific files
 */
export class QGetStagedFilesTool extends QAbstractTool<
	z.ZodObject<Record<never, never>>
> {
	name = 'get_staged_files';
	description =
		'List the files currently staged for commit via `git diff --cached --name-only`. ' +
		'Use this to discover which files need lint/typecheck validation before committing. ' +
		'Returns { passed, files[], total, summary }.';

	schema = z.object({});

	/** @internal `spawnCommand` reference; can be overridden in tests to inject a mock spawn function. */
	protected _spawn = spawnCommand;

	/**
	 * Retrieves the list of files currently staged for commit via
	 * `git diff --cached --name-only`.
	 *
	 * @param _args - No arguments required.
	 * @returns `{ passed, files, total, summary }` — `files` is a string array of
	 * staged file paths; `total` is the count; `passed` is `false` when the git
	 * command itself errors (e.g. not a git repository).
	 */
	async execute(_args: Record<never, never>): Promise<{
		passed: boolean;
		files: string[];
		total: number;
		summary: string;
	}> {
		let rawOutput = '';
		let success = false;

		try {
			const { stdout } = await this._spawn(
				'git',
				['diff', '--cached', '--name-only'],
				process.cwd()
			);
			rawOutput = stdout;
			success = true;
		} catch (err: unknown) {
			const typed = err as { stdout?: string; stderr?: string };
			rawOutput = (typed.stdout ?? '') + (typed.stderr ?? '');
		}

		const files = rawOutput
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);

		const total = files.length;
		const summary = success
			? total === 0
				? 'No staged files found.'
				: `${total} staged file(s) ready for commit.`
			: 'Failed to retrieve staged files (not a git repository?).';

		return { passed: success, files, total, summary };
	}
}
