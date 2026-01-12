import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { QCheckProjectRulesTool } from '../../../src/mcp/tools/rule-tools';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('QCheckProjectRulesTool', () => {
	const tool = new QCheckProjectRulesTool();
	// Use a completely separate temp dir as "Mock Project Root"
	const mockProjectRoot = join(process.cwd(), 'tests', 'temp_mock_project');
	const mockTestsDir = join(mockProjectRoot, 'tests');

	beforeEach(() => {
		// Clean start - force delete ignores missing files
		rmSync(mockProjectRoot, { recursive: true, force: true });
		mkdirSync(mockTestsDir, { recursive: true });
	});

	afterEach(() => {
		// Cleanup
		rmSync(mockProjectRoot, { recursive: true, force: true });
	});

	it('should pass given no violations', async () => {
		// Empty tests dir = no violations
		const result = await tool.execute({ targetDir: mockProjectRoot });
		expect(result.passed).toBe(true);
		expect(result.errors.length).toBe(0);
	});

	it('should detect @QType in test files', async () => {
		const violationFile = join(mockTestsDir, 'violation.test.ts');
		writeFileSync(
			violationFile,
			`
            import { QType } from '...';
            class Test {
                @QType('string') // Violation
                prop: string;
            }
        `
		);

		const result = await tool.execute({ targetDir: mockProjectRoot });
		expect(result.passed).toBe(false);
		const hasError = result.errors.some(
			(e) =>
				e.includes('Found @QType usage') &&
				e.includes('violation.test.ts')
		);
		expect(hasError).toBe(true);
	});
});
