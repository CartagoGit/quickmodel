import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/** A single TypeScript type error */
interface ITypeError {
	file: string;
	line: number;
	column: number;
	code: string;
	message: string;
}

/**
 * Internal tool to run TypeScript type checking (`tsc --noEmit`) on the source.
 * Returns structured type errors with file, line, column, TS error code and message.
 * Use this BEFORE declaring any implementation finished to ensure strict type safety.
 */
export class QTypecheckTool extends QAbstractTool<
	z.ZodObject<Record<never, never>>
> {
	name = 'typecheck';
	description =
		'Run TypeScript type checking (tsc --noEmit) on the source and return structured errors. ' +
		'Each error includes file, line, column, TS code (e.g. TS2322) and message. ' +
		'Use this BEFORE declaring the implementation done — zero type errors required. ' +
		'Returns { passed, errors[], total, summary }.';

	schema = z.object({});

	protected _spawn = spawnCommand;

	async execute(_args: Record<never, never>): Promise<{
		passed: boolean;
		errors: ITypeError[];
		total: number;
		summary: string;
	}> {
		let rawOutput = '';

		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				['run', 'typecheck:src'],
				process.cwd()
			);
			rawOutput = stdout + stderr;
		} catch (err: unknown) {
			const typed = err as {
				stdout?: string;
				stderr?: string;
				message?: string;
			};
			rawOutput = (typed.stdout ?? '') + (typed.stderr ?? '');
		}

		const errors = this.parseTscOutput(rawOutput);
		const total = errors.length;
		const passed = total === 0;
		const summary = passed
			? '✅ TypeScript: no type errors'
			: `❌ TypeScript: ${total} error(s). Fix all type errors before declaring the implementation done.`;

		return { passed, errors, total, summary };
	}

	private parseTscOutput(output: string): ITypeError[] {
		const errors: ITypeError[] = [];
		// Literal regex to detect tsc error lines: file(line,col): error TSxxxx: msg
		const pattern = /^(.+)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$/gm;

		let found: RegExpExecArray | null = pattern.exec(output);
		while (found !== null) {
			errors.push({
				file: found[1] ?? '',
				line: parseInt(found[2] ?? '0', 10),
				column: parseInt(found[3] ?? '0', 10),
				code: found[4] ?? '',
				message: found[5] ?? '',
			});
			found = pattern.exec(output);
		}

		return errors;
	}
}
