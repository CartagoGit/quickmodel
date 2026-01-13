import { describe, it, expect, mock, spyOn, beforeEach } from 'bun:test';
import { QMcpServer } from '../../../src/mcp/server';
import { QAbstractTool } from '../../../src/mcp/tools/abstract-tool';
import { z } from 'zod';

// Mocks
const mockRegisterTool = mock((_name, _schema, _callback) => {});
const mockConnect = mock(() => Promise.resolve());

mock.module('@modelcontextprotocol/sdk/server/mcp.js', () => {
	return {
		McpServer: class {
			constructor() {}
			registerTool = mockRegisterTool;
			connect = mockConnect;
		},
	};
});

mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => {
	return {
		StdioServerTransport: class {},
	};
});

// Mock console.error to avoid noise
spyOn(console, 'error').mockImplementation(() => {});

class MockTool extends QAbstractTool<any> {
	name = 'mock_tool';
	description = 'Mock tool description';
	schema = z.object({ input: z.string() });
	async execute(args: any) {
		if (args.input === 'error') throw new Error('Tool error');
		return { result: args.input };
	}
}

describe('QMcpServer', () => {
	beforeEach(() => {
		mockRegisterTool.mockClear();
		mockConnect.mockClear();
	});

	it('should be defined', () => {
		const server = new QMcpServer();
		expect(server).toBeDefined();
	});

	it('should register tools correctly', () => {
		const server = new QMcpServer();
		const tool = new MockTool();
		server.registerTools([tool]);

		expect(mockRegisterTool).toHaveBeenCalled();
		expect(mockRegisterTool).toHaveBeenCalledWith(
			'mock_tool',
			expect.objectContaining({
				description: 'Mock tool description',
			}),
			expect.any(Function)
		);
	});

	it('should execute tool callback successfully', async () => {
		const server = new QMcpServer();
		const tool = new MockTool();
		server.registerTools([tool]);

		// Get the callback passed to registerTool
		const args = mockRegisterTool.mock.calls[0];
		if (!args) throw new Error('Tool not registered');
		const callback = args[2] as (args: any) => Promise<any>;

		// Execute callback
		const result = await callback({ input: 'test' });

		expect(result).toEqual({
			content: [
				{
					type: 'text',
					text: JSON.stringify({ result: 'test' }, null, 2),
				},
			],
		});
	});

	it('should handle errors in tool callback', async () => {
		const server = new QMcpServer();
		const tool = new MockTool();
		server.registerTools([tool]);

		const args = mockRegisterTool.mock.calls[0];
		if (!args) throw new Error('Tool not registered');
		const callback = args[2] as (args: any) => Promise<any>;

		// Execute callback with error input
		const result = await callback({ input: 'error' });

		expect(result).toEqual({
			content: [
				{
					type: 'text',
					text: 'Error executing tool mock_tool: Tool error',
				},
			],
			isError: true,
		});
	});

	it('should start the server', async () => {
		const server = new QMcpServer();
		await server.start();
		expect(mockConnect).toHaveBeenCalled();
	});

	it('should get default tools', () => {
		const tools = QMcpServer.getDefaultTools();
		expect(tools.length).toBeGreaterThan(0);
		expect(tools.find((t) => t.name === 'create_model')).toBeDefined();
	});
});
