import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import { join } from 'path';
import { QSearchDocsTool } from '../../src/mcp/tools/public/search-docs.tool';
import { QScaffoldFeatureTool } from '../../src/mcp/tools/internal/scaffold-feature.tool';
import { QCheckApiCompatibilityTool } from '../../src/mcp/tools/internal/check-api-compat.tool';
import { QCheckProjectRulesTool } from '../../src/mcp/tools/internal/check-project-rules.tool';

describe('MCP Tools Security', () => {
	// --- Command Injection Tests ---
	describe('QSearchDocsTool (Command Injection)', () => {
		test('should treat shell operators as literal text (spawn check)', async () => {
			const tool = new QSearchDocsTool();
			// Try to inject a command that would create a file if executed
			const maliciousQuery = 'test; touch malicious.txt;';

			// Execute the tool
			// We expect this NOT to fail, but to search for the literal string "test; touch malicious.txt;"
			// Since that string likely doesn't exist, it returns empty matches.
			// Crucially, "malicious.txt" should NOT exist.
			const result = await tool.execute({ query: maliciousQuery });

			expect(result).toBeDefined();
			expect(Array.isArray(result.matches)).toBe(true);

			// Verify payload didn't execute
			const maliciousFileExists = fs.existsSync(
				join(process.cwd(), 'malicious.txt')
			);
			expect(maliciousFileExists).toBe(false);
		});
	});

	// --- Path Traversal Tests ---
	describe('Path Traversal Prevention', () => {
		test('QScaffoldFeatureTool should reject paths outside project root', async () => {
			const tool = new QScaffoldFeatureTool();
			const traversalPath = '../../outside';

			try {
				await tool.execute({
					type: 'transformer',
					name: 'hacker',
					location: traversalPath,
				});
				// Should not reach here
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Security Error');
				expect(error.message).toContain('outside project root');
			}
		});

		test('QCheckApiCompatibilityTool should reject baseline file outside root', async () => {
			const tool = new QCheckApiCompatibilityTool();
			const traversalPath = '../../etc/passwd';

			try {
				await tool.execute({ baselineFile: traversalPath });
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Security Error');
				expect(error.message).toContain('outside project root');
			}
		});

		test('QCheckProjectRulesTool should reject target directory outside root', async () => {
			const tool = new QCheckProjectRulesTool();
			const traversalPath = '../../sensitive';

			try {
				await tool.execute({ targetDir: traversalPath });
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Security Error');
				expect(error.message).toContain('outside project root');
			}
		});

		test('QScaffoldFeatureTool should reject Sibling Directory Attack', async () => {
			const tool = new QScaffoldFeatureTool();
			// Get current directory name efficiently
			const segments = process.cwd().split(/[/\\]/);
			const currentDirName = segments[segments.length - 1] || 'root';
			// Try to access "../quickmodel-evil" which textually starts with ".../quickmodel"
			const siblingPath = `../${currentDirName}-evil`;

			try {
				await tool.execute({
					type: 'transformer',
					name: 'test',
					location: siblingPath,
				});
				expect(true).toBe(false); // Should fail
			} catch (error: any) {
				expect(error.message).toContain('Security Error');
				expect(error.message).toContain('outside project root');
			}
		});

		test('QCheckProjectRulesTool should reject Sibling Directory Attack', async () => {
			const tool = new QCheckProjectRulesTool();
			const segments = process.cwd().split(/[/\\]/);
			const currentDirName = segments[segments.length - 1] || 'root';
			const siblingPath = `../${currentDirName}-evil`;

			try {
				await tool.execute({ targetDir: siblingPath });
				expect(true).toBe(false);
			} catch (error: any) {
				expect(error.message).toContain('Security Error');
				expect(error.message).toContain('outside project root');
			}
		});
	});
});
