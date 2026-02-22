import { describe, it, expect, mock, afterEach } from 'bun:test';
import { QCheckBundleSizeTool } from '../../../../src/mcp/tools/internal/check-bundle-size.tool';

describe('QCheckBundleSizeTool', () => {
	afterEach(() => {
		mock.restore();
	});

	it('should be defined with correct metadata', () => {
		const tool = new QCheckBundleSizeTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('check_bundle_size');
		expect(tool.description).toBeDefined();
	});

	it('should return status, files array, and total_bytes on success', async () => {
		const tool = new QCheckBundleSizeTool();
		tool['_spawn'] = async () => ({ stdout: '', stderr: '' });
		tool['_getDistFiles'] = async () => [
			{ file: 'index.cjs', bytes: 120000 },
			{ file: 'index.mjs', bytes: 95000 },
		];

		const result = await tool.execute({});

		expect(result.status).toBeDefined();
		expect(Array.isArray(result.files)).toBe(true);
		expect(typeof result.total_bytes).toBe('number');
	});

	it('should list individual file sizes', async () => {
		const tool = new QCheckBundleSizeTool();
		tool['_spawn'] = async () => ({ stdout: '', stderr: '' });
		tool['_getDistFiles'] = async () => [
			{ file: 'index.cjs', bytes: 50000 },
		];

		const result = await tool.execute({});

		expect(result.files[0]?.file).toBeDefined();
		expect(typeof result.files[0]?.bytes).toBe('number');
	});

	it('status should be "ok" when build succeeds', async () => {
		const tool = new QCheckBundleSizeTool();
		tool['_spawn'] = async () => ({ stdout: 'build ok', stderr: '' });
		tool['_getDistFiles'] = async () => [
			{ file: 'index.cjs', bytes: 1000 },
		];

		const result = await tool.execute({});

		expect(result.status).toBe('ok');
	});

	it('status should be "error" when build fails', async () => {
		const tool = new QCheckBundleSizeTool();
		tool['_spawn'] = async () => {
			throw Object.assign(new Error('build failed'), {
				stdout: '',
				stderr: 'build error',
			});
		};

		const result = await tool.execute({});

		expect(result.status).toBe('error');
	});

	it('should include a summary string', async () => {
		const tool = new QCheckBundleSizeTool();
		tool['_spawn'] = async () => ({ stdout: '', stderr: '' });
		tool['_getDistFiles'] = async () => [
			{ file: 'index.cjs', bytes: 123456 },
		];

		const result = await tool.execute({});

		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});
});
