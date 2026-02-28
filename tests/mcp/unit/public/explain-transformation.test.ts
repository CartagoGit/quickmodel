import { describe, it, expect } from 'bun:test';
import { QExplainTransformationTool } from '../../../../src/mcp/tools/public/explain-transformation.tool';

describe('QExplainTransformationTool', () => {
	const tool = new QExplainTransformationTool();

	it('should have correct metadata', () => {
		expect(tool.name).toBe('explain_transformation');
		expect(tool.description).toBeDefined();
	});

	it('should return trace array for each field', async () => {
		const result = await tool.execute({
			data: { name: 'Alice', age: '30' },
			options: {},
		});

		expect(Array.isArray(result.trace)).toBe(true);
		expect(result.trace.length).toBe(2);
	});

	it('should include field name in each trace entry', async () => {
		const result = await tool.execute({
			data: { name: 'Alice' },
			options: {},
		});

		expect(result.trace[0]?.field).toBe('name');
	});

	it('should include inputType and outputType in trace', async () => {
		const result = await tool.execute({
			data: { score: 42 },
			options: {},
		});

		const entry = result.trace[0];
		expect(entry?.inputType).toBeDefined();
		expect(entry?.outputType).toBeDefined();
	});

	it('should include transformer name in trace', async () => {
		const result = await tool.execute({
			data: { birthDate: '1990-01-01' },
			options: { birthDate: 'Date' },
		});

		const entry = result.trace.find(
			(traceEntry) => traceEntry.field === 'birthDate'
		);
		expect(entry?.transformer).toBeDefined();
		expect(typeof entry?.transformer).toBe('string');
	});

	it('should include explanation string for each field', async () => {
		const result = await tool.execute({
			data: { name: 'Bob' },
			options: {},
		});

		expect(typeof result.trace[0]?.explanation).toBe('string');
		expect((result.trace[0]?.explanation ?? '').length).toBeGreaterThan(0);
	});

	it('should include the transformed result', async () => {
		const result = await tool.execute({
			data: { count: 5 },
			options: {},
		});

		expect(result.result).toBeDefined();
		expect(typeof result.result).toBe('object');
	});

	it('should return a summary string', async () => {
		const result = await tool.execute({
			data: { val: 'test' },
			options: {},
		});

		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should pass through primitives that need no transformation', async () => {
		const result = await tool.execute({
			data: { greeting: 'hello' },
			options: {},
		});

		const entry = result.trace.find(
			(traceEntry) => traceEntry.field === 'greeting'
		);
		expect(entry?.inputValue).toBe('hello');
	});
});
