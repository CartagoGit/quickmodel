import { QAbstractInternalPrompt } from '../abstract-internal-prompt';

/**
 * Skill: Full project synchronisation — keeps tests, lint, typecheck and
 * documentation in lockstep after any significant change.
 *
 * Runs project_status to capture the current health snapshot, then guides
 * the AI through fixing any failures and regenerating documentation before
 * declaring the project fully in sync.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QProjectStatusTool} for the health snapshot step
 * @see {@link QSyncDocsTool} for the documentation regeneration step
 */
export class QSyncProjectPrompt extends QAbstractInternalPrompt<
	Record<string, never>
> {
	name = 'quickmodel_sync_project';
	title = 'Sync Project (health + documentation, gate-enforced)';
	description =
		'Ensures tests, lint, typecheck and documentation are all passing and up-to-date. ' +
		'Calls project_status to get a consolidated health snapshot, fixes any failures detected, ' +
		'then regenerates documentation with sync_docs. ' +
		'Use after completing a feature, refactor or any batch of changes to confirm full consistency.';

	argsSchema = {};

	execute(_args: Record<string, never>) {
		return Promise.resolve({
			description:
				'Synchronise project health and documentation after changes',
			messages: [
				this.user(
					`Please check the full project health and make sure all layers are in sync: ` +
						`tests, lint, typecheck and documentation.\n\n` +
						`Start by calling \`project_status\` to get a consolidated snapshot.`
				),
				this.assistant(
					`I'll run a full project sync now. Here is the plan:\n\n` +
						`## Sync plan\n\n` +
						`**Step 1 — Health snapshot:** Call \`project_status\` to get the current state ` +
						`of tests, lint and typecheck all at once.\n\n` +
						`**Step 2 — Fix failures (if any):**\n` +
						`- If tests fail → diagnose and fix; then re-run \`run_tests\` until \`passed: true\`.\n` +
						`- If lint errors → fix each violation; then re-run \`lint_check\` until \`passed: true\`.\n` +
						`- If typecheck errors → fix each TS error; then re-run \`typecheck\` until \`passed: true\`.\n\n` +
						`**Step 3 — Sync documentation:** Once all gates are green, call \`sync_docs\` ` +
						`to regenerate the API reference and any auto-generated documentation files.\n\n` +
						`**Step 4 — Final verification:** Call \`project_status\` again to confirm ` +
						`the final snapshot shows \`passed: true\` across all checks.\n\n` +
						`**GATE:** I will NOT declare done until project_status returns \`passed: true\` ` +
						`and documentation has been synchronised via sync_docs.`
				),
				this.user(
					`Go ahead — run project_status first and proceed through each step. ` +
						`Fix any issues found and regenerate documentation before finishing.`
				),
			],
		});
	}
}
