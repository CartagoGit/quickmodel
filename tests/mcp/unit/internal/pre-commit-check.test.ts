import { describe, it, expect, afterEach, mock } from 'bun:test';
import { QPreCommitCheckTool } from '../../../../src/mcp/tools/internal/pre-commit-check.tool';

describe('QPreCommitCheckTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QPreCommitCheckTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('pre_commit_check');
		expect(tool.description).toBeDefined();
	});

	it('should return passed=true when eslint and prettier succeed', async () => {
		const tool = new QPreCommitCheckTool();
		tool['_spawn'] = async (cmd: string) => {
			if (cmd === 'npx') {
				// eslint --format json with no errors
				return {
					stdout: JSON.stringify([
						{
							filePath: '/src/foo.ts',
							messages: [],
							errorCount: 0,
							warningCount: 0,
						},
					]),
					stderr: '',
				};
			}
			return { stdout: '', stderr: '' };
		};

		const result = await tool.execute({ files: ['src/foo.ts'] });
		expect(result.passed).toBe(true);
		expect(result.eslint_errors).toBe(0);
	});

	it('should return passed=false when eslint has errors', async () => {
		const tool = new QPreCommitCheckTool();
		tool['_spawn'] = async (cmd: string) => {
			if (cmd === 'npx') {
				const err = new Error('exit 1') as any;
				err.stdout = JSON.stringify([
					{
						filePath: '/src/foo.ts',
						messages: [
							{
								ruleId: 'id-length',
								severity: 2,
								message:
									"Identifier name 'fn' is too short (< 3)",
								line: 12,
								column: 3,
							},
						],
						errorCount: 1,
						warningCount: 0,
					},
				]);
				err.stderr = '';
				throw err;
			}
			return { stdout: '', stderr: '' };
		};

		const result = await tool.execute({ files: ['src/foo.ts'] });
		expect(result.passed).toBe(false);
		expect(result.eslint_errors).toBe(1);
	});

	it('should include eslint error details in the issues array', async () => {
		const tool = new QPreCommitCheckTool();
		tool['_spawn'] = async (cmd: string) => {
			if (cmd === 'npx') {
				const err = new Error('exit 1') as any;
				err.stdout = JSON.stringify([
					{
						filePath: '/src/bar.ts',
						messages: [
							{
								ruleId: 'no-console',
								severity: 2,
								message: 'Unexpected console statement.',
								line: 5,
								column: 2,
							},
						],
						errorCount: 1,
						warningCount: 0,
					},
				]);
				err.stderr = '';
				throw err;
			}
			return { stdout: '', stderr: '' };
		};

		const result = await tool.execute({ files: ['src/bar.ts'] });
		expect(result.issues.length).toBeGreaterThan(0);
		expect(result.issues[0]?.rule).toBe('no-console');
		expect(result.issues[0]?.file).toContain('bar.ts');
		expect(result.issues[0]?.line).toBe(5);
	});

	it('should include a human-readable summary', async () => {
		const tool = new QPreCommitCheckTool();
		tool['_spawn'] = async () => ({
			stdout: JSON.stringify([
				{
					filePath: '/src/ok.ts',
					messages: [],
					errorCount: 0,
					warningCount: 0,
				},
			]),
			stderr: '',
		});

		const result = await tool.execute({ files: ['src/ok.ts'] });
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should run on "src" as default when no files provided', async () => {
		const tool = new QPreCommitCheckTool();
		const calls: string[][] = [];
		tool['_spawn'] = async (cmd: string, args: string[]) => {
			calls.push([cmd, ...args]);
			return {
				stdout: JSON.stringify([
					{
						filePath: '/src/x.ts',
						messages: [],
						errorCount: 0,
						warningCount: 0,
					},
				]),
				stderr: '',
			};
		};

		await tool.execute({});
		const eslintCall = calls.find((c) => c[0] === 'npx');
		expect(eslintCall).toBeDefined();
		expect(eslintCall?.join(' ')).toContain('src');
	});

	it('should report prettier changes as informational', async () => {
		const tool = new QPreCommitCheckTool();
		tool['_spawn'] = async (cmd: string) => {
			if (cmd === 'npx' && false) throw new Error('eslint error');
			if (cmd === 'npx') {
				return {
					stdout: JSON.stringify([
						{
							filePath: '/src/foo.ts',
							messages: [],
							errorCount: 0,
							warningCount: 0,
						},
					]),
					stderr: '',
				};
			}
			// prettier --write outputs modified file paths to stdout
			return { stdout: 'src/foo.ts\n', stderr: '' };
		};

		const result = await tool.execute({ files: ['src/foo.ts'] });
		expect(result.passed).toBe(true);
		expect(typeof result.prettier_changed).toBe('number');
	});
});
