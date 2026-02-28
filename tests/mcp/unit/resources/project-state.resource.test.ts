/**
 * TDD Tests: QProjectStateResource
 *
 * RED phase — QProjectStateResource does not exist yet.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { QProjectStateResource } from '../../../../src/mcp/resources/internal/project-state.resource';

const TMP = join(process.cwd(), 'tests', 'temp_project_state_res');

const MOCK_PKG = JSON.stringify({ name: 'quickmodel', version: '1.2.3' });
const MOCK_INDEX =
	`export { QModel } from './core/models/quick.model';\n` +
	`export { Quick } from './core/decorators/quick.decorator';\n` +
	`export type { IQImplements } from './core/interfaces/model.interface';\n`;
const MOCK_TSCONFIG = JSON.stringify({
	compilerOptions: {
		paths: { '@/*': ['./src/*'], '@/core/*': ['./src/core/*'] },
	},
});

describe('QProjectStateResource — metadata', () => {
	it('uri is quickmodel://project/state', () => {
		const res = new QProjectStateResource(TMP);
		expect(res.uri).toBe('quickmodel://project/state');
	});

	it('name is quickmodel-project-state', () => {
		const res = new QProjectStateResource(TMP);
		expect(res.name).toBe('quickmodel-project-state');
	});

	it('mimeType is application/json', () => {
		const res = new QProjectStateResource(TMP);
		expect(res.mimeType).toBe('application/json');
	});

	it('description is a non-empty string', () => {
		const res = new QProjectStateResource(TMP);
		expect(typeof res.description).toBe('string');
		expect(res.description.length).toBeGreaterThan(10);
	});
});

describe('QProjectStateResource — read()', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(join(TMP, 'src'), { recursive: true });
		writeFileSync(join(TMP, 'package.json'), MOCK_PKG);
		writeFileSync(join(TMP, 'src', 'index.ts'), MOCK_INDEX);
		writeFileSync(join(TMP, 'tsconfig.json'), MOCK_TSCONFIG);
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns valid JSON string', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const content = await res.read();
		expect(() => JSON.parse(content)).not.toThrow();
	});

	it('includes version from package.json', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['version']).toBe('1.2.3');
	});

	it('includes changedFiles list from git diff output', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () =>
			Promise.resolve({
				stdout: 'M\tsrc/foo.ts\nA\tsrc/bar.ts\n',
				stderr: '',
			});
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const changed = parsed['changedFiles'] as string[];
		expect(changed).toContain('src/foo.ts');
		expect(changed).toContain('src/bar.ts');
	});

	it('changedFiles is empty array when git returns nothing', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['changedFiles']).toEqual([]);
	});

	it('changedFiles is empty array when git throws', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.reject(new Error('not a git repo'));
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['changedFiles']).toEqual([]);
	});

	it('includes publicExports extracted from src/index.ts', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const exports = parsed['publicExports'] as string[];
		expect(Array.isArray(exports)).toBe(true);
		expect(exports.length).toBeGreaterThan(0);
		expect(exports).toContain('QModel');
		expect(exports).toContain('Quick');
	});

	it('includes pathAliases from tsconfig.json', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const aliases = parsed['pathAliases'] as Record<string, string[]>;
		expect(aliases).toBeDefined();
		expect(aliases['@/*']).toBeDefined();
	});

	it('includes generatedAt ISO timestamp', async () => {
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(typeof parsed['generatedAt']).toBe('string');
		expect(() => new Date(parsed['generatedAt'] as string)).not.toThrow();
	});

	it('read() is fresh on every call — no stale cache', async () => {
		const res = new QProjectStateResource(TMP);
		let calls = 0;
		res['_spawnGit'] = () => {
			calls++;
			return Promise.resolve({ stdout: '', stderr: '' });
		};
		await res.read();
		await res.read();
		expect(calls).toBe(2);
	});

	it('publicExports falls back to empty array when index.ts is missing', async () => {
		rmSync(join(TMP, 'src', 'index.ts'));
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(Array.isArray(parsed['publicExports'])).toBe(true);
	});

	it('pathAliases falls back to empty object when tsconfig.json is missing', async () => {
		rmSync(join(TMP, 'tsconfig.json'));
		const res = new QProjectStateResource(TMP);
		res['_spawnGit'] = () => Promise.resolve({ stdout: '', stderr: '' });
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['pathAliases']).toEqual({});
	});
});
