import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

/**
 * Tool to enforce project-specific coding standards and rules.
 */
export class QCheckProjectRulesTool extends QAbstractTool<
	z.ZodObject<{ targetDir: z.ZodOptional<z.ZodString> }>
> {
	name = 'check_project_rules';
	description =
		'Enforce internal project rules: use @Quick over @QType in tests, and no console.log.';
	schema = z.object({
		targetDir: z
			.string()
			.optional()
			.describe('Directory to scan (defaults to project root)'),
	});

	async execute(args: { targetDir?: string }): Promise<{
		passed: boolean;
		errors: string[];
		warnings: string[];
	}> {
		await Promise.resolve();
		const errors: string[] = [];
		const warnings: string[] = [];
		const rootDir = args.targetDir
			? join(process.cwd(), args.targetDir) // Fix: always relative to cwd first or resolve absolute?
			: process.cwd();

		// Better fix: Treat args.targetDir as potentially absolute or relative, resolve it, and check start

		const absRoot = args.targetDir
			? resolve(process.cwd(), args.targetDir)
			: process.cwd();

		// Suffix with separator to ensure we don't match sibling folders sharing a prefix
		// e.g. /opt/project vs /opt/project-evil
		const safeCwd = process.cwd().endsWith(sep) ? process.cwd() : process.cwd() + sep;
		const safeTarget = absRoot.endsWith(sep) ? absRoot : absRoot + sep;

		if (!safeTarget.startsWith(safeCwd)) {
			throw new Error(
				'Security Error: Target directory is outside project root.'
			);
		}

		// Rule 1: Tests must favor @Quick over @QType
		const testDir = join(absRoot, 'tests');
		const testFiles = this.getAllFiles(testDir, '.ts');

		for (const file of testFiles) {
			const content = readFileSync(file, 'utf-8');
			// Simple regex check - can be improved with AST if needed, but text scan is fast and usually sufficient
			if (content.includes('@QType')) {
				// Allow @QType ONLY if @Quick is also present (migration phase or specific property override)
				// BUT rule says "favor @Quick", strict interpretation: don't use @QType if possible.
				// Let's flag usage of @QType as a warning/error.
				// User said: "en varios de los tests nuevos has usado qtype, usa quick...." -> implies forced preference.
				// Let's report it as an error for new tests, but maybe warning for existing?
				// For now, let's treat it as an error to be strict.

				// Exemption: comments
				if (content.includes('@QType')) {
					// Check if it's strictly used as a decorator
					if (/@QType\(/.test(content)) {
						errors.push(
							`[Rule: Prefer @Quick] Found @QType usage in test file: ${file.replace(rootDir, '')}. Please use @Quick({...}) instead.`
						);
					}
				}
			}
		}

		// Rule 2: No console.log in src (except maybe CLI entry points)
		const srcDir = join(absRoot, 'src');
		const srcFiles = this.getAllFiles(srcDir, '.ts');

		for (const file of srcFiles) {
			// Skip tools that might legitimately log (like CLI tools or server startup)
			// But generally library code shouldn't log.
			if (file.endsWith('mcp-cli.ts') || file.endsWith('server.ts'))
				continue;

			const content = readFileSync(file, 'utf-8');
			if (content.includes('console.log')) {
				warnings.push(
					`[Rule: No Console Log] Found console.log in source file: ${file.replace(absRoot, '')}. Use a proper logger or remove debug code.`
				);
			}
		}

		return {
			passed: errors.length === 0,
			errors,
			warnings,
		};
	}

	private getAllFiles(dir: string, extension: string): string[] {
		let results: string[] = [];
		try {
			const list = readdirSync(dir);
			for (const file of list) {
				const filepath = join(dir, file);
				const stat = statSync(filepath);
				if (stat && stat.isDirectory()) {
					results = results.concat(
						this.getAllFiles(filepath, extension)
					);
				} else {
					if (file.endsWith(extension)) {
						results.push(filepath);
					}
				}
			}
		} catch (_e) {
			// Directory might not exist or be accessible
		}
		return results;
	}
}
