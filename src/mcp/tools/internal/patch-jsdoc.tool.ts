import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { resolve, sep } from 'path';

/**
 * Result returned by {@link QPatchJSDocTool}.
 * @see {@link QPatchJSDocTool} — tool whose `execute` returns this union
 * @internal
 */
type IPatchJSDocResult =
	| { success: true; message: string; linesChanged: number }
	| { success: false; error: string };

/** Matches exported class, function, const, let, interface, type, enum declarations. */
const SYMBOL_PATTERN = (name: string): RegExp => {
	const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	// eslint-disable-next-line security/detect-non-literal-regexp
	return new RegExp(
		`^(\\s*export\\s+(?:default\\s+)?(?:abstract\\s+)?(?:class|function|const|let|interface|type|enum)\\s+${safeName}\\b)`,
		'm'
	);
};

/**
 * Internal MCP tool that adds, updates, or removes the JSDoc block for a
 * named exported symbol in a TypeScript source file.
 *
 * @remarks
 * - **add** — inserts a new JSDoc block immediately before the symbol
 *   declaration. Fails when a JSDoc block already exists there.
 * - **update** — replaces the existing JSDoc block before the symbol.
 *   Fails when no existing JSDoc is found.
 * - **remove** — deletes the JSDoc block before the symbol.
 *   Fails when no existing JSDoc is found.
 *
 * The tool applies a path-traversal guard: `file_path` must resolve inside
 * the current working directory.
 *
 * @returns `{ success: true, message, linesChanged }` on success, or
 * `{ success: false, error }` on validation failure.
 *
 * @see {@link QCheckMissingJSDocsTool} — scan for symbols missing JSDoc
 * @see {@link QCheckProjectRulesTool} — verify naming and project rules after patching
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QPatchJSDocTool extends QAbstractTool<
	z.ZodObject<{
		file_path: z.ZodString;
		symbol_name: z.ZodString;
		action: z.ZodEnum<{ add: 'add'; update: 'update'; remove: 'remove' }>;
		jsdoc: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'patch_jsdoc';
	description =
		'Add, update, or remove the JSDoc block for a named exported symbol in a TypeScript source file. ' +
		'action="add": inserts new JSDoc (fails if one already exists). ' +
		'action="update": replaces existing JSDoc (fails if none found). ' +
		'action="remove": deletes existing JSDoc (fails if none found). ' +
		'jsdoc must be provided for add/update. ' +
		'Protects against path-traversal: file_path must be inside the project root.';

	schema = z.object({
		file_path: z
			.string()
			.describe(
				'Absolute or project-relative path to the TypeScript file (e.g. "src/core/user.ts")'
			),
		symbol_name: z
			.string()
			.describe(
				'Exact name of the exported symbol to patch (e.g. "QUserTool", "validateEmail")'
			),
		action: z
			.enum(['add', 'update', 'remove'])
			.describe('Operation to perform on the JSDoc block'),
		jsdoc: z
			.string()
			.optional()
			.describe(
				'Full JSDoc block content to insert/replace (required for add/update). ' +
					'Must start with /** and end with */. Include inner lines with " * ".'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Applies the requested JSDoc patch to the target TypeScript source file.
	 *
	 * @param args - Patch options.
	 * @param args.file_path - Path to the source file to modify.
	 * @param args.symbol_name - Name of the exported symbol whose JSDoc to patch.
	 * @param args.action - `'add'`, `'update'`, or `'remove'`.
	 * @param args.jsdoc - New JSDoc block content (required for `add`/`update`).
	 * @returns `{ success, message, linesChanged }` on success.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		file_path: string;
		symbol_name: string;
		action: 'add' | 'update' | 'remove';
		jsdoc?: string;
	}): Promise<IPatchJSDocResult> {
		await Promise.resolve();
		const cwd = process.cwd();

		// ── Path-traversal guard ───────────────────────────────────────────
		const absPath = resolve(
			args.file_path.startsWith(sep)
				? args.file_path
				: `${cwd}/${args.file_path}`
		);
		if (!absPath.startsWith(cwd)) {
			return {
				success: false,
				error: 'Path traversal detected: file_path is outside project root',
			};
		}

		if (!this._fs.existsSync(absPath)) {
			return { success: false, error: `File not found: ${absPath}` };
		}

		// ── Validate jsdoc arg ─────────────────────────────────────────────
		if (
			(args.action === 'add' || args.action === 'update') &&
			!args.jsdoc
		) {
			return {
				success: false,
				error: `jsdoc is required for action="${args.action}"`,
			};
		}

		const content = this._fs.readFileSync(absPath, 'utf-8');
		const lines = content.split('\n');

		// ── Find symbol line ───────────────────────────────────────────────
		const symbolRegex = SYMBOL_PATTERN(args.symbol_name);
		const symbolLineIdx = lines.findIndex((line) => symbolRegex.test(line));
		if (symbolLineIdx === -1) {
			return {
				success: false,
				error: `Symbol "${args.symbol_name}" not found as an exported declaration in ${absPath}`,
			};
		}

		// ── Locate preceding JSDoc block ───────────────────────────────────
		const jsdocRange = this.findPrecedingJSDoc(lines, symbolLineIdx);

		if (args.action === 'add') {
			if (jsdocRange !== null) {
				return {
					success: false,
					error: `Symbol "${args.symbol_name}" already has a JSDoc block (lines ${jsdocRange.start + 1}–${jsdocRange.end + 1}). Use action="update" to replace it.`,
				};
			}
			const newLines = this.insertBefore(
				lines,
				symbolLineIdx,
				args.jsdoc as string
			);
			this._fs.writeFileSync(absPath, newLines.join('\n'), 'utf-8');
			const added = (args.jsdoc as string).split('\n').length;
			return {
				success: true,
				message: `JSDoc added for "${args.symbol_name}"`,
				linesChanged: added,
			};
		}

		if (args.action === 'update') {
			if (jsdocRange === null) {
				return {
					success: false,
					error: `No existing JSDoc found before "${args.symbol_name}". Use action="add" to insert one.`,
				};
			}
			const newLines = this.replaceRange(
				lines,
				{ start: jsdocRange.start, end: jsdocRange.end },
				args.jsdoc as string
			);
			this._fs.writeFileSync(absPath, newLines.join('\n'), 'utf-8');
			const changed = (args.jsdoc as string).split('\n').length;
			return {
				success: true,
				message: `JSDoc updated for "${args.symbol_name}"`,
				linesChanged: changed,
			};
		}

		// action === 'remove'
		if (jsdocRange === null) {
			return {
				success: false,
				error: `No existing JSDoc found before "${args.symbol_name}".`,
			};
		}
		const removedCount = jsdocRange.end - jsdocRange.start + 1;
		const newLines = [
			...lines.slice(0, jsdocRange.start),
			...lines.slice(jsdocRange.end + 1),
		];
		this._fs.writeFileSync(absPath, newLines.join('\n'), 'utf-8');
		return {
			success: true,
			message: `JSDoc removed for "${args.symbol_name}"`,
			linesChanged: removedCount,
		};
	}

	/**
	 * Searches backwards from a symbol line for a preceding `/** ... *‌/` JSDoc block.
	 *
	 * @param lines - All lines of the source file.
	 * @param symbolIdx - 0-based index of the symbol declaration line.
	 * @returns `{ start, end }` line indices of the JSDoc block, or `null` when none found.
	 */
	private findPrecedingJSDoc(
		lines: string[],
		symbolIdx: number
	): { start: number; end: number } | null {
		// Walk up, skipping blank lines and decorator lines
		let cursor = symbolIdx - 1;
		while (cursor >= 0) {
			const trimmed = (lines[cursor] ?? '').trim();
			// Skip blank lines between decorators/symbol and the JSDoc
			if (trimmed === '') {
				cursor--;
				continue;
			}
			// Skip decorator lines
			if (trimmed.startsWith('@')) {
				cursor--;
				continue;
			}
			// If we hit the end of a JSDoc block
			if (trimmed.endsWith('*/')) {
				const jsdocEnd = cursor;
				// Walk further up to find the start
				while (cursor >= 0) {
					const startLine = (lines[cursor] ?? '').trim();
					if (startLine.startsWith('/**')) {
						return { start: cursor, end: jsdocEnd };
					}
					cursor--;
				}
				return null;
			}
			// Hit something else → no JSDoc
			return null;
		}
		return null;
	}

	/**
	 * Inserts a block of text (multiline string) before a given line index.
	 *
	 * @param lines - All lines of the source file.
	 * @param beforeIdx - Index before which to insert.
	 * @param block - Multiline text to insert (will be split on `\n`).
	 * @returns New lines array with the block inserted.
	 */
	private insertBefore(
		lines: string[],
		beforeIdx: number,
		block: string
	): string[] {
		const blockLines = block.split('\n');
		return [
			...lines.slice(0, beforeIdx),
			...blockLines,
			...lines.slice(beforeIdx),
		];
	}

	/**
	 * Replaces a range of lines with new content.
	 *
	 * @param lines - All lines of the source file.
	 * @param range - Start and end indices of the range to replace (inclusive).
	 * @param block - Replacement multiline text (split on `\n`).
	 * @returns New lines array with the range replaced.
	 */
	private replaceRange(
		lines: string[],
		range: { start: number; end: number },
		block: string
	): string[] {
		const blockLines = block.split('\n');
		return [
			...lines.slice(0, range.start),
			...blockLines,
			...lines.slice(range.end + 1),
		];
	}
}
