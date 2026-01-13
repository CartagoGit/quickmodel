import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

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
