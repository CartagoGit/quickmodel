import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * Tool to analyze a model structure (simplified).
 */
export class QInspectModelTool extends QAbstractTool<
	z.ZodObject<{ code: z.ZodString }>
> {
	name = 'inspect_model';
	description =
		'Analyze a QuickModel class definition and explain its structure.';
	schema = z.object({
		code: z.string().describe('The TypeScript code of the model class'),
	});

	async execute(args: { code: string }): Promise<{
		name: string;
		transformers: string[];
		structure: string;
	}> {
		await Promise.resolve();
		// Simple regex parsing for demonstration
		const classNameMatch = args.code.match(
			/class\s+(\w+)\s+extends\s+QModel/
		);
		const className =
			classNameMatch && classNameMatch[1] ? classNameMatch[1] : 'Unknown';

		const decorators = Array.from(
			args.code.matchAll(/@Quick\(\s*({[\s\S]*?})\s*\)/g)
		);
		const quickConfig =
			decorators.length > 0 && decorators[0] && decorators[0][1]
				? decorators[0][1]
				: '{}';

		// Extract transformer types roughly using regex
		const transformerMatches = Array.from(
			quickConfig.matchAll(/:\s*['"]?(\w+)['"]?/g)
		);
		// Filter out undefineds to ensure string[]
		const transformers = transformerMatches
			.map((m) => m[1])
			.filter((t): t is string => t !== undefined);

		return {
			name: className,
			transformers: transformers,
			structure: quickConfig.replace(/\s+/g, ' '),
		};
	}
}
