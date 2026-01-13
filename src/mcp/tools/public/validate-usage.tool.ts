import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * Tool to validate if code snippets seem to be using QuickModel correctly.
 * (Simple implementation for now)
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

	async execute(args: { code: string }): Promise<{
		valid: boolean;
		issues: string[];
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
		if (!args.code.includes('@Quick')) {
			issues.push(
				'Class should be decorated with @Quick (or properties with @QType)'
			);
		}

		return {
			valid: issues.length === 0,
			issues,
		};
	}
}
