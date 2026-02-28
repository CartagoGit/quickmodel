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
 * Tool to validate if code snippets seem to be using QuickModel correctly.
 *
 * @see {@link QCheckIntegrityTool} — run transformer-level integrity checks on data
 * @see {@link QSimulateValidationTool} — simulate predicate validation
 * @see {@link QInspectModelTool} — inspect model structure
 */
export class QValidateUsageTool extends QAbstractTool<
	z.ZodObject<{ code: z.ZodString }>
> {
	name = 'validate_usage';
	description =
		'Analyzes a code snippet to check for common QuickModel usage errors (e.g. missing declare, wrong inheritance).';
	schema = z.object({
		code: z.string().describe('The TypeScript code to analyze'),
	});

	/**
	 * Performs static analysis on QuickModel TypeScript code and reports usage issues.
	 *
	 * Checks for: `extends QModel`, `declare` fields, presence of at least one decorator.
	 *
	 * @param args - Tool arguments.
	 * @param args.code - TypeScript code to analyze.
	 * @returns `{ valid, issues[], detectedDecorators[] }` — `valid` is `true` when no issues found.
	 */
	async execute(args: { code: string }): Promise<{
		valid: boolean;
		issues: string[];
		detectedDecorators: string[];
	}> {
		await Promise.resolve();
		const issues: string[] = [];

		if (!args.code.includes('extends QModel')) {
			issues.push('Class should extend QModel<Interface>');
		}
		if (!args.code.includes('declare ')) {
			issues.push(
				'Properties in QModel classes should be defined with "declare"'
			);
		}

		const detectedDecorators = QUICKMODEL_DECORATORS.filter((dec) =>
			args.code.includes(dec)
		);

		const hasAnyDecorator = detectedDecorators.length > 0;
		if (!hasAnyDecorator) {
			issues.push(
				'Class should use at least one QuickModel decorator: @Quick, @QRule, @QField, @QAlias, @QGroup, @QComputed or @QConfig'
			);
		}

		const hasQField = args.code.includes('@QField');
		const hasQRule = args.code.includes('@QRule');
		if (hasQField && !hasQRule) {
			issues.push(
				'@QField used without @QRule: form field metadata defined but no validation rules will run'
			);
		}

		return {
			valid:
				issues.filter((iss) => !iss.startsWith('@QField used without'))
					.length === 0,
			issues,
			detectedDecorators,
		};
	}
}
