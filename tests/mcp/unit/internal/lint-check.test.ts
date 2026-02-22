import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QLintCheckTool } from '../../../../src/mcp/tools/internal/lint-check.tool';

const makeEslintJson = (
	filePath: string,
	messages: Array<{
		ruleId: string;
		severity: number;
		message: string;
		line: number;
		column: number;
	}>
) =>
	JSON.stringify([
		{
			filePath,
			messages,
			errorCount: messages.filter((m) => m.severity === 2).length,
			warningCount: messages.filter((m) => m.severity === 1).length,
		},
	]);

describe('QLintCheckTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QLintCheckTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('lint_check');
		expect(tool.description).toBeDefined();
	});

	it('should return passed=true when eslint reports no problems', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => ({
			stdout: JSON.stringify([
				{
					filePath: '/src/foo.ts',
					messages: [],
					errorCount: 0,
					warningCount: 0,
				},
			]),
			stderr: '',
		});

		const result = await tool.execute({ targetDir: 'src' });
		expect(result.passed).toBe(true);
		expect(result.total_errors).toBe(0);
	});

	it('should return passed=false when eslint has errors', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => {
			const err = new Error('exit 1') as any;
			err.stdout = makeEslintJson('/src/foo.ts', [
				{
					ruleId: 'id-length',
					severity: 2,
					message: "Identifier name 'fn' is too short (< 3)",
					line: 10,
					column: 5,
				},
			]);
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({ targetDir: 'src' });
		expect(result.passed).toBe(false);
		expect(result.total_errors).toBeGreaterThan(0);
	});

	it('each error should have file, line, column, rule, message, severity', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => {
			const err = new Error('exit 1') as any;
			err.stdout = makeEslintJson('/src/foo.ts', [
				{
					ruleId: 'id-length',
					severity: 2,
					message: 'Too short',
					line: 5,
					column: 3,
				},
			]);
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({ targetDir: 'src' });
		const issue = result.errors[0];
		expect(issue).toBeDefined();
		expect(issue?.file).toBeDefined();
		expect(typeof issue?.line).toBe('number');
		expect(typeof issue?.column).toBe('number');
		expect(issue?.rule).toBeDefined();
		expect(issue?.message).toBeDefined();
		expect(issue?.severity).toBe('error');
	});

	it('should separate errors from warnings', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => {
			const err = new Error('exit 1') as any;
			err.stdout = makeEslintJson('/src/foo.ts', [
				{
					ruleId: 'id-length',
					severity: 2,
					message: 'Error',
					line: 1,
					column: 1,
				},
				{
					ruleId: 'no-console',
					severity: 1,
					message: 'Warning',
					line: 2,
					column: 1,
				},
			]);
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({ targetDir: 'src' });
		expect(result.total_errors).toBe(1);
		expect(result.total_warnings).toBe(1);
		expect(result.errors.length).toBe(1);
		expect(result.warnings.length).toBe(1);
		expect(result.errors[0]?.severity).toBe('error');
		expect(result.warnings[0]?.severity).toBe('warning');
	});

	it('should include a summary string', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => ({
			stdout: JSON.stringify([]),
			stderr: '',
		});

		const result = await tool.execute({ targetDir: 'src' });
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should accept targetFiles array as input', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => ({
			stdout: JSON.stringify([]),
			stderr: '',
		});

		const result = await tool.execute({
			targetFiles: ['src/foo.ts', 'src/bar.ts'],
		});
		expect(result).toBeDefined();
		expect(typeof result.passed).toBe('boolean');
	});

	it('should accept targetDir as input', async () => {
		const tool = new QLintCheckTool();
		tool['_spawn'] = async () => ({
			stdout: JSON.stringify([]),
			stderr: '',
		});

		const result = await tool.execute({ targetDir: 'src/mcp' });
		expect(result).toBeDefined();
		expect(typeof result.passed).toBe('boolean');
	});
});
