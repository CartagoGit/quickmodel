import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Generate realistic test data for a QuickModel.
 *
 * Guides the AI through: inspect/create model → generate mock → simulate transformation.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QGenerateMockDataTool} for the mock generation step
 * @see {@link QSimulateTransformationTool} for transformation verification
 */
export class QGenerateTestDataPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	count: z.ZodOptional<z.ZodString>;
	context: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_generate_test_data';
	title = 'Generate Test Data for a QuickModel';
	description =
		'Generate realistic mock/test data for a QuickModel class. ' +
		'Inspects the model structure, creates type-aware mock data, and verifies it survives ' +
		'the transformation pipeline. Use this for unit tests, fixtures, or API mocking.';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class code to generate test data for'),
		count: z
			.string()
			.optional()
			.describe('Number of mock instances to generate (default: 1)'),
		context: z
			.string()
			.optional()
			.describe(
				"Domain context to guide realistic data generation (e.g. 'e-commerce user', 'banking transaction')"
			),
	};

	execute(args: { model_code: string; count?: string; context?: string }) {
		const { model_code, count = '1', context } = args;
		const contextNote = context
			? ` The data should be realistic for a **${context}** context.`
			: '';
		const countNote =
			parseInt(count) > 1 ? `Generate **${count}** instances.` : '';

		return Promise.resolve({
			description: 'Generate test data for a QuickModel',
			messages: [
				this.user(
					`I need realistic test data for this QuickModel:\n\n\`\`\`typescript\n${model_code}\n\`\`\`\n${countNote}${contextNote}`
				),
				this.assistant(
					'I will generate test data step by step:\n\n' +
						'1. Call `inspect_model` to understand all properties, their types, and transformer configuration\n' +
						'2. Call `generate_mock` with the appropriate schema — making sure to use correct types for:\n' +
						'   - `Date` fields → ISO date strings (e.g. "2024-01-15T10:30:00.000Z")\n' +
						'   - `BigInt` fields → large digit strings (e.g. "9007199254740993")\n' +
						'   - `Set` fields → arrays (deduplicated)\n' +
						'   - `Map` fields → arrays of `[key, value]` tuples\n' +
						'   - `RegExp` fields → pattern strings\n' +
						'3. Call `simulate_transformation` to verify the mock data passes the full transformation pipeline\n' +
						'4. Return the final mock data as both raw input (for the constructor) and transformed output\n\n' +
						'Starting with inspection...'
				),
				this.user(
					`Please call \`inspect_model\` on the model above, then call \`generate_mock\` ` +
						`with count=${count}, then call \`simulate_transformation\` to verify. ` +
						`Show me data I can drop directly into a test.`
				),
			],
		});
	}
}
