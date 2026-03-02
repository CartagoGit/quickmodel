import { z } from '@mcp/deps';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Debug a QuickModel that is throwing errors or producing unexpected output.
 *
 * Guides the AI through: inspect model → explain error → suggest fix.
 * If the issue is a rule failure or transformation anomaly, the AI will also
 * suggest enabling trace (via `quickmodel_trace_model`) to observe the pipeline.
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QInspectModelTool} for model inspection
 * @see {@link QExplainErrorTool} for error explanation
 * @see {@link QTraceModelPrompt} for trace/observability setup
 */
export class QDebugModelPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	error: z.ZodOptional<z.ZodString>;
	sample_data: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_debug';
	title = 'Debug a QuickModel';
	description =
		'Debug a QuickModel class that is throwing validation errors, producing unexpected transformations, ' +
		'or behaving incorrectly. Inspects the model structure, explains any errors in plain language, ' +
		'and suggests fixes. Use this when a model is not working as expected.';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class code that has the issue'),
		error: z
			.string()
			.optional()
			.describe(
				'The JSON string of the error thrown, or a description of the unexpected behavior'
			),
		sample_data: z
			.string()
			.optional()
			.describe(
				'JSON sample data that triggers the issue (optional but helpful)'
			),
	};

	execute(args: {
		model_code: string;
		error?: string;
		sample_data?: string;
	}) {
		const { model_code, error, sample_data } = args;

		const errorSection = error
			? `\n\n**Error encountered:**\n\`\`\`json\n${error}\n\`\`\``
			: '';
		const dataSection = sample_data
			? `\n\n**Sample data that triggers it:**\n\`\`\`json\n${sample_data}\n\`\`\``
			: '';

		return Promise.resolve({
			description: 'Debug a QuickModel class',
			messages: [
				this.user(
					`I have a QuickModel that is not working correctly.\n\n` +
						`**Model code:**\n\`\`\`typescript\n${model_code}\n\`\`\`` +
						errorSection +
						dataSection
				),
				this.assistant(
					'I will debug this QuickModel step by step.\n\n' +
						'### Step 0 — 🤝 Register your work (mandatory)\n\n' +
						'Before writing the corrected file:\n' +
						'1. Call `agent_coordinate` with `action: "check"` — confirm no other agent is writing to the same source area\n' +
						'2. Call `agent_coordinate` with `action: "claim"`, your `agentId`, task `"debug-model: fix"`, and `files` (the path of the model file you will correct)\n' +
						'3. If `conflict: true` → **STOP**. Do not modify any file until the conflict is resolved.\n' +
						'4. **Read before every write:** Immediately before modifying each file, read its current content from disk — your context may be stale if another agent edited it since you started. If the file changed: adapt your change, merge carefully, or skip if no longer needed. Never overwrite from stale context.\n' +
						'5. Release when done: `agent_coordinate action="release"`\n\n' +
						'---\n\n' +
						'1. Call `inspect_model` to analyze the model structure, decorators, and configuration\n' +
						(error
							? '2. Call `explain_error` to translate the error into plain language and identify the root cause\n'
							: '2. Check the `@Quick` decorator configuration for any type mismatches\n') +
						'3. Call `validate_usage` on the model code to check for structural issues\n' +
						(sample_data
							? '4. Call `simulate_transformation` with the sample data to trace the exact transformation path\n'
							: '') +
						'5. Provide a corrected version of the model with an explanation of what was wrong\n' +
						'6. If the root cause is a rule failure or transformation anomaly, suggest using the `quickmodel_trace_model` skill to add observability\n\n' +
						'Starting with inspection...'
				),
				this.user(
					`Please call \`inspect_model\` on the model code` +
						(error
							? `, then call \`explain_error\` with: ${error}`
							: '') +
						`, then call \`validate_usage\`. ` +
						`Provide a fixed version of the model at the end.`
				),
			],
		});
	}
}
