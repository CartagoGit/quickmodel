import { describe, it, expect } from 'bun:test';
import { QGenerateIntegrationTestTool } from '../../../../src/mcp/tools/public/generate-integration-test.tool';

describe('QGenerateIntegrationTestTool', () => {
	const tool = new QGenerateIntegrationTestTool();

	it('should have correct metadata', () => {
		expect(tool.name).toBe('generate_integration_test');
		expect(tool.description).toBeDefined();
	});

	it('should default to roundtrip test_type', async () => {
		const result = await tool.execute({ base_model: 'IUserModel' });

		expect(result.testType).toBe('roundtrip');
		expect(result.code).toBeDefined();
		expect(result.testCount).toBeGreaterThan(0);
	});

	it('should generate inheritance tests', async () => {
		const result = await tool.execute({
			base_model: 'IBaseModel',
			child_model: 'IChildModel',
			test_type: 'inheritance',
		});

		expect(result.testType).toBe('inheritance');
		expect(result.code).toContain('IBaseModel');
		expect(result.code).toContain('IChildModel');
		expect(result.testCount).toBeGreaterThanOrEqual(6);
	});

	it('should generate composition tests', async () => {
		const result = await tool.execute({
			base_model: 'IOrderModel',
			child_model: 'IOrderItemModel',
			test_type: 'composition',
		});

		expect(result.testType).toBe('composition');
		expect(result.code).toContain('IOrderModel');
		expect(result.testCount).toBeGreaterThanOrEqual(5);
	});

	it('should generate roundtrip tests with base_model only', async () => {
		const result = await tool.execute({
			base_model: 'IProductModel',
			test_type: 'roundtrip',
		});

		expect(result.testType).toBe('roundtrip');
		expect(result.code).toContain('IProductModel');
		expect(result.testCount).toBeGreaterThanOrEqual(6);
	});

	it('should include base_model name in generated code', async () => {
		const result = await tool.execute({ base_model: 'IInvoiceModel' });

		expect(result.code).toContain('IInvoiceModel');
	});

	it('should return a summary string', async () => {
		const result = await tool.execute({ base_model: 'IBaseModel' });

		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should produce valid Bun test import in generated code', async () => {
		const result = await tool.execute({
			base_model: 'IBaseModel',
			test_type: 'roundtrip',
		});

		expect(result.code).toContain("from 'bun:test'");
	});
});
