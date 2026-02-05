import { describe, it, expect } from 'bun:test';
import { QCheckProjectHealthTool } from '../../../../src/mcp/tools/internal/check-health.tool';
import { QGetCoverageReportTool } from '../../../../src/mcp/tools/internal/coverage-report.tool';
import { QUpdateDocsTool } from '../../../../src/mcp/tools/internal/update-docs.tool';

describe('Internal Tools Error Fallbacks', () => {
	it('QCheckProjectHealthTool should use error.message fallback', async () => {
		const tool = new QCheckProjectHealthTool();
		(tool as any)._spawn = async () => {
			const err = new Error('Spawn failed hard');
			// No stdout/stderr on error object
			throw err;
		};

		const result = await tool.execute();
		expect(result.status).toBe('error');
		expect(result.output).toBe('Spawn failed hard');
	});

	it('QGetCoverageReportTool should use error.message fallback', async () => {
		// Assuming it has similar logic
		const tool = new QGetCoverageReportTool();
		(tool as any)._spawn = async () => {
			throw new Error('Coverage crashed');
		};
		const result = await tool.execute();
		// Check implementation of coverage-report tool to see if it handles this
		// It likely does catch(error: any) => return ...
		expect(result.summary).toContain('Coverage crashed');
	});

	it('QUpdateDocsTool should handle error message', async () => {
		const tool = new QUpdateDocsTool();
		(tool as any)._spawn = async () => {
			throw new Error('Docs build died');
		};
		const result = await tool.execute({ action: 'build' });
		expect(result.stderr).toContain('Docs build died');
	});
});
