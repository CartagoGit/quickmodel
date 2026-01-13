import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * Tool to explain validation errors in plain language.
 */
export class QExplainErrorTool extends QAbstractTool<
	z.ZodObject<{
		error: z.ZodString;
	}>
> {
	name = 'explain_error';
	description =
		'Explain a QuickModel validation error in human-readable language.';
	schema = z.object({
		error: z.string().describe('The JSON string of the validation error'),
	});

	async execute(args: { error: string }): Promise<{ explanation: string }> {
		await Promise.resolve();
		let errObj: any;
		try {
			errObj = JSON.parse(args.error);
		} catch (_e) {
			return { explanation: 'Could not parse error JSON.' };
		}

		// QuickModel errors usually have structure { code, message, path, ... } or "errors": []
		// Let's handle a standard shape or the specific library shape.
		// Assuming we see standard QuickModel validation error shape.

		const explanations: string[] = [];

		const processError = (e: any) => {
			if (e.code === 'INVALID_TYPE') {
				return `Field '${e.path}' expected ${e.expected} but got ${e.received}.`;
			}
			if (e.code === 'REQUIRED') {
				return `Field '${e.path}' is required but was missing.`;
			}
			if (e.message) return e.message;
			return JSON.stringify(e);
		};

		if (Array.isArray(errObj)) {
			explanations.push(...errObj.map(processError));
		} else if (errObj.errors && Array.isArray(errObj.errors)) {
			explanations.push(...errObj.errors.map(processError));
		} else {
			explanations.push(processError(errObj));
		}

		return {
			explanation: `Found ${explanations.length} issues:\n- ${explanations.join('\n- ')}`,
		};
	}
}
