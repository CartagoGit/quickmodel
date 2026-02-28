import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, resolve, sep } from 'path';

/**
 * Args accepted by {@link QCreateGuidePageTool}.
 * @see {@link QCreateGuidePageTool} — tool that processes these arguments
 * @internal
 */
interface ICreateGuidePageArgs {
	slug: string;
	title_en: string;
	title_es: string;
	description_en?: string;
	description_es?: string;
	/** Override base path (defaults to `process.cwd()`). Used in tests. */
	base_path?: string;
}

/**
 * Result returned by {@link QCreateGuidePageTool}.
 * @see {@link QCreateGuidePageTool} — tool whose `execute` returns this union
 * @internal
 */
type ICreateGuidePageResult =
	| { success: true; en_path: string; es_path: string; message: string }
	| { success: false; error: string };

/**
 * Internal MCP tool that scaffolds a new documentation guide page in both
 * English and Spanish from a standard template.
 *
 * @remarks
 * Creates two files:
 * - `docs-vitepress/en/guide/{slug}.md`
 * - `docs-vitepress/es/guide/{slug}.md`
 *
 * The slug must be kebab-case (`[a-z0-9]+(-[a-z0-9]+)*`).
 * Fails if either target file already exists to prevent accidental overwrites.
 *
 * @returns `{ success: true, en_path, es_path, message }` on success, or
 * `{ success: false, error }` on validation failure or if files already exist.
 *
 * @see {@link QAddToSidebarTool} — register the created page in the VitePress sidebar
 * @see {@link QUpdateDocsTool} — trigger the full documentation build after creating a page
 * @see {@link QSyncDocsTool} — auto-generate reference pages from source code
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCreateGuidePageTool extends QAbstractTool<
	z.ZodObject<{
		slug: z.ZodString;
		title_en: z.ZodString;
		title_es: z.ZodString;
		description_en: z.ZodOptional<z.ZodString>;
		description_es: z.ZodOptional<z.ZodString>;
		base_path: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'create_guide_page';
	description =
		'Create a new guide page (EN + ES) from a template in docs-vitepress/en/guide/ and docs-vitepress/es/guide/. ' +
		'Returns the paths of the created files. Use add_to_sidebar to register the page in the navigation.';

	schema = z.object({
		slug: z.string().describe('Kebab-case page slug (e.g. "my-feature")'),
		title_en: z
			.string()
			.describe('Page title in English (e.g. "My Feature")'),
		title_es: z
			.string()
			.describe('Page title in Spanish (e.g. "Mi Funcionalidad")'),
		description_en: z
			.string()
			.optional()
			.describe(
				'Optional brief description in English (added as a blockquote)'
			),
		description_es: z
			.string()
			.optional()
			.describe(
				'Optional brief description in Spanish (added as a blockquote)'
			),
		base_path: z
			.string()
			.optional()
			.describe('Override project root (used for testing)'),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Creates the EN and ES guide page files from a standard template.
	 *
	 * @param args - Page creation arguments.
	 * @param args.slug - Kebab-case slug for the `.md` filename.
	 * @param args.title_en - English page title used as the `# H1` heading.
	 * @param args.title_es - Spanish page title used as the `# H1` heading.
	 * @param args.description_en - Optional English description added as a blockquote.
	 * @param args.description_es - Optional Spanish description added as a blockquote.
	 * @param args.base_path - Override project root; defaults to `process.cwd()`.
	 * @returns `{ success: true, en_path, es_path, message }` or `{ success: false, error }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: ICreateGuidePageArgs): Promise<ICreateGuidePageResult> {
		await Promise.resolve();

		// Validate slug: must start/end with alphanumeric, only lowercase letters/digits/hyphens, no consecutive hyphens
		const validSlug =
			/^[a-z0-9][a-z0-9-]*$/.test(args.slug) &&
			!args.slug.endsWith('-') &&
			!args.slug.includes('--');
		if (!validSlug) {
			return {
				success: false,
				error: `Invalid slug: "${args.slug}". Must be kebab-case (e.g. "my-feature").`,
			};
		}

		const cwd = resolve(args.base_path ?? process.cwd());
		const safeCwd = cwd + sep;

		const enPath = resolve(
			cwd,
			'docs-vitepress',
			'en',
			'guide',
			`${args.slug}.md`
		);
		const esPath = resolve(
			cwd,
			'docs-vitepress',
			'es',
			'guide',
			`${args.slug}.md`
		);

		if (!enPath.startsWith(safeCwd) || !esPath.startsWith(safeCwd)) {
			return { success: false, error: 'Path traversal detected' };
		}

		if (this._fs.existsSync(enPath)) {
			return {
				success: false,
				error: `File already exists: ${enPath}. Delete it first or choose a different slug.`,
			};
		}

		if (this._fs.existsSync(esPath)) {
			return {
				success: false,
				error: `File already exists: ${esPath}. Delete it first or choose a different slug.`,
			};
		}

		this._fs.mkdirSync(join(cwd, 'docs-vitepress', 'en', 'guide'), {
			recursive: true,
		});
		this._fs.mkdirSync(join(cwd, 'docs-vitepress', 'es', 'guide'), {
			recursive: true,
		});

		this._fs.writeFileSync(
			enPath,
			this._buildEnPage(args.title_en, args.description_en),
			'utf-8'
		);
		this._fs.writeFileSync(
			esPath,
			this._buildEsPage(args.title_es, args.description_es),
			'utf-8'
		);

		return {
			success: true,
			en_path: enPath,
			es_path: esPath,
			message: `Guide page "${args.slug}" created successfully. Next: call add_to_sidebar to register it in the navigation.`,
		};
	}

	/**
	 * Builds the EN page template.
	 * @param titleText - `# H1` heading text.
	 * @param descText - Optional blockquote description.
	 */
	private _buildEnPage(titleText: string, descText?: string): string {
		const desc = descText ? `\n> ${descText}\n` : '';
		return (
			`# ${titleText}\n` +
			desc +
			'\n::: tip\nThis page is a stub. Replace this with real content.\n:::\n\n' +
			'## Overview\n\n' +
			'_Document this feature here._\n\n' +
			'## Usage\n\n' +
			'```typescript\n// Add a usage example\n```\n'
		);
	}

	/**
	 * Builds the ES page template.
	 * @param titleText - `# H1` heading text.
	 * @param descText - Optional blockquote description.
	 */
	private _buildEsPage(titleText: string, descText?: string): string {
		const desc = descText ? `\n> ${descText}\n` : '';
		return (
			`# ${titleText}\n` +
			desc +
			'\n::: tip\nEsta página es un borrador. Reemplaza esto con contenido real.\n:::\n\n' +
			'## Descripción General\n\n' +
			'_Documenta esta funcionalidad aquí._\n\n' +
			'## Uso\n\n' +
			'```typescript\n// Añade un ejemplo de uso\n```\n'
		);
	}
}
