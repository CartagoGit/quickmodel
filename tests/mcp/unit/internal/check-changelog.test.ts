import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QCheckChangelogTool } from '../../../../src/mcp/tools/internal/check-changelog.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_check_changelog');

describe('QCheckChangelogTool', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should be defined with correct metadata', () => {
		const tool = new QCheckChangelogTool();
		expect(tool).toBeDefined();
		expect(tool.name).toBe('check_changelog');
		expect(tool.description).toBeDefined();
	});

	it('should return found=true when version entry exists in CHANGELOG', async () => {
		writeFileSync(
			join(TMP, 'package.json'),
			JSON.stringify({ version: '1.2.3' })
		);
		writeFileSync(
			join(TMP, 'CHANGELOG.md'),
			'# Changelog\n\n## [1.2.3] - 2024-01-01\n\n### Added\n- new feature\n'
		);
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.found).toBe(true);
		expect(result.version).toBe('1.2.3');
	});

	it('should return found=false when version entry is missing from CHANGELOG', async () => {
		writeFileSync(
			join(TMP, 'package.json'),
			JSON.stringify({ version: '2.0.0' })
		);
		writeFileSync(
			join(TMP, 'CHANGELOG.md'),
			'# Changelog\n\n## [1.9.9] - 2023-12-01\n\n### Fixed\n- bug fix\n'
		);
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.found).toBe(false);
		expect(result.version).toBe('2.0.0');
	});

	it('should include the version from package.json in result', async () => {
		writeFileSync(
			join(TMP, 'package.json'),
			JSON.stringify({ version: '3.1.0' })
		);
		writeFileSync(join(TMP, 'CHANGELOG.md'), '## [3.1.0]');
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.version).toBe('3.1.0');
	});

	it('should return an excerpt/context when version is found', async () => {
		writeFileSync(
			join(TMP, 'package.json'),
			JSON.stringify({ version: '1.0.0' })
		);
		writeFileSync(
			join(TMP, 'CHANGELOG.md'),
			'# Changelog\n\n## [1.0.0] - 2024-06-01\n\n### Added\n- initial release\n'
		);
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.found).toBe(true);
		expect(typeof result.excerpt).toBe('string');
		expect(result.excerpt.length).toBeGreaterThan(0);
	});

	it('should return error status when package.json is missing', async () => {
		writeFileSync(join(TMP, 'CHANGELOG.md'), '# Changelog');
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.status).toBe('error');
	});

	it('should return error status when CHANGELOG.md is missing', async () => {
		writeFileSync(
			join(TMP, 'package.json'),
			JSON.stringify({ version: '1.0.0' })
		);
		const tool = new QCheckChangelogTool();
		const result = await tool.execute({ projectDir: TMP });

		expect(result.status).toBe('error');
	});
});
