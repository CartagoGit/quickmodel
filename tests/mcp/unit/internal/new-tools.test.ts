import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
	QScaffoldFeatureTool,
	QCheckApiCompatibilityTool,
	QBenchmarkPerformanceTool,
} from '../../../../src/mcp/tools/internal';
import { join } from 'path';
import { existsSync, rmSync, mkdirSync } from 'fs';

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

			expect(result.message).toContain('complete');
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

			expect(result.message).toContain('complete');
			const expPath = join(process.cwd(), loc, 'my-new-tool.tool.ts');
			expect(existsSync(expPath)).toBe(true);
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
			expect(result.changes.some((c) => c.includes('DeletedClass'))).toBe(
				true
			);
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
