import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';

/**
 * Skill: Convert a TypeScript interface into a complete QuickModel class.
 *
 * Guides the AI through: parse interface → generate model → validate usage.
 * The AI should call `interface_to_model` followed by `validate_usage`.
 */
export class QFromTypescriptPrompt extends QAbstractPrompt<{
	typescript: z.ZodString;
	model_name: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_from_typescript';
	title = 'Convert TypeScript Interface to QModel';
	description =
		'Convert a TypeScript interface or type into a fully annotated QuickModel class. ' +
		'Automatically detects transformable types (Date, BigInt, Set, Map) and applies the correct @Quick decorator. ' +
		'Use this when you have a backend DTO or API response type and want a ready-to-use model.';

	argsSchema = {
		typescript: z
			.string()
			.describe(
				'TypeScript interface or type definition to convert (e.g. `interface IUser { id: number; createdAt: string; }`)'
			),
		model_name: z
			.string()
			.optional()
			.describe(
				"Optional name for the generated model class (defaults to the interface name without 'I')"
			),
	};

	async execute(args: { typescript: string; model_name?: string }) {
		const { typescript, model_name } = args;
		const namePart = model_name ? ` Name it \`${model_name}\`.` : '';

		return {
			description: 'Convert TypeScript interface to a QuickModel class',
			messages: [
				this.user(
					`I have this TypeScript interface and I want to create a QuickModel class from it:\n\n\`\`\`typescript\n${typescript}\n\`\`\`\n${namePart}`
				),
				this.assistant(
					'I will convert this interface into a QuickModel class step by step:\n\n' +
						'1. First, call `interface_to_model` to generate the initial QModel class with the correct `@Quick` decorator mapping all transformable types (Date, BigInt, Set, Map, RegExp, etc.)\n' +
						'2. Then call `validate_usage` on the generated code to check for correctness and best practices\n' +
						'3. If there are validation issues, fix them and validate again\n\n' +
						'Let me start by analyzing the interface and generating the model.'
				),
				this.user(
					`Please call \`interface_to_model\` with the interface code above, then call \`validate_usage\` on the generated result. ` +
						`Show me the final model class with a usage example.`
				),
			],
		};
	}
}
