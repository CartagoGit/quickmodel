import {
	describe,
	it,
	expect,
	beforeEach,
	afterEach,
	beforeAll,
} from 'bun:test';
import {
	QScaffoldFeatureTool,
	QCheckApiCompatibilityTool,
	QBenchmarkPerformanceTool,
	QGenerateTestTool,
} from '../../../../src/mcp/tools/internal';
import { join } from 'path';
import { existsSync, readFileSync, rmSync, mkdirSync } from 'fs';

// Mock FS for safer testing where possible, though integration style often easier for FS tools
// We'll trust the real FS in tmp dirs for some tests to be realistic.

describe('New Internal Tools', () => {
	const tmpDir = join(process.cwd(), 'tests', 'temp_internal_tools');

	beforeEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
		mkdirSync(tmpDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('QScaffoldFeatureTool', () => {
		it('should scaffold a transformer', async () => {
			const tool = new QScaffoldFeatureTool();
			// Override FS to avoid polluting real src
			const loc = 'tests/temp_internal_tools';

			const result = await tool.execute({
				type: 'transformer',
				name: 'custom-demo',
				location: loc,
			});

			expect(result.message).toContain('Scaffolded');
			expect(result.testPath).toBe('');
			const expPath = join(
				process.cwd(),
				loc,
				'custom-demo.transformer.ts'
			);
			expect(existsSync(expPath)).toBe(true);
		});

		it('should scaffold a tool', async () => {
			const tool = new QScaffoldFeatureTool();
			const loc = 'tests/temp_internal_tools';

			const result = await tool.execute({
				type: 'tool',
				name: 'my-new-tool',
				location: loc,
			});

			expect(result.message).toContain('Scaffolded');
			expect(result.testPath).toBe('');
			const expPath = join(process.cwd(), loc, 'my-new-tool.tool.ts');
			expect(existsSync(expPath)).toBe(true);
		});

		it('transformer template must use BaseTransformer class pattern', async () => {
			const tool = new QScaffoldFeatureTool();
			const loc = 'tests/temp_internal_tools';

			await tool.execute({
				type: 'transformer',
				name: 'email',
				location: loc,
			});

			const content = readFileSync(
				join(process.cwd(), loc, 'email.transformer.ts'),
				'utf-8'
			);

			expect(content).toContain('BaseTransformer');
			expect(content).toContain('deserialize');
			expect(content).toContain('serialize');
			expect(content).not.toContain('ValueTransformer');
			expect(content).not.toContain('value-transformer.service');
		});

		it('tool template must use QAbstractTool correctly', async () => {
			const tool = new QScaffoldFeatureTool();
			const loc = 'tests/temp_internal_tools';

			await tool.execute({
				type: 'tool',
				name: 'send-email',
				location: loc,
			});

			const content = readFileSync(
				join(process.cwd(), loc, 'send-email.tool.ts'),
				'utf-8'
			);

			expect(content).toContain('QAbstractTool');
			expect(content).toContain('execute');
			expect(content).toContain("import { z } from '@mcp/deps'");
		});
	});

	describe('QCheckApiCompatibilityTool', () => {
		it('should detect compatible changes', async () => {
			const tool = new QCheckApiCompatibilityTool();
			// Mock fs for this one to avoid scanning real huge project
			const mockFs: any = {
				existsSync: () => true,
				readFileSync: (path: string) => {
					if (path.endsWith('baseline.json')) {
						return JSON.stringify({ OldClass: true });
					}
					// file content scan
					return 'export class OldClass {} export class NewClass {}';
				},
				readdirSync: () => ['file.ts'],
				statSync: () => ({ isDirectory: () => false }),
			};
			(tool as any)._fs = mockFs;

			const result = await tool.execute({
				baselineFile: 'baseline.json',
			});
			expect(result.status).toBe('compatible');
			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]).toContain('[NEW]');
		});

		it('should detect breaking changes', async () => {
			const tool = new QCheckApiCompatibilityTool();
			const mockFs: any = {
				existsSync: () => true,
				readFileSync: (path: string) => {
					if (path.endsWith('baseline.json')) {
						return JSON.stringify({
							OldClass: true,
							DeletedClass: true,
						});
					}
					return 'export class OldClass {}';
				},
				readdirSync: () => ['file.ts'],
				statSync: () => ({ isDirectory: () => false }),
			};
			(tool as any)._fs = mockFs;

			const result = await tool.execute({
				baselineFile: 'baseline.json',
			});
			expect(result.status).toBe('breaking');
			expect(
				result.changes.some((chg) => chg.includes('DeletedClass'))
			).toBe(true);
		});
		it('should create new baseline if it does not exist', async () => {
			const tool = new QCheckApiCompatibilityTool();
			const mockFs: any = {
				existsSync: () => false,
				writeFileSync: () => {}, // Mock write
				readFileSync: () => 'export class MyClass {}', // Mock source scan
				readdirSync: () => ['file.ts'],
				statSync: () => ({ isDirectory: () => false }),
			};
			(tool as any)._fs = mockFs;

			const result = await tool.execute({
				baselineFile: 'new-baseline.json',
			});
			expect(result.status).toBe('baseline_created');
			expect(result.changes[0]).toContain('No baseline found');
		});

		describe('QGenerateTestTool', () => {
			it('should generate test file for source outside src/', async () => {
				const tool = new QGenerateTestTool();
				const mockFs: any = {
					existsSync: (path: string) => path.endsWith('outside.ts'),
					mkdirSync: () => {},
					writeFileSync: () => {},
					readdirSync: () => [],
					statSync: () => ({ isDirectory: () => false }),
				};
				(tool as any)._fs = mockFs;

				const result = await tool.execute({
					sourceFile: 'outside.ts',
				});

				expect(result.message).toContain('Test file created');
				expect(result.path).toContain('outside.test.ts');
			});
		});
	});

	describe('QBenchmarkPerformanceTool', () => {
		it('should run benchmarks and return metrics', async () => {
			const tool = new QBenchmarkPerformanceTool();
			// Run small iterations for speed
			const result = await tool.execute({ iterations: 10 });

			expect(result.summary).toBeDefined();
			expect(result.results['instantiation_avg_ms']).toBeDefined();
			expect(result.results['transformation_avg_ms']).toBeDefined();
			expect(result.results['serialization_avg_ms']).toBeDefined();
		});
	});
});

describe('New Internal Tools - Health & Docs', () => {
	let QCheckProjectHealthTool: typeof import('../../../../src/mcp/tools/internal').QCheckProjectHealthTool;
	let QGetCoverageReportTool: typeof import('../../../../src/mcp/tools/internal').QGetCoverageReportTool;
	let QUpdateDocsTool: typeof import('../../../../src/mcp/tools/internal').QUpdateDocsTool;

	beforeAll(async () => {
		const mod = await import('../../../../src/mcp/tools/internal');
		QCheckProjectHealthTool = mod.QCheckProjectHealthTool;
		QGetCoverageReportTool = mod.QGetCoverageReportTool;
		QUpdateDocsTool = mod.QUpdateDocsTool;
	});

	describe('QCheckProjectHealthTool', () => {
		it('should return ok on successful check', async () => {
			const tool = new QCheckProjectHealthTool();
			tool['_spawn'] = () =>
				Promise.resolve({
					stdout: 'Passed',
					stderr: '',
				});

			const result = await tool.execute();
			expect(result.status).toBe('ok');
			expect(result.output).toContain('Passed');
		});

		it('should return error on failed check', async () => {
			const tool = new QCheckProjectHealthTool();
			tool['_spawn'] = () => {
				const err = new Error('Failed');
				(err as any).stdout = 'Errors found';
				(err as any).stderr = '';
				throw err;
			};

			const result = await tool.execute();
			expect(result.status).toBe('error');
			expect(result.output).toContain('Errors found');
		});
	});

	describe('QGetCoverageReportTool', () => {
		it('should return coverage summary on success', async () => {
			const tool = new QGetCoverageReportTool();
			tool['_spawn'] = () =>
				Promise.resolve({
					stdout: 'Coverage: 100%',
					stderr: '',
				});

			const result = await tool.execute();
			expect(result.summary).toContain('Coverage: 100%');
		});

		it('should return error summary on failure', async () => {
			const tool = new QGetCoverageReportTool();
			tool['_spawn'] = () => {
				throw new Error('Coverage failed');
			};

			const result = await tool.execute();
			expect(result.summary).toContain('Coverage failed');
		});
	});

	describe('QUpdateDocsTool', () => {
		it('should run build script', async () => {
			const tool = new QUpdateDocsTool();
			let capturedCmd = '';
			tool['_spawn'] = (_cmd: string, args: string[]) => {
				capturedCmd = args.join(' ');
				return Promise.resolve({ stdout: 'Built', stderr: '' });
			};

			const result = await tool.execute({ action: 'build' });
			expect(capturedCmd).toContain('docs:build');
			expect(result.stdout).toBe('Built');
		});

		it('should run clean script', async () => {
			const tool = new QUpdateDocsTool();
			let capturedCmd = '';
			tool['_spawn'] = (_cmd: string, args: string[]) => {
				capturedCmd = args.join(' ');
				return Promise.resolve({ stdout: 'Cleaned', stderr: '' });
			};

			const result = await tool.execute({ action: 'clean' });
			expect(capturedCmd).toContain('docs:clean');
			expect(result.stdout).toBe('Cleaned');
		});

		it('should handle spawn errors', async () => {
			const tool = new QUpdateDocsTool();
			tool['_spawn'] = () => {
				throw new Error('Spawn failed');
			};

			const result = await tool.execute({ action: 'build' });
			expect(result.stderr).toContain('Spawn failed');
		});
	});
});
