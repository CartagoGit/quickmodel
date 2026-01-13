import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { resolve as pathResolve, dirname } from 'path';
import { enMcp } from '../../locales/en.mcp';
import { esMcp } from '../../locales/es.mcp';

/**
 * Tool to synchronize documentation content with code.
 * Automatically updates:
 * - Public Tools reference
 * - Internal Tools reference
 * - Transformers reference
 */
export class QSyncDocsTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'update_docs_content';
	description =
		'Auto-generate documentation files for Tools and Transformers based on current code.';
	schema = z.object({});

	protected _fs = fs;

	async execute(): Promise<{ summary: string; updatedFiles: string[] }> {
		const updatedFiles: string[] = [];
		const cwd = process.cwd();

		// 1. Get Tools via dynamic import to avoid circular dependency
		// Note: We assume the server exports QMcpServer class
		const { QMcpServer } = await import('../../server');
		const allTools = QMcpServer.getDefaultTools();

		// Separate Public vs Internal using Heuristic
		// Heuristic: internal tools start with internal prefixes
		const internalPrefixes = [
			'check_',
			'update_',
			'generate_test',
			'get_coverage',
			'scaffold_',
			'benchmark_',
		];

		const internalTools = allTools.filter((t: any) =>
			internalPrefixes.some((p) => t.name.startsWith(p))
		);
		const publicTools = allTools.filter(
			(t: any) => !internalPrefixes.some((p) => t.name.startsWith(p))
		);

		// 2. Generate Transformers Documentation
		const { TransformerLookupService } =
			await import('../../../core/services/transformer-lookup.service');
		const transformers =
			new TransformerLookupService().getAvailableTransformers();

		// 3. Process each language
		const languages = [
			{ code: 'en', texts: enMcp },
			{ code: 'es', texts: esMcp },
		];

		for (const lang of languages) {
			const t = lang.texts as any;
			const isEn = lang.code === 'en';

			// Helper to get description
			// If English, use tool.description (Source of Truth in Code) if not in file (or just always tool.desc?)
			// User said: "use translations". But for English, tool.description IS the text.
			// Ideally en.mcp.ts shouldn't double maintain it.
			// Let's assume for 'en', we prefer tool.description.
			// For 'es', we look in t.tools[name].
			const getDesc = (name: string, defaultDesc: string) => {
				if (t.tools && t.tools[name]) {
					return t.tools[name];
				}
				// If not found in translation file
				if (isEn) {
					return defaultDesc; // For English, use code description
				}
				// For other languages, fallback to English with a warning prefix? Or just English.
				// User wants "unified", so maybe we should enforce it?
				// But let's just return defaultDesc (English) as fallback.
				return defaultDesc;
			};

			// Generate Tools Documentation
			const publicDocs = this.generateToolMd(
				publicTools,
				t.publicTitle,
				t,
				getDesc
			);
			const internalDocs = this.generateToolMd(
				internalTools,
				t.internalTitle,
				t,
				getDesc
			);

			this.injectDoc(
				pathResolve(
					cwd,
					`docs-vitepress/${lang.code}/mcp/public/index.md`
				),
				publicDocs,
				updatedFiles
			);
			this.injectDoc(
				pathResolve(
					cwd,
					`docs-vitepress/${lang.code}/mcp/internal/index.md`
				),
				internalDocs,
				updatedFiles
			);

			// Generate Transformers Documentation
			const transformerDocs = this.generateTransformerMd(transformers, t);

			this.writeDoc(
				pathResolve(
					cwd,
					`docs-vitepress/${lang.code}/guide/transformers.md`
				),
				transformerDocs,
				updatedFiles
			);
		}

		return {
			summary: `Successfully updated ${updatedFiles.length} documentation files.`,
			updatedFiles,
		};
	}

	private generateToolMd(
		tools: any[],
		_title: string,
		texts: Record<string, any>,
		descLookup: (name: string, defaultDesc: string) => string
	): string {
		// Title is handled by the parent index.md usually, but let's add a separator or subheader if needed.
		// For now, we just append the list of tools.
		let md = `\n\n`;
		md += `<!-- ${texts.generatedBy} -->\n\n`;

		for (const tool of tools) {
			md += `## \`${tool.name}\`\n\n`;
			// Use translation lookup
			const desc = descLookup(tool.name, tool.description);
			md += `${desc}\n\n`;
			// md += `### ${texts.inputSchema}\n\n`;
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

	private generateTransformerMd(
		transformers: string[],
		texts: Record<string, any>
	): string {
		let md = `# ${texts.transformersTitle}\n\n`;
		md += `${texts.transformersDesc}\n\n`;
		md += `<!-- ${texts.generatedBy} -->\n\n`;

		md += `| ${texts.transformerHeader} | ${texts.descHeader} |\n`;
		md += `| :--- | :--- |\n`;

		for (const t of transformers.sort()) {
			md += `| \`${t}\` | Handles \`${t}\` data types. |\n`;
		}

		md += `\n\n${texts.customTransformers}\n`;
		return md;
	}

	private writeDoc(path: string, content: string, updatedFiles: string[]) {
		// Ensure dir exists
		this._fs.mkdirSync(dirname(path), { recursive: true });
		this._fs.writeFileSync(path, content);
		updatedFiles.push(path);
	}

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
