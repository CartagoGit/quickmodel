import { describe, it, expect } from 'bun:test';
import { QGenerateFeatureTestsTool } from '../../../../src/mcp/tools/public/generate-feature-tests.tool';

describe('QGenerateFeatureTestsTool', () => {
	const tool = new QGenerateFeatureTestsTool();

	it('should have correct metadata', () => {
		expect(tool.name).toBe('generate_feature_tests');
		expect(tool.description).toBeDefined();
	});

	it('should generate tests for @Quick', async () => {
		const result = await tool.execute({
			decorator: '@Quick',
			model_name: 'IUserModel',
			include_edge_cases: true,
		});

		expect(result.decorator).toBe('@Quick');
		expect(result.code).toContain('@Quick');
		expect(result.testCount).toBeGreaterThan(0);
		expect(typeof result.summary).toBe('string');
	});

	it('should generate tests for @QRule', async () => {
		const result = await tool.execute({
			decorator: '@QRule',
			include_edge_cases: true,
		});

		expect(result.decorator).toBe('@QRule');
		expect(result.code).toContain('@QRule');
		expect(result.testCount).toBeGreaterThan(0);
	});

	it('should generate tests for @QField', async () => {
		const result = await tool.execute({
			decorator: '@QField',
			include_edge_cases: false,
		});

		expect(result.decorator).toBe('@QField');
		expect(result.code).toContain('@QField');
	});

	it('should generate tests for @QAlias', async () => {
		const result = await tool.execute({
			decorator: '@QAlias',
			include_edge_cases: false,
		});

		expect(result.code).toContain('@QAlias');
	});

	it('should generate tests for @QGroup', async () => {
		const result = await tool.execute({
			decorator: '@QGroup',
			include_edge_cases: false,
		});

		expect(result.code).toContain('@QGroup');
	});

	it('should generate tests for @QComputed', async () => {
		const result = await tool.execute({
			decorator: '@QComputed',
			include_edge_cases: false,
		});

		expect(result.code).toContain('@QComputed');
	});

	it('should generate tests for @QConfig', async () => {
		const result = await tool.execute({
			decorator: '@QConfig',
			include_edge_cases: false,
		});

		expect(result.code).toContain('@QConfig');
	});

	it('should handle an unknown decorator with fallback template', async () => {
		const result = await tool.execute({
			decorator: '@QUnknown',
			include_edge_cases: false,
		});

		expect(result.decorator).toBe('@QUnknown');
		expect(typeof result.code).toBe('string');
		expect(result.code.length).toBeGreaterThan(0);
	});

	it('should include edge case tests when flag is true', async () => {
		const result = await tool.execute({
			decorator: '@Quick',
			include_edge_cases: true,
		});
		expect(result.testCount).toBeGreaterThan(3);
	});

	it('should use custom model_name in generated code', async () => {
		const result = await tool.execute({
			decorator: '@Quick',
			model_name: 'IProductModel',
			include_edge_cases: false,
		});
		expect(result.code).toContain('IProductModel');
	});
});
