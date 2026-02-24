import { describe, test, expect } from 'bun:test';
import { QCheckSecurityTool } from '../../../../src/mcp/tools/internal';

describe('QCheckSecurityTool (Unit)', () => {
	const createToolWithMockSpawn = (mockImpl: any) => {
		const inst = new QCheckSecurityTool();
		(inst as any)._spawn = mockImpl;
		return inst;
	};

	test('should return secure status when tests pass', async () => {
		const mockSpawn = () =>
			Promise.resolve({ stdout: 'Tests passed', stderr: '' });
		const tool = createToolWithMockSpawn(mockSpawn);

		const result = await tool.execute({});

		expect(result.status).toBe('secure');
		expect(result.output).toContain('Tests passed');
	});

	test('should return vulnerable status when tests fail', async () => {
		const mockFn = () => {
			const err = Object.assign(new Error('Command failed'), {
				stdout: 'Tests failed',
				stderr: '',
			});
			return Promise.reject(err);
		};
		const tool = createToolWithMockSpawn(mockFn);

		const result = await tool.execute({});

		expect(result.status).toBe('vulnerable');
		expect(result.output).toContain('Tests failed');
	});
});
