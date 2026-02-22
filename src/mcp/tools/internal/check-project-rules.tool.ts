import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';

/** Short identifier exceptions matching the ESLint id-length config */
const ID_LENGTH_EXCEPTIONS = new Set([
	'_',
	'id',
	'on',
	'fs',
	'cb',
	'md',
	'ts',
	'err',
]);

/**
 * Tool to enforce project-specific coding standards and rules.
 * Checks: @Quick/@QType preference, console.log, id-length, max-params,
 * naming-convention (I prefix), and no-restricted-imports.
 */
export class QCheckProjectRulesTool extends QAbstractTool<
	z.ZodObject<{ targetDir: z.ZodOptional<z.ZodString> }>
> {
	name = 'check_project_rules';
	description =
		'Enforce internal project rules: @Quick over @QType in tests, no console.log, ' +
		'id-length (min 3 chars), max-params (max 3), naming-convention (I prefix for ' +
		'interfaces/types), and no-restricted-imports (@cartago-git/quickmodel, bare @mcp).';
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

		const absRoot = args.targetDir
			? resolve(process.cwd(), args.targetDir)
			: process.cwd();

		const safeCwd = process.cwd().endsWith(sep)
			? process.cwd()
			: process.cwd() + sep;
		const safeTarget = absRoot.endsWith(sep) ? absRoot : absRoot + sep;

		if (!safeTarget.startsWith(safeCwd)) {
			throw new Error(
				'Security Error: Target directory is outside project root.'
			);
		}

		// ── Rule 1: Tests must favor @Quick over @QType ─────────────────────
		const testDir = join(absRoot, 'tests');
		const testFiles = this.getAllFiles(testDir, '.ts');

		for (const file of testFiles) {
			const content = readFileSync(file, 'utf-8');
			if (/@QType\(/.test(content)) {
				errors.push(
					`[Rule: Prefer @Quick] Found @QType usage in test file: ${file.replace(absRoot, '')}. Please use @Quick({...}) instead.`
				);
			}
		}

		// ── Src-level rules (Rules 2-6) ──────────────────────────────────────
		const srcDir = join(absRoot, 'src');
		const srcFiles = this.getAllFiles(srcDir, '.ts');

		for (const file of srcFiles) {
			const relativePath = file.replace(absRoot, '');
			const content = readFileSync(file, 'utf-8');

			// Rule 2: No console.log in src (warn only, allow CLI/server entry points)
			if (!file.endsWith('mcp-cli.ts') && !file.endsWith('server.ts')) {
				if (content.includes('console.log')) {
					warnings.push(
						`[Rule: No Console Log] Found console.log in source file: ${relativePath}. Use a proper logger or remove debug code.`
					);
				}
			}

			// Rule 3: id-length – identifiers must be >= 3 chars (min-length)
			this.checkIdLength(content, relativePath, errors);

			// Rule 4: max-params – functions must have <= 3 positional params
			// Exception: transformers/ and core/bases/ (IQTransformer contract)
			const isTransformerFile =
				relativePath.includes(`${sep}transformers${sep}`) ||
				relativePath.includes(`${sep}core${sep}bases${sep}`);
			if (!isTransformerFile) {
				this.checkMaxParams(content, relativePath, errors);
			}

			// Rule 5: naming-convention – interfaces and type aliases need I prefix
			this.checkNamingConvention(content, relativePath, errors);

			// Rule 6: no-restricted-imports
			this.checkRestrictedImports(content, relativePath, errors);
		}

		return {
			passed: errors.length === 0,
			errors,
			warnings,
		};
	}

	// ── Rule 3 helper ─────────────────────────────────────────────────────────
	private checkIdLength(
		content: string,
		relativePath: string,
		errors: string[]
	): void {
		const lines = content.split('\n');
		let insideMultilineTemplate = false;

		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx]!;

			// Track multi-line template literal state (count unescaped backticks)
			const unescapedBackticks = (line.match(/(?<!\\)`/g) ?? []).length;
			if (unescapedBackticks % 2 !== 0) {
				insideMultilineTemplate = !insideMultilineTemplate;
			}
			if (insideMultilineTemplate) continue;

			const trimmed = line.trim();

			// Skip comment lines and decorator lines
			if (
				trimmed.startsWith('//') ||
				trimmed.startsWith('*') ||
				trimmed.startsWith('/*') ||
				trimmed.startsWith('@')
			)
				continue;

			// Strip string literals to avoid matching content inside strings
			const cleanLine = line
				.replace(/'[^']*'/g, "''")
				.replace(/"[^"]*"/g, '""')
				.replace(/`[^`]*`/g, '``');

			// Match variable declarations: const|let|var X = or X:
			const varRegex =
				/\b(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[=:]/g;
			let match: RegExpExecArray | null;

			while ((match = varRegex.exec(cleanLine)) !== null) {
				const name = match[1];
				if (name && this.isShortViolation(name)) {
					errors.push(
						`[Rule: id-length] Identifier '${name}' is too short (min 3 chars) at ${relativePath}:${idx + 1}`
					);
					break; // One violation per line is enough to flag the file
				}
			}

			// Match function params: opening ( or , followed by identifier then : or , or )
			// Only in actual function/method declarations (exclude control flow keywords)
			const controlFlow =
				/^\s*(?:if|for|while|switch|catch|return|throw|new|typeof|await|yield)\s*\(/.test(
					line
				);
			const isDeclLine =
				!controlFlow &&
				(/^\s*(?:function|async\s+function|(?:public|private|protected|static|async|override|abstract)\s)/.test(
					line
				) ||
					/^\s*\w+\s*\(/.test(line));
			if (!isDeclLine) continue;

			const paramRegex =
				/[,(]\s*([a-zA-Z_$][a-zA-Z0-9_$]*)(?:\s*[,?:)])/g;
			while ((match = paramRegex.exec(cleanLine)) !== null) {
				const name = match[1];
				if (name && this.isShortViolation(name)) {
					errors.push(
						`[Rule: id-length] Identifier '${name}' is too short (min 3 chars) at ${relativePath}:${idx + 1}`
					);
					break;
				}
			}
		}
	}

	private isShortViolation(name: string): boolean {
		if (name.length >= 3) return false;
		if (ID_LENGTH_EXCEPTIONS.has(name)) return false;
		if (name.startsWith('_')) return false;
		return true;
	}

	// ── Rule 4 helper ─────────────────────────────────────────────────────────
	private checkMaxParams(
		content: string,
		relativePath: string,
		errors: string[]
	): void {
		const lines = content.split('\n');
		let insideMultilineTemplate = false;

		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx]!;

			const unescapedBackticks = (line.match(/(?<!\\)`/g) ?? []).length;
			if (unescapedBackticks % 2 !== 0) {
				insideMultilineTemplate = !insideMultilineTemplate;
			}
			if (insideMultilineTemplate) continue;

			const trimmed = line.trim();
			if (
				trimmed.startsWith('//') ||
				trimmed.startsWith('*') ||
				trimmed.startsWith('@')
			)
				continue;

			// Only check lines that look like actual function/method declarations
			// (line must start with a declaration keyword or known access modifier)
			const isDeclLine =
				/^\s*(?:function\s+\w+|(?:public|private|protected|static|async|override|abstract)\s+(?:\w+\s+)?\w+)\s*\(/.test(
					line
				);
			if (!isDeclLine) continue;

			const funcRegex =
				/(?:function\s+\w+|(?:public|private|protected|static|async|override|abstract)\s+(?:\w+\s+)?\w+)\s*\(([^)]+)\)/g;
			let match: RegExpExecArray | null;

			while ((match = funcRegex.exec(line)) !== null) {
				const paramsStr = match[1];
				if (!paramsStr) continue;
				const paramCount = this.countParams(paramsStr);
				if (paramCount > 3) {
					errors.push(
						`[Rule: max-params] Function has ${paramCount} params (max 3, use an options object) at ${relativePath}:${idx + 1}`
					);
					break;
				}
			}
		}
	}

	private countParams(paramsStr: string): number {
		let depth = 0;
		let count = 1;
		for (const char of paramsStr) {
			if (char === '<' || char === '(' || char === '[') depth++;
			else if (char === '>' || char === ')' || char === ']') depth--;
			else if (char === ',' && depth === 0) count++;
		}
		return count;
	}

	// ── Rule 5 helper ─────────────────────────────────────────────────────────
	private checkNamingConvention(
		content: string,
		relativePath: string,
		errors: string[]
	): void {
		const lines = content.split('\n');

		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx]!;
			const trimmed = line.trim();
			if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

			// Interface without I prefix: interface Word { (where Word doesn't start with I)
			const ifaceMatch =
				/\binterface\s+([A-Z][a-zA-Z0-9_]*)(?:\s|<|\{)/.exec(line);
			if (ifaceMatch) {
				const name = ifaceMatch[1];
				if (name && !name.startsWith('I')) {
					errors.push(
						`[Rule: naming-convention] Interface '${name}' must have 'I' prefix at ${relativePath}:${idx + 1}`
					);
				}
			}

			// Type alias without I prefix: type Word = (where Word doesn't start with I)
			const typeMatch =
				/\btype\s+([A-Z][a-zA-Z0-9_]*)\s*(?:<[^=]*>)?\s*=/.exec(line);
			if (typeMatch) {
				const name = typeMatch[1];
				if (name && !name.startsWith('I')) {
					errors.push(
						`[Rule: naming-convention] Type alias '${name}' must have 'I' prefix at ${relativePath}:${idx + 1}`
					);
				}
			}
		}
	}

	// ── Rule 6 helper ─────────────────────────────────────────────────────────
	private checkRestrictedImports(
		content: string,
		relativePath: string,
		errors: string[]
	): void {
		const lines = content.split('\n');
		let insideMultilineTemplate = false;

		for (let idx = 0; idx < lines.length; idx++) {
			const line = lines[idx]!;

			const unescapedBackticks = (line.match(/(?<!\\)`/g) ?? []).length;
			if (unescapedBackticks % 2 !== 0) {
				insideMultilineTemplate = !insideMultilineTemplate;
			}
			if (insideMultilineTemplate) continue;

			const trimmed = line.trim();
			if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;

			// Only check lines that are actual import/require statements (not regex patterns or strings)
			const isImportLine =
				trimmed.startsWith('import ') ||
				trimmed.startsWith('export ') ||
				/\brequire\s*\(/.test(trimmed);
			if (!isImportLine) continue;

			// No auto-import from the published package name
			if (
				/from\s+['"]@cartago-git\/quickmodel['"]/.test(line) ||
				/require\s*\(\s*['"]@cartago-git\/quickmodel['"]\s*\)/.test(
					line
				)
			) {
				errors.push(
					`[Rule: no-restricted-imports] Auto-import from '@cartago-git/quickmodel' is forbidden at ${relativePath}:${idx + 1}. Use internal paths like '@/core/...'.`
				);
			}

			// No bare @mcp import (must specify a sub-path like @mcp/server)
			if (/from\s+['"]@mcp['"]/.test(line)) {
				errors.push(
					`[Rule: no-restricted-imports] Bare import from '@mcp' is forbidden at ${relativePath}:${idx + 1}. Specify the full path, e.g. '@mcp/server'.`
				);
			}
		}
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
		} catch (_err) {
			// Directory might not exist or be accessible
		}
		return results;
	}
}
