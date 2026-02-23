import { describe, it, expect } from 'bun:test';
import { QListValidatorsTool } from '../../../../src/mcp/tools/public/list-validators.tool';

describe('QListValidatorsTool', () => {
	it('should have name "list_validators"', () => {
		const tool = new QListValidatorsTool();
		expect(tool.name).toBe('list_validators');
	});

	it('should return an array of validator entries', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it('should include core validators: IsEmail, IsUrl, IsNotEmpty', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		const names = result.map((val) => val.name);

		expect(names).toContain('IsEmail');
		expect(names).toContain('IsUrl');
		expect(names).toContain('IsNotEmpty');
	});

	it('should include numeric validators: Min, Max, IsInt, IsPositive, IsNegative', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		const names = result.map((val) => val.name);

		expect(names).toContain('Min');
		expect(names).toContain('Max');
		expect(names).toContain('IsInt');
		expect(names).toContain('IsPositive');
		expect(names).toContain('IsNegative');
	});

	it('should include string validators: MinLength, MaxLength, Matches, IsUuid, IsDateString', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		const names = result.map((val) => val.name);

		expect(names).toContain('MinLength');
		expect(names).toContain('MaxLength');
		expect(names).toContain('Matches');
		expect(names).toContain('IsUuid');
		expect(names).toContain('IsDateString');
	});

	it('should include IsIn validator', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		const names = result.map((val) => val.name);

		expect(names).toContain('IsIn');
	});

	it('each entry should have name, description, and params fields', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});

		for (const entry of result) {
			expect(typeof entry.name).toBe('string');
			expect(typeof entry.description).toBe('string');
			expect(entry.name.length).toBeGreaterThan(0);
			expect(entry.description.length).toBeGreaterThan(0);
		}
	});

	it('should return entries sorted alphabetically by name', async () => {
		const tool = new QListValidatorsTool();
		const result = await tool.execute({});
		const names = result.map((val) => val.name);
		const sorted = [...names].sort();

		expect(names).toEqual(sorted);
	});
});
