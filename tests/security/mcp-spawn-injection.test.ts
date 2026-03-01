import { describe, test, expect } from 'bun:test';
import { QRunTestsTool } from '../../src/mcp/tools/internal/run-tests.tool';
import { QLintCheckTool } from '../../src/mcp/tools/internal/lint-check.tool';
import { QBenchmarkPerformanceTool } from '../../src/mcp/tools/internal/benchmark-perf.tool';
import { QGenerateMockDataTool } from '../../src/mcp/tools/public/generate-mock.tool';

// MED-06 ─────────────────────────────────────────────────────────────────────

describe('MED-06 — run_tests: CLI flag injection via pattern', () => {
	const FLAG_PATTERNS = [
		'--preload /evil.js',
		'--config /etc/passwd',
		'-r require("evil")',
		'--inspect-brk',
		'--watch',
		'-w',
	];

	const tool = new QRunTestsTool();

	for (const pat of FLAG_PATTERNS) {
		test(`should reject pattern: ${pat}`, async () => {
			const result = await tool.execute({ pattern: pat });
			expect(result.passed).toBe(false);
			expect(result.summary).toMatch(/Security/i);
			// Confirm it did NOT actually attempt to run tests with the flag
			expect(result.total_pass).toBe(0);
		});
	}

	test('should accept a valid file path pattern', async () => {
		// We only check that it does NOT return a security error — actual test
		// execution (which would call bun test with the pattern) may pass or fail
		// depending on the environment; we just verify the guard is not triggered.
		const result = await tool.execute({
			pattern: 'tests/unit/core',
		});
		expect(result.summary).not.toMatch(/Security/i);
	});
});

// MED-07 ─────────────────────────────────────────────────────────────────────

describe('MED-07 — lint_check: CLI flag injection via targetDir / targetFiles', () => {
	class CaptureTool extends QLintCheckTool {
		public captured: string[] = [];
		protected override _spawn = (
			_cmd: string,
			args: string[]
		): Promise<{ stdout: string; stderr: string }> => {
			this.captured = args;
			return Promise.resolve({ stdout: '[]', stderr: '' });
		};
	}

	test('should include -- separator before targetDir in eslint args', async () => {
		const tool = new CaptureTool();
		await tool.execute({ targetDir: 'src/mcp' });
		const doubledash = tool.captured.indexOf('--');
		expect(doubledash).toBeGreaterThan(-1);
		expect(tool.captured[doubledash + 1]).toBe('src/mcp');
	});

	test('should include -- separator before targetFiles in eslint args', async () => {
		const tool = new CaptureTool();
		await tool.execute({
			targetFiles: ['src/mcp/tools/public/roundtrip.tool.ts'],
		});
		const doubledash = tool.captured.indexOf('--');
		expect(doubledash).toBeGreaterThan(-1);
	});

	test('should reject targetFiles entries starting with - (flag injection)', async () => {
		const tool = new CaptureTool();
		const result = await tool.execute({
			targetFiles: ['--stdin-filename', '--rule', '{"": "error"}'],
		});
		expect(result.passed).toBe(false);
		expect(result.summary).toMatch(/Security/i);
	});

	test('should reject targetDir starting with - (flag injection)', async () => {
		const tool = new CaptureTool();
		const result = await tool.execute({ targetDir: '--rulesdir /evil' });
		expect(result.passed).toBe(false);
		expect(result.summary).toMatch(/Security/i);
	});
});

// MED-08 ─────────────────────────────────────────────────────────────────────

describe('MED-08 — benchmark_performance: DoS via unbounded iterations', () => {
	const tool = new QBenchmarkPerformanceTool();

	test('schema should reject iterations above limit', () => {
		const result = tool.schema.safeParse({ iterations: 100_001 });
		expect(result.success).toBe(false);
	});

	test('schema should accept iterations within limit', () => {
		const result = tool.schema.safeParse({ iterations: 1_000 });
		expect(result.success).toBe(true);
	});

	test('schema should accept default (omitted) iterations', () => {
		const result = tool.schema.safeParse({});
		expect(result.success).toBe(true);
	});
});

// MED-09 ─────────────────────────────────────────────────────────────────────

describe('MED-09 — generate_mock: DoS via unbounded count', () => {
	const tool = new QGenerateMockDataTool();

	test('schema should reject count above limit', () => {
		const result = tool.schema.safeParse({
			schema: { name: 'string' },
			count: 1_001,
		});
		expect(result.success).toBe(false);
	});

	test('schema should accept count within limit', () => {
		const result = tool.schema.safeParse({
			schema: { name: 'string' },
			count: 50,
		});
		expect(result.success).toBe(true);
	});

	test('schema should accept default (omitted) count', () => {
		const result = tool.schema.safeParse({ schema: { name: 'string' } });
		expect(result.success).toBe(true);
	});
});
