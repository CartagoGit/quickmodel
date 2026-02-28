import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';

const QUICKMODEL_DECORATORS = [
	'@Quick',
	'@QType',
	'@QRule',
	'@QField',
	'@QAlias',
	'@QGroup',
	'@QComputed',
	'@QConfig',
] as const;

/**
 * MCP tool that parses a QuickModel class definition and returns a structural
 * summary: class name, detected transformers, applied decorators, and the
 * raw `@Quick` config string.
 *
 * @remarks
 * Uses lightweight regex-based parsing — no TypeScript compiler involved.
 * Suitable for quick structural inspection via AI-agent tooling.
 *
 * @see {@link QExportJsonSchemaTool} to generate a full JSON Schema from the same code.
 * @see {@link QGetModelSchemaTool} — multi-format schema generation
 * @see {@link QDiffModelsTool} — compare two model definitions
 * @internal Registered on the MCP server; not part of the public library API.
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

	/**
	 * Inspects a QuickModel class and returns its structural metadata.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript source code of the QuickModel class.
	 * @returns `{ name, transformers, structure, decorators }` — class name, bound transformers,
	 *   raw `@Quick()` config string, and list of detected decorator names.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QExportJsonSchemaTool} — use inspection results to generate a JSON Schema
	 */
	async execute(args: { code: string }): Promise<{
		name: string;
		transformers: string[];
		structure: string;
		decorators: string[];
	}> {
		await Promise.resolve();
		// Simple regex parsing for demonstration
		const classNameMatch = args.code.match(
			/class\s+(\w+)\s+extends\s+QModel/
		);
		const className =
			classNameMatch && classNameMatch[1] ? classNameMatch[1] : 'Unknown';

		const quickMatches = Array.from(
			args.code.matchAll(/@Quick\(\s*({[\s\S]*?})\s*\)/g)
		);
		const quickConfig =
			quickMatches.length > 0 && quickMatches[0] && quickMatches[0][1]
				? quickMatches[0][1]
				: '{}';

		// Extract transformer types roughly using regex
		const transformerMatches = Array.from(
			quickConfig.matchAll(/:\s*['"]?(\w+)['"]?/g)
		);
		// Filter out undefineds to ensure string[]
		const transformers = transformerMatches
			.map((matchItem) => matchItem[1])
			.filter((item): item is string => item !== undefined);

		const detectedDecorators = QUICKMODEL_DECORATORS.filter((dec) =>
			args.code.includes(dec)
		);

		return {
			name: className,
			transformers: transformers,
			structure: quickConfig.replace(/\s+/g, ' '),
			decorators: detectedDecorators,
		};
	}
}
