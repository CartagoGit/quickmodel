import { describe, it, expect } from 'bun:test';
import { QCreateModelTool } from '../../../src/mcp/tools/public/create-model.tool';
import { QJsonToModelTool } from '../../../src/mcp/tools/public/json-to-model.tool';

describe('Security: MCP Tool Code Injection', () => {
	it('should reject invalid class names in QCreateModelTool', async () => {
		const tool = new QCreateModelTool();
		const maliciousClassName =
			"User} console.log('pwned'); class Malicious";

		// Should throw error now
		try {
			await tool.execute({
				className: maliciousClassName,
				properties: { id: 'string' },
			});
			// If it doesn't throw, fail the test
			expect(false).toBe(true);
		} catch (err: any) {
			expect(err.message).toContain('Invalid class name');
		}
	});

	it('should sanitize property keys in QJsonToModelTool', async () => {
		const tool = new QJsonToModelTool();
		// A key that attempts to close the property declaration and start new code
		const maliciousKey = 'x: number; } console.log("pwned"); class Y { y';
		const json = JSON.stringify({
			[maliciousKey]: 123,
		});

		const result = await tool.execute({
			json,
			className: 'Test',
		});

		const code = result.code;
		// console.log('Generated Code (Json Safe):', code);

		// Ensure the malicious payload is QUOTED and does not execute
		// The key should appear as a string literal: "x: number; }..."
		expect(code).toContain(JSON.stringify(maliciousKey));
		// Ensure it doesn't contain the raw injection sequence breaking the line
		expect(code).not.toContain(`public ${maliciousKey}:`);
	});
});
