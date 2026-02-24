import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QGetStagedFilesTool } from '../../../../src/mcp/tools/internal/get-staged-files.tool';

const STAGED_OUTPUT = `src/mcp/tools/internal/run-tests.tool.ts
src/mcp/tools/internal/get-staged-files.tool.ts
tests/mcp/unit/internal/run-tests.test.ts
`;

describe('QGetStagedFilesTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QGetStagedFilesTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('get_staged_files');
		expect(tool.description).toBeDefined();
		expect(tool.description.length).toBeGreaterThan(10);
	});

	it('should have an empty schema (no required args)', () => {
		const tool = new QGetStagedFilesTool();
		const parsed = tool.schema.safeParse({});
		expect(parsed.success).toBe(true);
	});

	it('should return a files array from git diff --cached --name-only', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: STAGED_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(Array.isArray(result.files)).toBe(true);
		expect(result.files.length).toBe(3);
	});

	it('should correctly parse multi-line output into file paths', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: STAGED_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(result.files).toContain(
			'src/mcp/tools/internal/run-tests.tool.ts'
		);
		expect(result.files).toContain(
			'src/mcp/tools/internal/get-staged-files.tool.ts'
		);
		expect(result.files).toContain(
			'tests/mcp/unit/internal/run-tests.test.ts'
		);
	});

	it('should return total matching the number of files', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: STAGED_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(result.total).toBe(3);
	});

	it('should return empty array when no staged files', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () => Promise.resolve({ stdout: '', stderr: '' });

		const result = await tool.execute({});
		expect(result.files).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it('should include a summary string', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () =>
			Promise.resolve({ stdout: STAGED_OUTPUT, stderr: '' });

		const result = await tool.execute({});
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should run git diff --cached --name-only', async () => {
		const tool = new QGetStagedFilesTool();
		let capturedArgs: string[] = [];
		tool['_spawn'] = (_cmd: string, args: string[]) => {
			capturedArgs = args;
			return Promise.resolve({ stdout: '', stderr: '' });
		};

		await tool.execute({});
		expect(capturedArgs).toContain('--cached');
		expect(capturedArgs).toContain('--name-only');
	});

	it('should handle git error gracefully returning empty files', async () => {
		const tool = new QGetStagedFilesTool();
		tool['_spawn'] = () => {
			const err = new Error('not a git repo') as any;
			err.stdout = '';
			err.stderr = 'fatal: not a git repository';
			throw err;
		};

		const result = await tool.execute({});
		expect(Array.isArray(result.files)).toBe(true);
		expect(result.passed).toBe(false);
	});
});
