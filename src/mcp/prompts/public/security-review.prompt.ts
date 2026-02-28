import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Review a QuickModel for security vulnerabilities and suggest hardening.
 *
 * Orchestrates `check_security` → explains findings → recommends hardening:
 * - unknownPropertyPolicy: 'strip' — prevent mass assignment
 * - populationLimit — prevent DoS via large arrays
 * - Field-level type enforcement preventing prototype pollution
 * - Safe defaults for common attack vectors
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QCheckSecurityTool} for the security check step
 * @see {@link QCheckIntegrityTool} for integrity validation
 */
export class QSecurityReviewPrompt extends QAbstractPrompt<{
	model_code: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_security_review';
	title = 'Security Review for a QuickModel';
	description =
		'Reviews a QuickModel for security vulnerabilities (mass assignment, prototype pollution, DoS) ' +
		'and suggests hardening. Orchestrates check_security, explains results, and recommends ' +
		'unknownPropertyPolicy: "strip", populationLimit, and field-level type enforcement.';

	argsSchema = {
		model_code: z
			.string()
			.optional()
			.describe(
				'Optional QuickModel class code to review. If omitted, runs general project security audit.'
			),
	};

	execute(args: { model_code?: string }): Promise<IQPromptResult> {
		const { model_code } = args;

		const codeSection = model_code
			? `\n\n**Model code to review:**\n\`\`\`typescript\n${model_code}\n\`\`\``
			: '';

		return Promise.resolve({
			description: 'Security review and hardening for QuickModel',
			messages: [
				this.user(
					`I want a security review of my QuickModel setup.` +
						codeSection
				),
				this.assistant(
					`### Security review workflow\n\n` +
						`I will:\n` +
						`1. Run \`check_security\` to execute the full security test suite\n` +
						`2. Explain any vulnerabilities found\n` +
						`3. Recommend hardening steps\n\n` +
						`---\n\n` +
						`### Common QuickModel security vulnerabilities\n\n` +
						`#### 1. Mass assignment (strip unknown properties)\n` +
						`The most critical setting. Without it, an attacker can inject arbitrary fields:\n` +
						`\`\`\`typescript\n` +
						`// ⚠️  Vulnerable: unknown properties are kept by default (will change in v2.0.0)\n` +
						`@Quick({})\n` +
						`class UserModel extends QModel<UserModel> { ... }\n\n` +
						`// ✅ Hardened: strip unknown properties\n` +
						`@Quick({}, { unknownPropertyPolicy: 'strip' })\n` +
						`class UserModel extends QModel<UserModel> { ... }\n` +
						`\`\`\`\n\n` +
						`#### 2. Population DoS (large arrays or Maps)\n` +
						`Without a limit, an attacker can send arbitrarily large collections:\n` +
						`\`\`\`typescript\n` +
						`// ✅ Cap collection size during population\n` +
						`@Quick({ tags: Set }, { populationLimit: 100 })\n` +
						`class PostModel extends QModel<PostModel> { ... }\n` +
						`\`\`\`\n\n` +
						`#### 3. Prototype pollution via type enforcement\n` +
						`QuickModel's strict transformer pipeline rejects values that don't match ` +
						`the declared type, preventing prototype pollution via crafted payloads.\n` +
						`Always declare types explicitly — avoid \`declare val: any\`.\n\n` +
						`#### 4. ReDoS via RegExp transformer\n` +
						`If you store user-supplied regex strings, validate pattern complexity before ` +
						`passing to the RegExp transformer. QuickModel applies a basic complexity check ` +
						`but an allow-list is safer.\n\n` +
						`I will now run the security suite...`
				),
				this.user(
					`Please call \`check_security\` to run the full security test suite. ` +
						(model_code
							? `Then review the model code above specifically for mass assignment risk (missing unknownPropertyPolicy: 'strip'), ` +
								`any fields declared as \`any\`, and missing populationLimit. `
							: ``) +
						`Explain any failures and provide a hardened version of the model with ` +
						`unknownPropertyPolicy, appropriate populationLimit, and type-safe field declarations.`
				),
			],
		});
	}
}
