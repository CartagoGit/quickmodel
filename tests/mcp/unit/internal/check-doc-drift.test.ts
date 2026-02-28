import { describe, it, expect } from 'bun:test';
import { QCheckDocDriftTool } from '../../../../src/mcp/tools/internal/check-doc-drift.tool';

describe('QCheckDocDriftTool', () => {
	it('should have correct metadata', () => {
		const tool = new QCheckDocDriftTool();
		expect(tool.name).toBe('check_doc_drift');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	it('should return passed:true when git returns no changed files', async () => {
		const tool = new QCheckDocDriftTool();
		// Inject a mock spawn that returns empty output (no changed files)
		tool['_spawn'] = () => Promise.resolve({ stdout: '', stderr: '' });

		const result = await tool.execute({ target_dir: 'src' });
		expect(result.passed).toBe(true);
		expect(result.driftedFiles).toHaveLength(0);
	});

	it('should return passed:true when git command fails (no commits)', async () => {
		const tool = new QCheckDocDriftTool();
		// Inject a mock spawn that throws (simulates no git repo)
		tool['_spawn'] = () => Promise.reject(new Error('not a git repo'));

		const result = await tool.execute({ target_dir: 'src' });
		expect(result.passed).toBe(true);
		expect(result.summary).toContain('No git diff available');
	});

	it('should flag files with code changes but no JSDoc changes', async () => {
		const tool = new QCheckDocDriftTool();
		tool['_spawn'] = (_cmd: string, spawnArgs: string[]) => {
			// First call: list changed files
			if (spawnArgs.includes('--name-only')) {
				return Promise.resolve({
					stdout: 'src/core/user.model.ts\n',
					stderr: '',
				});
			}
			// Second call: file diff with only code changes (no JSDoc changes)
			return Promise.resolve({
				stdout: [
					'diff --git a/src/core/user.model.ts b/src/core/user.model.ts',
					'+  public name: string = "";',
					'+  public email: string = "";',
					'+  public age: number = 0;',
				].join('\n'),
				stderr: '',
			});
		};

		const result = await tool.execute({ target_dir: 'src' });
		expect(result.driftedFiles.length).toBeGreaterThan(0);
		expect(result.passed).toBe(false);
		expect(result.driftedFiles[0]?.file).toBe('src/core/user.model.ts');
	});

	it('should not flag files where JSDoc was also updated', async () => {
		const tool = new QCheckDocDriftTool();
		tool['_spawn'] = (_cmd: string, spawnArgs: string[]) => {
			if (spawnArgs.includes('--name-only')) {
				return Promise.resolve({
					stdout: 'src/core/user.model.ts\n',
					stderr: '',
				});
			}
			return Promise.resolve({
				stdout: [
					'diff --git a/src/core/user.model.ts b/src/core/user.model.ts',
					'+  public name: string = "";',
					'+  /**',
					'+   * The user name.',
					'+   */',
				].join('\n'),
				stderr: '',
			});
		};

		const result = await tool.execute({ target_dir: 'src' });
		expect(result.driftedFiles).toHaveLength(0);
		expect(result.passed).toBe(true);
	});

	it('should report total changed file count', async () => {
		const tool = new QCheckDocDriftTool();
		tool['_spawn'] = (_cmd: string, spawnArgs: string[]) => {
			if (spawnArgs.includes('--name-only')) {
				return Promise.resolve({
					stdout: 'src/a.ts\nsrc/b.ts\n',
					stderr: '',
				});
			}
			return Promise.resolve({ stdout: '', stderr: '' });
		};

		const result = await tool.execute({ target_dir: 'src' });
		expect(result.total).toBe(2);
	});

	it('should return summary string', async () => {
		const tool = new QCheckDocDriftTool();
		tool['_spawn'] = () => Promise.resolve({ stdout: '', stderr: '' });

		const result = await tool.execute({ target_dir: 'src' });
		expect(typeof result.summary).toBe('string');
	});
});
