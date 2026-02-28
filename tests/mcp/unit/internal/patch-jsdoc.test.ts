import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QPatchJSDocTool } from '../../../../src/mcp/tools/internal/patch-jsdoc.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_patch_jsdoc');

const FIXTURE_WITH_JSDOC = `import { z } from '@mcp/deps';

/**
 * Original documentation for MyClass.
 * @see {@link Something} — example
 */
export class MyClass {
	constructor() {}
}

/**
 * A helper function.
 */
export function myHelper(): void {}
`;

const FIXTURE_WITHOUT_JSDOC = `import { z } from '@mcp/deps';

export class NoDocClass {
	constructor() {}
}

export function noDocFn(): string {
	return 'ok';
}
`;

describe('QPatchJSDocTool', () => {
	let tool: QPatchJSDocTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		tool = new QPatchJSDocTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('patch_jsdoc');
		expect(tool.description).toBeDefined();
	});

	it('should add JSDoc to a symbol that has none', async () => {
		const filePath = join(TMP, 'no-doc.ts');
		writeFileSync(filePath, FIXTURE_WITHOUT_JSDOC);

		const newDoc = '/**\n * My new documentation.\n */';
		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'NoDocClass',
			action: 'add',
			jsdoc: newDoc,
		});

		expect(result).toMatchObject({ success: true });
		if (result.success) {
			expect(result.linesChanged).toBeGreaterThan(0);
		}
		const updated = readFileSync(filePath, 'utf-8');
		expect(updated).toContain('My new documentation.');
	});

	it('should fail to add when JSDoc already exists', async () => {
		const filePath = join(TMP, 'has-doc.ts');
		writeFileSync(filePath, FIXTURE_WITH_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'MyClass',
			action: 'add',
			jsdoc: '/** New */',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('already has a JSDoc');
		}
	});

	it('should update existing JSDoc', async () => {
		const filePath = join(TMP, 'update-doc.ts');
		writeFileSync(filePath, FIXTURE_WITH_JSDOC);

		const updatedDoc = '/**\n * Updated documentation.\n */';
		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'MyClass',
			action: 'update',
			jsdoc: updatedDoc,
		});

		expect(result).toMatchObject({ success: true });
		const updatedContent = readFileSync(filePath, 'utf-8');
		expect(updatedContent).toContain('Updated documentation.');
		expect(updatedContent).not.toContain(
			'Original documentation for MyClass.'
		);
	});

	it('should fail to update when no JSDoc exists', async () => {
		const filePath = join(TMP, 'no-doc-update.ts');
		writeFileSync(filePath, FIXTURE_WITHOUT_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'NoDocClass',
			action: 'update',
			jsdoc: '/** Updated */',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('No existing JSDoc');
		}
	});

	it('should remove existing JSDoc', async () => {
		const filePath = join(TMP, 'remove-doc.ts');
		writeFileSync(filePath, FIXTURE_WITH_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'MyClass',
			action: 'remove',
		});

		expect(result).toMatchObject({ success: true });
		const updatedContent = readFileSync(filePath, 'utf-8');
		expect(updatedContent).not.toContain(
			'Original documentation for MyClass.'
		);
	});

	it('should fail to remove when no JSDoc exists', async () => {
		const filePath = join(TMP, 'no-doc-remove.ts');
		writeFileSync(filePath, FIXTURE_WITHOUT_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'NoDocClass',
			action: 'remove',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('No existing JSDoc');
		}
	});

	it('should return error when symbol not found', async () => {
		const filePath = join(TMP, 'missing-symbol.ts');
		writeFileSync(filePath, FIXTURE_WITHOUT_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'NonExistentSymbol',
			action: 'add',
			jsdoc: '/** New */',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('not found');
		}
	});

	it('should return error for path traversal attempt', async () => {
		const result = await tool.execute({
			file_path: '/etc/passwd',
			symbol_name: 'root',
			action: 'add',
			jsdoc: '/** Hacked */',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('traversal');
		}
	});

	it('should require jsdoc for add action', async () => {
		const filePath = join(TMP, 'req-jsdoc.ts');
		writeFileSync(filePath, FIXTURE_WITHOUT_JSDOC);

		const result = await tool.execute({
			file_path: filePath,
			symbol_name: 'NoDocClass',
			action: 'add',
		});

		expect(result).toMatchObject({ success: false });
		if (!result.success) {
			expect(result.error).toContain('jsdoc is required');
		}
	});
});
