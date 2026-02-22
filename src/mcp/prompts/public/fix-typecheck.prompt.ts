import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Guided step-by-step TypeScript type error resolution.
 *
 * Given the raw output from typecheck, guides the AI through fixing each
 * TS error one by one, calling typecheck after every change, and only
 * declaring done when typecheck and pre_commit_check both return passed: true.
 */
export class QFixTypecheckPrompt extends QAbstractPrompt<{
	type_errors: z.ZodString;
	file_paths: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_fix_typecheck';
	title = 'Fix TypeScript Type Errors (guided, gate-enforced)';
	description =
		'Step-by-step guide to fix TypeScript type errors reported by typecheck (tsc --noEmit). ' +
		'Explains each TS error code, applies the minimal correct type fix (no `any` shortcuts), ' +
		'and enforces a typecheck gate before declaring done. ' +
		'Use after typecheck returns passed: false.';

	argsSchema = {
		type_errors: z
			.string()
			.describe(
				'Full text of the TypeScript error output from typecheck or the tsc CLI. ' +
					'Format: src/file.ts(line,col): error TSxxxx: message.'
			),
		file_paths: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated list of files to focus on. ' +
					'Defaults to the full src/ when omitted.'
			),
	};

	execute(args: { type_errors: string; file_paths?: string }) {
		const { type_errors, file_paths } = args;

		const filesSection = file_paths
			? `\n\n**Files to fix:** \`${file_paths}\``
			: '';

		const typecheckTarget = file_paths
			? `(focus on: ${file_paths})`
			: '(full src/)';

		return Promise.resolve({
			description:
				'Fix TypeScript type errors with guided step-by-step resolution',
			messages: [
				this.user(
					`The following TypeScript type errors were reported by typecheck:\n\n` +
						`\`\`\`\n${type_errors}\n\`\`\`` +
						filesSection +
						`\n\nPlease guide me through fixing each error correctly and verify the result.`
				),
				this.assistant(
					`I'll fix each TypeScript type error systematically. Here's my plan:\n\n` +
						`## Common TS Error Quick Reference\n\n` +
						`| Code | Meaning | Fix strategy |\n` +
						`|------|---------|-------------|\n` +
						`| TS2322 | Type mismatch (assignability) | Align types; use correct type annotation; never cast with \`as any\` |\n` +
						`| TS2339 | Property does not exist on type | Add property to interface; use optional chaining if intentional |\n` +
						`| TS7006 | Parameter has implicit \`any\` | Add explicit parameter type annotation |\n` +
						`| TS2345 | Argument type mismatch | Correct argument type or fix the function signature |\n` +
						`| TS2531 | Object is possibly null | Add null check; use optional chaining or non-null assertion only if safe |\n` +
						`| TS2304 | Cannot find name | Import missing symbol; verify path alias (\`@/core/...\`) |\n` +
						`| TS2554 | Expected N arguments but got M | Correct the call site or update the signature |\n\n` +
						`## Key rules in this codebase\n\n` +
						`- **\`strict: true\`** — all types must be explicit or inferrable; no implicit \`any\`\n` +
						`- **\`noUncheckedIndexedAccess\`** — array/Map access returns \`T | undefined\`; always guard\n` +
						`- **\`noImplicitReturns\`** — every code branch must return a value\n` +
						`- **Interfaces prefixed with \`I\`** — \`interface IUser {}\`, \`type IStatus = ...\`\n` +
						`- **No \`any\`** — use \`unknown\` and narrow, or add a proper type\n\n` +
						`## Fix plan ${typecheckTarget}\n\n` +
						`I'll go error by error, starting from the first one in the output:\n\n` +
						`1. Read the error → identify the code → apply the minimal correct fix\n` +
						`2. After each fix, mentally verify the type chain is still consistent\n` +
						`3. After all fixes → call \`typecheck({})\`\n` +
						`4. If \`typecheck\` returns \`passed: true\` → call \`pre_commit_check\` as final gate\n\n` +
						`**GATE:** I will NOT declare done until \`typecheck\` returns \`passed: true\` ` +
						`AND \`pre_commit_check\` returns \`passed: true\`.`
				),
				this.user(
					`Go ahead and fix the type errors one by one. ` +
						`Call \`typecheck({})\` after each batch of changes. ` +
						`Finish with \`pre_commit_check\` when \`typecheck\` reports \`passed: true\`.`
				),
			],
		});
	}
}
