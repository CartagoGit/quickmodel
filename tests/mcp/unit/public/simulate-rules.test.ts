import { describe, it, expect } from 'bun:test';
import { QSimulateRulesTool } from '../../../../src/mcp/tools/public/simulate-rules.tool';

describe('QSimulateRulesTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QSimulateRulesTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('simulate_rules');
		expect(tool.description).toBeDefined();
	});

	it('should return valid=true when all rules pass', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { age: 25 },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be 18+',
				},
			],
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should return valid=false when a rule fails', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { age: 15 },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be 18+',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('error should carry field name and message', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { name: '' },
			rules: [
				{
					field: 'name',
					predicate: 'value.length > 0',
					message: 'Required',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('name');
		expect(result.errors[0]?.message).toBe('Required');
	});

	it('should evaluate all rules on the same field (multiple @QRule per field)', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { score: -5 },
			rules: [
				{
					field: 'score',
					predicate: 'value >= 0',
					message: 'Cannot be negative',
				},
				{
					field: 'score',
					predicate: 'value <= 100',
					message: 'Cannot exceed 100',
				},
			],
		});

		// -5 fails the first rule (< 0) but passes the second (<= 100)
		// checkRules() reports ALL failing rules
		expect(result.errors.some((err) => err.field === 'score')).toBe(true);
	});

	it('should report only failing fields when multiple fields are present', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { email: 'bad', status: 'active' },
			rules: [
				{
					field: 'email',
					predicate: 'value.includes("@")',
					message: 'Invalid email',
				},
				{
					field: 'status',
					predicate: 'value === "active"',
					message: 'Must be active',
				},
			],
		});

		expect(result.valid).toBe(false);
		const failedFields = result.errors.map((err) => err.field);
		expect(failedFields).toContain('email');
		expect(failedFields).not.toContain('status');
	});

	it('should count evaluated rules correctly', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { val: 10 },
			rules: [
				{ field: 'val', predicate: 'value > 0', message: 'Positive' },
				{
					field: 'val',
					predicate: 'value < 100',
					message: 'Under 100',
				},
				{ field: 'val', predicate: 'value !== 0', message: 'Non-zero' },
			],
		});

		expect(result.evaluated).toBe(3);
		expect(result.valid).toBe(true);
	});

	it('should use cross-field access via data variable', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { password: 'abc', confirm: 'xyz' },
			rules: [
				{
					field: 'confirm',
					predicate: 'value === data.password',
					message: 'Must match password',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('Must match password');
	});

	it('should handle predicate evaluation errors gracefully (treat as failure)', async () => {
		const tool = new QSimulateRulesTool();
		const result = await tool.execute({
			data: { val: null },
			rules: [
				{
					field: 'val',
					predicate: 'value.length > 0',
					message: 'Cannot be null/empty',
				},
			],
		});

		// Accessing .length on null throws — should be treated as failure
		expect(result.valid).toBe(false);
	});
});
