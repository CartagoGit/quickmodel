import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { QCheckProjectRulesTool } from '../../../src/mcp/tools/internal';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('QCheckProjectRulesTool', () => {
	const tool = new QCheckProjectRulesTool();
	// Use a completely separate temp dir as "Mock Project Root"
	const mockProjectRoot = join(process.cwd(), 'tests', 'temp_mock_project');
	const mockTestsDir = join(mockProjectRoot, 'tests');

	beforeEach(() => {
		// Clean start - force delete ignores missing files
		rmSync(mockProjectRoot, { recursive: true, force: true });
		mkdirSync(mockTestsDir, { recursive: true });
	});

	afterEach(() => {
		// Cleanup
		rmSync(mockProjectRoot, { recursive: true, force: true });
	});

	it('should pass given no violations', async () => {
		// Empty tests dir = no violations
		const result = await tool.execute({ targetDir: mockProjectRoot });
		expect(result.passed).toBe(true);
		expect(result.errors.length).toBe(0);
	});

	it('should detect @QType in test files', async () => {
		const violationFile = join(mockTestsDir, 'violation.test.ts');
		writeFileSync(
			violationFile,
			`
            import { QType } from '...';
            class Test {
                @QType('string') // Violation
                prop: string;
            }
        `
		);

		const result = await tool.execute({ targetDir: mockProjectRoot });
		expect(result.passed).toBe(false);
		const hasError = result.errors.some(
			(e: string) =>
				e.includes('Found @QType usage') &&
				e.includes('violation.test.ts')
		);
		expect(hasError).toBe(true);
	});

	it('should detect console.log in src files', async () => {
		const mockSrcDir = join(mockProjectRoot, 'src');
		mkdirSync(mockSrcDir, { recursive: true });

		const violationFile = join(mockSrcDir, 'bad-code.ts');
		writeFileSync(
			violationFile,
			`
            function debug() {
                console.log('debug info'); // Violation
            }
        `
		);

		// Should ignore safe files
		const safeFile = join(mockSrcDir, 'server.ts');
		writeFileSync(safeFile, "console.log('server started')");

		const result = await tool.execute({ targetDir: mockProjectRoot });
		// It might still pass because console.log produces warnings, not errors
		// Check implementation: passed = errors.length === 0. So it passes.
		expect(result.passed).toBe(true);

		const hasWarning = result.warnings.some(
			(w: string) =>
				w.includes('Found console.log') && w.includes('bad-code.ts')
		);
		expect(hasWarning).toBe(true);

		const safeWarning = result.warnings.find((w: string) =>
			w.includes('server.ts')
		);
		expect(safeWarning).toBeUndefined();
	});

	// ──────────────────────────────────────────────────────────────────────────
	// id-length: variable/param names must have >= 3 chars (ESLint rule)
	// ──────────────────────────────────────────────────────────────────────────
	describe('id-length rule (min 3 chars)', () => {
		it('should detect short identifiers in src files', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'bad-names.ts'),
				`
function process(a: string, b: number) {
  const x = a + b;
  return x;
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('id-length') && e.includes('bad-names.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should allow allowed short names (id, on, fs, cb, md, ts, err, _)', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'allowed-names.ts'),
				`
const id = 1;
const res = await fetch('/');
const md = 'markdown';
const ts = Date.now();
const cb = () => {};
const fs = require('fs');
try {} catch (err) {}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasIdError = result.errors.some(
				(e: string) =>
					e.includes('id-length') && e.includes('allowed-names.ts')
			);
			expect(hasIdError).toBe(false);
		});

		it('should allow identifiers starting with _ (discard prefix)', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'discard.ts'),
				`
const [_a, second] = [1, 2];
function process(_unused: string, value: number) { return value; }
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('id-length') && e.includes('discard.ts')
			);
			expect(hasError).toBe(false);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// max-params: functions must not have more than 3 positional params
	// ──────────────────────────────────────────────────────────────────────────
	describe('max-params rule (max 3)', () => {
		it('should detect functions with more than 3 params in src', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'too-many-params.ts'),
				`
function processData(name: string, age: number, city: string, country: string) {
  return { name, age, city, country };
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('max-params') && e.includes('too-many-params.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should allow up to 3 params', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'valid-params.ts'),
				`
function create(name: string, age: number, active: boolean) {
  return { name, age, active };
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('max-params') && e.includes('valid-params.ts')
			);
			expect(hasError).toBe(false);
		});

		it('should ignore transformers and core/bases directories', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src', 'transformers');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'custom.transformer.ts'),
				`
function deserialize(val: unknown, key: string, cls: string, ctx: object) {
  return val;
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('max-params') &&
					e.includes('custom.transformer.ts')
			);
			expect(hasError).toBe(false);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// naming-convention: interfaces must use I prefix
	// ──────────────────────────────────────────────────────────────────────────
	describe('naming-convention rule (I prefix for interfaces and type aliases)', () => {
		it('should detect interface without I prefix in src', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'bad-interface.ts'),
				`
interface User {
  name: string;
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('naming-convention') &&
					e.includes('bad-interface.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should allow interface with I prefix', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'good-interface.ts'),
				`
interface IUser {
  name: string;
}
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('naming-convention') &&
					e.includes('good-interface.ts')
			);
			expect(hasError).toBe(false);
		});

		it('should detect type alias without I prefix in src', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'bad-type.ts'),
				`
type User = { name: string };
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('naming-convention') && e.includes('bad-type.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should allow type alias with I prefix', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'good-type.ts'),
				`
type IUser = { name: string };
`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('naming-convention') &&
					e.includes('good-type.ts')
			);
			expect(hasError).toBe(false);
		});
	});

	// ──────────────────────────────────────────────────────────────────────────
	// no-restricted-imports: no barrel imports
	// ──────────────────────────────────────────────────────────────────────────
	describe('no-restricted-imports rule', () => {
		it('should detect auto-import from @cartago-git/quickmodel in src', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'self-import.ts'),
				`import { QModel } from '@cartago-git/quickmodel';`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('no-restricted-imports') &&
					e.includes('self-import.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should detect bare @mcp barrel import in src', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'bad-mcp.ts'),
				`import { something } from '@mcp';`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('no-restricted-imports') &&
					e.includes('bad-mcp.ts')
			);
			expect(hasError).toBe(true);
		});

		it('should allow @mcp imports that specify a file path', async () => {
			const mockSrcDir = join(mockProjectRoot, 'src');
			mkdirSync(mockSrcDir, { recursive: true });
			writeFileSync(
				join(mockSrcDir, 'good-mcp.ts'),
				`import { McpServer } from '@mcp/server';`
			);
			const result = await tool.execute({ targetDir: mockProjectRoot });
			const hasError = result.errors.some(
				(e: string) =>
					e.includes('no-restricted-imports') &&
					e.includes('good-mcp.ts')
			);
			expect(hasError).toBe(false);
		});
	});
});
