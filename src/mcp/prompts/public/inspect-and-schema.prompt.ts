import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Inspect a QuickModel and export its schema in multiple formats.
 *
 * Guides the AI through: inspect model → export schema in requested format(s).
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QInspectModelTool} for the model inspection step
 * @see {@link QGetModelSchemaTool} for the schema export step
 */
export class QInspectAndSchemaPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	formats: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_inspect_and_schema';
	title = 'Inspect Model and Export Schema';
	description =
		'Inspect a QuickModel class and export its schema in one or more formats: ' +
		'json (JSON Schema Draft-07), openapi (OpenAPI 3.0), zod (Zod validation), ' +
		'mongo (MongoDB/Mongoose), typescript (TS interface), graphql (GraphQL SDL), ajv. ' +
		'Use this to integrate a QuickModel with validation libraries, API docs, or databases.';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class code to inspect and export'),
		formats: z
			.string()
			.optional()
			.describe(
				"Comma-separated list of schema formats to export (default: 'json,openapi'). " +
					'Available: json, openapi, zod, mongo, typescript, graphql, ajv'
			),
	};

	execute(args: { model_code: string; formats?: string }) {
		const { model_code, formats = 'json,openapi' } = args;
		const formatList = formats
			.split(',')
			.map((fmt) => fmt.trim())
			.filter(Boolean);

		const formatBullets = formatList
			.map(
				(fmt) =>
					`   - \`${fmt}\`: call \`export_json_schema\` with format="${fmt}"`
			)
			.join('\n');

		return Promise.resolve({
			description: `Inspect model and export schemas: ${formatList.join(', ')}`,
			messages: [
				this.user(
					`I need to inspect this QuickModel and export its schema in the following formats: **${formatList.join(', ')}**\n\n` +
						`\`\`\`typescript\n${model_code}\n\`\`\``
				),
				this.assistant(
					'I will inspect the model and export all requested schemas:\n\n' +
						'1. Call `inspect_model` to analyze the full model structure: properties, types, decorators, and options\n' +
						`2. Export schemas in each requested format:\n${formatBullets}\n` +
						'3. Provide integration examples for each format\n\n' +
						'Starting with model inspection...'
				),
				this.user(
					`Please call \`inspect_model\` on the model above, then call \`export_json_schema\` ` +
						`for each of these formats: ${formatList.join(', ')}. ` +
						`Show me how to use each exported schema with its respective library.`
				),
			],
		});
	}
}
