import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Add @QGroup conditional validation groups to a QuickModel.
 *
 * @QGroup(name) marks a field as belonging to a named validation group.
 * model.checkGroups(groupName) evaluates only the rules for that group,
 * enabling conditional validation (e.g. only validate address fields when
 * the user has selected a shipping option).
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QSimulateRulesTool} for testing the validation groups
 * @see {@link QValidateUsageTool} for usage verification
 */
export class QAddQGroupPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	group_name: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_add_qgroup';
	title = 'Add @QGroup Conditional Validation to a QuickModel';
	description =
		'Guides adding @QGroup conditional validation groups to a QuickModel. ' +
		'@QGroup(name) marks fields as belonging to a named validation group; ' +
		'model.checkGroups(groupName) evaluates only rules for that group. ' +
		'Use when you need conditional validation (e.g. validate address fields only during checkout).';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class code to add @QGroup groups to'),
		group_name: z
			.string()
			.optional()
			.describe(
				'Optional name for the primary validation group to create ' +
					'(e.g. "shipping", "billing", "addressGroup"). ' +
					'If omitted, a generic example group will be used.'
			),
	};

	execute(args: {
		model_code: string;
		group_name?: string;
	}): Promise<IQPromptResult> {
		const { model_code, group_name } = args;
		const exampleGroup = group_name ?? 'shippingGroup';

		return Promise.resolve({
			description: 'Add @QGroup conditional validation groups',
			messages: [
				this.user(
					`I want to add @QGroup conditional validation to my QuickModel.\n\n` +
						`**Model code:**\n\`\`\`typescript\n${model_code}\n\`\`\`` +
						(group_name
							? `\n\n**Target group name:** \`${group_name}\``
							: '')
				),
				this.assistant(
					`### @QGroup — Conditional validation groups\n\n` +
						`\`@QGroup(name)\` marks a field as belonging to a named validation group. ` +
						`\`model.checkGroups(groupName)\` then evaluates **only** the \`@QRule\` predicates ` +
						`of fields in that group, ignoring all other rules.\n\n` +
						`This is useful when you need conditional validation — for example, validating ` +
						`address fields only during checkout, or billing fields only when payment is required.\n\n` +
						`### Usage pattern\n\n` +
						`\`\`\`typescript\n` +
						`@Quick({})\n` +
						`class OrderModel extends QModel<OrderModel> {\n` +
						`  declare userId: string;\n\n` +
						`  // Only validated when checkGroups("${exampleGroup}") is called\n` +
						`  @QGroup('${exampleGroup}')\n` +
						`  @QRule((val) => val !== '', 'Street is required')\n` +
						`  declare street: string;\n\n` +
						`  @QGroup('${exampleGroup}')\n` +
						`  @QRule((val) => /^\\d{5}$/.test(val), 'Invalid ZIP')\n` +
						`  declare zip: string;\n` +
						`}\n\n` +
						`// Always-on validation:\n` +
						`const order = new OrderModel(data);\n` +
						`order.$qCheckRules();                       // validates everything\n\n` +
						`// Conditional — only when shipping is needed:\n` +
						`order.checkGroups('${exampleGroup}');     // validates only grouped fields\n` +
						`\`\`\`\n\n` +
						`### Key points\n` +
						`- A field **can belong to multiple groups** by stacking \`@QGroup\` decorators\n` +
						`- \`checkGroups()\` does NOT run rules for ungrouped fields\n` +
						`- \`checkRules()\` runs ALL rules regardless of groups\n` +
						`- You can pass an array: \`checkGroups(['billing', 'shipping'])\`\n\n` +
						`I will now analyze the model and add the appropriate @QGroup configuration...`
				),
				this.user(
					`Please call \`validate_usage\` on the model code to verify it is valid QuickModel v2. ` +
						`Then show the updated model with @QGroup and @QRule decorators added to the relevant fields, ` +
						`along with a usage example calling \`checkGroups('${exampleGroup}')\`. ` +
						(group_name
							? `Focus the group on fields that logically belong to the "${group_name}" context.`
							: `Choose a sensible group name based on the model's fields.`)
				),
			],
		});
	}
}
