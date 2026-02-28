import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { spawnCommand } from './utils';

/**
 * A file flagged as potentially drifted — code changed but JSDoc not updated.
 * @see {@link QCheckDocDriftTool} — tool that produces these drift reports
 * @internal
 */
interface IDriftedFile {
	file: string;
	codeChanges: number;
	jsdocChanges: number;
	note: string;
}

/**
 * Result returned by {@link QCheckDocDriftTool}.
 * @see {@link QCheckDocDriftTool} — tool whose `execute` returns this shape
 * @internal
 */
interface ICheckDocDriftResult {
	driftedFiles: IDriftedFile[];
	cleanFiles: number;
	total: number;
	passed: boolean;
	summary: string;
}

/**
 * Internal MCP tool that detects TypeScript source files where code was
 * modified (in the current working tree or since the last commit) but the
 * JSDoc comments were **not** updated alongside the code.
 *
 * @remarks
 * Uses `git diff HEAD` to obtain the current working-tree diff. For every
 * changed `.ts` file it counts:
 * - **codeChanges** — added lines that look like code (not `*`, not blank,
 *   not comment-only).
 * - **jsdocChanges** — added lines that look like JSDoc content (`+ * `,
 *   `+/**`, `+ * /`).
 *
 * Files with `codeChanges > 0` but `jsdocChanges === 0` are flagged as
 * "potentially drifted". This is a heuristic, not a guarantee — the agent
 * should review flagged files and decide whether the JSDoc needs updating.
 *
 * @returns `{ driftedFiles, cleanFiles, total, passed, summary }`.
 *
 * @see {@link QCheckMissingJSDocsTool} — detect symbols without any JSDoc
 * @see {@link QPatchJSDocTool} — apply JSDoc patches to flagged files
 * @see {@link QCheckProjectRulesTool} — ensure project conventions are met
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QCheckDocDriftTool extends QAbstractTool<
	z.ZodObject<{
		target_dir: z.ZodDefault<z.ZodString>;
	}>
> {
	name = 'check_doc_drift';
	description =
		'Detect TypeScript source files where code changed (vs HEAD) but JSDoc was not updated. ' +
		'Uses `git diff HEAD` to analyse the working tree. ' +
		'Returns files where code additions outpace JSDoc updates — ' +
		'these are candidates for JSDoc review / patch_jsdoc. ' +
		'Heuristic: counts added code lines vs added JSDoc lines per diff chunk.';

	schema = z.object({
		target_dir: z
			.string()
			.default('src')
			.describe('Directory to scope the drift check to (default: "src")'),
	});

	/** @internal `spawnCommand` reference; can be overridden in tests. */
	protected _spawn = spawnCommand;

	/**
	 * Runs `git diff HEAD` scoped to the target directory and analyses each
	 * changed `.ts` file for JSDoc drift.
	 *
	 * @param args - Tool arguments.
	 * @param args.target_dir - Directory to scope (default: `src`).
	 * @returns Drift analysis result.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: { target_dir: string }): Promise<ICheckDocDriftResult> {
		const cwd = process.cwd();

		// ── Get list of changed .ts files ─────────────────────────────────
		let changedFiles: string[] = [];
		try {
			const { stdout } = await this._spawn(
				'git',
				[
					'diff',
					'HEAD',
					'--name-only',
					'--',
					`${args.target_dir}/**/*.ts`,
				],
				cwd
			);
			changedFiles = stdout
				.split('\n')
				.map((line) => line.trim())
				.filter(
					(line) =>
						line.endsWith('.ts') && line.startsWith(args.target_dir)
				);
		} catch {
			// No commits yet or no git repo — return empty
			return {
				driftedFiles: [],
				cleanFiles: 0,
				total: 0,
				passed: true,
				summary: 'No git diff available or no changed files found.',
			};
		}

		if (changedFiles.length === 0) {
			return {
				driftedFiles: [],
				cleanFiles: 0,
				total: 0,
				passed: true,
				summary: `No changed files in ${args.target_dir} since HEAD.`,
			};
		}

		// ── Analyse each file's diff ───────────────────────────────────────
		const driftedFiles: IDriftedFile[] = [];
		let cleanCount = 0;

		for (const filePath of changedFiles) {
			const analyse = await this.analyseFileDiff(filePath, cwd);
			if (analyse.codeChanges > 0 && analyse.jsdocChanges === 0) {
				driftedFiles.push({
					file: filePath,
					codeChanges: analyse.codeChanges,
					jsdocChanges: 0,
					note: `${analyse.codeChanges} code line(s) added with no JSDoc update — review and run patch_jsdoc if needed`,
				});
			} else {
				cleanCount++;
			}
		}

		const total = changedFiles.length;
		const passed = driftedFiles.length === 0;
		const summary = passed
			? `✅ No JSDoc drift detected in ${total} changed file(s)`
			: `⚠️ ${driftedFiles.length} file(s) may have drifted JSDoc (code changed, JSDoc untouched)`;

		return { driftedFiles, cleanFiles: cleanCount, total, passed, summary };
	}

	/**
	 * Gets the diff for a single file and counts added code vs JSDoc lines.
	 *
	 * @param filePath - Repository-relative path to the file.
	 * @param cwd - Project root directory.
	 * @returns `{ codeChanges, jsdocChanges }` counts.
	 */
	private async analyseFileDiff(
		filePath: string,
		cwd: string
	): Promise<{ codeChanges: number; jsdocChanges: number }> {
		let diffOutput = '';
		try {
			const { stdout } = await this._spawn(
				'git',
				['diff', 'HEAD', '--', filePath],
				cwd
			);
			diffOutput = stdout;
		} catch {
			return { codeChanges: 0, jsdocChanges: 0 };
		}

		let codeChanges = 0;
		let jsdocChanges = 0;

		for (const line of diffOutput.split('\n')) {
			if (!line.startsWith('+') || line.startsWith('+++')) {
				continue;
			}
			const body = line.slice(1);
			const trimmed = body.trim();
			if (trimmed === '') {
				continue;
			}
			// JSDoc line heuristics: lines starting with `/**`, ` * `, ` */`
			if (
				trimmed.startsWith('/**') ||
				trimmed.startsWith('* ') ||
				trimmed === '*' ||
				trimmed.startsWith('*/')
			) {
				jsdocChanges++;
			} else if (!trimmed.startsWith('//')) {
				codeChanges++;
			}
		}

		return { codeChanges, jsdocChanges };
	}
}
