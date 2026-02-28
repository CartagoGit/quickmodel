import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QCreateGuidePageTool } from '../../../../src/mcp/tools/internal/create-guide-page.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';

const TMP_EN = join(
	process.cwd(),
	'tests',
	'temp_guide_page',
	'docs-vitepress',
	'en',
	'guide'
);
const TMP_ES = join(
	process.cwd(),
	'tests',
	'temp_guide_page',
	'docs-vitepress',
	'es',
	'guide'
);
const TMP_ROOT = join(process.cwd(), 'tests', 'temp_guide_page');

describe('QCreateGuidePageTool', () => {
	let tool: QCreateGuidePageTool;

	beforeEach(() => {
		rmSync(TMP_ROOT, { recursive: true, force: true });
		mkdirSync(TMP_EN, { recursive: true });
		mkdirSync(TMP_ES, { recursive: true });
		tool = new QCreateGuidePageTool();
	});

	afterEach(() => {
		rmSync(TMP_ROOT, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('create_guide_page');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	it('should create EN and ES files given valid args', async () => {
		const result = await tool.execute({
			slug: 'my-feature',
			title_en: 'My Feature',
			title_es: 'Mi Funcionalidad',
			base_path: TMP_ROOT,
		});

		expect(result.success).toBe(true);
		const enPath = join(TMP_EN, 'my-feature.md');
		const esPath = join(TMP_ES, 'my-feature.md');
		expect(existsSync(enPath)).toBe(true);
		expect(existsSync(esPath)).toBe(true);
	});

	it('should write correct EN title', async () => {
		await tool.execute({
			slug: 'my-feature',
			title_en: 'My Feature',
			title_es: 'Mi Funcionalidad',
			base_path: TMP_ROOT,
		});

		const enContent = readFileSync(join(TMP_EN, 'my-feature.md'), 'utf-8');
		expect(enContent).toContain('# My Feature');
	});

	it('should write correct ES title', async () => {
		await tool.execute({
			slug: 'my-feature',
			title_en: 'My Feature',
			title_es: 'Mi Funcionalidad',
			base_path: TMP_ROOT,
		});

		const esContent = readFileSync(join(TMP_ES, 'my-feature.md'), 'utf-8');
		expect(esContent).toContain('# Mi Funcionalidad');
	});

	it('should include description in EN page when provided', async () => {
		await tool.execute({
			slug: 'with-desc',
			title_en: 'With Desc',
			title_es: 'Con Desc',
			description_en: 'A brief description',
			base_path: TMP_ROOT,
		});

		const enContent = readFileSync(join(TMP_EN, 'with-desc.md'), 'utf-8');
		expect(enContent).toContain('A brief description');
	});

	it('should include description in ES page when provided', async () => {
		await tool.execute({
			slug: 'with-desc',
			title_en: 'With Desc',
			title_es: 'Con Desc',
			description_es: 'Una descripción breve',
			base_path: TMP_ROOT,
		});

		const esContent = readFileSync(join(TMP_ES, 'with-desc.md'), 'utf-8');
		expect(esContent).toContain('Una descripción breve');
	});

	it('should return paths of created files', async () => {
		const result = await tool.execute({
			slug: 'path-test',
			title_en: 'Path Test',
			title_es: 'Test Ruta',
			base_path: TMP_ROOT,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.en_path).toContain('path-test.md');
			expect(result.es_path).toContain('path-test.md');
		}
	});

	it('should fail if EN file already exists', async () => {
		writeFileSync(join(TMP_EN, 'existing.md'), '# Existing\n', 'utf-8');

		const result = await tool.execute({
			slug: 'existing',
			title_en: 'Existing',
			title_es: 'Existente',
			base_path: TMP_ROOT,
		});

		expect(result.success).toBe(false);
	});

	it('should fail on invalid slug', async () => {
		const result = await tool.execute({
			slug: 'INVALID SLUG!',
			title_en: 'Invalid',
			title_es: 'Inválido',
			base_path: TMP_ROOT,
		});

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('slug');
		}
	});

	it('should reject path traversal in slug', async () => {
		const result = await tool.execute({
			slug: '../../../etc/passwd',
			title_en: 'Evil',
			title_es: 'Malo',
			base_path: TMP_ROOT,
		});

		expect(result.success).toBe(false);
	});
});
