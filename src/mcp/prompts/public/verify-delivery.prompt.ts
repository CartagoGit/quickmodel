import { QAbstractInternalPrompt } from '../abstract-internal-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Pre-delivery quality gate — confirms tests, lint, typecheck and
 * project rules are all green before declaring any work done.
 *
 * This skill embodies the "confirm, not correct" philosophy: it is meant to
 * be invoked as the final step before declaring an implementation or refactor
 * complete. If a gate fails, it redirects to the appropriate fix skill
 * (`quickmodel_fix_lint`, `quickmodel_fix_typecheck`) rather than silently
 * patching errors — which would violate the principle of writing correctly
 * from the first character.
 *
 * Gate order:
 *  1. `check_project_health` — tests + lint + typecheck in one shot
 *  2. `check_project_rules` — id-length, max-params, naming-convention, imports
 *  3. `pre_commit_check` — simulates the Husky hook (ESLint --fix + Prettier --write)
 *
 * All three must return `passed: true` before the work is considered deliverable.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QCheckProjectHealthTool} for the combined health snapshot
 * @see {@link QCheckProjectRulesTool} for internal project rule enforcement
 * @see {@link QPreCommitCheckTool} for the Husky pre-commit simulation
 * @see {@link QFixLintPrompt} for guided lint error resolution when gate fails
 * @see {@link QFixTypecheckPrompt} for guided type error resolution when gate fails
 * @see {@link QImplementFeaturePrompt} for the full implementation workflow that ends with this gate
 */
export class QVerifyDeliveryPrompt extends QAbstractInternalPrompt<
	Record<string, never>
> {
	name = 'quickmodel_verify_delivery';
	title =
		'Verify Delivery (tests + lint + types + rules, confirm not correct)';
	description =
		'Pre-delivery quality gate: confirms tests, lint, typecheck and project rules are all green ' +
		'before declaring any work done. Runs check_project_health → check_project_rules → pre_commit_check. ' +
		'If a gate fails, redirects to quickmodel_fix_lint or quickmodel_fix_typecheck — ' +
		'it does NOT silently patch errors itself, enforcing the "write correctly first time" principle. ' +
		'Use as the final step before declaring any implementation, refactor or fix complete.';

	argsSchema = {};

	execute(_args: Record<string, never>): Promise<IQPromptResult> {
		return Promise.resolve({
			description:
				'Pre-delivery quality gate: tests + lint + types + rules',
			messages: [
				this.user(
					`I am about to declare my work done. Please run all quality gates ` +
						`and confirm that tests, lint, typecheck and project rules are all green.\n\n` +
						`Start with \`check_project_health\`.`
				),

				this.assistant(
					`## ✅ Pre-delivery Quality Gate\n\n` +
						`> **Principio:** Este skill **confirma** que el código se escribió correctamente.\n` +
						`> No está diseñado para corregir errores — si algo falla, el problema ocurrió\n` +
						`> durante la implementación, no aquí. Uso correcto: invocar al final, no como red de seguridad.\n\n` +
						`---\n\n` +
						`### Gate 1 — Project health (tests + lint + typecheck)\n\n` +
						`Call \`check_project_health({})\`.\n\n` +
						`This runs tests, lint and typecheck in a single consolidated report.\n\n` +
						`**If \`passed: false\`:**\n` +
						`- Tests failing → diagnose and fix. Re-run \`run_tests\` until \`passed: true\`.\n` +
						`- Lint errors → invoke \`quickmodel_fix_lint\` with the error output. Do **NOT** edit files manually without that skill.\n` +
						`- Type errors → invoke \`quickmodel_fix_typecheck\` with the error output. Do **NOT** use \`any\` shortcuts.\n\n` +
						`> After any fix, restart from Gate 1 — a fix can introduce new violations.\n\n` +
						`---\n\n` +
						`### Gate 2 — Internal project rules\n\n` +
						`Call \`check_project_rules({})\`.\n\n` +
						`Checks: \`id-length\` ≥ 3, \`max-params\` ≤ 3, \`naming-convention\` (I prefix for interfaces/types),\n` +
						`\`no-restricted-imports\` (no bare \`quickmodel\` from \`src/\`, no \`zod\` inside \`src/mcp/**\`),\n` +
						`\`no-console\` outside allowed files, \`@Quick\` instead of \`@QType\` in tests.\n\n` +
						`**If violations found:**\n` +
						`- Fix each violation directly — these are structural rules, not lint auto-fixes.\n` +
						`- Re-run \`check_project_rules\` until zero violations.\n` +
						`- Then restart from Gate 1.\n\n` +
						`---\n\n` +
						`### Gate 3 — Pre-commit simulation\n\n` +
						`Call \`pre_commit_check({})\`.\n\n` +
						`Simulates the Husky pre-commit hook: ESLint \`--fix\` + Prettier \`--write\`.\n` +
						`This is the final confirmation that the commit would not be rejected.\n\n` +
						`**If \`passed: false\`:** Fix the reported issues, then re-run \`pre_commit_check\` until \`passed: true\`.\n\n` +
						`---\n\n` +
						`### ⛔ DONE condition\n\n` +
						`The work is deliverable **only when all three gates pass simultaneously**:\n\n` +
						`- [ ] \`check_project_health\` → \`passed: true\` (tests ✅, lint ✅, typecheck ✅)\n` +
						`- [ ] \`check_project_rules\` → zero violations\n` +
						`- [ ] \`pre_commit_check\` → \`passed: true\`\n\n` +
						`I will NOT declare done until all three checkboxes are ticked.\n\n` +
						`---\n\n` +
						`Let me start with Gate 1 now.`
				),

				this.user(
					`Run \`check_project_health\` now, then proceed through all three gates. ` +
						`If any gate fails, fix the issues and restart the sequence from Gate 1. ` +
						`Only declare the work done when all three gates return \`passed: true\` simultaneously.`
				),
			],
		});
	}
}
