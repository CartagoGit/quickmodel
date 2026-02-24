import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QRunTestsTool } from '../../../../src/mcp/tools/internal/run-tests.tool';

const BUN_PASS_OUTPUT = `
bun test v1.0.0

tests/unit/my.test.ts:
✓ should work (2ms)
✓ should also work (1ms)

 2 pass
 0 fail
`;

const BUN_FAIL_OUTPUT = `
bun test v1.0.0

tests/unit/my.test.ts:
✓ should work (2ms)
✗ should also work (1ms)

● should also work

  expect(received).toBe(expected)

  Expected: true
  Received: false

 1 pass
 1 fail
`;

describe('QRunTestsTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QRunTestsTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('run_tests');
		expect(tool.description).toBeDefined();
		expect(tool.description.length).toBeGreaterThan(10);
	});

	it('should have an optional pattern in the schema', () => {
		const tool = new QRunTestsTool();
		const parsed = tool.schema.safeParse({});
		expect(parsed.success).toBe(true);

		const withPattern = tool.schema.safeParse({ pattern: 'unit' });
		expect(withPattern.success).toBe(true);
	});

	it('should return passed=true when bun test exits 0', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: BUN_PASS_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(result.passed).toBe(true);
	});

	it('should return total_pass and total_fail from stdout', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: BUN_PASS_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(result.total_pass).toBe(2);
		expect(result.total_fail).toBe(0);
	});

	it('should return passed=false when bun test exits non-zero', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () => {
			const err = new Error('bun test failed') as any;
			err.stdout = BUN_FAIL_OUTPUT;
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(false);
	});

	it('should parse total_pass and total_fail when tests fail', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () => {
			const err = new Error('bun test failed') as any;
			err.stdout = BUN_FAIL_OUTPUT;
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(result.total_pass).toBe(1);
		expect(result.total_fail).toBe(1);
	});

	it('should return an errors array with failing test info', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () => {
			const err = new Error('bun test failed') as any;
			err.stdout = BUN_FAIL_OUTPUT;
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(Array.isArray(result.errors)).toBe(true);
	});

	it('should include a summary string', async () => {
		const tool = new QRunTestsTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: BUN_PASS_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should pass the pattern to the bun test command', async () => {
		const tool = new QRunTestsTool();
		let capturedArgs: string[] = [];
		tool['_spawn'] = (_cmd: string, args: string[]) => {
			capturedArgs = args;
			return Promise.resolve({ stdout: BUN_PASS_OUTPUT, stderr: '' });
		};

		await tool.execute({ pattern: 'unit/my' });
		expect(capturedArgs.join(' ')).toContain('unit/my');
	});

	it('should run without pattern when no pattern provided', async () => {
		const tool = new QRunTestsTool();
		let capturedArgs: string[] = [];
		tool['_spawn'] = (_cmd: string, args: string[]) => {
			capturedArgs = args;
			return Promise.resolve({ stdout: BUN_PASS_OUTPUT, stderr: '' });
		};

		await tool.execute({});
		expect(capturedArgs.join(' ')).toContain('test');
	});
});
