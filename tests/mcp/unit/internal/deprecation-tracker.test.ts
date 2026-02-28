import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QDeprecationTrackerTool } from '../../../../src/mcp/tools/internal/deprecation-tracker.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_deprecation_tracker');

describe('QDeprecationTrackerTool', () => {
	let tool: QDeprecationTrackerTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		tool = new QDeprecationTrackerTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('deprecation_tracker');
		expect(tool.description).toBeDefined();
	});

	it('should return empty results when no @deprecated tags found', async () => {
		writeFileSync(join(TMP, 'clean.ts'), `export class CleanClass {}\n`);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.deprecated).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it('should detect a @deprecated symbol', async () => {
		const content = `
/**
 * @deprecated Use NewClass instead.
 * @since 1.2.0
 */
export class OldClass {
	constructor() {}
}
`;
		writeFileSync(join(TMP, 'deprecated.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.total).toBeGreaterThanOrEqual(1);
		expect(result.deprecated.some((dep) => dep.symbol === 'OldClass')).toBe(
			true
		);
	});

	it('should extract @deprecated message', async () => {
		const content = `
/**
 * @deprecated Use newHelper() instead — it handles edge cases better.
 */
export function oldHelper(): void {}
`;
		writeFileSync(join(TMP, 'dep-fn.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		const found = result.deprecated.find(
			(dep) => dep.symbol === 'oldHelper'
		);
		expect(found?.message).toContain('Use newHelper()');
	});

	it('should extract @since tag when present', async () => {
		const content = `
/**
 * @deprecated Will be removed in v2.0.
 * @since 1.5.0
 */
export interface IOldInterface {
	id: number;
}
`;
		writeFileSync(join(TMP, 'dep-interface.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		const found = result.deprecated.find(
			(dep) => dep.symbol === 'IOldInterface'
		);
		expect(found?.since).toBe('1.5.0');
	});

	it('should extract @see as replacement hint', async () => {
		const content = `
/**
 * @deprecated Use QNewTool instead.
 * @see {@link QNewTool}
 */
export class QOldTool {
	run(): void {}
}
`;
		writeFileSync(join(TMP, 'dep-tool.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		const found = result.deprecated.find(
			(dep) => dep.symbol === 'QOldTool'
		);
		expect(found?.replacement).toContain('QNewTool');
	});

	it('should detect multiple deprecated symbols across files', async () => {
		writeFileSync(
			join(TMP, 'file-a.ts'),
			`\n/** @deprecated Legacy A */\nexport const legacyA = 'old';\n`
		);
		writeFileSync(
			join(TMP, 'file-b.ts'),
			`\n/** @deprecated Legacy B */\nexport function legacyB(): void {}\n`
		);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.total).toBeGreaterThanOrEqual(2);
	});

	it('should return correct summary string', async () => {
		const result = await tool.execute({ target_dir: TMP });
		expect(typeof result.summary).toBe('string');
		expect(result.summary).toContain('No deprecated symbols found');
	});

	it('should handle non-existent directory gracefully', async () => {
		const result = await tool.execute({
			target_dir: '/tmp/non-existent-qm-test',
		});
		expect(result.deprecated).toHaveLength(0);
		expect(result.total).toBe(0);
	});

	it('should not include @since when absent', async () => {
		const content = `
/**
 * @deprecated Old stuff, no @since tag here.
 */
export function noSinceFn(): void {}
`;
		writeFileSync(join(TMP, 'no-since.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		const found = result.deprecated.find(
			(dep) => dep.symbol === 'noSinceFn'
		);
		expect(found?.since).toBeUndefined();
	});
});
