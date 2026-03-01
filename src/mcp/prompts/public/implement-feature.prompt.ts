// @quickmodel-rule-ignore: no-console — string literals inside the prompt text reference console.log as a rule example; no actual console.log calls in this file
import { z } from '@mcp/deps';
import { QAbstractInternalPrompt } from '../abstract-internal-prompt';

/**
 * Skill: Guided TDD feature implementation with enforced lint + typecheck gate.
 *
 * Forces the mandatory workflow:
 *  1. Write a failing test first (red)
 *  2. Implement the minimum code to pass it (green)
 *  3. Run lint_check — MUST return passed: true before continuing
 *  4. Run typecheck  — MUST return passed: true before continuing
 *  5. Run check_project_rules — MUST pass before continuing
 *  6. Refactor if needed, re-run gate
 *  7. Only then the feature is DONE
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QLintCheckTool} for the lint gate
 * @see {@link QTypecheckTool} for the typecheck gate
 * @see {@link QCheckProjectRulesTool} for the project rules gate
 */
export class QImplementFeaturePrompt extends QAbstractInternalPrompt<{
	feature_description: z.ZodString;
	file_paths: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_implement_feature';
	title = 'Implement a Feature (TDD + Lint/Typecheck Gate)';
	description =
		'Guided TDD implementation workflow that enforces strict lint and type checking ' +
		'before declaring any feature done. Follows the mandatory cycle: ' +
		'write failing test → implement → lint_check (MUST pass) → typecheck (MUST pass) → ' +
		'check_project_rules (MUST pass) → only then DONE. ' +
		'Prevents shipping code with id-length, max-params, no-implied-eval, implicit-any, ' +
		'or any other lint/type violation.';

	argsSchema = {
		feature_description: z
			.string()
			.describe(
				'Clear description of the feature or artefact to implement ' +
					'(e.g. "Add email validation tool", "Implement diff_models public tool")'
			),
		file_paths: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated list of source files that will be created or modified ' +
					'(e.g. "src/mcp/tools/public/my-tool.ts,tests/mcp/unit/public/my-tool.test.ts")'
			),
	};

	execute(args: { feature_description: string; file_paths?: string }) {
		const { feature_description, file_paths } = args;

		const filesSection = file_paths
			? `\n\n**Files involved:** \`${file_paths}\``
			: '';

		const lintTargets = file_paths
			? `targetFiles: [${file_paths
					.split(',')
					.map((pth) => `"${pth.trim()}"`)
					.join(', ')}]`
			: 'targetDir: "src"';

		return Promise.resolve({
			description: `TDD implementation of: ${feature_description}`,
			messages: [
				this.user(
					`I need to implement the following QuickModel feature:\n\n` +
						`**Feature:** ${feature_description}` +
						filesSection +
						`\n\nPlease guide me through the complete TDD cycle with enforced lint and type checking.`
				),

				this.assistant(
					`## 🔴→🟢 TDD implementation of: ${feature_description}\n\n` +
						`Follow this mandatory cycle. **You are NOT done until all gates pass.**\n\n` +
						`---\n\n` +
						`### Step 0 — 🤝 Register your work (mandatory for parallel environments)\n\n` +
						`Before touching any file, coordinate with other agents:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — see who is currently working and on what files.\n` +
						`   **If \`agents[]\` is non-empty:** inspect their staged/unstaged git changes before proceeding.\n` +
						`   For wide-scope operations (e.g. renaming a namespace across hundreds of files), ask the other agents to commit or stash their changes so your operation starts from a clean baseline.\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\` (e.g. \`"copilot-session-1"\`), \`task\` (short description), and \`files\` (glob patterns of everything you will create or modify):\n` +
						`   - Targeted feature (a few files): list the specific paths, e.g. \`["src/mcp/tools/**", "tests/mcp/unit/**"]\`\n` +
						`   - **Wide-scope / mass-rename touching many files:** claim \`["src/**", "tests/**"]\` or even \`["src/**", "tests/**", "docs-vitepress/**"]\`\n` +
						`   - **For mass operations, also set \`ttlMs: 1800000\` (30 min)** — the default TTL (2 min) will expire before you finish\n` +
						`3. If the response returns \`conflict: true\` → **STOP immediately**. Inform the user which agent owns the conflicting files and wait or coordinate manually. Do NOT proceed.\n` +
						`4. When your work is fully done (all gates pass), call \`agent_coordinate\` with \`action: "release"\` to free your claim.\n\n` +
						`> ⛔ **Skipping this step causes concurrent agents to overwrite each other's work. There is no auto-merge.**\n\n` +
						`---\n\n` +
						`### Step 1 — 🏗️ Scaffold first (new tools & transformers only)\n\n` +
						`If this feature requires creating a **new tool or transformer** (not modifying existing code), ` +
						`call \`scaffold_feature\` BEFORE writing anything:\n` +
						`\`\`\`json\n{ "type": "tool", "name": "my-feature-name" }\n\`\`\`\n` +
						`or\n` +
						`\`\`\`json\n{ "type": "transformer", "name": "my-type-name" }\n\`\`\`\n\n` +
						`This generates:\n` +
						`- The **source file** with typed STEP comments (correct imports, class structure, registration reminder)\n` +
						`- A **test skeleton** already placed at the right path, ready for TDD assertions\n\n` +
						`Use the returned \`testPath\` as your test file in Steps 2–3.\n` +
						`Skip this step if modifying existing files.\n\n` +
						`---\n\n` +
						`### Step 2 — 🔴 Write the failing test first\n\n` +
						`Before writing any production code:\n` +
						`1. Use the test skeleton from Step 1 (or create one at e.g. \`tests/mcp/unit/...\`)\n` +
						`2. Write tests that describe the expected behaviour\n` +
						`3. Run \`bun test <test-file>\` — tests MUST fail at this point\n` +
						`4. Confirm "X pass, Y fail" in the output\n\n` +
						`---\n\n` +
						`### Step 3 — 🟢 Implement the minimum code to pass\n\n` +
						`Now write the production code:\n` +
						`- If scaffolded in Step 1, fill in the \`STEP\` comments in the source file\n` +
						`- Follow **strict TypeScript** (\`strict: true\`, \`noImplicitAny\`, \`noUncheckedIndexedAccess\`)\n` +
						`- **Avoid \`as unknown\`**: it signals that the types are wrong — fix them instead. \`as any\` is even worse and never acceptable. If there is a genuinely unavoidable edge case, add \`// @quickmodel-rule-ignore: no-as-unknown\` on that line.\n` +
						`- Respect **ESLint rules**:\n` +
						`  - \`id-length\`: identifiers ≥ 3 chars (exceptions: \`_\`, \`id\`, \`on\`, \`fs\`, \`cb\`, \`md\`, \`ts\`, \`err\`, \`_\` prefix)\n` +
						`  - \`max-params\`: maximum 3 positional parameters per function\n` +
						`  - \`no-console\`: no \`console.log\` in \`src/\`\n` +
						`  - Interfaces and type aliases must have \`I\` prefix (e.g. \`IMyInterface\`)\n` +
						`  - No bare \`quickmodel\` or \`@mcp\` imports inside \`src/\`\n` +
						`- Run \`bun test <test-file>\` — tests MUST pass now\n\n` +
						`---\n\n` +
						`### Step 4 — 🚦 MANDATORY Lint Gate\n\n` +
						`> ⛔ **You CANNOT declare the feature done until this returns \`passed: true\`.**\n\n` +
						`Call \`lint_check\` with:\n` +
						`\`\`\`json\n` +
						`{ ${lintTargets} }\n` +
						`\`\`\`\n` +
						`- If \`passed: false\`: **fix every error** in \`errors[]\` before continuing\n` +
						`- Warnings in \`warnings[]\` should also be resolved if possible\n` +
						`- Re-run until \`passed: true\`\n\n` +
						`---\n\n` +
						`### Step 5 — 🚦 MANDATORY Typecheck Gate\n\n` +
						`> ⛔ **You CANNOT declare the feature done until this returns \`passed: true\`.**\n\n` +
						`Call \`typecheck\` (no arguments needed).\n` +
						`- If \`passed: false\`: **fix every type error** in \`errors[]\` before continuing\n` +
						`- Each error shows \`file\`, \`line\`, \`column\`, \`code\` (TSxxxx) and \`message\`\n` +
						`- Re-run until \`passed: true\`\n\n` +
						`---\n\n` +
						`### Step 6 — 🚦 MANDATORY Project Rules Gate\n\n` +
						`> ⛔ **You CANNOT declare the feature done until this returns \`passed: true\`.**\n\n` +
						`Call \`check_project_rules\`.\n` +
						`- Checks: \`@Quick\` vs \`@QType\`, \`console.log\`, id-length, max-params, naming convention, restricted imports, **no-as-unknown**\n` +
						`- Fix all items in \`errors[]\`, re-run until \`passed: true\`\n\n` +
						`---\n\n` +
						`### Step 7 — ✅ Feature is DONE\n\n` +
						`Only when all three gates return \`passed: true\` AND all tests pass:\n` +
						`- \`lint_check\` → \`passed: true\`\n` +
						`- \`typecheck\` → \`passed: true\`\n` +
						`- \`check_project_rules\` → \`passed: true\`\n` +
						`- \`bun test\` → all tests passing\n\n` +
						`The implementation of **${feature_description}** is now complete and ready for review.\n\n` +
						`> Remember to call \`agent_coordinate\` with \`action: "release"\` (Step 0) to free your file claim.`
				),

				this.user(
					`I'm ready to start. Let's implement **${feature_description}** following the TDD cycle above.\n\n` +
						`Please guide me step by step, calling lint_check, typecheck, and check_project_rules ` +
						`at the appropriate steps to ensure the implementation is complete and clean before declaring it done.` +
						(file_paths
							? `\n\nFile(s) to work on: \`${file_paths}\``
							: '')
				),
			],
		});
	}
}
