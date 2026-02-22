import { z } from 'zod';
import { QAbstractPrompt } from '../abstract-prompt';
import type { IQPromptResult } from '../abstract-prompt';

/**
 * Skill: Given a TypeScript type, recommend the correct @Quick() transformer configuration.
 *
 * Answers the most frequent QuickModel question: "What do I put in @Quick for this type?"
 *
 * Covers:
 * - Primitives (no transformer needed)
 * - Complex types: Date, BigInt, RegExp, Set, Map, ArrayBuffer, typed arrays, URL, URLSearchParams
 * - Nested generics: Map<string, Set<Date>>, Array<Date>
 * - Ends with simulate_transformation to preview the result
 */
export class QTransformerGuidePrompt extends QAbstractPrompt<{
	typescript_type: z.ZodString;
	sample_data: z.ZodOptional<z.ZodString>;
}> {
	name = 'quickmodel_transformer_guide';
	title = 'Transformer Configuration Guide for a TypeScript Type';
	description =
		'Given a TypeScript type (e.g. "Date", "Map<string, Set<Date>>", "BigInt"), ' +
		'recommends the exact @Quick() transformer configuration, explains which transformer ' +
		'activates and why, then calls simulate_transformation with sample data to preview the result. ' +
		'Answers the most common QuickModel question: "What do I put in @Quick for this type?"';

	argsSchema = {
		typescript_type: z
			.string()
			.describe(
				'The TypeScript field type to configure (e.g. "Date", "Set<string>", "Map<string, Date>", "BigInt")'
			),
		sample_data: z
			.string()
			.optional()
			.describe(
				'Optional JSON sample data to use in simulate_transformation. ' +
					'E.g. \'{ "created": "2024-01-15" }\' for a Date field called "created"'
			),
	};

	execute(args: {
		typescript_type: string;
		sample_data?: string;
	}): Promise<IQPromptResult> {
		const { typescript_type, sample_data } = args;

		const sampleSection = sample_data
			? `\n\n**Sample data to preview:**\n\`\`\`json\n${sample_data}\n\`\`\``
			: '';

		return Promise.resolve({
			description:
				'Recommend @Quick transformer config for a TypeScript type',
			messages: [
				this.user(
					`I have a field with type \`${typescript_type}\`. ` +
						`What do I put in \`@Quick({})\` to make QuickModel handle it correctly?` +
						sampleSection
				),
				this.assistant(
					`### Transformer guide for \`${typescript_type}\`\n\n` +
						`I will look up the correct \`@Quick()\` configuration for your type, ` +
						`explain which transformer activates, and then call \`simulate_transformation\` ` +
						`to preview the transformation with sample data.\n\n` +
						`---\n\n` +
						`### Quick reference: type → @Quick config\n\n` +
						`| TypeScript type | @Quick config | Notes |\n` +
						`|---|---|---|\n` +
						`| \`string\`, \`number\`, \`boolean\` | — (no transformer needed) | Primitives are handled automatically |\n` +
						`| \`Date\` | \`{ field: Date }\` | Parses ISO strings, timestamps, Date objects |\n` +
						`| \`BigInt\` | \`{ field: BigInt }\` | Parses bigint strings and numbers |\n` +
						`| \`RegExp\` | \`{ field: RegExp }\` | Parses \`/pattern/flags\` strings |\n` +
						`| \`Set<T>\` | \`{ field: Set }\` | Use \`list\` for the inner type if \`T\` is complex |\n` +
						`| \`Map<K, V>\` | \`{ field: Map }\` | Keys/values use transformer if declared |\n` +
						`| \`ArrayBuffer\` | \`{ field: ArrayBuffer }\` | Base64 string ↔ ArrayBuffer |\n` +
						`| \`URL\` | \`{ field: URL }\` | Parses URL strings |\n` +
						`| \`URLSearchParams\` | \`{ field: URLSearchParams }\` | Parses query strings |\n` +
						`| \`T[]\` (array of complex type) | \`{ field: [Date] }\` or \`list: [...]\` | Wrap single transformer in array |\n` +
						`| Nested: \`Map<string, Set<Date>>\` | Nested config object | Ask for specific guidance |\n\n` +
						`For your type \`${typescript_type}\`, I will provide the exact configuration now ` +
						`and call \`simulate_transformation\` to validate it.`
				),
				this.user(
					`Based on the type \`${typescript_type}\`, please:\n` +
						`1. Show the complete \`@Quick({})\` configuration for a field named \`myField\`\n` +
						`2. Explain which transformer activates and what it does during \`create()\` and \`serialize()\`\n` +
						`3. Call \`simulate_transformation\` with appropriate sample data` +
						(sample_data
							? ` using the provided sample: ${sample_data}`
							: '') +
						`\n4. Show the serialized output and confirm the round-trip is lossless\n` +
						`5. Highlight any gotchas specific to \`${typescript_type}\` (e.g. nested generics, precision loss, BigInt JSON limits)`
				),
			],
		});
	}
}
