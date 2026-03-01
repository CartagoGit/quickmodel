import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Explain and apply @QAlias and @QComputed decorators.
 *
 * Guides the AI through understanding field name remapping and computed-getter
 * serialization, covering common mistakes and best practices.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QValidateUsageTool} for usage verification
 * @see {@link QModel.serialize} for the serialize step that outputs aliased/computed fields
 */
export class QAliasComputedPrompt extends QAbstractPrompt<{
	model_code: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_alias_computed';
	title = 'Use @QAlias and @QComputed';
	description =
		'Explains how to remap field names during serialization with @QAlias ' +
		'(e.g. camelCase ↔ snake_case) and how to include computed getter values ' +
		'in serialize()/toJSON() output with @QComputed. ' +
		'Covers common mistakes, best practices, and ends with a validate_usage call.';

	argsSchema = {
		model_code: z
			.string()
			.optional()
			.describe(
				'Optional QuickModel class code to analyze or enrich with @QAlias / @QComputed'
			),
	};

	execute(args: { model_code?: string }) {
		const { model_code } = args;

		const codeSection = model_code
			? `\n\n**Model code to analyze:**\n\`\`\`typescript\n${model_code}\n\`\`\``
			: '';

		return Promise.resolve({
			description: 'Explain and apply @QAlias and @QComputed',
			messages: [
				this.user(
					`I want to understand how to use @QAlias and @QComputed in QuickModel.` +
						codeSection
				),
				this.assistant(
					'I will explain both decorators and how to use them correctly:\n\n' +
						'### @QAlias — Field name remapping\n' +
						'`@QAlias("snake_name")` remaps a field during `serialize()` and `create()`, ' +
						'so the serialized key differs from the class property name. ' +
						'This is common for API contracts that use snake_case while the model uses camelCase.\n\n' +
						'```typescript\n' +
						'@Quick({})\n' +
						'class UserModel extends QModel<UserModel> {\n' +
						'  @QAlias("first_name") declare firstName: string;\n' +
						'  @QAlias("last_name")  declare lastName: string;\n' +
						'}\n' +
						'// new UserModel({ first_name: "Ada" }).$qm.serialize()\n' +
						'// → { first_name: "Ada" }\n' +
						'```\n\n' +
						'### @QComputed — Include getter in serialize()/toJSON()\n' +
						'`@QComputed()` opts an accessor **getter** into the serialized output. ' +
						'It must be applied to a getter, **not** a `declare` field — that is a common mistake.\n\n' +
						'```typescript\n' +
						'@Quick({})\n' +
						'class UserModel extends QModel<UserModel> {\n' +
						'  declare firstName: string;\n' +
						'  declare lastName: string;\n\n' +
						'  @QComputed()\n' +
						'  get fullName() { return `${this.firstName} ${this.lastName}`; }\n' +
						'}\n' +
						'// new UserModel({ firstName: "Ada", lastName: "Lovelace" }).$qm.serialize()\n' +
						'// → { firstName: "Ada", lastName: "Lovelace", fullName: "Ada Lovelace" }\n' +
						'```\n\n' +
						'### Common mistakes\n' +
						'- Using `@QComputed()` on a `declare` field instead of a getter → the value will not appear in output\n' +
						'- Forgetting that `@QAlias` also affects `create()` input key lookup\n' +
						'- Mixing `@QAlias` and `@QComputed` on the same getter (usually not needed)\n\n' +
						'I will now call `validate_usage` to verify the model structure is correct...'
				),
				this.user(
					`Please call \`validate_usage\` on the model code` +
						(model_code
							? ` provided above`
							: ` (use an example if none was given)`) +
						`. Then show the final corrected or example model with both decorators applied, ` +
						`and confirm that serialize() and toJSON() will include the remapped and computed fields.`
				),
			],
		});
	}
}
