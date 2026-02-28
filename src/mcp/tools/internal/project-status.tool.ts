import { z } from 'zod';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/** @internal Test-run summary returned by the project status snapshot. */
interface ITestStatus {
	passed: boolean;
	total_pass: number;
	total_fail: number;
}

/** @internal Lint summary returned by the project status snapshot. */
interface ILintStatus {
	passed: boolean;
	total_errors: number;
	total_warnings: number;
}

/** @internal TypeScript type-check summary returned by the project status snapshot. */
interface ITypecheckStatus {
	passed: boolean;
	total: number;
}

/** @internal Shape of a single message entry in the ESLint JSON output. */
interface IEslintMessage {
	ruleId: string | null;
	severity: number;
	message: string;
	line: number;
	column: number;
}

/** @internal Shape of a per-file entry in the ESLint JSON output. */
interface IEslintFileResult {
	filePath: string;
	messages: IEslintMessage[];
	errorCount: number;
	warningCount: number;
}

/**
 * Internal tool that runs all project health checks in sequence and returns
 * a consolidated snapshot: tests, lint, typecheck.
 * Use this as the first step in any "what is the current state?" workflow
 * and as a final gate before committing or releasing.
 */
export class QProjectStatusTool extends QAbstractTool<
	z.ZodObject<Record<never, never>>
> {
	name = 'project_status';
	description =
		'Run all project health checks (tests, lint, typecheck) and return a consolidated snapshot. ' +
		'Reports pass/fail for each check with counts so you can see at a glance what needs attention. ' +
		'Use this to get instant context on the current project state before starting or after finishing work. ' +
		'Returns { passed, tests, lint, typecheck, summary }.';

	schema = z.object({});

	protected _spawn = spawnCommand;

	async execute(_args: Record<never, never>): Promise<{
		passed: boolean;
		tests: ITestStatus;
		lint: ILintStatus;
		typecheck: ITypecheckStatus;
		summary: string;
	}> {
		const tests = await this.runTests();
		const lint = await this.runLint();
		const typecheck = await this.runTypecheck();

		const passed = tests.passed && lint.passed && typecheck.passed;

		const statusIcon = (isOk: boolean) => (isOk ? '✓' : '✗');
		const summary = [
			`Tests: ${statusIcon(tests.passed)} ${tests.total_pass} pass, ${tests.total_fail} fail`,
			`Lint: ${statusIcon(lint.passed)} ${lint.total_errors} errors, ${lint.total_warnings} warnings`,
			`Typecheck: ${statusIcon(typecheck.passed)} ${typecheck.total} errors`,
			passed
				? 'All checks passed.'
				: 'Some checks failed — see details above.',
		].join(' | ');

		return { passed, tests, lint, typecheck, summary };
	}

	private async runTests(): Promise<ITestStatus> {
		let rawOutput = '';
		let exitedClean = false;

		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				['test'],
				process.cwd()
			);
			rawOutput = stdout + stderr;
			exitedClean = true;
		} catch (err: unknown) {
			const typed = err as { stdout?: string; stderr?: string };
			rawOutput = (typed.stdout ?? '') + (typed.stderr ?? '');
		}

		const passMatch = rawOutput.match(/(\d+)\s+pass/);
		const failMatch = rawOutput.match(/(\d+)\s+fail/);
		const totalPass =
			passMatch?.[1] !== undefined ? parseInt(passMatch[1], 10) : 0;
		const totalFail =
			failMatch?.[1] !== undefined ? parseInt(failMatch[1], 10) : 0;

		return {
			passed: exitedClean && totalFail === 0,
			total_pass: totalPass,
			total_fail: totalFail,
		};
	}

	private async runLint(): Promise<ILintStatus> {
		let rawOutput = '';

		try {
			const { stdout } = await this._spawn(
				'npx',
				['eslint', 'src/', '--format', 'json'],
				process.cwd()
			);
			rawOutput = stdout;
		} catch (err: unknown) {
			const typed = err as { stdout?: string };
			rawOutput = typed.stdout ?? '';
		}

		let totalErrors = 0;
		let totalWarnings = 0;

		try {
			const parsed = JSON.parse(rawOutput) as IEslintFileResult[];
			for (const fileResult of parsed) {
				totalErrors += fileResult.errorCount;
				totalWarnings += fileResult.warningCount;
			}
		} catch {
			// non-JSON output → treat as error
			totalErrors = rawOutput.length > 0 ? 1 : 0;
		}

		return {
			passed: totalErrors === 0,
			total_errors: totalErrors,
			total_warnings: totalWarnings,
		};
	}

	private async runTypecheck(): Promise<ITypecheckStatus> {
		let rawOutput = '';

		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				['run', 'typecheck:src'],
				process.cwd()
			);
			rawOutput = stdout + stderr;
		} catch (err: unknown) {
			const typed = err as { stdout?: string; stderr?: string };
			rawOutput = (typed.stdout ?? '') + (typed.stderr ?? '');
		}

		const errorMatches = rawOutput.match(/error TS\d+:/g);
		const total = errorMatches?.length ?? 0;

		return { passed: total === 0, total };
	}
}
