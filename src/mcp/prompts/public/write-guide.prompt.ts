import { z } from '@mcp/deps';
import { QAbstractInternalPrompt } from '../abstract-internal-prompt';

/**
 * Skill: Guided workflow to create and publish a new QuickModel documentation page.
 *
 * Orchestrates the full doc-creation pipeline:
 *  1. `create_guide_page`  — scaffold EN + ES `.md` files from a template
 *  2. `add_to_sidebar`     — register the page in `.vitepress/config.ts` (EN + ES)
 *  3. Write real content   — replace the template stub with actual documentation
 *  4. `search_docs`        — verify the page is findable in the docs
 *  5. `update_docs_content` — regenerate auto-generated reference sections (optional)
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QCreateGuidePageTool} — tool called in step 1
 * @see {@link QAddToSidebarTool} — tool called in step 2
 * @see {@link QSearchDocsTool} — tool called in step 4
 * @see {@link QSyncDocsTool} — tool called in step 5
 */
export class QWriteGuidePrompt extends QAbstractInternalPrompt<{
	slug: z.ZodString;
	title_en: z.ZodString;
	title_es: z.ZodString;
	section_en: z.ZodString;
	section_es: z.ZodString;
	description: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_write_guide';
	title = 'Write a New Documentation Guide Page (EN + ES)';
	description =
		'Creates a new VitePress guide page for both English and Spanish locales, ' +
		'registers it in the sidebar, and guides the agent through writing the full content. ' +
		'Steps: create_guide_page → add_to_sidebar → write content → search_docs validation. ' +
		'Use this whenever you need to document a new feature, integration, or concept.';

	argsSchema = {
		slug: z
			.string()
			.describe('Kebab-case file slug (e.g. "drizzle-integration")'),
		title_en: z
			.string()
			.describe('English page title (e.g. "Drizzle ORM Integration")'),
		title_es: z
			.string()
			.describe(
				'Spanish page title (e.g. "Integración con Drizzle ORM")'
			),
		section_en: z
			.string()
			.describe(
				'Target sidebar section in EN. Available: Introduction, Core, Validation, ' +
					'Forms, Mocks, Tracing & Observability, Customization, Performance, Reference'
			),
		section_es: z
			.string()
			.describe(
				'Target sidebar section in ES. Available: Introducción, Núcleo, Validación, ' +
					'Formularios, Mocks, Trazas y Observabilidad, Personalización, Rendimiento, Referencia'
			),
		description: z
			.string()
			.optional()
			.describe(
				'Optional brief description added as a blockquote below the title'
			),
	};

	execute(args: {
		slug: string;
		title_en: string;
		title_es: string;
		section_en: string;
		section_es: string;
		description?: string;
	}) {
		const {
			slug,
			title_en,
			title_es,
			section_en,
			section_es,
			description,
		} = args;
		const descArg = description ? `, description_en: "${description}"` : '';
		const esDescArg = description
			? `, description_es: "${description}"`
			: '';

		return Promise.resolve({
			description: `Create documentation guide: ${title_en} / ${title_es}`,
			messages: [
				this.user(
					`I need to create a new documentation guide page:\n\n` +
						`- **Slug:** \`${slug}\`\n` +
						`- **Title EN:** ${title_en}\n` +
						`- **Title ES:** ${title_es}\n` +
						`- **Section EN:** ${section_en}\n` +
						`- **Section ES:** ${section_es}\n` +
						(description
							? `- **Description:** ${description}\n`
							: '') +
						`\nPlease create the page files, register them in the sidebar, write complete content, and verify everything is working.`
				),
				this.assistant(
					`## ✍️ Documentation guide: ${title_en}\n\n` +
						`I'll follow the complete doc-creation pipeline. Here are the steps:\n\n` +
						`---\n\n` +
						`### Step 1 — Scaffold the page files\n\n` +
						`Call \`create_guide_page\` to create the EN and ES markdown stubs:\n\n` +
						`\`\`\`\n` +
						`create_guide_page(\n` +
						`  slug: "${slug}",\n` +
						`  title_en: "${title_en}",\n` +
						`  title_es: "${title_es}"${descArg}${esDescArg}\n` +
						`)\n` +
						`\`\`\`\n\n` +
						`**Gate:** Must return \`success: true\`. If files already exist, update their content instead of aborting.\n\n` +
						`---\n\n` +
						`### Step 2 — Register in the sidebar\n\n` +
						`Call \`add_to_sidebar\` to add navigation links:\n\n` +
						`\`\`\`\n` +
						`add_to_sidebar(\n` +
						`  slug: "${slug}",\n` +
						`  text_en: "${title_en}",\n` +
						`  text_es: "${title_es}",\n` +
						`  section_en: "${section_en}",\n` +
						`  section_es: "${section_es}"\n` +
						`)\n` +
						`\`\`\`\n\n` +
						`**Gate:** Must return \`success: true\`. If the link already exists, skip this step.\n\n` +
						`---\n\n` +
						`### Step 3 — Write the content\n\n` +
						`Replace the template stubs with complete documentation for both locales:\n\n` +
						`**EN page** (\`docs-vitepress/en/guide/${slug}.md\`):\n` +
						`- Clear overview with code examples\n` +
						`- API reference section covering key methods and options\n` +
						`- At least one complete, runnable TypeScript example\n` +
						`- Common patterns and edge cases\n` +
						`- Links to related pages (use VitePress \`[[text]]\` format)\n\n` +
						`**ES page** (\`docs-vitepress/es/guide/${slug}.md\`):\n` +
						`- Full translation of the EN content — not a stub\n` +
						`- Same code examples (code is language-neutral)\n` +
						`- All headings and prose in Spanish\n\n` +
						`---\n\n` +
						`### Step 4 — Verify the page is findable\n\n` +
						`Call \`search_docs\` to confirm the page is indexed:\n\n` +
						`\`\`\`\n` +
						`search_docs(query: "${slug}")\n` +
						`\`\`\`\n\n` +
						`The results must include matches from the new \`${slug}.md\` files.\n\n` +
						`---\n\n` +
						`### Step 5 — Sync auto-generated docs (if needed)\n\n` +
						`If new public tools or transformers were added as part of this feature, call \`update_docs_content\` to regenerate the MCP tools reference:\n\n` +
						`\`\`\`\n` +
						`update_docs_content()\n` +
						`\`\`\`\n\n` +
						`---\n\n` +
						`**DONE when:** Steps 1–4 complete successfully and the new page has complete EN + ES content (not a stub).`
				),
				this.user(
					`Go ahead — start with \`create_guide_page\` and proceed through each step. ` +
						`Write complete, production-ready documentation for both locales.`
				),
			],
		});
	}
}
