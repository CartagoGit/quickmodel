// @quickmodel-rule-ignore: prefer-quick — @QType appears as a string literal inside a test fixture that verifies the validate-examples tool detects it; not an actual decorator usage
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QValidateExamplesTool } from '../../../../src/mcp/tools/internal/validate-examples.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_validate_examples');

describe('QValidateExamplesTool', () => {
	let tool: QValidateExamplesTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		tool = new QValidateExamplesTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('validate_examples');
		expect(tool.description).toBeDefined();
	});

	it('should pass when no @example blocks exist', async () => {
		writeFileSync(join(TMP, 'clean.ts'), `export class CleanClass {}\n`);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.passed).toBe(true);
		expect(result.issues).toHaveLength(0);
		expect(result.totalExamples).toBe(0);
	});

	it('should detect @QType usage in @example block (error)', async () => {
		const content = `
/**
 * @example
 * \`\`\`typescript
 * @QType({ field: Date })
 * class Foo extends QModel<IFoo> {}
 * \`\`\`
 */
export class FooBarClass {}
`;
		writeFileSync(join(TMP, 'qtype-example.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		expect(
			result.issues.some(
				(iss) =>
					iss.severity === 'error' && iss.issue.includes('@QType')
			)
		).toBe(true);
		expect(result.passed).toBe(false);
	});

	it('should detect barrel import from quickmodel in @example block (error)', async () => {
		const content = `
/**
 * @example
 * \`\`\`typescript
 * import { QModel } from 'quickmodel';
 * \`\`\`
 */
export function badImportFn() {}
`;
		writeFileSync(join(TMP, 'barrel-import.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		expect(
			result.issues.some(
				(iss) =>
					iss.severity === 'error' && iss.issue.includes('barrel')
			)
		).toBe(true);
		expect(result.passed).toBe(false);
	});

	it('should detect console.log in @example block (warning)', async () => {
		const content = `
/**
 * @example
 * \`\`\`typescript
 * const instance = MyModel.create({});
 * console.log(instance.serialize());
 * \`\`\`
 */
export function withConsoleFn() {}
`;
		writeFileSync(join(TMP, 'console-example.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		const warnIssues = result.issues.filter(
			(iss) => iss.severity === 'warning'
		);
		expect(warnIssues.length).toBeGreaterThan(0);
		// Should pass (no errors)
		expect(result.passed).toBe(true);
	});

	it('should pass with a clean @example block', async () => {
		const content = `
/**
 * @example
 * \`\`\`typescript
 * const instance = MyValidModel.create({ id: 1, name: 'Alice' });
 * const serialized = instance.serialize();
 * \`\`\`
 */
export function cleanExampleFn() {}
`;
		writeFileSync(join(TMP, 'clean-example.ts'), content);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.passed).toBe(true);
		expect(
			result.issues.filter((iss) => iss.severity === 'error')
		).toHaveLength(0);
	});

	it('should count total examples across multiple files', async () => {
		const contentA = `\n/**\n * @example\n * something good\n */\nexport function funcA() {}\n`;
		const contentB = `\n/**\n * @example\n * something else\n */\nexport function funcB() {}\n`;
		writeFileSync(join(TMP, 'file-a.ts'), contentA);
		writeFileSync(join(TMP, 'file-b.ts'), contentB);

		const result = await tool.execute({ target_dir: TMP });
		expect(result.totalExamples).toBeGreaterThanOrEqual(2);
	});

	it('should return summary string', async () => {
		const result = await tool.execute({ target_dir: TMP });
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});

	it('should handle non-existent directory gracefully', async () => {
		const result = await tool.execute({ target_dir: '/non/existent/path' });
		expect(result.passed).toBe(true);
		expect(result.totalExamples).toBe(0);
	});
});
