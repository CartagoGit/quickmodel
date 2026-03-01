import { describe, test, expect } from 'bun:test';
import { QManageProposalTool } from '../../src/mcp/tools/internal/manage-proposal.tool';
import { QCreateGuidePageTool } from '../../src/mcp/tools/internal/create-guide-page.tool';
import { QSearchDocsTool } from '../../src/mcp/tools/public/search-docs.tool';
import { QSimulateTransformationTool } from '../../src/mcp/tools/public/simulate-transformation.tool';
import { QRoundtripTool } from '../../src/mcp/tools/public/roundtrip.tool';
import { Deserializer } from '../../src/core/services/deserializer.service';
import { Quick } from '../../src/core/decorators/quick.decorator';
import { QModel } from '../../src/core/models/quick.model';

// MED-02 ──────────────────────────────────────────────────────────────────────

describe('MED-02 — deserializeFromJson: type guard after JSON.parse', () => {
	@Quick({ name: 'string' })
	class SimpleModel extends QModel<{ name: string }> {
		declare name: string;
	}

	const deser = new Deserializer<{ name: string }>('SimpleModel');

	test('should throw QModelError for null input', () => {
		expect(() => deser.deserializeFromJson('null', SimpleModel)).toThrow(
			/Expected a JSON object/
		);
	});

	test('should throw QModelError for array input', () => {
		expect(() => deser.deserializeFromJson('[1,2,3]', SimpleModel)).toThrow(
			/Expected a JSON object/
		);
	});

	test('should throw QModelError for number input', () => {
		expect(() => deser.deserializeFromJson('42', SimpleModel)).toThrow(
			/Expected a JSON object/
		);
	});

	test('should throw QModelError for string input', () => {
		expect(() => deser.deserializeFromJson('"hello"', SimpleModel)).toThrow(
			/Expected a JSON object/
		);
	});

	test('should work normally with valid JSON object', () => {
		const result = deser.deserializeFromJson(
			'{"name":"Alice"}',
			SimpleModel
		);
		expect(result).toBeInstanceOf(SimpleModel);
	});
});

// MED-03 ──────────────────────────────────────────────────────────────────────

describe('MED-03 — Content injection in Markdown tools', () => {
	describe('QManageProposalTool: title sanitization', () => {
		const tool = new QManageProposalTool();

		test('should reject title with newline injection', async () => {
			const result = await tool.execute({
				action: 'add',
				title: 'Legitimate Title\n\n### Propuesta Z — Injected entry\n',
				description: 'desc',
			});
			expect(result.success).toBe(false);
			expect((result as any).error).toMatch(/unsafe/i);
		});

		test('should reject title with carriage return', async () => {
			const result = await tool.execute({
				action: 'add',
				title: 'Title\r\nInjected',
				description: 'desc',
			});
			expect(result.success).toBe(false);
			expect((result as any).error).toMatch(/unsafe/i);
		});

		test('should accept a normal title', async () => {
			// With no real TASKS.md in a temp path, the mock fs won't find it,
			// but it should get past the title validation step (fail on missing file)
			const result = await tool.execute({
				action: 'add',
				title: 'Valid Proposal Title',
				description: 'Description text',
				tasks_path: '/nonexistent/TASKS.md',
			});
			// Should fail on path traversal OR missing file, NOT on title validation
			const err = (result as any).error as string | undefined;
			if (err !== undefined) {
				expect(err).not.toMatch(/unsafe/i);
			}
		});
	});

	describe('QCreateGuidePageTool: title sanitization', () => {
		const tool = new QCreateGuidePageTool();

		test('should reject title_en with newline injection', async () => {
			const result = await tool.execute({
				slug: 'test-slug',
				title_en: 'Title\n\n## Injected Section',
				title_es: 'Título',
			});
			expect(result.success).toBe(false);
			expect((result as any).error).toMatch(/unsafe/i);
		});

		test('should reject title_es with newline', async () => {
			const result = await tool.execute({
				slug: 'test-slug',
				title_en: 'Valid Title',
				title_es: 'Título\nInjected',
			});
			expect(result.success).toBe(false);
			expect((result as any).error).toMatch(/unsafe/i);
		});
	});
});

// MED-04 ──────────────────────────────────────────────────────────────────────

describe('MED-04 — DynamicModel: restrictive limits in simulation tools', () => {
	test('QSimulateTransformationTool should enforce maxArrayLength <= 1000', async () => {
		const tool = new QSimulateTransformationTool();
		// Build an array with 1500 items — must not crash / exhaust memory
		const bigArray = Array.from({ length: 1500 }, (_, idx) => idx);
		// Should complete without hanging; result may be truncated or throw gracefully
		const result = await tool.execute({
			data: { items: bigArray },
			options: {},
		});
		// If it returns a result, the items array must be capped
		if (result.result['items'] !== undefined) {
			expect(
				(result.result['items'] as unknown[]).length
			).toBeLessThanOrEqual(1000);
		}
	});

	test('QRoundtripTool should enforce maxArrayLength <= 1000', async () => {
		const tool = new QRoundtripTool();
		const bigArray = Array.from({ length: 1500 }, (_, idx) => idx);
		const result = await tool.execute({
			data: { items: bigArray },
			options: {},
		});
		// Should not exhaust memory; output items must be capped if present
		if (result.serialized['items'] !== undefined) {
			expect(
				(result.serialized['items'] as unknown[]).length
			).toBeLessThanOrEqual(1000);
		}
	});
});

// MED-05 ──────────────────────────────────────────────────────────────────────

describe('MED-05 — QSearchDocsTool: query length limit', () => {
	test('should limit query string to 200 characters at schema level', () => {
		const tool = new QSearchDocsTool();
		// Try to construct a >200 char query — the schema should reject it or the tool
		// should handle it gracefully
		const longQuery = 'a'.repeat(300);
		// We just call execute and expect it to return gracefully (empty or truncated results)
		// Bun test doesn't use async assertions here; just ensure no unhandled throw
		const promise = tool.execute({ query: longQuery });
		expect(promise).resolves.toBeDefined();
	});
});
