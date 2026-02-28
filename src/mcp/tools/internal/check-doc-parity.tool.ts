import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, resolve, extname, basename } from 'path';

/**
 * A missing-pair issue between EN and ES documentation pages.
 * @see {@link QCheckDocParityTool} — tool that produces these parity issues
 * @internal
 */
interface IParityIssue {
	file: string;
	locale: 'en' | 'es';
	issue: string;
}

/**
 * A sidebar entry whose corresponding `.md` file does not exist on disk.
 * @see {@link QCheckDocParityTool} — tool that produces these sidebar issues
 * @internal
 */
interface ISidebarIssue {
	link: string;
	issue: string;
}

/**
 * Result returned by {@link QCheckDocParityTool}.
 * @see {@link QCheckDocParityTool} — tool whose `execute` returns this shape
 * @internal
 */
interface ICheckDocParityResult {
	parityIssues: IParityIssue[];
	sidebarIssues: ISidebarIssue[];
	passed: boolean;
	summary: string;
}

/**
 * Internal MCP tool that audits documentation parity between the English and
 * Spanish VitePress guide pages.
 *
 * @remarks
 * Performs two checks:
 *
 * 1. **Parity check** — every `.md` file under `docs-vitepress/en/guide/` must
 *    have a counterpart under `docs-vitepress/es/guide/` and vice-versa.
 * 2. **Sidebar integrity check** — every link registered in
 *    `docs-vitepress/.vitepress/config.ts` must resolve to a real `.md` file
 *    on disk. Orphan entries (broken links in the nav) are flagged here.
 *
 * @returns `{ parityIssues, sidebarIssues, passed, summary }` — `passed` is
 * `true` only when both checks find zero issues.
 *
 * @see {@link QCreateGuidePageTool} — create missing EN+ES page pairs
 * @see {@link QAddToSidebarTool} — add sidebar entries after creating pages
 * @see {@link QSyncDocsTool} — regenerate auto-generated reference pages
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCheckDocParityTool extends QAbstractTool<
	z.ZodObject<{
		base_path: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'check_doc_parity';
	description =
		'Audit documentation parity between EN and ES VitePress guide pages. ' +
		'Reports: (1) .md files that exist in one locale but not the other, ' +
		'(2) sidebar entries in config.ts whose .md file does not exist on disk. ' +
		'Run this before any doc-related PR to catch missing translations or broken nav links.';

	schema = z.object({
		base_path: z
			.string()
			.optional()
			.describe(
				'Override project root (defaults to process.cwd()). Used in tests.'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Scans guide pages and sidebar config for EN/ES parity issues.
	 *
	 * @param args - Tool arguments.
	 * @param args.base_path - Optional override for the project root path.
	 * @returns `{ parityIssues, sidebarIssues, passed, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QCreateGuidePageTool} — fix parity issues by creating the missing page
	 */
	async execute(args: {
		base_path?: string;
	}): Promise<ICheckDocParityResult> {
		await Promise.resolve();
		const cwd = args.base_path ?? process.cwd();
		const enDir = join(cwd, 'docs-vitepress', 'en', 'guide');
		const esDir = join(cwd, 'docs-vitepress', 'es', 'guide');
		const configPath = join(
			cwd,
			'docs-vitepress',
			'.vitepress',
			'config.ts'
		);

		const parityIssues: IParityIssue[] = [];
		const sidebarIssues: ISidebarIssue[] = [];

		// ── 1. Parity check ────────────────────────────────────────────────
		const enFiles = this.listMdFiles(enDir);
		const esFiles = this.listMdFiles(esDir);

		const enSet = new Set(enFiles);
		const esSet = new Set(esFiles);

		for (const enFile of enFiles) {
			if (!esSet.has(enFile)) {
				parityIssues.push({
					file: enFile,
					locale: 'en',
					issue: `exists in en/guide/ but missing in es/guide/`,
				});
			}
		}

		for (const esFile of esFiles) {
			if (!enSet.has(esFile)) {
				parityIssues.push({
					file: esFile,
					locale: 'es',
					issue: `exists in es/guide/ but missing in en/guide/`,
				});
			}
		}

		// ── 2. Sidebar integrity check ─────────────────────────────────────
		if (this._fs.existsSync(configPath)) {
			const configContent = this._fs.readFileSync(configPath, 'utf-8');
			const links = this.extractSidebarLinks(configContent);

			for (const link of links) {
				const filePath = this.linkToFilePath(cwd, link);
				if (filePath !== null && !this._fs.existsSync(filePath)) {
					sidebarIssues.push({
						link,
						issue: `sidebar link does not resolve to a file: ${filePath}`,
					});
				}
			}
		}

		const totalIssues = parityIssues.length + sidebarIssues.length;
		const passed = totalIssues === 0;
		const summary = passed
			? `✅ Documentation parity OK — ${enFiles.length} EN pages, ${esFiles.length} ES pages, sidebar clean`
			: `❌ Found ${parityIssues.length} parity issue(s) and ${sidebarIssues.length} sidebar issue(s)`;

		return { parityIssues, sidebarIssues, passed, summary };
	}

	/**
	 * Lists all `.md` filenames (without directory prefix) in a guide directory.
	 *
	 * @param dir - Absolute path to the guide directory.
	 * @returns Array of filename strings (e.g. `['qmodel.md', 'validation.md']`).
	 */
	private listMdFiles(dir: string): string[] {
		if (!this._fs.existsSync(dir)) {
			return [];
		}
		return this._fs
			.readdirSync(dir)
			.map(String)
			.filter((filePath) => extname(filePath) === '.md')
			.map((filePath) => basename(filePath));
	}

	/**
	 * Extracts all sidebar link values from a VitePress `config.ts` string
	 * using a regex that targets the `link:` properties inside sidebar arrays.
	 *
	 * @param content - Raw text content of the VitePress config file.
	 * @returns Deduplicated array of link strings (e.g. `['/en/guide/qmodel']`).
	 */
	private extractSidebarLinks(content: string): string[] {
		const linkRegex = /link:\s*['"]([^'"]+)['"]/g;
		const links: string[] = [];
		let match = linkRegex.exec(content);
		while (match !== null) {
			links.push(match[1] as string);
			match = linkRegex.exec(content);
		}
		return [...new Set(links)];
	}

	/**
	 * Converts a sidebar link string to an absolute file path.
	 *
	 * @param cwd - Project root directory.
	 * @param link - Link string from the sidebar config (e.g. `/en/guide/qmodel`).
	 * @returns Absolute path to the expected `.md` file, or `null` when the
	 * link contains a fragment (`#`) or cannot be mapped to a guide file.
	 */
	private linkToFilePath(cwd: string, link: string): string | null {
		// Skip fragment-only anchors or external URLs
		if (link.includes('#') || link.startsWith('http')) {
			return null;
		}
		// Only check guide pages (en/guide/* and es/guide/*)
		if (!link.startsWith('/en/guide/') && !link.startsWith('/es/guide/')) {
			return null;
		}
		const rel = link.replace(/^\//, '').replace(/\/$/, '');
		const absPath = resolve(join(cwd, 'docs-vitepress', rel + '.md'));
		const docsRoot = resolve(join(cwd, 'docs-vitepress'));
		// Path-traversal guard
		if (!absPath.startsWith(docsRoot)) {
			return null;
		}
		return absPath;
	}
}
