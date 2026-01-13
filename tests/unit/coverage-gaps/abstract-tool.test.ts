import { describe, it, expect } from 'bun:test';
import { QAbstractTool } from '../../../src/mcp/tools/abstract-tool';
import { z } from 'zod';

describe('QAbstractTool Coverage', () => {
	const schema = z.object({ arg: z.string() });

	class ConcreteTool extends QAbstractTool<typeof schema> {
		name = 'test';
		description = 'desc';
		schema = schema;

		async execute(args: { arg: string }) {
			return Promise.resolve(args.arg);
		}
	}

	it('should be instantiable', async () => {
		const tool = new ConcreteTool();
		expect(tool).toBeDefined();
		expect(await tool.execute({ arg: 'hello' })).toBe('hello');
	});
});
