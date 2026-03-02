import { z } from '@mcp/deps';
import { QAbstractInternalPrompt } from '../abstract-internal-prompt';

/**
 * Skill: Guided SOLID principles review and application.
 *
 * Analyses the specified files against each of the 5 SOLID principles
 * and guides the AI through structured improvements, gated by run_tests,
 * lint_check and typecheck to ensure no regressions.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QRunTestsTool} for the test gate
 * @see {@link QLintCheckTool} for the lint gate
 */
export class QApplySolidPrompt extends QAbstractInternalPrompt<{
	file_paths: z.ZodString;
	concern: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_apply_solid';
	title = 'Apply SOLID Principles (guided, gate-enforced)';
	description =
		'Guides a structured review and improvement of source files against all 5 SOLID principles. ' +
		'Evaluates SRP, OCP, LSP, ISP and DIP; proposes targeted refactors; gates on run_tests, ' +
		'lint_check and typecheck before declaring done. ' +
		'Use when a file has grown too large, mixes responsibilities, or relies on concrete implementations.';

	argsSchema = {
		file_paths: z
			.string()
			.describe(
				'Comma-separated list of source files to review ' +
					'(e.g. "src/mcp/tools/internal/my-tool.ts").'
			),
		concern: z
			.string()
			.optional()
			.describe(
				'Optional specific SOLID concern already identified ' +
					'(e.g. "The class handles both parsing and IO — SRP violation").'
			),
	};

	execute(args: { file_paths: string; concern?: string }) {
		const { file_paths, concern } = args;

		const concernSection = concern
			? `\n\n**Identified concern:** ${concern}`
			: '';

		const lintTarget = file_paths
			.split(',')
			.map((pth) => `"${pth.trim()}"`)
			.join(', ');

		return Promise.resolve({
			description:
				'Review and apply SOLID principles with guided refactoring',
			messages: [
				this.user(
					`Please review the following files against all 5 SOLID principles and guide me ` +
						`through any improvements:\n\n**Files:** \`${file_paths}\`` +
						concernSection +
						`\n\nAnalyse each principle and propose targeted refactors where violations exist.`
				),
				this.assistant(
					`I'll review the files systematically against all 5 SOLID principles.\n\n` +
						`## SOLID Principles Reference\n\n` +
						`| Principle | Code | What to check                                              | Common fix                           |\n` +
						`| --------- | ---- | ---------------------------------------------------------- | ------------------------------------ |\n` +
						`| Single Responsibility | **SRP** | Does each class have exactly ONE reason to change? | Split concerns into separate classes |\n` +
						`| Open/Closed | **OCP** | Can behaviours be extended without modifying existing code? | Use abstract bases, strategy pattern |\n` +
						`| Liskov Substitution | **LSP** | Can subtypes fully replace base types without breaking callers? | Don't override to throw; preserve contract |\n` +
						`| Interface Segregation | **ISP** | Are interfaces lean? Do clients depend on methods they don't use? | Split fat interfaces into focused ones |\n` +
						`| Dependency Inversion | **DIP** | Do high-level modules depend on abstractions, not concretions? | Inject via interface; use constructor injection |\n\n` +
						`## SOLID in this codebase\n\n` +
						`- **QAbstractTool / QAbstractPrompt** — OCP and DIP: extend the abstract base, inject \`_spawn\`\n` +
						`- **IQMcpTool / IQMcpPrompt** — ISP: lean, focused interfaces per concern\n` +
						`- **spawnCommand** — DIP: injectable, mockable I/O abstraction\n` +
						`- **Transformers** — SRP: each transformer handles exactly one TypeScript type\n\n` +
						`## Review plan for \`${file_paths}\`\n\n` +
						`**Step 0 — 🤝 Register your work (mandatory):**\n` +
						`Before touching any file:\n` +
						`1. Call \`agent_coordinate\` with \`action: "check"\` — confirm no other agent is working on overlapping files.\n` +
						`   If \`agents[]\` is non-empty: check what staged/unstaged changes they have (via git) and wait for them to commit or stash if there is overlap.\n` +
						`2. Call \`agent_coordinate\` with \`action: "claim"\`, your \`agentId\`, task \`"apply SOLID to ${file_paths}"\`, and \`files: [${lintTarget}]\`.\n` +
						`3. If \`conflict: true\` → **STOP immediately**. Do not modify any file. Inform the user and wait.\n` +
						`4. **Read before every write:** Immediately before modifying each file, read its current content from disk — your context may be stale if another agent edited it since you started. If the file changed: adapt your change, merge carefully, or skip if no longer needed. Never overwrite from stale context.\n` +
						`5. Release when done (even if the task fails): \`agent_coordinate action="release"\`\n\n` +
						`---\n\n` +
						`**Step 1 — Baseline:** Call \`run_tests\` to confirm green baseline before any change.\n\n` +
						`**Step 2 — SRP:** Does each class/method have a single clear responsibility?\n` +
						`→ If a class has >1 section with different concerns, extract into separate classes/helpers.\n\n` +
						`**Step 3 — OCP:** Are extensions possible without modifying existing code?\n` +
						`→ If switch/if-else chains exist for type dispatch, consider strategy or registry pattern.\n\n` +
						`**Step 4 — LSP:** Do subclasses honour the full contract of the base class?\n` +
						`→ Override methods should NOT narrow preconditions or throw where base doesn't.\n\n` +
						`**Step 5 — ISP:** Are interfaces tight and focused?\n` +
						`→ Split any interface with >5 methods if consumers only use a subset.\n\n` +
						`**Step 6 — DIP:** Are dependencies injected as abstractions?\n` +
						`→ Replace \`new ConcreteClass()\` calls inside constructors with injected interfaces.\n\n` +
						`**After each change:**\n` +
						`1. Call \`run_tests\` → \`passed: true\` (no regressions)\n` +
						`2. Call \`lint_check({ targetFiles: [${lintTarget}] })\` → \`passed: true\`\n` +
						`3. Call \`typecheck({})\` → \`passed: true\`\n\n` +
						`**GATE:** I will NOT declare done until run_tests, lint_check and typecheck all return \`passed: true\`.`
				),
				this.user(
					`Go ahead — review the files against each SOLID principle and propose the improvements. ` +
						`Make the changes one principle at a time and run the gates after each batch.`
				),
			],
		});
	}
}
