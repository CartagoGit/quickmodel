import { describe, it, expect } from 'bun:test';
import { QMcpServer } from '../../../src/mcp/server';

describe('MCP Server Integration', () => {
	it('should initialize with default tools', () => {
		const tools = QMcpServer.getDefaultTools();
		expect(tools).toBeArray();
		expect(tools.length).toBeGreaterThan(0);

		// Check for presence of key tools
		const names = tools.map((t) => t.name);
		expect(names).toContain('list_transformers');
		expect(names).toContain('generate_mock');
		expect(names).toContain('update_docs');
		expect(names).toContain('interface_to_model');
	});

	it('should register tools with the underlying McpServer', () => {
		// We can't easily spy on the private server instance without casting to any
		// But we can verify no error is thrown during registration
		const server = new QMcpServer();
		expect(() => {
			server.registerTools(QMcpServer.getDefaultTools());
		}).not.toThrow();
	});
});
