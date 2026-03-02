import { z } from '@mcp/deps';
import { QAbstractInternalPrompt } from '../abstract-internal-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Guided execution of external scripts (Python, bash, Node.js, etc.).
 *
 * When a task requires a script in a language other than TypeScript —
 * e.g. a Python one-liner to inspect a JSON file, a bash pipeline to batch-rename
 * files, or a Node.js snippet to query an API — this skill provides a structured
 * workflow that ensures the script is minimal, auditable and leaves no side effects.
 *
 * The workflow enforces five phases:
 *  1. **Document intent** — state clearly what the script does, why it is needed,
 *     and which files or data it reads or writes
 *  2. **Audit** — verify the script is minimal, paths are safe, no credentials
 *     are embedded, and unintended side effects are absent
 *  3. **Run** — execute with explicit error handling; capture stdout/stderr
 *  4. **Process output** — integrate results back into the project workflow;
 *     transform output into actionable changes if needed
 *  5. **Clean up** — remove temp files; verify no unintended changes were left;
 *     confirm the working tree is in the expected state
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QVerifyDeliveryPrompt} for the final quality gate to run after applying script results
 * @see {@link QSyncProjectPrompt} for syncing the project after bulk file changes from a script
 */
export class QRunScriptPrompt extends QAbstractInternalPrompt<{
	purpose: z.ZodString;
	script: z.ZodString;
	language: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_run_script';
	title = 'Run External Script (Python / bash / Node.js — guided, audited)';
	description =
		'Guided workflow for running external scripts in Python, bash, Node.js or any other language. ' +
		'Ensures the script is minimal, auditable and side-effect-free: ' +
		'document intent → audit the script → run with error handling → process output → clean up. ' +
		'Use whenever a task requires a non-TypeScript tool: inspecting JSON, batch file operations, ' +
		'SDK queries, data transformations, or any automation that does not belong in the TypeScript source.';

	argsSchema = {
		purpose: z
			.string()
			.describe(
				'Clear statement of what the script is for and what outcome is expected. ' +
					'E.g. "Inspect VS Code extension package.json to list all config keys that reference file paths."'
			),
		script: z.string().describe('The script content to review and run.'),
		language: z
			.string()
			.optional()
			.describe(
				'Script language: "python", "bash", "node", etc. ' +
					'Inferred from the script when omitted.'
			),
	};

	execute(args: {
		purpose: string;
		script: string;
		language?: string;
	}): Promise<IQPromptResult> {
		const { purpose, script, language } = args;
		const langLabel = language ?? '(auto-detect from script)';

		return Promise.resolve({
			description: `Run external script: ${purpose}`,
			messages: [
				this.user(
					`I need to run an external script to accomplish the following:\n\n` +
						`**Purpose:** ${purpose}\n\n` +
						`**Language:** ${langLabel}\n\n` +
						`**Script:**\n\`\`\`\n${script}\n\`\`\`\n\n` +
						`Please guide me through running it safely and integrating the result.`
				),

				this.assistant(
					`## 🛠️ External Script Workflow\n\n` +
						`Running scripts outside the TypeScript source is normal and expected — ` +
						`Python one-liners, bash pipelines, Node.js snippets. ` +
						`The goal is to make every such execution **intentional, auditable, and clean**.\n\n` +
						`---\n\n` +
						`### Step 0 — 🤝 Register your work (mandatory)\n\n` +
						`If this script will produce **code changes** (Phase 4), register before applying them:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — confirm no other agent owns the files you will modify\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\`, task \`"run-script: ${purpose}"\`, and \`files\` (the files the script output will be applied to)\n` +
						`3. If \`conflict: true\` → **STOP**. Do not apply any code change until the conflict is resolved.\n` +
						`4. **Read before every write:** Immediately before modifying each file, read its current content from disk — your context may be stale if another agent edited it since you started. If the file changed: adapt your change, merge carefully, or skip if no longer needed. Never overwrite from stale context.\n` +
						`5. Release when done: \`agent_coordinate action="release"\`\n` +
						`> If the script is read-only (output is informational only, no file writes), skip this step.\n\n` +
						`---\n\n` +
						`### Phase 1 — Document intent\n\n` +
						`Before running anything, state explicitly:\n\n` +
						`- **What it reads:** which files, APIs, environment variables or data sources\n` +
						`- **What it writes:** which files or state it modifies (if any)\n` +
						`- **Why a script is the right tool:** not just convenient — genuinely the right approach for this task\n` +
						`- **Expected output shape:** what format the result will be in\n\n` +
						`> Purpose for this run: **${purpose}**\n\n` +
						`---\n\n` +
						`### Phase 2 — Audit the script\n\n` +
						`Review the script before executing it:\n\n` +
						`| Check | Requirement |\n` +
						`|-------|-------------|\n` +
						`| Minimal | Does it do exactly what is needed and nothing else? |\n` +
						`| Safe paths | File paths are safe. NEVER use /tmp — use ./tmp/ of the project instead |\n` +
						`| No \`>\` redirects | **NEVER** use \`>\` or \`>>\` — they can trigger VS Code approval prompts that block the agent. Use \`| tee ./tmp/file.txt\` to capture output. To write/edit files use VS Code tools: replace_string_in_file / create_file |\n` +
						`| No file edits via terminal | NEVER edit source files using head/tail/sed/awk + \`>\`. Use replace_string_in_file or create_file tools |\n` +
						`| No credentials | No tokens, keys or passwords embedded in the script |\n` +
						`| No destructive writes | If it writes files, are they the ones we intend to change? |\n` +
						`| Error handling | Does it exit non-zero on failure? |\n` +
						`| Idempotent | Can it be run again without causing double-effects? |\n\n` +
						`**Script to audit:**\n` +
						`\`\`\`\n${script}\n\`\`\`\n\n` +
						`If any check fails — fix the script before running. Do not proceed to Phase 3 with an unsafe script.\n\n` +
						`---\n\n` +
						`### Phase 3 — Run\n\n` +
						`Execute the script. Capture both stdout and stderr.\n\n` +
						`- If the script exits non-zero → diagnose the error from stderr before retrying\n` +
						`- Do not silently ignore a non-zero exit code\n` +
						`- If the script requires a specific runtime version, confirm it is available first\n\n` +
						`---\n\n` +
						`### Phase 4 — Process output\n\n` +
						`Take the captured output and integrate it into the project:\n\n` +
						`- Parse the output into the format the next step needs\n` +
						`- Apply it to the relevant files, config or data structures\n` +
						`- If the output drives code changes → apply those changes now and verify they are correct\n` +
						`- If the output is informational → record the finding and decide the next action explicitly\n\n` +
						`---\n\n` +
						`### Phase 5 — Clean up\n\n` +
						`After the script and its results have been applied:\n\n` +
						`- Remove any temporary files created by the script\n` +
						`- Run \`git status\` (or equivalent) to confirm the working tree looks as expected\n` +
						`- If the script produced changes to tracked files → those changes are intentional and should be committed\n` +
						`- If the script left unintended changes → revert them before continuing\n\n` +
						`> If code changes were applied from the script output, finish with **\`quickmodel_verify_delivery\`** to confirm all quality gates still pass.\n\n` +
						`---\n\n` +
						`### ⛔ DONE condition\n\n` +
						`- [ ] Intent documented (reads / writes / why a script)\n` +
						`- [ ] Script audited (minimal, safe, no credentials, no destructive writes)\n` +
						`- [ ] Script ran with exit code 0\n` +
						`- [ ] Output integrated into the project\n` +
						`- [ ] Working tree clean — no unintended changes\n` +
						`- [ ] If code changed → \`quickmodel_verify_delivery\` passed\n\n` +
						`Let me start with Phase 2 — auditing the script now.`
				),

				this.user(
					`Audit the script, then run it, process the output and clean up. ` +
						`If the result drives code changes, finish with \`quickmodel_verify_delivery\`.`
				),
			],
		});
	}
}
