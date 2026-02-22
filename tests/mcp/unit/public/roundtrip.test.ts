import { describe, it, expect } from 'bun:test';
import { QRoundtripTool } from '../../../../src/mcp/tools/public/roundtrip.tool';

describe('QRoundtripTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QRoundtripTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('roundtrip');
		expect(tool.description).toBeDefined();
	});

	it('should return lossless=true for a simple string/number model', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { name: 'Alice', age: 30 },
			options: { name: 'String', age: 'Number' },
		});

		expect(result.lossless).toBe(true);
	});

	it('should return lossless=true for a Date transformer roundtrip', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { created: '2024-01-15T00:00:00.000Z' },
			options: { created: 'Date' },
		});

		expect(result.lossless).toBe(true);
	});

	it('should return input, serialized, and roundtrip_serialized in result', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { val: 'hello' },
			options: { val: 'String' },
		});

		expect(result.input).toBeDefined();
		expect(result.serialized).toBeDefined();
		expect(result.roundtrip_serialized).toBeDefined();
	});

	it('serialized output should be a plain object (JSON-safe)', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { created: '2024-06-01T00:00:00.000Z' },
			options: { created: 'Date' },
		});

		// Date → ISO string in serialized output
		expect(typeof (result.serialized as any).created).toBe('string');
	});

	it('should return a diff object', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { name: 'Test' },
			options: { name: 'String' },
		});

		expect(result).toHaveProperty('diff');
	});

	it('diff should be empty when roundtrip is lossless', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { name: 'Alice' },
			options: { name: 'String' },
		});

		expect(result.lossless).toBe(true);
		expect(
			Object.keys(result.diff as Record<string, unknown>)
		).toHaveLength(0);
	});

	it('should return summary string', async () => {
		const tool = new QRoundtripTool();
		const result = await tool.execute({
			data: { val: 42 },
			options: { val: 'Number' },
		});

		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});
});
