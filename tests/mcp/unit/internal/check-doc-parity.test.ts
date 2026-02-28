import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QCheckDocParityTool } from '../../../../src/mcp/tools/internal/check-doc-parity.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_check_doc_parity');

describe('QCheckDocParityTool', () => {
	let tool: QCheckDocParityTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(join(TMP, 'docs-vitepress', 'en', 'guide'), {
			recursive: true,
		});
		mkdirSync(join(TMP, 'docs-vitepress', 'es', 'guide'), {
			recursive: true,
		});
		mkdirSync(join(TMP, 'docs-vitepress', '.vitepress'), {
			recursive: true,
		});
		tool = new QCheckDocParityTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('check_doc_parity');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	it('should pass when EN and ES have identical pages', async () => {
		writeFileSync(
			join(TMP, 'docs-vitepress', 'en', 'guide', 'qmodel.md'),
			'# QModel'
		);
		writeFileSync(
			join(TMP, 'docs-vitepress', 'es', 'guide', 'qmodel.md'),
			'# QModel'
		);

		const result = await tool.execute({ base_path: TMP });
		expect(result.passed).toBe(true);
		expect(result.parityIssues).toHaveLength(0);
	});

	it('should detect page in EN missing from ES', async () => {
		writeFileSync(
			join(TMP, 'docs-vitepress', 'en', 'guide', 'validation.md'),
			'# Validation'
		);
		// No ES counterpart

		const result = await tool.execute({ base_path: TMP });
		expect(result.passed).toBe(false);
		expect(
			result.parityIssues.some(
				(iss) => iss.file === 'validation.md' && iss.locale === 'en'
			)
		).toBe(true);
	});

	it('should detect page in ES missing from EN', async () => {
		writeFileSync(
			join(TMP, 'docs-vitepress', 'es', 'guide', 'formularios.md'),
			'# Formularios'
		);
		// No EN counterpart

		const result = await tool.execute({ base_path: TMP });
		expect(result.passed).toBe(false);
		expect(
			result.parityIssues.some(
				(iss) => iss.file === 'formularios.md' && iss.locale === 'es'
			)
		).toBe(true);
	});

	it('should flag sidebar link pointing to non-existent file', async () => {
		const configContent = `export default defineConfig({
			locales: {
				en: { themeConfig: { sidebar: { '/en/guide/': [{ text: 'Ghost', link: '/en/guide/ghost-page' }] } } },
				es: { themeConfig: { sidebar: { '/es/guide/': [] } } },
			}
		});`;
		writeFileSync(
			join(TMP, 'docs-vitepress', '.vitepress', 'config.ts'),
			configContent
		);

		const result = await tool.execute({ base_path: TMP });
		expect(
			result.sidebarIssues.some((iss) => iss.link.includes('ghost-page'))
		).toBe(true);
	});

	it('should not flag sidebar links with fragment anchors', async () => {
		const configContent = `export default defineConfig({
			locales: {
				en: { themeConfig: { sidebar: { '/en/guide/': [{ text: 'Bench', link: '/en/guide/perf#benchmarks' }] } } },
			}
		});`;
		writeFileSync(
			join(TMP, 'docs-vitepress', '.vitepress', 'config.ts'),
			configContent
		);
		writeFileSync(
			join(TMP, 'docs-vitepress', 'en', 'guide', 'perf.md'),
			'# Perf'
		);

		const result = await tool.execute({ base_path: TMP });
		expect(result.sidebarIssues).toHaveLength(0);
	});

	it('should not flag sidebar links for valid existing files', async () => {
		writeFileSync(
			join(TMP, 'docs-vitepress', 'en', 'guide', 'qmodel.md'),
			'# QModel'
		);
		const configContent = `export default defineConfig({
			locales: {
				en: { themeConfig: { sidebar: { '/en/guide/': [{ text: 'QModel', link: '/en/guide/qmodel' }] } } },
			}
		});`;
		writeFileSync(
			join(TMP, 'docs-vitepress', '.vitepress', 'config.ts'),
			configContent
		);

		const result = await tool.execute({ base_path: TMP });
		expect(result.sidebarIssues).toHaveLength(0);
	});

	it('should return summary string', async () => {
		const result = await tool.execute({ base_path: TMP });
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should handle missing docs-vitepress directory gracefully', async () => {
		rmSync(join(TMP, 'docs-vitepress'), { recursive: true, force: true });

		const result = await tool.execute({ base_path: TMP });
		expect(result.parityIssues).toHaveLength(0);
		expect(result.sidebarIssues).toHaveLength(0);
	});
});
