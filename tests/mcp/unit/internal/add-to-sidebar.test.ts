import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QAddToSidebarTool } from '../../../../src/mcp/tools/internal/add-to-sidebar.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_add_sidebar');
const CONFIG_PATH = join(TMP, 'config.ts');

// Minimal VitePress config fixture with same indentation as the real config.ts
const FIXTURE_CONFIG = `import { defineConfig } from 'vitepress';
export default defineConfig({
	locales: {
		en: {
			themeConfig: {
				sidebar: {
					'/en/guide/': [
						{
							text: 'Core',
							link: '/en/guide/qmodel',
							items: [
								{
									text: 'QModel',
									link: '/en/guide/qmodel',
								},
								{
									text: 'Serialization',
									link: '/en/guide/serialization',
								},
							],
						},
						{
							text: 'Validation',
							link: '/en/guide/validation',
							items: [
								{
									text: 'Validation (@QRule)',
									link: '/en/guide/validation',
								},
								{
									text: '⚡ Benchmarks',
									link: '/en/guide/validation#performance',
								},
							],
						},
					],
				},
			},
		},
		es: {
			themeConfig: {
				sidebar: {
					'/es/guide/': [
						{
							text: 'Núcleo',
							link: '/es/guide/qmodel',
							items: [
								{
									text: 'QModel',
									link: '/es/guide/qmodel',
								},
							],
						},
						{
							text: 'Validación',
							link: '/es/guide/validation',
							items: [
								{
									text: 'Validación (@QRule)',
									link: '/es/guide/validation',
								},
								{
									text: '⚡ Benchmarks',
									link: '/es/guide/validation#rendimiento',
								},
							],
						},
					],
				},
			},
		},
	},
});
`;

describe('QAddToSidebarTool', () => {
	let tool: QAddToSidebarTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		writeFileSync(CONFIG_PATH, FIXTURE_CONFIG, 'utf-8');
		tool = new QAddToSidebarTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('add_to_sidebar');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	it('should add entry to EN Core section (no benchmark)', async () => {
		const result = await tool.execute({
			slug: 'my-page',
			text_en: 'My Page',
			text_es: 'Mi Página',
			section_en: 'Core',
			section_es: 'Núcleo',
			config_path: CONFIG_PATH,
		});

		expect(result.success).toBe(true);
		const content = readFileSync(CONFIG_PATH, 'utf-8');
		expect(content).toContain(`link: '/en/guide/my-page'`);
		expect(content).toContain(`text: 'My Page'`);
	});

	it('should add entry to ES section', async () => {
		const result = await tool.execute({
			slug: 'mi-pagina',
			text_en: 'My Page',
			text_es: 'Mi Página',
			section_en: 'Core',
			section_es: 'Núcleo',
			config_path: CONFIG_PATH,
		});

		expect(result.success).toBe(true);
		const content = readFileSync(CONFIG_PATH, 'utf-8');
		expect(content).toContain(`link: '/es/guide/mi-pagina'`);
		expect(content).toContain(`text: 'Mi Página'`);
	});

	it('should insert EN entry BEFORE ⚡ Benchmarks when present', async () => {
		await tool.execute({
			slug: 'new-validator',
			text_en: 'New Validator',
			text_es: 'Nuevo Validador',
			section_en: 'Validation',
			section_es: 'Validación',
			config_path: CONFIG_PATH,
		});

		const content = readFileSync(CONFIG_PATH, 'utf-8');
		const benchmarkIdx = content.indexOf('⚡ Benchmarks');
		const newEntryIdx = content.indexOf(`link: '/en/guide/new-validator'`);
		expect(newEntryIdx).toBeGreaterThan(0);
		// New entry must appear BEFORE the benchmark
		expect(newEntryIdx).toBeLessThan(benchmarkIdx);
	});

	it('should insert ES entry BEFORE ⚡ Benchmarks when present', async () => {
		await tool.execute({
			slug: 'nuevo-validador',
			text_en: 'New Validator',
			text_es: 'Nuevo Validador',
			section_en: 'Validation',
			section_es: 'Validación',
			config_path: CONFIG_PATH,
		});

		const content = readFileSync(CONFIG_PATH, 'utf-8');
		const enBenchIdx = content.indexOf('validation#performance');
		const esBenchIdx = content.indexOf('validation#rendimiento');
		const esEntryIdx = content.indexOf(`link: '/es/guide/nuevo-validador'`);
		// ES entry must appear after EN benchmark and before ES benchmark
		expect(esEntryIdx).toBeGreaterThan(enBenchIdx);
		expect(esEntryIdx).toBeLessThan(esBenchIdx);
	});

	it('should return error when section not found', async () => {
		const result = await tool.execute({
			slug: 'orphan',
			text_en: 'Orphan',
			text_es: 'Huérfano',
			section_en: 'NonExistentSection',
			section_es: 'SecciónInexistente',
			config_path: CONFIG_PATH,
		});

		expect(result.success).toBe(false);
	});

	it('should return error when config file not found', async () => {
		const result = await tool.execute({
			slug: 'test-page',
			text_en: 'Test',
			text_es: 'Test',
			section_en: 'Core',
			section_es: 'Núcleo',
			config_path: join(TMP, 'nonexistent.ts'),
		});

		expect(result.success).toBe(false);
	});

	it('should not duplicate an already-present link', async () => {
		await tool.execute({
			slug: 'unique',
			text_en: 'Unique',
			text_es: 'Único',
			section_en: 'Core',
			section_es: 'Núcleo',
			config_path: CONFIG_PATH,
		});

		// Run again — should return an error about duplicate
		const second = await tool.execute({
			slug: 'unique',
			text_en: 'Unique',
			text_es: 'Único',
			section_en: 'Core',
			section_es: 'Núcleo',
			config_path: CONFIG_PATH,
		});

		expect(second.success).toBe(false);
	});
});
