import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Tool to run security checks.
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
