import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { resolve as pathResolve, dirname } from 'path';
import { enMcp } from '../../locales/en.mcp';

/**
 * Tool to synchronize documentation content with code.
 * Automatically updates the **English** documentation pages only:
 * - Public Tools reference (`en/mcp/public/index.md`, `en/mcp/tools.md`)
 * - Internal Tools reference (`en/mcp/internal/index.md`, `en/mcp/contributing/tools.md`)
 * - Transformers reference (`en/guide/transformers.md`, `es/guide/transformers.md`)
 *
 * All tool `description` fields are always English — the single source of truth for AI agents.
 * Spanish docs pages (`docs-vitepress/es/mcp/`) are human-facing and reference English tool
 * names; they are NOT generated from a locale file.
 *
 * @see {@link QUpdateDocsTool} — trigger the full documentation build pipeline
 * @see {@link QCheckMissingJSDocsTool} — find exports missing JSDoc before syncing
 */
export class QSyncDocsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'update_docs_content';
	description =
		'Auto-generate documentation files for Tools and Transformers based on current code.';
	schema = z.object({});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Regenerates documentation pages for public tools, internal tools, and
	 * transformers for every supported locale by reflecting on the live tool
	 * and transformer registrations.
	 *
	 * Tool descriptions are always sourced from `tool.description` (English,
	 * the single source of truth in code). `enMcp` structural strings are used
	 * for all locales — there is no separate Spanish locale file.
	 *
	 * @returns `{ summary, updatedFiles }` — `updatedFiles` lists the absolute
	 * paths of every Markdown file that was written; `summary` is a human-
	 * readable description of what was regenerated.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QUpdateDocsTool} — trigger the full documentation build after syncing
	 */
	async execute(): Promise<{ summary: string; updatedFiles: string[] }> {
		const updatedFiles: string[] = [];
		const cwd = process.cwd();

		// 1. Get Tools via dynamic import to avoid circular dependency
		const { QMcpServer } = await import('../../server');

		const internalTools = QMcpServer.getDefaultInternalTools().sort(
			(valA, valB) => valA.name.localeCompare(valB.name)
		);
		const publicTools = QMcpServer.getDefaultPublicTools().sort(
			(valA, valB) => valA.name.localeCompare(valB.name)
		);

		// 2. Generate Transformers Documentation
		const { TransformerLookupService } =
			await import('../../../core/services/transformer-lookup.service');
		const transformers =
			new TransformerLookupService().getAvailableTransformers();

		// 3. Build tool docs once (always English — tool.description is the source of truth)
		const publicDocs = this.generateToolMd(publicTools, enMcp.generatedBy);
		const internalDocs = this.generateToolMd(
			internalTools,
			enMcp.generatedBy
		);

		// 4. Inject tool docs into English pages only.
		// Spanish docs (es/mcp/) are human-facing pages — not auto-generated. Tool descriptions are always English.
		this.injectDoc(
			pathResolve(cwd, `docs-vitepress/en/mcp/public/index.md`),
			publicDocs,
			updatedFiles
		);
		this.injectDoc(
			pathResolve(cwd, `docs-vitepress/en/mcp/tools.md`),
			publicDocs,
			updatedFiles
		);
		this.injectDoc(
			pathResolve(cwd, `docs-vitepress/en/mcp/internal/index.md`),
			internalDocs,
			updatedFiles
		);
		this.injectDoc(
			pathResolve(cwd, `docs-vitepress/en/mcp/contributing/tools.md`),
			internalDocs,
			updatedFiles
		);

		// Transformer docs: auto-generate for both locales (structural only, no tool descriptions)
		const transformerDocs = this.generateTransformerMd(transformers, enMcp);
		this.writeDoc(
			pathResolve(cwd, `docs-vitepress/en/guide/transformers.md`),
			transformerDocs,
			updatedFiles
		);
		this.writeDoc(
			pathResolve(cwd, `docs-vitepress/es/guide/transformers.md`),
			transformerDocs,
			updatedFiles
		);

		return {
			summary: `Successfully updated ${updatedFiles.length} documentation files.`,
			updatedFiles,
		};
	}

	/**
	 * Generates a Markdown section listing all tools in a category.
	 * Tool descriptions are taken directly from `tool.description` (English,
	 * single source of truth — no translation lookup needed).
	 *
	 * @param tools - Array of tool instances to document
	 * @param generatedBy - Footer comment string for the generated block
	 * @returns Markdown string with one `##` section per tool
	 */
	private generateToolMd(tools: any[], generatedBy: string): string {
		let md = `\n\n`;
		md += `<!-- ${generatedBy} -->\n\n`;

		for (const tool of tools) {
			md += `## \`${tool.name}\`\n\n`;

			// SECURITY: Escape HTML characters to prevent XSS in generated docs
			const desc = (tool.description as string)
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')
				.replace(/>/g, '&gt;')
				.replace(/"/g, '&quot;')
				.replace(/'/g, '&#039;');

			md += `${desc}\n\n`;
			md += `\`\`\`json\n`;
			const shape = tool.schema.shape || {};
			const simpleSchema: any = {};
			for (const key in shape) {
				const def = shape[key];
				simpleSchema[key] = {
					type: def._def.typeName,
					description: def.description,
				};
				if (def.isOptional && def.isOptional()) {
					simpleSchema[key].optional = true;
				}
			}
			md += JSON.stringify(simpleSchema, null, 2);
			md += `\n\`\`\`\n\n`;
		}
		return md;
	}

	/**
	 * Generates a Markdown table listing all registered transformers.
	 *
	 * @param transformers - Array of transformer name strings
	 * @param texts - Locale-specific text strings
	 * @returns Markdown string with a formatted table
	 */
	private generateTransformerMd(
		transformers: string[],
		texts: Record<string, any>
	): string {
		let md = `# ${texts.transformersTitle}\n\n`;
		md += `${texts.transformersDesc}\n\n`;
		md += `<!-- ${texts.generatedBy} -->\n\n`;

		md += `| ${texts.transformerHeader} | ${texts.descHeader} |\n`;
		md += `| :--- | :--- |\n`;

		for (const transformer of transformers.sort()) {
			md += `| \`${transformer}\` | Handles \`${transformer}\` data types. |\n`;
		}

		md += `\n\n${texts.customTransformers}\n`;
		return md;
	}

	/**
	 * Writes `content` to `path`, creating parent directories as needed.
	 *
	 * @param path - Absolute destination file path
	 * @param content - Markdown content to write
	 * @param updatedFiles - Mutable array; the path is pushed after writing
	 */
	private writeDoc(path: string, content: string, updatedFiles: string[]) {
		// Ensure dir exists
		this._fs.mkdirSync(dirname(path), { recursive: true });
		this._fs.writeFileSync(path, content);
		updatedFiles.push(path);
	}

	/**
	 * Injects `content` into an existing file between auto-generated markers.
	 *
	 * @param path - Absolute path to the target documentation file
	 * @param content - Markdown content to inject
	 * @param updatedFiles - Mutable array; the path is pushed after injection
	 */
	private injectDoc(path: string, content: string, updatedFiles: string[]) {
		if (!this._fs.existsSync(path)) {
			console.warn(
				`Warning: File ${path} not found. Skipping injection.`
			);
			return;
		}

		const originalContent = this._fs.readFileSync(path, 'utf-8');
		const marker = '<!-- TOOLS-START -->';
		const parts = originalContent.split(marker);

		if (parts.length < 2) {
			console.warn(
				`Warning: Marker ${marker} not found in ${path}. Appending to end.`
			);
			this._fs.writeFileSync(
				path,
				originalContent + '\n\n' + marker + content
			);
		} else {
			// Keep pre-marker content and append new content
			const newContent = parts[0] + marker + content;
			this._fs.writeFileSync(path, newContent);
		}
		updatedFiles.push(path);
	}
}
