import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, isAbsolute } from 'path';

/**
 * A single deprecated symbol found in the codebase.
 * @see {@link QDeprecationTrackerTool} — tool that produces these deprecated-item records
 * @internal
 */
interface IDeprecatedItem {
	file: string;
	line: number;
	symbol: string;
	message: string;
	since?: string;
	replacement?: string;
}

/**
 * Result returned by {@link QDeprecationTrackerTool}.
 * @see {@link QDeprecationTrackerTool} — tool whose `execute` returns this shape
 * @internal
 */
interface IDeprecationTrackerResult {
	deprecated: IDeprecatedItem[];
	total: number;
	summary: string;
}

/**
 * Internal MCP tool that scans TypeScript source files for `@deprecated`
 * JSDoc tags and returns a structured list of every deprecated symbol.
 *
 * @remarks
 * For each symbol found the tool extracts:
 * - **symbol** — the name of the deprecated export
 * - **message** — the deprecation message (text after `@deprecated`)
 * - **since** — value of the `@since` tag if present in the same JSDoc block
 * - **replacement** — the link text of the first `@see` tag, if present, used
 *   as a hint for the replacement API
 *
 * @returns `{ deprecated, total, summary }`.
 *
 * @see {@link QCheckMissingJSDocsTool} — scan for exports without any JSDoc
 * @see {@link QPatchJSDocTool} — update or remove deprecated JSDoc
 * @see {@link QCheckApiCompatibilityTool} — detect breaking API changes
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QDeprecationTrackerTool extends QAbstractTool<
	z.ZodObject<{
		target_dir: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'deprecation_tracker';
	description =
		'Scan TypeScript source files for @deprecated JSDoc tags and return a structured list ' +
		'of every deprecated symbol with its message, @since version, and replacement (@see). ' +
		'Useful for auditing the public API before a major release or planning removal sprints. ' +
		'Returns { deprecated, total, summary }.';

	schema = z.object({
		target_dir: z
			.string()
			.optional()
			.describe(
				'Directory to scan (defaults to "src"). Relative to project root.'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Scans source files for `@deprecated` tags and returns structured metadata.
	 *
	 * @param args - Tool arguments.
	 * @param args.target_dir - Directory to scan (default: `src`).
	 * @returns `{ deprecated, total, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		target_dir?: string;
	}): Promise<IDeprecationTrackerResult> {
		await Promise.resolve();
		const cwd = process.cwd();
		const rawDir = args.target_dir ?? 'src';
		const targetDir = isAbsolute(rawDir) ? rawDir : join(cwd, rawDir);
		const deprecated: IDeprecatedItem[] = [];

		const tsFiles = this.collectTsFiles(targetDir);

		for (const filePath of tsFiles) {
			const relativePath = filePath.replace(cwd + '/', '');
			const content = this._fs.readFileSync(filePath, 'utf-8');
			deprecated.push(...this.extractDeprecations(relativePath, content));
		}

		const summary =
			deprecated.length === 0
				? '✅ No deprecated symbols found'
				: `Found ${deprecated.length} deprecated symbol(s) across the codebase`;

		return { deprecated, total: deprecated.length, summary };
	}

	/**
	 * Extracts all deprecated symbols from a single source file.
	 *
	 * @param relativePath - Relative file path (for reporting).
	 * @param content - File content string.
	 * @returns Array of deprecated item descriptors.
	 */
	private extractDeprecations(
		relativePath: string,
		content: string
	): IDeprecatedItem[] {
		const items: IDeprecatedItem[] = [];
		const jsdocRegex = /\/\*\*([\s\S]*?)\*\//g;
		const lines = content.split('\n');

		let jsdocMatch = jsdocRegex.exec(content);
		while (jsdocMatch !== null) {
			const jsdocBody = jsdocMatch[1] ?? '';

			if (!/@deprecated/.test(jsdocBody)) {
				jsdocMatch = jsdocRegex.exec(content);
				continue;
			}

			// Extract @deprecated message
			const deprecatedMatch = /@deprecated\s*(.*?)(?=@|\*\/|$)/s.exec(
				jsdocBody
			);
			const rawMessage = deprecatedMatch
				? (deprecatedMatch[1] ?? '').replace(/\n\s*\*\s*/g, ' ').trim()
				: '';

			// Extract @since — only at the start of a JSDoc line (* @since) to avoid
			// false positives in @deprecated message text like "no @since tag here"
			const sinceMatch = /\n[ \t]*\*[ \t]+@since\s+(\S+)/.exec(jsdocBody);
			const since = sinceMatch ? (sinceMatch[1] ?? undefined) : undefined;

			// Extract first @see — only at the start of a JSDoc line to avoid
			// false positives in deprecated message text
			const seeMatch =
				/\n[ \t]*\*[ \t]+@see\s+\{?@?link\s+([^\s}]+)/.exec(
					jsdocBody
				) ?? /\n[ \t]*\*[ \t]+@see\s+(.+?)[\n\r]/.exec(jsdocBody);
			const replacement = seeMatch
				? (seeMatch[1] ?? undefined)
				: undefined;

			// Find line number of the JSDoc opening
			const lineNum = content
				.slice(0, jsdocMatch.index ?? 0)
				.split('\n').length;

			// Find symbol name: first exported declaration after the closing */
			const afterJsdoc = content.slice(
				(jsdocMatch.index ?? 0) + jsdocMatch[0].length
			);
			const symbolMatch =
				// eslint-disable-next-line security/detect-unsafe-regex
				/(?:export\s+(?:default\s+)?(?:abstract\s+)?(?:class|function|const|interface|type|enum)\s+)(\w+)/.exec(
					afterJsdoc.trimStart()
				);
			const symbol = symbolMatch
				? (symbolMatch[1] ?? '(unknown)')
				: '(unknown)';

			// Resolve actual line number as the first non-empty line after */
			const lineAfterBlock = lines[lineNum] ?? '';
			const actualLine = lineAfterBlock.trim().startsWith('@')
				? lineNum + 2
				: lineNum + 1;

			items.push({
				file: relativePath,
				line: actualLine,
				symbol,
				message: rawMessage,
				since,
				replacement,
			});

			jsdocMatch = jsdocRegex.exec(content);
		}

		return items;
	}

	/**
	 * Recursively collects all `.ts` files (excluding `.d.ts`) under a directory.
	 *
	 * @param dir - Absolute path to the directory.
	 * @returns Array of absolute file paths.
	 */
	private collectTsFiles(dir: string): string[] {
		if (!this._fs.existsSync(dir)) {
			return [];
		}
		const result: string[] = [];
		const entries = this._fs.readdirSync(dir).map(String);
		for (const entry of entries) {
			const fullPath = join(dir, entry);
			if (this._fs.statSync(fullPath).isDirectory()) {
				result.push(...this.collectTsFiles(fullPath));
			} else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts')) {
				result.push(fullPath);
			}
		}
		return result;
	}
}
