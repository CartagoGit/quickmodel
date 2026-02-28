import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Internal MCP tool that runs `bun run test:coverage` and returns the
 * coverage summary as a raw string.
 *
 * @remarks
 * Delegates entirely to the Bun test runner — output includes per-file
 * line/branch/function coverage percentages and a totals row.
 *
 * @returns `{ summary: string }` — raw stdout + stderr from the coverage run.
 *
 * @see {@link QRunTestsTool} — run tests without coverage
 * @see {@link QCheckProjectHealthTool} — comprehensive health check
 * @see {@link QCheckSecurityTool} — dedicated security test suite
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QGetCoverageReportTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'get_coverage_report';
	description = 'Run tests with coverage and report the summary.';
	schema = z.object({});

	/** @internal `spawnCommand` reference; can be overridden in tests to inject a mock spawn function. */
	protected _spawn = spawnCommand;

	/**
	 * Runs the test suite with coverage reporting enabled.
	 *
	 * @returns `{ summary }` — coverage output from `bun run test:coverage`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QRunTestsTool} — use this for tests without coverage overhead
	 */
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
