import { QAbstractInternalPrompt } from '../abstract-internal-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Documentation coherence audit — JSDoc, EN↔ES parity and sidebar integrity.
 *
 * Runs a structured review across three dimensions:
 *  1. JSDoc coverage and accuracy — calls `check_jsdocs`, verifies `@see` links resolve
 *     and `@example` blocks reflect the current API signature
 *  2. EN↔ES parity — every page under `docs-vitepress/en/` must have a counterpart
 *     under `docs-vitepress/es/` with equivalent up-to-date content
 *  3. Sidebar coherence — every entry in `docs-vitepress/.vitepress/config.ts` must
 *     point to a page that exists and whose content matches the entry's title and section
 *
 * Also verifies that MCP tool/skill `description` fields are still accurate for any
 * symbol that was recently changed.
 *
 * Use after completing a feature or refactor to confirm documentation is fully in sync,
 * or periodically as a standalone audit.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QCheckJsdocsTool} for the JSDoc coverage gate
 * @see {@link QSyncDocsTool} for regenerating auto-generated documentation
 * @see {@link QSyncProjectPrompt} for the broader project health + docs sync workflow
 */
export class QCheckDocsCoherencePrompt extends QAbstractInternalPrompt<
	Record<string, never>
> {
	name = 'quickmodel_check_docs_coherence';
	title = 'Check Documentation Coherence (JSDoc + EN↔ES + Sidebar)';
	description =
		'Audits documentation coherence across three dimensions: ' +
		'(1) JSDoc coverage and accuracy — check_jsdocs + verify @see links resolve and @example compiles; ' +
		'(2) EN↔ES parity — every docs-vitepress/en/ page must have an up-to-date counterpart in docs-vitepress/es/; ' +
		'(3) Sidebar coherence — every config.ts entry must point to a real page with matching content. ' +
		'Also checks that MCP tool/skill description fields are still accurate after recent changes. ' +
		'Use after any feature, refactor or documentation edit to confirm full documentation consistency.';

	argsSchema = {};

	execute(_args: Record<string, never>): Promise<IQPromptResult> {
		return Promise.resolve({
			description:
				'Documentation coherence audit: JSDoc + EN↔ES parity + sidebar integrity',
			messages: [
				this.user(
					`Please run a full documentation coherence audit:\n` +
						`1. JSDoc coverage and accuracy\n` +
						`2. EN↔ES page parity\n` +
						`3. Sidebar integrity in both languages\n` +
						`4. MCP tool/skill description accuracy\n\n` +
						`Start with \`check_jsdocs\` to get the JSDoc coverage report.`
				),

				this.assistant(
					`## 📚 Documentation Coherence Audit\n\n` +
						`I will run a structured audit across all four dimensions. ` +
						`**This is NOT done until every dimension reports clean.**\n\n` +
						`---\n\n` +
						`### Step 0 — 🤝 Register your work (mandatory)\n\n` +
						`Before modifying any file:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — confirm no other agent is currently modifying docs or source files.\n` +
						`   If \`agents[]\` is non-empty: check their staged/unstaged git changes. Wait for them to commit or stash if their changes overlap with docs-vitepress or src.\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\`, task \`"docs coherence audit"\`,\n` +
						`   and \`files: ["docs-vitepress/**", "src/**"]\`.\n` +
						`3. If \`conflict: true\` → **STOP immediately**. Do not modify any file. Inform the user and wait.\n` +
						`4. **Read before every write:** Immediately before modifying each file, read its current content from disk — your context may be stale if another agent edited it since you started. If the file changed: adapt your change, merge carefully, or skip if no longer needed. Never overwrite from stale context.\n` +
						`5. Release when done (even if the task fails): \`agent_coordinate action="release"\`\n\n` +
						`---\n\n` +
						`### Dimension 1 — JSDoc coverage and accuracy\n\n` +
						`Call \`check_jsdocs\` to find:\n` +
						`- Public exports without a JSDoc block\n` +
						`- Exports with incomplete JSDoc (missing \`@param\`, \`@returns\`, \`@throws\`)\n\n` +
						`For every JSDoc block found (existing or new), verify:\n` +
						`- **Realistic**: the description matches what the code actually does right now — not what it used to do or was intended to do\n` +
						`- **\`@see\` / \`@link\` resolve**: each referenced symbol exists and the description of the relationship is still accurate\n` +
						`- **\`@example\` compiles**: the snippet reflects the current API signature and runs without errors\n` +
						`- **\`description\` of MCP tools/skills**: if a tool or prompt was changed, its \`description\` field must reflect the new behaviour — stale descriptions cause wrong AI tool selection\n\n` +
						`> Re-run \`check_jsdocs\` until it reports zero missing or incomplete exports.\n\n` +
						`---\n\n` +
						`### Dimension 2 — EN↔ES page parity\n\n` +
						`The documentation tree under \`docs-vitepress/en/\` and \`docs-vitepress/es/\` must be **mirror images** at all times.\n\n` +
						`For each page found:\n` +
						`1. Verify its counterpart exists in the other language directory\n` +
						`2. Verify both versions cover the same sections and examples\n` +
						`3. If one was recently edited, confirm the equivalent change was applied to the other\n\n` +
						`**Common parity failures to check:**\n` +
						`- Page exists in \`en/\` but not in \`es/\` (or vice versa)\n` +
						`- One language has a section the other is missing\n` +
						`- One language references a symbol/API that was renamed or removed, while the other was updated\n\n` +
						`---\n\n` +
						`### Dimension 3 — Sidebar integrity\n\n` +
						`Open \`docs-vitepress/.vitepress/config.ts\` and audit the sidebar configuration for both locales:\n\n` +
						`For every sidebar entry (EN and ES):\n` +
						`1. **Link resolves** — the path points to a file that actually exists\n` +
						`2. **Title matches** — the sidebar label matches the \`# Heading\` on the page\n` +
						`3. **Section is coherent** — the entry belongs to the correct section and the section order reflects the real content structure\n` +
						`4. **No orphans** — there are no pages in \`en/\` or \`es/\` that exist but have no sidebar entry (unless intentionally unlisted)\n` +
						`5. **No ghosts** — there are no sidebar entries pointing to pages that do not exist\n\n` +
						`---\n\n` +
						`### Dimension 4 — MCP tool/skill description accuracy\n\n` +
						`The \`description\` property on every \`QAbstractTool\` and \`QAbstractPrompt\` is used by the AI for **auto-discovery**. ` +
						`A stale description causes the agent to select the wrong tool.\n\n` +
						`For any symbol changed recently:\n` +
						`1. Re-read its \`description\` field\n` +
						`2. Verify it accurately describes the **current** behaviour, inputs and expected outputs\n` +
						`3. If the description is stale — update it to match reality before declaring done\n\n` +
						`---\n\n` +
						`### ✅ Definition of DONE for this audit\n\n` +
						`- [ ] \`check_jsdocs\` reports zero missing or incomplete exports\n` +
						`- [ ] All \`@see\` references verified to resolve correctly\n` +
						`- [ ] All \`@example\` blocks verified to compile against the current API\n` +
						`- [ ] Every \`en/\` page has a matching \`es/\` counterpart with equivalent content\n` +
						`- [ ] Sidebar EN: all entries resolve, titles match, no orphans, no ghosts\n` +
						`- [ ] Sidebar ES: same\n` +
						`- [ ] All MCP tool/skill \`description\` fields reflect current behaviour\n` +
						`- [ ] \`agent_coordinate release\` called`
				),

				this.user(
					`Start the audit now. Call \`check_jsdocs\` first, then work through dimensions 2, 3 and 4. ` +
						`Report findings for each dimension and fix any issues before declaring the audit complete.`
				),
			],
		});
	}
}
