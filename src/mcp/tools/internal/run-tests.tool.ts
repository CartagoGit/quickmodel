import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/** A single failing test entry */
interface ITestError {
	test: string;
	message: string;
	file?: string;
}

/**
 * Internal tool to run the Bun test suite (or a filtered subset by pattern).
 * Parses pass/fail counts from stdout and extracts failing test names.
 * Use this to verify that a refactor or new feature does not break existing tests.
 * Always run BEFORE declaring implementation done.
 */
export class QRunTestsTool extends QAbstractTool<
	z.ZodObject<{
		pattern: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'run_tests';
	description =
		'Run the Bun test suite, optionally filtered by a path/pattern. ' +
		'Parses pass/fail counts and returns structured failure details. ' +
		'Use this BEFORE declaring any implementation done to ensure no regressions. ' +
		'Returns { passed, total_pass, total_fail, errors[], summary }.';

	schema = z.object({
		pattern: z
			.string()
			.optional()
			.describe(
				'Optional file path or pattern to narrow test execution ' +
					'(e.g. "tests/mcp/unit/internal"). Runs the full suite when omitted.'
			),
	});

	protected _spawn = spawnCommand;

	async execute(args: { pattern?: string }): Promise<{
		passed: boolean;
		total_pass: number;
		total_fail: number;
		errors: ITestError[];
		summary: string;
	}> {
		const cmdArgs = ['test'];
		if (args.pattern) {
			cmdArgs.push(args.pattern);
		}

		let rawOutput = '';
		let exitedClean = false;

		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				cmdArgs,
				process.cwd()
			);
			rawOutput = stdout + stderr;
			exitedClean = true;
		} catch (err: unknown) {
			const typed = err as { stdout?: string; stderr?: string };
			rawOutput = (typed.stdout ?? '') + (typed.stderr ?? '');
		}

		const totalPass = this.parseCount(rawOutput, 'pass');
		const totalFail = this.parseCount(rawOutput, 'fail');
		const errors = exitedClean ? [] : this.parseFailures(rawOutput);
		const passed = exitedClean && totalFail === 0;

		const summary = passed
			? `All ${totalPass} test(s) passed.`
			: `${totalPass} passed, ${totalFail} failed.`;

		return {
			passed,
			total_pass: totalPass,
			total_fail: totalFail,
			errors,
			summary,
		};
	}

	private parseCount(raw: string, label: 'pass' | 'fail'): number {
		const match = raw.match(new RegExp(`(\\d+)\\s+${label}`));
		return match?.[1] !== undefined ? parseInt(match[1], 10) : 0;
	}

	private parseFailures(raw: string): ITestError[] {
		const errors: ITestError[] = [];
		// Match lines like: ✗ test name (Xms)  or  ● test name
		const failPattern = /[✗●]\s+(.+)/g;
		let match: RegExpExecArray | null;

		while ((match = failPattern.exec(raw)) !== null) {
			const testName = (match[1] ?? '')
				.trim()
				.replace(/\s*\(\d+ms\)$/, '');
			errors.push({ test: testName, message: 'Test failed' });
		}

		return errors;
	}
}
