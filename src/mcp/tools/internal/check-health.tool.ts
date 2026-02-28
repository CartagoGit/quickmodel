import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Internal MCP tool that runs a comprehensive health check by invoking
 * `bun run check` — a composite script that runs ESLint, TypeScript
 * type-checking, and the full test suite in sequence.
 *
 * @remarks
 * Use this as a final gate before committing or releasing. It is equivalent
 * to calling `lint_check`, `typecheck`, and `run_tests` individually but
 * faster because it uses the optimised `check` NPM script.
 *
 * @returns `{ status: 'ok' | 'error', output: string }` — `'ok'` only when
 * all three checks pass, combined stdout + stderr on failure.
 *
 * @see {@link QLintCheckTool} — run only ESLint
 * @see {@link QTypecheckTool} — run only TypeScript type-check
 * @see {@link QRunTestsTool} — run only the test suite
 * @see {@link QCheckSecurityTool} — run the security test suite
 * @see {@link QProjectStatusTool} — quick project status snapshot
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCheckProjectHealthTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_project_health';
	description =
		'Run a comprehensive health check: Lint, Typecheck, and Run Tests.';
	schema = z.object({});

	/** @internal `spawnCommand` reference; can be overridden in tests to inject a mock spawn function. */
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
