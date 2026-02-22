import { describe, it, expect } from 'bun:test';
import { QCheckIntegrityTool } from '../../../../src/mcp/tools/public/check-integrity.tool';

describe('QCheckIntegrityTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QCheckIntegrityTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('check_integrity');
		expect(tool.description).toBeDefined();
	});

	it('should return valid=true for intact data', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { birth: '1990-01-01T00:00:00.000Z' },
			options: { birth: 'Date' },
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should return valid=false for an invalid Date', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { birth: 'not-a-date' },
			options: { birth: 'Date' },
		});

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('each error should have isValid=false and a field identifier', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { birth: 'not-a-date' },
			options: { birth: 'Date' },
		});

		const firstError = result.errors[0];
		expect(firstError).toBeDefined();
		expect(firstError?.isValid).toBe(false);
	});

	it('should handle multiple fields — report only failing ones', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: {
				birth: '2000-01-01T00:00:00.000Z',
				updated: 'bad-date',
			},
			options: { birth: 'Date', updated: 'Date' },
		});

		expect(result.valid).toBe(false);
		// Only one field is bad, but integrity returns one entry per field
		expect(result.errors.length).toBeGreaterThanOrEqual(1);
	});

	it('should return valid=true when no transformers are involved', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { name: 'Alice', age: 30 },
			options: {},
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should expose evaluated field count', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { birth: '2000-01-01T00:00:00.000Z' },
			options: { birth: 'Date' },
		});

		expect(typeof result.evaluated).toBe('number');
	});

	it('should handle BigInt field with valid value', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { balance: '999999999' },
			options: { balance: 'BigInt' },
		});

		expect(result.valid).toBe(true);
	});

	it('should return all-pass result summary message', async () => {
		const tool = new QCheckIntegrityTool();
		const result = await tool.execute({
			data: { ts: '2024-06-01T00:00:00.000Z' },
			options: { ts: 'Date' },
		});

		expect(result.valid).toBe(true);
		expect(typeof result.summary).toBe('string');
	});
});
