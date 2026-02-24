import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QTypecheckTool } from '../../../../src/mcp/tools/internal/typecheck.tool';

interface IMakeTscErrorOptions {
	file: string;
	line: number;
	col: number;
	code: string;
	msg: string;
}

const makeTscError = (opts: IMakeTscErrorOptions) =>
	`${opts.file}(${opts.line},${opts.col}): error ${opts.code}: ${opts.msg}`;

describe('QTypecheckTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QTypecheckTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('typecheck');
		expect(tool.description).toBeDefined();
	});

	it('should return passed=true when tsc exits 0 with no errors', async () => {
		const tool = new QTypecheckTool();
		tool['_spawn'] = () => Promise.resolve({ stdout: '', stderr: '' });

		const result = await tool.execute({});
		expect(result.passed).toBe(true);
		expect(result.total).toBe(0);
		expect(result.errors).toHaveLength(0);
	});

	it('should return passed=false when tsc has errors', async () => {
		const tool = new QTypecheckTool();
		tool['_spawn'] = () => {
			const err = new Error('tsc failed') as any;
			err.stdout = makeTscError({
				file: 'src/foo.ts',
				line: 10,
				col: 5,
				code: 'TS2322',
				msg: "Type 'string' is not assignable to type 'number'.",
			});
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(result.passed).toBe(false);
		expect(result.total).toBeGreaterThan(0);
	});

	it('each error should have file, line, column, code, message', async () => {
		const tool = new QTypecheckTool();
		tool['_spawn'] = () => {
			const err = new Error('tsc failed') as any;
			err.stdout = makeTscError({
				file: 'src/foo.ts',
				line: 10,
				col: 5,
				code: 'TS2322',
				msg: "Type 'string' is not assignable to type 'number'.",
			});
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		const typeErr = result.errors[0];
		expect(typeErr).toBeDefined();
		expect(typeErr?.file).toContain('foo.ts');
		expect(typeErr?.line).toBe(10);
		expect(typeErr?.column).toBe(5);
		expect(typeErr?.code).toBe('TS2322');
		expect(typeErr?.message).toContain('string');
	});

	it('should parse multiple errors from tsc output', async () => {
		const tool = new QTypecheckTool();
		tool['_spawn'] = () => {
			const err = new Error('tsc failed') as any;
			err.stdout = [
				makeTscError({
					file: 'src/a.ts',
					line: 1,
					col: 1,
					code: 'TS2304',
					msg: 'Cannot find name X.',
				}),
				makeTscError({
					file: 'src/b.ts',
					line: 2,
					col: 3,
					code: 'TS2551',
					msg: 'Did you mean Y?',
				}),
			].join('\n');
			err.stderr = '';
			throw err;
		};

		const result = await tool.execute({});
		expect(result.total).toBe(2);
		expect(result.errors).toHaveLength(2);
	});

	it('should include a summary string', async () => {
		const tool = new QTypecheckTool();
		tool['_spawn'] = () => Promise.resolve({ stdout: '', stderr: '' });

		const result = await tool.execute({});
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});
});
