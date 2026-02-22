import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Migrate legacy code to QuickModel v2 patterns.
 *
 * Guides the AI through converting plain classes or legacy QuickModel v1 code
 * into idiomatic v2 patterns: declare fields, @Quick decorator, proper typing.
 */
export class QMigrationPrompt extends QAbstractPrompt<{
	legacy_code: z.ZodString;
}> {
	name = 'quickmodel_migration';
	title = 'Migrate legacy code to QuickModel';
	description =
		'Migrates legacy or non-idiomatic TypeScript classes to QuickModel v2. ' +
		'Converts property assignments to `declare` fields, wraps with `@Quick({})`, ' +
		'adds proper typing, and validates the result. ' +
		'Handles v1 → v2 upgrade paths and plain-class → QModel conversions.';

	argsSchema = {
		legacy_code: z
			.string()
			.describe(
				'The legacy TypeScript class or outdated QuickModel code to migrate to v2 patterns'
			),
	};

	execute(args: { legacy_code: string }) {
		const { legacy_code } = args;

		return Promise.resolve({
			description: 'Migrate legacy code to QuickModel',
			messages: [
				this.user(
					`I have the following legacy code that I want to migrate to QuickModel v2:\n\n` +
						`\`\`\`typescript\n${legacy_code}\n\`\`\``
				),
				this.assistant(
					'I will migrate this code to idiomatic QuickModel v2. Here is the step-by-step upgrade plan:\n\n' +
						'### Migration checklist\n' +
						'1. **Extend `QModel<T>`** — the class must extend `QModel<ClassName>`\n' +
						'2. **Add `@Quick({})`** — every model needs the `@Quick` decorator with at least an empty options object\n' +
						'3. **Convert property assignments to `declare`** — replace `field = value` with `declare field: Type`. ' +
						'QuickModel manages initialization; direct assignment bypasses it\n' +
						'4. **Add transformer types** — if a field holds a complex type (Date, Set, Map…), add it to `@Quick({ field: Date })`\n' +
						'5. **Remove manual constructors** that assign fields — the base constructor handles hydration\n' +
						'6. **Call `validate_usage`** — verify the migrated code follows all v2 conventions\n\n' +
						'### v2 pattern example\n' +
						'```typescript\n' +
						'// ❌ Before (legacy)\n' +
						'class User {\n' +
						'  name: string = "";\n' +
						'  createdAt: Date = new Date();\n' +
						'  constructor(data: any) { this.name = data.name; this.createdAt = new Date(data.createdAt); }\n' +
						'}\n\n' +
						'// ✅ After (QuickModel v2)\n' +
						'@Quick({ createdAt: Date })\n' +
						'class User extends QModel<User> {\n' +
						'  declare name: string;\n' +
						'  declare createdAt: Date;\n' +
						'}\n' +
						'```\n\n' +
						'Applying this migration to the provided code now...'
				),
				this.user(
					`Please call \`validate_usage\` on the migrated code to confirm it follows QuickModel v2 conventions. ` +
						`Then provide the final migrated version with an explanation of every change made, ` +
						`highlighting any places where the upgrade or update path required special attention.`
				),
			],
		});
	}
}
