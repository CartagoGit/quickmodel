import { describe, it, expect } from 'bun:test';
import { QMcpServer } from '../../../src/mcp/server';

describe('MCP Tool Execution Integration', () => {
	it('should execute QInterfaceToModelTool via server registry', async () => {
		const server = new QMcpServer();
		const tools = QMcpServer.getDefaultTools();
		server.registerTools(tools);

		// Find the tool instance
		const tool = tools.find((fnd) => fnd.name === 'interface_to_model');
		expect(tool).toBeDefined();

		if (tool) {
			const result: any = await tool.execute({
				code: 'interface User { name: string; }',
			});
			expect(result.code).toBeDefined();
			expect(result.code).toContain('class UserModel extends QModel');
			expect(result.code).toContain('name: string');
		}
	});

	it('should execute QGenerateMockDataTool via server registry', async () => {
		const tools = QMcpServer.getDefaultTools();
		const tool = tools.find((fnd) => fnd.name === 'generate_mock');
		expect(tool).toBeDefined();

		if (tool) {
			const result: any = await tool.execute({
				schema: { id: 'number' },
				count: 2,
			});
			expect(result).toBeArray();
			expect(result).toHaveLength(2);
			expect(typeof result[0].id).toBe('number');
		}
	});
});
