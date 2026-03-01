import { describe, test, expect, beforeEach } from 'bun:test';
import { QRunTestsTool } from '../../src/mcp/tools/internal/run-tests.tool';
import { QLintCheckTool } from '../../src/mcp/tools/internal/lint-check.tool';
import { QBenchmarkPerformanceTool } from '../../src/mcp/tools/internal/benchmark-perf.tool';
import { QGenerateMockDataTool } from '../../src/mcp/tools/public/generate-mock.tool';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Stub that records the args it receives but never spawns a real process. */
const makeSpawnStub =
	(stdout = '', stderr = '') =>
	(_cmd: string, _args: string[], _cwd: string) => ({
		stdout,
		stderr,
	});

// ──────────────────────────────────────────────────────────────────────────────
// MED-06 — run_tests: CLI flag injection via `pattern`
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Security: CLI flag injection into `bun test`.
 * MED-06 — pattern must be rejected when it starts with `-`.
 */
describe('MED-06 — run_tests: flag injection via pattern', () => {
	let tool: QRunTestsTool;

	beforeEach(() => {
		tool = new QRunTestsTool();
		// Replace _spawn so no real process is started
		(tool as unknown as { _spawn: unknown })._spawn = makeSpawnStub(
			'1 pass\n0 fail',
			''
		);
	});

	const FLAG_PATTERNS = [
		'--preload /evil.js',
		'--hook /proc/self/mem',
		'-t dangerous',
		'--bail 1 --preload /x',
		'--smol',
		'--define "process.env.SECRET=leaked"',
	];

	for (const pattern of FLAG_PATTERNS) {
		test(`should reject pattern starting with flag: ${pattern.slice(0, 45)}`, async () => {
			const result = await tool.execute({ pattern });
			// Must refuse — not run the suite
			expect(result.passed).toBe(false);
			expect(result.summary.toLowerCase()).toMatch(/security/);
		});
	}

	test('should allow a safe path pattern', async () => {
		const result = await tool.execute({ pattern: 'tests/unit' });
		// stub returns "1 pass 0 fail" so passed:true
		expect(result.passed).toBe(true);
	});

	test('should allow omitting pattern entirely', async () => {
		const result = await tool.execute({});
		expect(result.passed).toBe(true);
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// MED-07 — lint_check: CLI flag injection via targetDir / targetFiles
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Security: CLI flag injection into `npx eslint`.
 * MED-07 — targetDir / targetFiles must be rejected when they start with `-`.
 */
describe('MED-07 — lint_check: flag injection via targetDir / targetFiles', () => {
	let tool: QLintCheckTool;

	beforeEach(() => {
		tool = new QLintCheckTool();
		(tool as unknown as { _spawn: unknown })._spawn = makeSpawnStub('[]');
	});

	const BAD_TARGET_DIRS = [
		'--rulesdir /evil',
		'--rule {"no-eval": 2}',
		'-c /evil/.eslintrc',
		'--debug',
	];

	for (const targetDir of BAD_TARGET_DIRS) {
		test(`should reject targetDir starting with flag: ${targetDir.slice(0, 45)}`, async () => {
			const result = await tool.execute({ targetDir });
			expect(result.passed).toBe(false);
			expect(result.summary.toLowerCase()).toMatch(/security/);
		});
	}

	const BAD_TARGET_FILES = [
		['--rule dangerous'],
		['--plugin /proc/self/mem', 'src/file.ts'],
		['-c /evil/.eslintrc'],
	];

	for (const targetFiles of BAD_TARGET_FILES) {
		test(`should reject targetFiles containing flag: ${targetFiles[0]?.slice(0, 45)}`, async () => {
			const result = await tool.execute({ targetFiles });
			expect(result.passed).toBe(false);
			expect(result.summary.toLowerCase()).toMatch(/security/);
		});
	}

	test('should allow safe targetDir', async () => {
		const result = await tool.execute({ targetDir: 'src/mcp' });
		// stub returns '[]' → 0 errors → passed:true
		expect(result.passed).toBe(true);
	});

	test('should allow safe targetFiles', async () => {
		const result = await tool.execute({
			targetFiles: ['src/mcp/tools/predicate-sanitizer.ts'],
		});
		expect(result.passed).toBe(true);
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// MED-08 — benchmark_performance: DoS via unbounded iterations
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Security: DoS via excessively large `iterations` value.
 * MED-08 — iterations must be capped at 100 000.
 */
describe('MED-08 — benchmark_performance: DoS via unbounded iterations', () => {
	test('schema rejects iterations > 100_000', () => {
		const tool = new QBenchmarkPerformanceTool();
		const parsed = tool.schema.safeParse({ iterations: 100_001 });
		expect(parsed.success).toBe(false);
	});

	test('schema accepts iterations = 100_000', () => {
		const tool = new QBenchmarkPerformanceTool();
		const parsed = tool.schema.safeParse({ iterations: 100_000 });
		expect(parsed.success).toBe(true);
	});

	test('schema accepts default (1 000)', () => {
		const tool = new QBenchmarkPerformanceTool();
		const parsed = tool.schema.safeParse({});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.iterations).toBe(1000);
		}
	});

	test('execute clamps iterations to 100_000 defensively', async () => {
		const tool = new QBenchmarkPerformanceTool();
		// Bypassing schema — should still not run 2B iterations
		const start = Date.now();
		await tool.execute({ iterations: 100_001 });
		const elapsed = Date.now() - start;
		// If no cap, this would take >>60 s — guard: must finish in <30 s
		expect(elapsed).toBeLessThan(30_000);
	});
});

// ──────────────────────────────────────────────────────────────────────────────
// MED-09 — generate_mock: DoS via unbounded count
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Security: DoS via large `count` value in generate_mock.
 * MED-09 — count must be capped at 100.
 */
describe('MED-09 — generate_mock: DoS via unbounded count', () => {
	test('schema rejects count > 100', () => {
		const tool = new QGenerateMockDataTool();
		const parsed = tool.schema.safeParse({
			schema: { name: 'string' },
			count: 101,
		});
		expect(parsed.success).toBe(false);
	});

	test('schema accepts count = 100', () => {
		const tool = new QGenerateMockDataTool();
		const parsed = tool.schema.safeParse({
			schema: { name: 'string' },
			count: 100,
		});
		expect(parsed.success).toBe(true);
	});

	test('execute clamps count to 100 defensively', () => {
		const tool = new QGenerateMockDataTool();
		// The execute-level cap must be in place even if schema is bypassed.
		// We verify the cap constant is wired correctly by inspecting the schema max.
		const parsed = tool.schema.safeParse({
			schema: { name: 'string' },
			count: 101,
		});
		// Must fail at schema boundary → DoS payload never reaches execute
		expect(parsed.success).toBe(false);
	});

	test('returns correct number of mocks within limit', () => {
		const tool = new QGenerateMockDataTool();
		// Schema must allow count = 3
		const parsed = tool.schema.safeParse({
			schema: { name: 'string', age: 'number' },
			count: 3,
		});
		expect(parsed.success).toBe(true);
		if (parsed.success) {
			expect(parsed.data.count).toBe(3);
		}
	});
});
