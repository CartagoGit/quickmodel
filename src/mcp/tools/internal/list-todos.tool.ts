import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, resolve, sep } from 'path';

/** Recognized annotation types */
type ITodoType = 'TODO' | 'FIXME' | 'HACK' | 'XXX';

/** A single found annotation entry */
interface ITodoItem {
	file: string;
	line: number;
	type: ITodoType;
	text: string;
}

const TODO_PATTERN = /\/\/\s*(TODO|FIXME|HACK|XXX)\s*[:-]?\s*(.*)/i;

const ANNOTATION_TYPES: ITodoType[] = ['TODO', 'FIXME', 'HACK', 'XXX'];

/**
 * Internal tool to scan source files for TODO / FIXME / HACK / XXX comments.
 * Returns a structured list of annotations with file, line number, type, and text.
 *
 * @see {@link QCheckMissingJSDocsTool} — find exports missing documentation
 * @see {@link QProjectStatusTool} — overall project health snapshot
 * @see {@link QListTodosTool} — this tool itself (self-reference for API completeness)
 */
export class QListTodosTool extends QAbstractTool<
	z.ZodObject<{
		targetDir: z.ZodOptional<z.ZodString>;
		extensions: z.ZodOptional<z.ZodArray<z.ZodString>>;
	}>
> {
	name = 'list_todos';
	description =
		'Scan source files for TODO, FIXME, HACK, and XXX comments. ' +
		'Returns a structured list: { file, line, type, text }[] so the agent can ' +
		'prioritize technical debt and outstanding work items. ' +
		'Defaults to scanning src/ in the project root; respects targetDir override.';

	schema = z.object({
		targetDir: z
			.string()
			.optional()
			.describe(
				'Directory to scan. Defaults to src/ in the project root.'
			),
		extensions: z
			.array(z.string())
			.optional()
			.describe(
				'File extensions to include (default: [".ts", ".js"]). ' +
					'E.g. [".ts", ".tsx", ".js"]'
			),
	});

	/**
	 * Scans source files for `TODO`, `FIXME`, `HACK`, and `XXX` annotation
	 * comments and returns them as a structured list.
	 *
	 * @param args - Scan configuration.
	 * @param args.targetDir - Directory to scan (relative to project root).
	 * Defaults to `src/` inside the project root.
	 * @param args.extensions - File extensions to include.
	 * Defaults to `['.ts', '.js']`.
	 * @returns `{ items, total }` — `items` is an array of
	 * `{ file, line, type, text }` entries; `total` is the count.
	 * @throws {Error} When `targetDir` resolves outside the project root
	 * (path-traversal guard).
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 * @see {@link QCheckMissingJSDocsTool} — complement: find undocumented exports
	 */
	async execute(args: {
		targetDir?: string;
		extensions?: string[];
	}): Promise<{ items: ITodoItem[]; total: number }> {
		await Promise.resolve();

		const cwd = process.cwd();
		const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;

		const rawTarget = args.targetDir
			? resolve(cwd, args.targetDir)
			: join(cwd, 'src');

		const safeTarget = rawTarget.endsWith(sep)
			? rawTarget
			: rawTarget + sep;
		if (!safeTarget.startsWith(safeCwd)) {
			throw new Error(
				'Security Error: Target directory is outside project root.'
			);
		}

		const exts = args.extensions ?? ['.ts', '.js'];
		const items: ITodoItem[] = [];

		const allFiles = this.collectFiles(rawTarget, exts);

		for (const filePath of allFiles) {
			let content: string;
			try {
				content = readFileSync(filePath, 'utf-8');
			} catch {
				continue;
			}

			const lines = content.split('\n');
			for (let idx = 0; idx < lines.length; idx++) {
				const line = lines[idx] ?? '';
				const match = TODO_PATTERN.exec(line);
				if (!match) continue;

				const rawType = match[1]?.toUpperCase() as ITodoType;
				if (!ANNOTATION_TYPES.includes(rawType)) continue;

				items.push({
					file: relative(cwd, filePath),
					line: idx + 1,
					type: rawType,
					text: match[2]?.trim() ?? '',
				});
			}
		}

		return { items, total: items.length };
	}

	/**
	 * Recursively collects files with the given extensions under a directory.
	 *
	 * @param dir - Root directory to traverse
	 * @param exts - File extensions to include (e.g. `['.ts', '.js']`)
	 * @returns Array of absolute file paths
	 */
	private collectFiles(dir: string, exts: string[]): string[] {
		const result: string[] = [];
		let entries: string[];
		try {
			entries = readdirSync(dir, { withFileTypes: false }) as string[];
		} catch {
			return result;
		}

		for (const entry of entries) {
			const full = join(dir, entry);
			let stat: ReturnType<typeof statSync>;
			try {
				stat = statSync(full);
			} catch {
				continue;
			}

			if (stat.isDirectory()) {
				result.push(...this.collectFiles(full, exts));
			} else if (exts.some((ext) => full.endsWith(ext))) {
				result.push(full);
			}
		}

		return result;
	}
}
