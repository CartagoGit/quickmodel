import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';

/**
 * MCP tool that parses a JSON-serialised QuickModel validation error and
 * returns a human-readable explanation string.
 *
 * @remarks
 * Accepts both a bare error object and an envelope with an `errors` array.
 * Known error codes:
 * - `INVALID_TYPE` → "Field '…' expected X but got Y."
 * - `REQUIRED`     → "Field '…' is required but was missing."
 * - Any other error → falls back to the `message` property or raw JSON.
 *
 * @returns `{ explanation: string }` — a numbered summary beginning with
 * "Found N issues:" followed by one bullet per error.
 *
 * @internal Registered on the MCP server; not part of the public library API.
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

		const processError = (err: any) => {
			if (err.code === 'INVALID_TYPE') {
				return `Field '${err.path}' expected ${err.expected} but got ${err.received}.`;
			}
			if (err.code === 'REQUIRED') {
				return `Field '${err.path}' is required but was missing.`;
			}
			if (err.message) return err.message;
			return JSON.stringify(err);
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
