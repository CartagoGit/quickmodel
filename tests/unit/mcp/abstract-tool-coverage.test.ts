import { describe, it, expect } from 'bun:test';
import { QAbstractTool } from '@/mcp/tools/abstract-tool';
import { z } from 'zod';

class MockTool extends QAbstractTool<z.ZodObject<{ prop: z.ZodString }>> {
	name = 'mock_tool';
	description = 'A mock tool for testing';
	schema = z.object({ prop: z.string() });
	async execute(args: { prop: string }): Promise<string> {
		return args.prop;
	}
}

describe('QAbstractTool coverage', () => {
	it('should allow extension and verify instance type', () => {
		const tool = new MockTool();
		expect(tool).toBeInstanceOf(QAbstractTool);
		expect(tool.name).toBe('mock_tool');
	});
});
