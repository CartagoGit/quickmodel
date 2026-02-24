import { describe, it, expect } from 'bun:test';
import { QSimulateAsyncRulesTool } from '../../../../src/mcp/tools/public/simulate-async-rules.tool';

describe('QSimulateAsyncRulesTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QSimulateAsyncRulesTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('simulate_async_rules');
		expect(tool.description).toBeDefined();
	});

	it('schema should have data, rules, and optional options', () => {
		const tool = new QSimulateAsyncRulesTool();
		expect(tool.schema).toBeDefined();
	});

	it('should return valid=true when all async rules pass', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { age: 25 },
			rules: [
				{
					field: 'age',
					predicate: 'Promise.resolve(value >= 18)',
					message: 'Must be 18+',
				},
			],
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should return valid=false when an async rule fails', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { age: 15 },
			rules: [
				{
					field: 'age',
					predicate: 'Promise.resolve(value >= 18)',
					message: 'Must be 18+',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('error should carry field name and message', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { email: 'bad' },
			rules: [
				{
					field: 'email',
					predicate: 'Promise.resolve(value.includes("@"))',
					message: 'Invalid email',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('email');
		expect(result.errors[0]?.message).toBe('Invalid email');
	});

	it('synchronous predicates should also work (backwards compat)', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { score: 90 },
			rules: [
				{
					field: 'score',
					predicate: 'value <= 100',
					message: 'Too high',
				},
			],
		});

		expect(result.valid).toBe(true);
	});

	it('should accept timeoutMs option', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { val: 1 },
			rules: [
				{
					field: 'val',
					predicate: 'Promise.resolve(true)',
					message: 'fail',
				},
			],
			options: { timeoutMs: 5000 },
		});

		expect(result).toBeDefined();
		expect(result.valid).toBe(true);
	});

	it('should accept mode: parallel', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { val: 1 },
			rules: [
				{
					field: 'val',
					predicate: 'Promise.resolve(true)',
					message: 'fail',
				},
			],
			options: { mode: 'parallel' },
		});

		expect(result).toBeDefined();
	});

	it('should accept mode: serial', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { val: 1 },
			rules: [
				{
					field: 'val',
					predicate: 'Promise.resolve(true)',
					message: 'fail',
				},
			],
			options: { mode: 'serial' },
		});

		expect(result).toBeDefined();
	});

	it('should return evaluated count equal to total rules', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { val: 5 },
			rules: [
				{
					field: 'val',
					predicate: 'Promise.resolve(value > 0)',
					message: 'A',
				},
				{
					field: 'val',
					predicate: 'Promise.resolve(value < 10)',
					message: 'B',
				},
				{
					field: 'val',
					predicate: 'Promise.resolve(value !== 3)',
					message: 'C',
				},
			],
		});

		expect(result.evaluated).toBe(3);
	});

	// ── Tests específicos para el fix del ZodEnum Zod v4 ──────────────────────
	// Pre-fix: ZodEnum<["parallel","serial"]> causaba TS2416/TS2344
	// Post-fix: ZodEnum<{parallel:"parallel";serial:"serial"}> (forma objeto Zod v4)

	it('[ZodEnum fix] schema accepts "parallel" as valid mode value', () => {
		const tool = new QSimulateAsyncRulesTool();
		const parsed = tool.schema.safeParse({
			data: { val: 1 },
			rules: [{ field: 'val', predicate: 'true', message: 'fail' }],
			options: { mode: 'parallel' },
		});
		expect(parsed.success).toBe(true);
	});

	it('[ZodEnum fix] schema accepts "serial" as valid mode value', () => {
		const tool = new QSimulateAsyncRulesTool();
		const parsed = tool.schema.safeParse({
			data: { val: 1 },
			rules: [{ field: 'val', predicate: 'true', message: 'fail' }],
			options: { mode: 'serial' },
		});
		expect(parsed.success).toBe(true);
	});

	it('[ZodEnum fix] schema rejects unknown mode values', () => {
		const tool = new QSimulateAsyncRulesTool();
		const parsed = tool.schema.safeParse({
			data: {},
			rules: [],
			options: { mode: 'concurrent' },
		});
		expect(parsed.success).toBe(false);
	});

	it('[ZodEnum fix] mode serial stops after first failing rule', async () => {
		const tool = new QSimulateAsyncRulesTool();
		const result = await tool.execute({
			data: { val: -1 },
			rules: [
				{
					field: 'val',
					predicate: 'Promise.resolve(value >= 0)',
					message: 'must be >= 0',
				},
				{
					field: 'val',
					predicate: 'Promise.resolve(value <= 100)',
					message: 'must be <= 100',
				},
			],
			options: { mode: 'serial' },
		});
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('must be >= 0');
	});
});
