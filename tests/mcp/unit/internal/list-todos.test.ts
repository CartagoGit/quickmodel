import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QListTodosTool } from '../../../../src/mcp/tools/internal/list-todos.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_list_todos');

describe('QListTodosTool', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should be defined with correct metadata', () => {
		const tool = new QListTodosTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('list_todos');
		expect(tool.description).toBeDefined();
	});

	it('should find TODO comments', async () => {
		writeFileSync(
			join(TMP, 'a.ts'),
			'// TODO: fix this later\nconst x = 1;'
		);
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		expect(result.items.some((item) => item.type === 'TODO')).toBe(true);
	});

	it('should find FIXME comments', async () => {
		writeFileSync(
			join(TMP, 'b.ts'),
			'// FIXME: broken edge case\nconst y = 2;'
		);
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		expect(result.items.some((item) => item.type === 'FIXME')).toBe(true);
	});

	it('should find HACK and XXX comments', async () => {
		writeFileSync(
			join(TMP, 'c.ts'),
			'// HACK: workaround\n// XXX: review this'
		);
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		const types = result.items.map((item) => item.type);
		expect(types).toContain('HACK');
		expect(types).toContain('XXX');
	});

	it('each item should have file, line, type and text', async () => {
		writeFileSync(
			join(TMP, 'd.ts'),
			'// TODO: add tests here\nconst z = 3;'
		);
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		const item = result.items[0];
		expect(item).toBeDefined();
		expect(typeof item?.file).toBe('string');
		expect(typeof item?.line).toBe('number');
		expect(item?.type).toBe('TODO');
		expect(typeof item?.text).toBe('string');
	});

	it('should return empty items when no todos found', async () => {
		writeFileSync(join(TMP, 'clean.ts'), 'const clean = true;');
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		expect(result.items).toHaveLength(0);
	});

	it('should include total count in result', async () => {
		writeFileSync(
			join(TMP, 'multi.ts'),
			'// TODO: one\n// FIXME: two\n// HACK: three'
		);
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		expect(result.total).toBe(3);
		expect(result.total).toBe(result.items.length);
	});

	it('should scan subdirectories recursively', async () => {
		const sub = join(TMP, 'sub');
		mkdirSync(sub);
		writeFileSync(join(sub, 'deep.ts'), '// TODO: nested file');
		const tool = new QListTodosTool();
		const result = await tool.execute({ targetDir: TMP });

		expect(result.items.some((item) => item.file.includes('deep.ts'))).toBe(
			true
		);
	});

	it('collectFiles should return string paths (not Dirent objects)', () => {
		// Verifies the readdirSync { withFileTypes: false } fix.
		// If Dirent objects were returned, join(dir, dirent) would produce wrong paths.
		const { writeFileSync } = require('fs');
		const { join } = require('path');
		writeFileSync(join(TMP, 'strings-check.ts'), '// verify strings fix');
		const tool = new QListTodosTool();
		const files = (tool as any).collectFiles(TMP, ['.ts']) as unknown[];
		expect(Array.isArray(files)).toBe(true);
		expect(files.length).toBeGreaterThan(0);
		for (const entry of files) {
			// Each entry must be a plain string path
			expect(typeof entry).toBe('string');
			expect((entry as string).endsWith('.ts')).toBe(true);
		}
	});
});
