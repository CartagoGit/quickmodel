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
		'Statically analyze a TypeScript code snippet for common QuickModel usage mistakes. ' +
		'Detects: missing `extends QModel`, fields declared with `public` instead of `declare`, ' +
		'QModel generic parameter without I-prefix (e.g. QModel<User> should be QModel<IUser>), ' +
		'missing QuickModel decorators, and @QField used without @QRule. ' +
		'Returns { valid, issues[], detectedDecorators[] } — valid is true when no blocking issues are found.';
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
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QCheckIntegrityTool} — complement: checks transformer-level data integrity
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

		// Detect fields declared with 'public' keyword (should be 'declare')
		const publicFieldPattern = /\bpublic\s+\w+\??\s*:/g;
		const publicFieldMatches = args.code.match(publicFieldPattern);
		if (publicFieldMatches && publicFieldMatches.length > 0) {
			issues.push(
				`Found ${publicFieldMatches.length} field(s) declared with 'public' instead of 'declare': ` +
					`use 'declare' for QModel property declarations (e.g. 'declare name: string')`
			);
		}

		// Detect QModel<X> where X does not start with 'I'
		const qModelGenericPattern = /extends\s+QModel\s*<\s*([A-Z]\w*)/g;
		let genericMatch: RegExpExecArray | null;
		while ((genericMatch = qModelGenericPattern.exec(args.code)) !== null) {
			const typeName = genericMatch[1];
			if (typeName && !typeName.startsWith('I')) {
				issues.push(
					`QModel generic parameter '${typeName}' should use the I-prefix convention (e.g. I${typeName})`
				);
			}
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
