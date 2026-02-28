import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Set up and interpret the QuickModel trace / observability system.
 *
 * Guides the AI through:
 * 1. Inspect the model to understand its structure and decorators
 * 2. Propose the right trace configuration for the user's goal
 *    (global QConfig, per-model @Quick, or per-rule @QRule options)
 * 3. Generate the annotated model code with trace settings in place
 * 4. Explain what each trace entry means and how to interpret the output
 *
 * @see {@link QAbstractPrompt} for the base class this prompt extends
 * @see {@link QInspectModelTool} for model structure inspection
 * @see {@link QSimulateRulesTool} for synchronous rule simulation
 * @see {@link QSimulateAsyncRulesTool} for async rule simulation
 */
export class QTraceModelPrompt extends QAbstractPrompt<{
	model_code: z.ZodString;
	goal: z.ZodOptional<z.ZodString>;
	sample_data: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_trace_model';
	title = 'Set Up Tracing & Observability for a QuickModel';
	description =
		'Guides the AI through enabling and configuring the QuickModel trace system for a model. ' +
		'Covers global (QConfig), per-model (@Quick), and per-rule (@QRule options) trace settings. ' +
		'Helps pick the right verbosity level, event filter, custom sink, and prefix for the use case. ' +
		'Useful for debugging transformation pipelines, auditing rule failures, or wiring structured logging.';

	argsSchema = {
		model_code: z
			.string()
			.describe('The QuickModel class code to add tracing to'),
		goal: z
			.string()
			.optional()
			.describe(
				'What you want to observe or capture. Examples: ' +
					'"see all rule failures", "audit token validation to a security log", ' +
					'"debug a transformation pipeline", "silence a noisy rule"'
			),
		sample_data: z
			.string()
			.optional()
			.describe(
				'JSON string with sample data to run through the model after trace is set up (optional)'
			),
	};

	execute(args: {
		model_code: string;
		goal?: string;
		sample_data?: string;
	}): Promise<IQPromptResult> {
		const { model_code, goal, sample_data } = args;

		const goalSection = goal ? `\n\n**Goal:** ${goal}` : '';
		const sampleSection = sample_data
			? `\n\n**Sample data to run after setup:**\n\`\`\`json\n${sample_data}\n\`\`\``
			: '';

		return Promise.resolve({
			description: 'Set up tracing and observability for a QuickModel',
			messages: [
				this.user(
					`I want to add tracing/observability to this QuickModel.${goalSection}${sampleSection}\n\n` +
						`**Model code:**\n\`\`\`typescript\n${model_code}\n\`\`\``
				),
				this.assistant(
					'I will set up tracing for this QuickModel step by step:\n\n' +
						'1. Call `inspect_model` to understand the model structure, fields, and existing `@QRule` decorators\n' +
						(goal
							? `2. Based on the goal ("${goal}"), determine the right trace scope:\n` +
								'   - **Global** (`QConfig.configure`) if you want to observe all models\n' +
								'   - **Per-model** (`@Quick` second arg) to target this model only\n' +
								'   - **Per-rule** (`@QRule` third arg) to target specific rules with their own verbosity or sink\n'
							: '2. Determine the right trace scope (global / per-model / per-rule) based on the model structure\n') +
						'3. Choose the appropriate verbosity level:\n' +
						'   - `error` — exceptions only\n' +
						'   - `warn` — rule failures + errors\n' +
						'   - `info` — construction + serialize milestones\n' +
						'   - `debug` — field-level transformation steps\n' +
						'   - `verbose` — everything including raw input/output values\n' +
						'4. Propose event filters and/or a custom sink if needed\n' +
						'5. Return the annotated model code with trace configuration\n' +
						(sample_data
							? '6. Call `simulate_rules` or `simulate_transformation` with the sample data to show what the trace output would look like\n'
							: '') +
						'\nStarting with model inspection...'
				),
				this.user(
					`Please call \`inspect_model\` on the model code above` +
						(sample_data
							? `, then call \`simulate_rules\` with: ${sample_data}`
							: '') +
						'. After inspection provide the annotated model with trace configuration and explain what each trace entry means.'
				),
			],
		});
	}
}
