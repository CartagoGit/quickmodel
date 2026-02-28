import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Internal MCP tool that runs the full security test suite located at
 * `tests/security/` via `bun test` and reports pass / fail status.
 *
 * @remarks
 * The security suite covers: DoS vectors (large inputs, deeply nested
 * objects), ReDoS patterns, path-traversal attempts, prototype-pollution,
 * and information-disclosure scenarios.
 *
 * @returns `{ status: 'secure' | 'vulnerable' | 'error', output: string }` —
 * `'secure'` only when all tests pass; `'vulnerable'` on test failures;
 * `'error'` when the runner itself fails to start.
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCheckSecurityTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'check_security';
	description =
		'Run the security test suite to verify protection against vulnerabilities (XSS, Injection, Path Traversal, etc.).';
	schema = z.object({});

	protected _spawn = spawnCommand;

	async execute(_args: {}): Promise<{
		status: 'secure' | 'vulnerable' | 'error';
		output: string;
	}> {
		const cwd = process.cwd();
		try {
			// Run the specific security test suite
			const { stdout, stderr } = await this._spawn(
				'bun',
				['test', 'tests/security/'],
				cwd
			);

			return {
				status: 'secure',
				output: stdout + (stderr || ''),
			};
		} catch (error: any) {
			// If tests fail, bun test exit code is non-zero, so spawnCommand throws
			return {
				status: 'vulnerable',
				output:
					(error.stdout || '') +
					(error.stderr || '') +
					(error.message || ''),
			};
		}
	}
}
