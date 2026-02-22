import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QProjectStatusTool } from '../../../../src/mcp/tools/internal/project-status.tool';

const PASS_TESTS = '\n 489 pass\n 0 fail\n';
const FAIL_TESTS = '\n 1 pass\n 3 fail\n';
const LINT_CLEAN = JSON.stringify([
	{ filePath: '/src/foo.ts', messages: [], errorCount: 0, warningCount: 0 },
]);
const LINT_ISSUES = JSON.stringify([
	{
		filePath: '/src/foo.ts',
		messages: [
			{
				ruleId: 'id-length',
				severity: 2,
				message: "Identifier 'fn' too short",
				line: 5,
				column: 3,
			},
		],
		errorCount: 1,
		warningCount: 0,
	},
]);
const TSC_CLEAN = '';
const TSC_ERRORS =
	"src/foo.ts(10,5): error TS2322: Type 'string' is not assignable to type 'number'.";

describe('QProjectStatusTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QProjectStatusTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('project_status');
		expect(tool.description).toBeDefined();
		expect(tool.description.length).toBeGreaterThan(10);
	});

	it('should have an empty schema (no required args)', () => {
		const tool = new QProjectStatusTool();
		const parsed = tool.schema.safeParse({});
		expect(parsed.success).toBe(true);
	});

	it('should return passed=true when all checks pass', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			// typecheck throws on error, clean = no throw
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(true);
	});

	it('should return passed=false when tests fail', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) {
				const err = new Error('tests failed') as any;
				err.stdout = FAIL_TESTS;
				err.stderr = '';
				throw err;
			}
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(false);
	});

	it('should return passed=false when lint has errors', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint')) {
				const err = new Error('lint failed') as any;
				err.stdout = LINT_ISSUES;
				err.stderr = '';
				throw err;
			}
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(false);
	});

	it('should return passed=false when typecheck has errors', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			const err = new Error('tsc failed') as any;
			err.stdout = TSC_ERRORS;
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(false);
	});

	it('should return a structured result with all check sections', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.tests).toBeDefined();
		expect(result.lint).toBeDefined();
		expect(result.typecheck).toBeDefined();
		expect(typeof result.summary).toBe('string');
	});

	it('should report test pass/fail counts in tests section', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.tests.total_pass).toBe(489);
		expect(result.tests.total_fail).toBe(0);
		expect(result.tests.passed).toBe(true);
	});

	it('should report lint error count in lint section', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.lint.total_errors).toBe(0);
		expect(result.lint.passed).toBe(true);
	});

	it('should report typecheck error count in typecheck section', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.typecheck.total).toBe(0);
		expect(result.typecheck.passed).toBe(true);
	});

	it('should include a summary string describing the full status', async () => {
		const tool = new QProjectStatusTool();
		tool['_spawn'] = async (_cmd: string, args: string[]) => {
			const cmd = args.join(' ');
			if (cmd.includes('test')) return { stdout: PASS_TESTS, stderr: '' };
			if (cmd.includes('eslint'))
				return { stdout: LINT_CLEAN, stderr: '' };
			return { stdout: TSC_CLEAN, stderr: '' };
		};

		const result = await tool.execute({});
		expect(result.summary).toMatch(/test|lint|typecheck/i);
	});
});
