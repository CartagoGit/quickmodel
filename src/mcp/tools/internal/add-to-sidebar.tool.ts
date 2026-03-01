import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { resolve } from 'path';

/**
 * Options for inserting a single guide entry.
 * @see {@link QAddToSidebarTool} — tool that uses these options internally
 * @internal
 */
interface IInsertGuideOpts {
	guideKey: string;
	sectionText: string;
	itemText: string;
	itemLink: string;
}

/**
 * Result returned by {@link QAddToSidebarTool}.
 * @see {@link QAddToSidebarTool} — tool whose `execute` returns this union
 * @internal
 */
type IAddToSidebarResult =
	| { success: true; message: string }
	| { success: false; error: string };

/**
 * Internal MCP tool that registers a new guide page in the VitePress sidebar
 * (`docs-vitepress/.vitepress/config.ts`) for both the English and Spanish locales.
 *
 * @remarks
 * The new entry is inserted just before the `⚡ Benchmarks` entry in the target
 * section (if one exists), or at the end of the `items` array otherwise.
 *
 * Fails if the slug's link is already present in the config file, to prevent
 * duplicate entries.
 *
 * @returns `{ success: true, message }` on success, or
 * `{ success: false, error }` when the config file, section, or items block
 * cannot be located, or when the link is already registered.
 *
 * @see {@link QCreateGuidePageTool} — create the `.md` files before calling this tool
 * @see {@link QUpdateDocsTool} — rebuild the docs after registering the page
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QAddToSidebarTool extends QAbstractTool<
	z.ZodObject<{
		slug: z.ZodString;
		text_en: z.ZodString;
		text_es: z.ZodString;
		section_en: z.ZodString;
		section_es: z.ZodString;
		config_path: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'add_to_sidebar';
	description =
		'Register a new guide page in both EN and ES VitePress sidebars (docs-vitepress/.vitepress/config.ts). ' +
		'Inserts the entry before ⚡ Benchmarks if present, otherwise at the end of the section items. ' +
		'Fails gracefully if the section is not found or the link already exists.';

	schema = z.object({
		slug: z
			.string()
			.describe('Kebab-case slug used in the link (e.g. "my-feature")'),
		text_en: z
			.string()
			.describe('Sidebar label in English (e.g. "My Feature")'),
		text_es: z
			.string()
			.describe('Sidebar label in Spanish (e.g. "Mi Funcionalidad")'),
		section_en: z
			.string()
			.describe(
				'Target section name in EN (e.g. "Core", "Validation", "Forms")'
			),
		section_es: z
			.string()
			.describe(
				'Target section name in ES (e.g. "Núcleo", "Validación", "Formularios")'
			),
		config_path: z
			.string()
			.optional()
			.describe('Override path to config.ts (used for testing)'),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Inserts the new sidebar entry into `config.ts` for EN and ES locales.
	 *
	 * @param args - Insertion arguments.
	 * @returns `{ success: true, message }` or `{ success: false, error }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(
		args: z.infer<typeof this.schema>
	): Promise<IAddToSidebarResult> {
		await Promise.resolve();

		const configPath =
			args.config_path ??
			resolve(process.cwd(), 'docs-vitepress', '.vitepress', 'config.ts');

		if (!this._fs.existsSync(configPath)) {
			return {
				success: false,
				error: `Config file not found: ${configPath}`,
			};
		}

		const content = this._fs.readFileSync(configPath, 'utf-8');

		const enLink = `/en/guide/${args.slug}`;
		const esLink = `/es/guide/${args.slug}`;

		if (
			content.includes(`link: '${enLink}'`) ||
			content.includes(`link: '${esLink}'`)
		) {
			return {
				success: false,
				error: `Link "${args.slug}" already exists in the sidebar. Remove the existing entry first.`,
			};
		}

		const withEn = this._insertIntoGuide(content, {
			guideKey: '/en/guide/',
			sectionText: args.section_en,
			itemText: args.text_en,
			itemLink: enLink,
		});

		if (withEn === null) {
			return {
				success: false,
				error: `Section "${args.section_en}" not found in the EN guide sidebar (/en/guide/).`,
			};
		}

		const withEs = this._insertIntoGuide(withEn, {
			guideKey: '/es/guide/',
			sectionText: args.section_es,
			itemText: args.text_es,
			itemLink: esLink,
		});

		if (withEs === null) {
			return {
				success: false,
				error: `Section "${args.section_es}" not found in the ES guide sidebar (/es/guide/).`,
			};
		}

		this._fs.writeFileSync(configPath, withEs, 'utf-8');

		return {
			success: true,
			message:
				`"${args.slug}" registered in sidebar — ` +
				`EN: section "${args.section_en}" | ES: section "${args.section_es}".`,
		};
	}

	/**
	 * Inserts a new item into the target section of the given guide block.
	 *
	 * @param content - Full `config.ts` source.
	 * @param opts - Insertion options (guideKey, sectionText, itemText, itemLink).
	 * @returns Updated source string, or `null` when the section cannot be found.
	 */
	private _insertIntoGuide(
		content: string,
		opts: IInsertGuideOpts
	): string | null {
		const { guideKey, sectionText, itemText, itemLink } = opts;
		const lines = content.split('\n');

		// Step 1: Locate the guide block start (e.g. `'/en/guide/': [`)
		const guideIdx = lines.findIndex((line) =>
			line.includes(`'${guideKey}': [`)
		);
		if (guideIdx === -1) return null;

		const guideLineIndent = lines[guideIdx]!.match(/^(\t+)/)?.[1] ?? '';
		// Section-level properties are at guideLineIndent + 2 more tabs
		// (guide marker → array item `{` → item properties)
		const sectionPropLine = `${guideLineIndent}\t\ttext: '${sectionText}',`;

		// Step 2: Locate the target section text line within the guide block.
		// Exact indentation match prevents false positives from item-level text properties.
		let sectionIdx = -1;
		for (let idx = guideIdx + 1; idx < lines.length; idx++) {
			if (lines[idx] === sectionPropLine) {
				sectionIdx = idx;
				break;
			}
		}

		if (sectionIdx === -1) return null;

		// Step 3: Find `items: [` within the next ~5 lines after the section text
		let itemsIdx = -1;
		const itemsPropPrefix = `${guideLineIndent}\t\titems: [`;
		for (
			let idx = sectionIdx + 1;
			idx < Math.min(sectionIdx + 6, lines.length);
			idx++
		) {
			if (lines[idx]?.startsWith(itemsPropPrefix)) {
				itemsIdx = idx;
				break;
			}
		}
		if (itemsIdx === -1) return null;

		// Indentation for items entries:
		//   items: [  → itemsIndent = guideLineIndent + 2 tabs
		//   {         → itemIndent  = guideLineIndent + 3 tabs
		//   text:     → propIndent  = guideLineIndent + 4 tabs
		const itemsIndent = `${guideLineIndent}\t\t`;
		const itemIndent = `${guideLineIndent}\t\t\t`;
		const propIndent = `${guideLineIndent}\t\t\t\t`;

		// Step 4: Find insertion point — before ⚡ Benchmarks or before items close `],`
		let insertIdx = -1;
		for (let idx = itemsIdx + 1; idx < lines.length; idx++) {
			// Benchmark opener: a `{` at item indentation level
			if (lines[idx] === `${itemIndent}{`) {
				const nextChunk = lines.slice(idx, idx + 3).join('\n');
				if (nextChunk.includes('⚡ Benchmarks')) {
					insertIdx = idx;
					break;
				}
			}

			// Items close: `],` at items-array indentation
			if (lines[idx] === `${itemsIndent}],`) {
				insertIdx = idx;
				break;
			}
		}

		if (insertIdx === -1) return null;

		// Build new entry in multi-line format matching existing style
		const newEntry = [
			`${itemIndent}{`,
			`${propIndent}text: '${itemText}',`,
			`${propIndent}link: '${itemLink}',`,
			`${itemIndent}},`,
		];

		lines.splice(insertIdx, 0, ...newEntry);
		return lines.join('\n');
	}
}
