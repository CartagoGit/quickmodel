import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Guided workflow to add form validation to a QuickModel.
 *
 * Guides the AI through:
 * 1. Declaring `@QField` metadata for form rendering
 * 2. Adding `@QRule` business-logic predicates
 * 3. Optionally grouping fields with `@QGroup`
 * 4. Verifying the result with `validate_usage`
 * 5. Testing rules live with `simulate_validation`
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QSimulateValidationTool} for the live validation testing step
 * @see {@link QValidateUsageTool} for usage verification
 */
export class QFormValidationPrompt extends QAbstractPrompt<{
	form_description: z.ZodString;
	fields: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_form_validation';
	title = 'Add Form Validation to a QuickModel';
	description =
		'Guided workflow to add form-validation capabilities to a QuickModel class. ' +
		'Uses @QField for field metadata, @QRule for business-logic predicates, ' +
		'@QGroup for section grouping, then verifies with validate_usage and simulate_validation.';

	argsSchema = {
		form_description: z
			.string()
			.describe(
				'A description of the form and its validation requirements'
			),
		fields: z
			.string()
			.optional()
			.describe(
				'Comma-separated list of field names to include in the form (e.g. "name, email, age")'
			),
	};

	execute(args: {
		form_description: string;
		fields?: string;
	}): Promise<IQPromptResult> {
		const { form_description, fields } = args;

		const fieldHint = fields ? `\n\nFields requested: **${fields}**` : '';

		return Promise.resolve({
			description: `Add form validation: ${form_description}`,
			messages: [
				this.user(
					`I need to add form validation to a QuickModel for the following form:${fieldHint}\n\n` +
						`**Form description:** ${form_description}\n\n` +
						`Please guide me through:\n` +
						`1. Declaring \`@QField\` metadata on properties (label, widget, required, hint)\n` +
						`2. Adding \`@QRule\` predicates for business-logic validation\n` +
						`3. Grouping fields with \`@QGroup\` if needed\n` +
						`4. Verifying the code with \`validate_usage\`\n` +
						`5. Testing validation live with \`simulate_validation\``
				),
				this.assistant(
					'I will guide you step by step to add full form validation:\n\n' +
						'**Step 1 — @QField (form metadata)**\n' +
						'Add `@QField` to each property to define widget type, label, required flag, and hints:\n' +
						'```typescript\n' +
						"import { QField } from 'quickmodel';\n\n" +
						"@QField({ widget: 'input', label: 'Email', required: true, hint: 'Enter a valid email' })\n" +
						'declare email: string;\n' +
						'```\n\n' +
						'**Step 2 — @QRule (validation predicates)**\n' +
						'Add `@QRule` for business-logic constraints. Each rule has a `predicate` and `message`:\n' +
						'```typescript\n' +
						"import { QRule } from 'quickmodel';\n\n" +
						"@QRule({ predicate: (val) => val.includes('@'), message: 'Must be a valid email' })\n" +
						"@QField({ widget: 'input', label: 'Email' })\n" +
						'declare email: string;\n' +
						'```\n\n' +
						'**Step 3 — @QGroup (optional sections)**\n' +
						'Group related fields with `@QGroup` for structured form rendering:\n' +
						'```typescript\n' +
						"@QGroup('Contact')\n" +
						"@QField({ widget: 'input', label: 'Email' })\n" +
						'declare email: string;\n' +
						'```\n\n' +
						'**Step 4 — Verify with validate_usage**\n' +
						'Call `validate_usage` on the model code to check for common mistakes.\n\n' +
						'**Step 5 — Test live with simulate_validation**\n' +
						'Call `simulate_validation` with sample data and rule predicates to preview validation results:\n' +
						'```json\n' +
						'{\n' +
						'  "data": { "email": "not-an-email" },\n' +
						'  "rules": [{ "field": "email", "predicate": "value.includes(\'@\')", "message": "Must be a valid email" }]\n' +
						'}\n' +
						'```\n\n' +
						'**Getting form schema at runtime:**\n' +
						'```typescript\n' +
						'// All @QField entries as ordered array\n' +
						'const schema = MyForm.getFormSchema();\n\n' +
						'// Grouped by @QGroup sections\n' +
						'const grouped = MyForm.getFormSchemaGrouped();\n\n' +
						'// Run validations on an instance\n' +
						'const result = instance.$qm.checkRules(); // { valid, errors[] }\n' +
						'```'
				),
				this.user(
					`Now please help me implement this for my form. ` +
						`The form is: **${form_description}**${fieldHint}\n\n` +
						`Steps:\n` +
						`1. Call \`validate_usage\` once you have the model code to confirm it is correct\n` +
						`2. Call \`simulate_validation\` with representative valid and invalid data to confirm the \`@QRule\` predicates work as expected\n` +
						`3. Show the final model with \`@QField\`, \`@QRule\`, and \`@QGroup\` (if applicable)`
				),
			],
		});
	}
}
