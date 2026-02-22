import { describe, it, expect } from 'bun:test';
import { QSimulateValidationTool } from '../../../../src/mcp/tools/public/simulate-validation.tool';

describe('QSimulateValidationTool', () => {
	it('should be defined with correct metadata', () => {
		const tool = new QSimulateValidationTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('simulate_validation');
		expect(tool.description).toBeDefined();
	});

	it('should return valid=true when all rules pass', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { age: 25, name: 'Alice' },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be at least 18',
				},
				{
					field: 'name',
					predicate: 'value.length >= 3',
					message: 'Name too short',
				},
			],
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should return valid=false with errors when rules fail', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { age: 15, name: 'Jo' },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Must be at least 18',
				},
				{
					field: 'name',
					predicate: 'value.length >= 3',
					message: 'Name too short',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(2);
		expect(result.errors[0]?.field).toBe('age');
		expect(result.errors[0]?.message).toBe('Must be at least 18');
		expect(result.errors[0]?.value).toBe(15);
		expect(result.errors[1]?.field).toBe('name');
		expect(result.errors[1]?.message).toBe('Name too short');
		expect(result.errors[1]?.value).toBe('Jo');
	});

	it('should include passed rules in the report', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { score: 90 },
			rules: [
				{
					field: 'score',
					predicate: 'value >= 50',
					message: 'Score too low',
				},
			],
		});

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it('should filter by group when group is provided', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { age: 15, email: 'not-valid' },
			rules: [
				{
					field: 'age',
					predicate: 'value >= 18',
					message: 'Too young',
					group: 'personal',
				},
				{
					field: 'email',
					predicate: 'value.includes("@")',
					message: 'Invalid email',
					group: 'contact',
				},
			],
			group: 'personal',
		});

		// Only age rule should be evaluated (personal group)
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.field).toBe('age');
	});

	it('should access full data object in predicate via data variable', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { password: 'secret', confirm: 'wrong' },
			rules: [
				{
					field: 'confirm',
					predicate: 'value === data.password',
					message: 'Passwords do not match',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors[0]?.message).toBe('Passwords do not match');
	});

	it('should handle predicate evaluation errors gracefully', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { field: null },
			rules: [
				{
					field: 'field',
					predicate: 'value.length > 0',
					message: 'Cannot be empty',
				},
			],
		});

		// Should catch the TypeError and treat rule as failed
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.field).toBe('field');
	});

	it('should return summary statistics', async () => {
		const tool = new QSimulateValidationTool();
		const result = await tool.execute({
			data: { val: 5 },
			rules: [
				{
					field: 'val',
					predicate: 'value > 10',
					message: 'Too small',
				},
				{
					field: 'val',
					predicate: 'value > 0',
					message: 'Must be positive',
				},
			],
		});

		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(typeof result.evaluated).toBe('number');
		expect(result.evaluated).toBe(2);
	});
});
