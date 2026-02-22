import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Guide usage of asynchronous business rules via checkRulesAsync().
 *
 * ⚠️  ASYNC-ONLY: checkRulesAsync() is ONLY for predicates that genuinely require
 * async work (database lookups, external API calls, async validators).
 * For synchronous rules, always use checkRules() — it is simpler and faster.
 *
 * Covers timeoutMs, parallel vs. serial execution mode, and NestJS integration patterns.
 */
export class QAsyncRulesPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	context: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_async_rules';
	title = 'Async business rules with checkRulesAsync()';
	description =
		'⚠️ ASYNC-ONLY SKILL. Use this only when @QRule predicates truly need to be async ' +
		'(e.g. database lookups, external API calls, async validators). ' +
		'For synchronous rules, use checkRules() instead — it is simpler and faster. ' +
		'Guides: checkRulesAsync() API, timeoutMs safety net, parallel vs. serial mode, ' +
		'NestJS / HTTP-request integration patterns.';

	argsSchema = {
		model_code: z
			.string()
			.describe(
				'The QuickModel class with @QRule decorators to make async'
			),
		context: z
			.string()
			.optional()
			.describe(
				'Optional description of the async context: e.g. "NestJS service with TypeORM", ' +
					'"Express middleware", "database uniqueness check"'
			),
	};

	execute(args: { model_code: string; context?: string }) {
		const { model_code, context } = args;

		const contextSection = context
			? `\n\n**Async context:** ${context}`
			: '';

		return Promise.resolve({
			description:
				'Guide usage of checkRulesAsync() for async predicates',
			messages: [
				this.user(
					`I need to use async business rules in my QuickModel.\n\n` +
						`**Model code:**\n\`\`\`typescript\n${model_code}\n\`\`\`` +
						contextSection
				),
				this.assistant(
					'## ⚠️ Important: async rules are for async predicates ONLY\n\n' +
						'`checkRulesAsync()` should **only** be used when your `@QRule` predicates ' +
						'genuinely perform asynchronous operations such as:\n' +
						'- Database uniqueness checks (e.g. TypeORM, Prisma)\n' +
						'- External API call validation\n' +
						'- File system or network I/O inside a predicate\n\n' +
						'If your predicates are synchronous, use `checkRules()` — it is simpler and faster.\n\n' +
						'---\n\n' +
						'### checkRulesAsync() API\n\n' +
						'```typescript\n' +
						'const result = await instance.checkRulesAsync({\n' +
						'  timeoutMs: 5000,              // abort slow predicates after 5 s\n' +
						'  timeoutMessage: "Timed out",  // optional custom message\n' +
						'  mode: "parallel",             // "parallel" (default) | "serial"\n' +
						'});\n' +
						'// result: { valid: boolean, errors: Array<{field, message, value, timedOut?}> }\n' +
						'```\n\n' +
						'### parallel vs. serial mode\n' +
						'- **`parallel`** (default): all async predicates run concurrently via `Promise.all`. ' +
						'Fast but all rules run regardless of earlier failures.\n' +
						'- **`serial`**: predicates run one after another. Stops at the first failure when you ' +
						'need to short-circuit expensive downstream checks.\n\n' +
						'### NestJS / async context integration\n' +
						'In a NestJS service you would typically inject the repository and call:\n' +
						'```typescript\n' +
						'@Injectable()\n' +
						'export class UserService {\n' +
						'  constructor(private repo: UserRepository) {}\n\n' +
						'  async validate(data: unknown) {\n' +
						'    const model = new UserModel(data);\n' +
						'    // Inject async context before checking rules\n' +
						'    return model.checkRulesAsync({ timeoutMs: 3000, mode: "parallel" });\n' +
						'  }\n' +
						'}\n' +
						'```\n\n' +
						'Async predicates in `@QRule` must return `Promise<boolean>`:\n' +
						'```typescript\n' +
						'@QRule(async (value) => !(await repo.existsByEmail(value)), "Email already taken")\n' +
						'declare email: string;\n' +
						'```\n\n' +
						'I will now analyze the provided model and suggest the async rule setup...'
				),
				this.user(
					`Please call \`validate_usage\` on the model code to verify it follows QuickModel conventions. ` +
						`Then show the complete async implementation using checkRulesAsync() ` +
						`with appropriate timeoutMs and the correct parallel or serial mode for ` +
						(context
							? `the described context: ${context}.`
							: `the use case.`) +
						` Remind me when synchronous checkRules() would be sufficient instead.`
				),
			],
		});
	}
}
