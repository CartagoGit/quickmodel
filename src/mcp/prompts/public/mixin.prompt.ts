import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Extend a non-QModel base class with QModel capabilities (mixin pattern).
 *
 * `QModel.extends(BaseClass)` returns a new class that inherits from `BaseClass`
 * while gaining all QuickModel features (@Quick, serialize, checkRules, etc.).
 *
 * Covered patterns:
 * - `QModel.extends(BaseEntity)` base class wiring
 * - `IQImplements<TSchema>` type-only interface for strong typing
 * - `instanceof` caveat (QuickModel does NOT multi-inherit JS prototype chain)
 * - Typical Angular/NestJS entity scenarios
 */
export class QMixinPrompt extends QAbstractPrompt<{
	base_class: z.ZodString;
	model_fields: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_mixin';
	title = 'Extend a Base Class with QModel (Mixin Pattern)';
	description =
		'Explains how to extend a non-QModel base class (e.g. a TypeORM entity, NestJS DTO) ' +
		'with QuickModel features using `QModel.extends(BaseClass)`. ' +
		'Covers IQImplements typing, instanceof caveats, and validate_usage checks.';

	argsSchema = {
		base_class: z
			.string()
			.describe(
				'The name of the base class to extend (e.g. "BaseEntity", "TypeORMUser")'
			),
		model_fields: z
			.string()
			.optional()
			.describe(
				'Optional comma-separated field declarations to include in the example ' +
					'(e.g. "createdAt: Date, status: string, score: number")'
			),
	};

	execute(args: {
		base_class: string;
		model_fields?: string;
	}): Promise<IQPromptResult> {
		const { base_class, model_fields } = args;

		const fieldsBlock =
			model_fields
				?.split(',')
				.map((field) => field.trim())
				.filter(Boolean)
				.map((field) => `\tdeclare ${field};`)
				.join('\n') ?? '\tdeclare createdAt: Date;';

		return Promise.resolve({
			description: 'Mixin pattern: extend a base class with QModel',
			messages: [
				this.user(
					`How do I extend my base class \`${base_class}\` with QuickModel capabilities?` +
						(model_fields
							? `\nThe model needs these fields: ${model_fields}`
							: '')
				),
				this.assistant(
					'Use `QModel.extends(BaseClass)` to compose QuickModel features onto any class:\n\n' +
						'---\n\n' +
						'**Step 1 — Wire the mixin**\n\n' +
						'```typescript\n' +
						`import { QModel } from '@cartago-git/quickmodel';\n` +
						`import { ${base_class} } from './your-base';\n\n` +
						`@Quick({ /* transformers */ })\n` +
						`export class MyModel extends QModel.extends(${base_class}) implements IQImplements<typeof MyModel> {\n` +
						`${fieldsBlock}\n` +
						`}\n` +
						'```\n\n' +
						'`QModel.extends(BaseClass)` returns an anonymous class that:\n' +
						'- Inherits the full JS prototype chain of `BaseClass`\n' +
						'- Injects the QuickModel store, `serialize()`, `checkRules()`, `checkIntegrity()`, etc.\n\n' +
						'---\n\n' +
						'**Step 2 — Add the `IQImplements` interface for strong typing**\n\n' +
						'```typescript\n' +
						`import { IQImplements } from '@cartago-git/quickmodel';\n\n` +
						`export class MyModel\n` +
						`  extends QModel.extends(${base_class})\n` +
						`  implements IQImplements<typeof MyModel> {\n` +
						'  ...\n' +
						'}\n' +
						'```\n\n' +
						'`IQImplements<T>` is a type-only helper — it tells TypeScript that `MyModel` ' +
						'has all the static methods expected by QuickModel without adding runtime overhead.\n\n' +
						'---\n\n' +
						'**Step 3 — ⚠️ `instanceof` caveat**\n\n' +
						'Because JavaScript does not support true multiple inheritance, ' +
						'`QModel.extends()` inserts itself into the prototype chain:\n\n' +
						'```typescript\n' +
						`const instance = MyModel.create(data);\n\n` +
						`instance instanceof MyModel;    // ✅ true\n` +
						`instance instanceof ${base_class};  // ✅ true (prototype chain is intact)\n` +
						`instance instanceof QModel;      // ⚠️ false — QModel is not in the chain\n` +
						'```\n\n' +
						'If you need to check for QuickModel capability, use:\n' +
						'```typescript\n' +
						`import { isQModel } from '@cartago-git/quickmodel';\n` +
						`isQModel(instance); // ✅ true\n` +
						'```\n\n' +
						'---\n\n' +
						'**Step 4 — Verify with `validate_usage`**\n\n' +
						'Before submitting, call `validate_usage` with your class code to ' +
						'catch common mistakes (missing `declare`, wrong inheritance, etc.).'
				),
				this.user(
					`Please check this ${base_class} mixin implementation for common errors:\n\n` +
						`\`\`\`typescript\n` +
						`import { QModel, IQImplements } from '@cartago-git/quickmodel';\n` +
						`import { ${base_class} } from './base';\n\n` +
						`@Quick({ /* transformers */ })\n` +
						`export class MyModel extends QModel.extends(${base_class}) implements IQImplements<typeof MyModel> {\n` +
						`${fieldsBlock}\n` +
						`}\n` +
						`\`\`\`\n\n` +
						`Use \`validate_usage\` to verify it and summarize any issues or confirm it is correct.`
				),
			],
		});
	}
}
