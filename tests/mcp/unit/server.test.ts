import { describe, it, expect, mock, spyOn, beforeEach } from 'bun:test';
import { QMcpServer } from '../../../src/mcp/server';
import { QAbstractTool } from '../../../src/mcp/tools/abstract-tool';
import { QAbstractPrompt } from '../../../src/mcp/prompts/abstract-prompt';
import type { IQPromptResult } from '../../../src/mcp/prompts/abstract-prompt';
import { z } from 'zod';

// Mocks
const mockRegisterTool = mock((_name, _schema, _callback) => {});
const mockRegisterPrompt = mock((_name, _config, _callback) => {});
const mockConnect = mock(() => Promise.resolve());

void mock.module('@modelcontextprotocol/sdk/server/mcp.js', () => {
	return {
		McpServer: class {
			constructor() {}
			registerTool = mockRegisterTool;
			registerPrompt = mockRegisterPrompt;
			connect = mockConnect;
		},
	};
});

void mock.module('@modelcontextprotocol/sdk/server/stdio.js', () => {
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
	execute(args: any): Promise<unknown> {
		if (args.input === 'error') throw new Error('Tool error');
		return Promise.resolve({ result: args.input });
	}
}

class MockPrompt extends QAbstractPrompt<{ input: z.ZodString }> {
	name = 'mock_prompt';
	title = 'Mock Prompt';
	description = 'Mock prompt description';
	argsSchema = { input: z.string().describe('Input text') };
	execute(args: { input: string }): Promise<IQPromptResult> {
		return Promise.resolve({
			description: 'Mock result',
			messages: [
				this.user(`Input: ${args.input}`),
				this.assistant('Done'),
			],
		});
	}
}

describe('QMcpServer', () => {
	beforeEach(() => {
		mockRegisterTool.mockClear();
		mockRegisterPrompt.mockClear();
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
		expect(
			tools.find((tool) => tool.name === 'create_model')
		).toBeDefined();
	});

	it('should register prompts correctly', () => {
		const server = new QMcpServer();
		const prompt = new MockPrompt();
		server.registerPrompts([prompt]);

		expect(mockRegisterPrompt).toHaveBeenCalledTimes(1);
		expect(mockRegisterPrompt).toHaveBeenCalledWith(
			'mock_prompt',
			expect.objectContaining({
				description: 'Mock prompt description',
			}),
			expect.any(Function)
		);
	});

	it('should execute prompt callback successfully', async () => {
		const server = new QMcpServer();
		const prompt = new MockPrompt();
		server.registerPrompts([prompt]);

		const callArgs = mockRegisterPrompt.mock.calls[0];
		if (!callArgs) throw new Error('Prompt not registered');
		const callback = callArgs[2] as (
			args: Record<string, string>
		) => Promise<IQPromptResult>;

		const result = await callback({ input: 'hello' });

		expect(result).toBeDefined();
		expect(result.messages).toHaveLength(2);
		expect(result.messages[0].role).toBe('user');
		expect(result.messages[0].content.text).toContain('hello');
		expect(result.messages[1].role).toBe('assistant');
	});

	it('should get default prompts', () => {
		const prompts = QMcpServer.getDefaultPrompts();
		expect(prompts.length).toBe(20);
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_from_typescript'
			)
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_debug')
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_generate_test_data'
			)
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_inspect_and_schema'
			)
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_form_validation'
			)
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_full_pipeline')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_mixin')
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_alias_computed'
			)
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_migration')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_async_rules')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_add_qgroup')
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_security_review'
			)
		).toBeDefined();
		expect(
			prompts.find(
				(prompt) => prompt.name === 'quickmodel_transformer_guide'
			)
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_form_data')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_fix_lint')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_fix_typecheck')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_refactor')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_apply_solid')
		).toBeDefined();
		expect(
			prompts.find((prompt) => prompt.name === 'quickmodel_sync_project')
		).toBeDefined();
	});

	it('should register multiple prompts', () => {
		const server = new QMcpServer();
		const prompt1 = new MockPrompt();
		const prompt2 = new MockPrompt();
		prompt2.name = 'mock_prompt_2';
		server.registerPrompts([prompt1, prompt2]);

		expect(mockRegisterPrompt).toHaveBeenCalledTimes(2);
	});

	it('getDefaultPublicTools should return only public tools', () => {
		const tools = QMcpServer.getDefaultPublicTools();
		expect(tools.length).toBeGreaterThan(0);
		expect(
			tools.find((tool) => tool.name === 'create_model')
		).toBeDefined();
		// Internal tools must NOT appear
		expect(
			tools.find((tool) => tool.name === 'lint_check')
		).toBeUndefined();
		expect(tools.find((tool) => tool.name === 'typecheck')).toBeUndefined();
		expect(
			tools.find((tool) => tool.name === 'check_project_rules')
		).toBeUndefined();
	});

	it('getDefaultInternalTools should return only internal tools', () => {
		const tools = QMcpServer.getDefaultInternalTools();
		expect(tools.length).toBeGreaterThan(0);
		expect(tools.find((tool) => tool.name === 'lint_check')).toBeDefined();
		expect(tools.find((tool) => tool.name === 'typecheck')).toBeDefined();
		expect(
			tools.find((tool) => tool.name === 'check_project_rules')
		).toBeDefined();
		expect(
			tools.find((tool) => tool.name === 'check_bundle_size')
		).toBeDefined();
		expect(
			tools.find((tool) => tool.name === 'check_changelog')
		).toBeDefined();
		expect(tools.find((tool) => tool.name === 'list_todos')).toBeDefined();
		expect(
			tools.find((tool) => tool.name === 'pre_commit_check')
		).toBeDefined();
		expect(tools.find((tool) => tool.name === 'run_tests')).toBeDefined();
		expect(
			tools.find((tool) => tool.name === 'get_staged_files')
		).toBeDefined();
		// Public tools must NOT appear
		expect(
			tools.find((tool) => tool.name === 'create_model')
		).toBeUndefined();
	});

	it('getDefaultTools should be the union of public + internal tools', () => {
		const all = QMcpServer.getDefaultTools();
		const pub = QMcpServer.getDefaultPublicTools();
		const internal = QMcpServer.getDefaultInternalTools();
		expect(all.length).toBe(pub.length + internal.length);
	});
});
