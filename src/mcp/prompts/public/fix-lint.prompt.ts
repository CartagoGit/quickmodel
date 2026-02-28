import { z } from '@mcp/deps';
import { QAbstractInternalPrompt } from '../abstract-internal-prompt';

/**
 * Skill: Guided step-by-step ESLint error resolution.
 *
 * Given the raw output from lint_check or a pre-commit failure, guides the AI
 * through fixing each violation one by one, calling lint_check after every
 * change, and only declaring done when pre_commit_check returns passed: true.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QLintCheckTool} for the lint gate used in this prompt
 * @see {@link QPreCommitCheckTool} for the final pre-commit gate
 */
export class QFixLintPrompt extends QAbstractInternalPrompt<{
	lint_errors: z.ZodString;
	file_paths: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_fix_lint';
	title = 'Fix ESLint Errors (guided, gate-enforced)';
	description =
		'Step-by-step guide to fix ESLint errors reported by lint_check or a failed pre-commit hook. ' +
		'Explains each violation, applies the minimal correct fix (respecting id-length, max-params, ' +
		'no-implied-eval, require-await, etc.), and enforces a lint_check gate before declaring done. ' +
		'Use after any pre-commit failure or after lint_check returns passed: false.';

	argsSchema = {
		lint_errors: z
			.string()
			.describe(
				'Full text of the ESLint error output, either from lint_check, ' +
					'pre_commit_check, or the Husky pre-commit hook failure.'
			),
		file_paths: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated list of files to re-check with lint_check. ' +
					'Defaults to src/ when omitted.'
			),
	};

	execute(args: { lint_errors: string; file_paths?: string }) {
		const { lint_errors, file_paths } = args;

		const filesSection = file_paths
			? `\n\n**Files to fix:** \`${file_paths}\``
			: '';

		const lintTarget = file_paths
			? `targetFiles: [${file_paths
					.split(',')
					.map((pth) => `"${pth.trim()}"`)
					.join(', ')}]`
			: 'targetDir: "src"';

		return Promise.resolve({
			description:
				'Fix ESLint errors with guided step-by-step resolution',
			messages: [
				this.user(
					`The following ESLint errors were reported by the pre-commit hook or lint_check:\n\n` +
						`\`\`\`\n${lint_errors}\n\`\`\`` +
						filesSection +
						`\n\nPlease guide me through fixing each error correctly and verify the result.`
				),

				this.assistant(
					`## 🚦 Guided ESLint Fix\n\n` +
						`I'll fix each violation following the project rules strictly.\n` +
						`**I CANNOT declare this done until \`lint_check\` returns \`passed: true\`.**\n\n` +
						`---\n\n` +
						`### Common rules and their correct fix\n\n` +
						`| Rule | Wrong | Correct |\n` +
						`|------|---------|---------|\n` +
						`| \`id-length\` | \`fn\`, \`tA\`, \`tB\`, \`p\` | Rename to ≥3 chars: \`func\`, \`valA\`, \`valB\`, \`pth\` |\n` +
						`| \`max-params\` | \`f(a,b,c,d)\` | Group into object: \`f({ valA, valB, valC, valD })\` |\n` +
						`| \`@typescript-eslint/no-implied-eval\` | \`new Function(str)\` | Add \`// eslint-disable-next-line\` only if unavoidable; prefer \`eval\`-free design |\n` +
						`| \`@typescript-eslint/require-await\` | \`async f() { return x; }\` | Remove \`async\` or add a real \`await\`: \`return Promise.resolve(x)\` |\n` +
						`| \`no-useless-escape\` | \`/[\\-]/\` | Fix: \`/[\\x2d]/\` or \`/[-]/\` (move \`-\` to start/end) |\n` +
						`| \`security/detect-non-literal-regexp\` | \`new RegExp(VAR)\` | Move regex to inline literal inside the method: \`/pattern/flags\` |\n` +
						`| \`no-console\` | \`console.log\` in \`src/\` | Remove or replace with return value; allowed only in \`mcp-cli.ts\` and \`server.ts\` |\n` +
						`| \`naming-convention\` | \`interface User\` | Add \`I\` prefix: \`interface IUser\` |\n\n` +
						`---\n\n` +
						`### Step-by-step plan\n\n` +
						`I will process each error from the output above:\n\n` +
						`\`\`\`\n${lint_errors}\n\`\`\`\n\n` +
						`After **every file edit**, I run:\n` +
						`\`\`\`\nlint_check({ ${lintTarget} })\n\`\`\`\n\n` +
						`⛔ I will **NOT declare the work done** until \`lint_check\` returns:\n` +
						`\`\`\`json\n{ "passed": true, "total_errors": 0 }\n\`\`\`\n\n` +
						`---\n\n` +
						`### Final gate\n\n` +
						`Once \`lint_check\` passes, I run:\n` +
						`\`\`\`\npre_commit_check({ files: [${
							file_paths
								? file_paths
										.split(',')
										.map((pth) => `"${pth.trim()}"`)
										.join(', ')
								: '"src"'
						}] })\n\`\`\`\n\n` +
						`Only when \`pre_commit_check\` returns \`{ "passed": true }\` is the work finished.\n\n` +
						`Let me start fixing the errors now…`
				),

				this.user(
					`Go ahead — fix each error one by one, run lint_check after each change, ` +
						`and confirm with pre_commit_check at the end.` +
						(file_paths ? `\n\nFocus on: ${file_paths}` : '')
				),
			],
		});
	}
}
