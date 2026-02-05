import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * Tool to get test coverage report.
 */
export class QGetCoverageReportTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'get_coverage_report';
	description = 'Run tests with coverage and report the summary.';
	schema = z.object({});

	protected _spawn = spawnCommand;

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
