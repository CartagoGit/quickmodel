import { describe, it, expect } from 'bun:test';
import { QExplainErrorTool } from '../../../../src/mcp/tools/public/explain-error.tool';

describe('QExplainErrorTool', () => {
	it('should be defined', () => {
		const tool = new QExplainErrorTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('explain_error');
	});

	it('should return error message for invalid JSON', async () => {
		const tool = new QExplainErrorTool();
		const result = await tool.execute({ error: '{ invalid json' });
		expect(result.explanation).toBe('Could not parse error JSON.');
	});

	it('should explain INVALID_TYPE error', async () => {
		const tool = new QExplainErrorTool();
		const error = {
			code: 'INVALID_TYPE',
			path: 'user.age',
			expected: 'number',
			received: 'string',
		};
		const result = await tool.execute({ error: JSON.stringify(error) });
		expect(result.explanation).toContain(
			"Field 'user.age' expected number but got string."
		);
		expect(result.explanation).toContain('Found 1 issues');
	});

	it('should explain REQUIRED error', async () => {
		const tool = new QExplainErrorTool();
		const error = {
			code: 'REQUIRED',
			path: 'user.name',
		};
		const result = await tool.execute({ error: JSON.stringify(error) });
		expect(result.explanation).toContain(
			"Field 'user.name' is required but was missing."
		);
	});

	it('should use message property if code is unknown', async () => {
		const tool = new QExplainErrorTool();
		const error = {
			code: 'UNKNOWN_CODE',
			message: 'Something went wrong manually',
		};
		const result = await tool.execute({ error: JSON.stringify(error) });
		expect(result.explanation).toContain('Something went wrong manually');
	});

	it('should stringify error if no known code or message', async () => {
		const tool = new QExplainErrorTool();
		const error = { foo: 'bar' };
		const result = await tool.execute({ error: JSON.stringify(error) });
		expect(result.explanation).toContain('{"foo":"bar"}');
	});

	it('should handle array of errors', async () => {
		const tool = new QExplainErrorTool();
		const errors = [
			{ code: 'REQUIRED', path: 'a' },
			{
				code: 'INVALID_TYPE',
				path: 'b',
				expected: 'Date',
				received: 'null',
			},
		];
		const result = await tool.execute({ error: JSON.stringify(errors) });
		expect(result.explanation).toContain('Found 2 issues:');
		expect(result.explanation).toContain(
			"- Field 'a' is required but was missing."
		);
		expect(result.explanation).toContain(
			"- Field 'b' expected Date but got null."
		);
	});

	it('should handle object with errors array property', async () => {
		const tool = new QExplainErrorTool();
		const errorObj = {
			errors: [{ code: 'REQUIRED', path: 'x' }],
		};
		const result = await tool.execute({ error: JSON.stringify(errorObj) });
		expect(result.explanation).toContain(
			"Field 'x' is required but was missing."
		);
	});
});
