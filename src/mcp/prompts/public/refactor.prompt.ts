import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Guided refactoring cycle with TDD gates.
 *
 * Guides the AI through a safe refactor: run tests first to establish a green
 * baseline, apply the refactor, then verify with run_tests + lint_check +
 * typecheck + check_project_rules before declaring done.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QRunTestsTool} for the test gate
 * @see {@link QLintCheckTool} for the lint gate
 * @see {@link QCheckProjectRulesTool} for the project rules gate
 */
export class QRefactorPrompt extends QAbstractPrompt<{
	description: z.ZodString;
	file_paths: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_refactor';
	title = 'Safe Refactor (TDD-gated, rule-enforced)';
	description =
		'Guides a safe refactoring cycle: establish a green test baseline, apply the refactor, ' +
		'then gate on run_tests + lint_check + typecheck + check_project_rules before declaring done. ' +
		'Ensures the refactor preserves all existing behaviours and complies with all project rules.';

	argsSchema = {
		description: z
			.string()
			.describe(
				'Clear description of what should be refactored and the goal ' +
					'(e.g. "Extract the parsing logic from QRunTestsTool into a private helper").'
			),
		file_paths: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated list of files to refactor. ' +
					'If omitted, the agent must identify them from the description.'
			),
	};

	execute(args: { description: string; file_paths?: string }) {
		const { description, file_paths } = args;

		const filesSection = file_paths
			? `\n\n**Target files:** \`${file_paths}\``
			: '';

		return Promise.resolve({
			description: 'Safe refactoring cycle with TDD gates',
			messages: [
				this.user(
					`I need to perform the following refactor:\n\n` +
						`**${description}**` +
						filesSection +
						`\n\nPlease guide me through this refactoring safely, ensuring no regressions.`
				),
				this.assistant(
					`I'll guide this refactoring using a safe, gate-enforced cycle.\n\n` +
						`## Refactoring Rules (QuickModel)\n\n` +
						`- **No \`any\`** — use \`unknown\` + narrowing or explicit types\n` +
						`- **id-length ≥ 3** — rename short variables: \`fn→func\`, \`tA→valA\`, \`res→result\`\n` +
						`- **max-params ≤ 3** — if more params needed, group into an options object\n` +
						`- **Interfaces prefixed \`I\`** — \`interface IFoo {}\`, never \`interface Foo {}\`\n` +
						`- **Path aliases** — use \`@/core/...\`, \`@/transformers/...\` (never relative dots)\n` +
						`- **No barrel files** — import directly from the source file\n` +
						`- **Tabs, single-quotes, 100 chars max** line length\n\n` +
						`## Step-by-step plan\n\n` +
						`**Step 1 — Baseline (green):**\n` +
						`Call \`run_tests\` to confirm the suite is currently passing.\n` +
						`Only proceed if \`passed: true\`.\n\n` +
						`**Step 2 — Apply the refactor:**\n` +
						`Make the minimal targeted change described. ` +
						`Keep the public API intact unless the refactor explicitly changes it.\n\n` +
						`**Step 3 — Verify no regressions:**\n` +
						`Call \`run_tests\` again. All tests must still pass (\`passed: true\`).\n\n` +
						`**Step 4 — Lint gate:**\n` +
						`Call \`lint_check\` on the changed files. Must return \`passed: true\`.\n\n` +
						`**Step 5 — Type gate:**\n` +
						`Call \`typecheck({})\`. Must return \`passed: true\`.\n\n` +
						`**Step 6 — Rules gate:**\n` +
						`Call \`check_project_rules\`. Must report zero violations.\n\n` +
						`**DONE gate:** I will NOT declare this refactor complete until:\n` +
						`- \`run_tests\` → \`passed: true\`\n` +
						`- \`lint_check\` → \`passed: true\`\n` +
						`- \`typecheck\` → \`passed: true\`\n` +
						`- \`check_project_rules\` → zero violations\n\n` +
						`Let me start with Step 1 now.`
				),
				this.user(
					`Go ahead — run the tests first to establish the baseline, ` +
						`then apply the refactor and verify all gates pass. ` +
						`Use \`run_tests\`, \`lint_check\`, \`typecheck\`, and \`check_project_rules\` as required.`
				),
			],
		});
	}
}
