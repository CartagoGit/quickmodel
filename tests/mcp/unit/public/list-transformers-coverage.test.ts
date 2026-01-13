import { describe, it, expect, spyOn } from 'bun:test';
import { QListTransformersTool } from '../../../../src/mcp/tools/public/list-transformers.tool';
import { TransformerLookupService } from '../../../../src/core/services/transformer-lookup.service';

describe('QListTransformersTool Coverage', () => {
	it('should fallback to default list if registry returns empty', async () => {
		// Mock service implementation to return empty array
		const spy = spyOn(
			TransformerLookupService.prototype,
			'getAvailableTransformers'
		).mockReturnValue([]);

		const tool = new QListTransformersTool();
		// Since execute creates a NEW instance of service, spying on prototype affects it.
		const result = await tool.execute();

		expect(result).toContain('string');
		expect(result).toContain('date');
		expect(result.length).toBeGreaterThan(0);

		spy.mockRestore();
	});

	it('should return sorted list from service', async () => {
		const spy = spyOn(
			TransformerLookupService.prototype,
			'getAvailableTransformers'
		).mockReturnValue(['z', 'a']);

		const tool = new QListTransformersTool();
		const result = await tool.execute();

		expect(result).toEqual(['a', 'z']);

		spy.mockRestore();
	});
});
