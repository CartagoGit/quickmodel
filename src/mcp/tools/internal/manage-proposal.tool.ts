import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join, resolve } from 'path';

/**
 * A parsed proposal entry from the TASKS.md backlog.
 * @see {@link QManageProposalTool} — tool that produces these parsed entries
 * @internal
 */
interface IProposalEntry {
	letter: string;
	title: string;
	priority: string;
	status: string;
	excerpt: string;
}

/**
 * Arguments accepted by {@link QManageProposalTool}.
/**
 * Result returned by {@link QManageProposalTool}.
 * @see {@link QManageProposalTool} — tool whose `execute` returns this union
 * @internal
 */
type IManageProposalResult =
	| {
			action: 'list';
			success: true;
			proposals: IProposalEntry[];
			total: number;
			summary: string;
	  }
	| { action: 'add'; success: true; letter: string; message: string }
	| { action: 'get-next-id'; success: true; letter: string; summary: string }
	| { success: false; error: string };

/** Priority emoji map. */
const PRIORITY_EMOJI: Record<string, string> = {
	alta: '🔴 Alta',
	media: '🟡 Media',
	baja: '🟢 Baja',
};

/**
 * Internal MCP tool for managing proposal entries in
 * `docs-vitepress/proposals/TASKS.md`.
 *
 * @remarks
 * Supports three actions:
 * - **list** — parses and returns all backlog proposals from the
 *   `## 🆕 PROPUESTAS BACKLOG` section.
 * - **add** — appends a new proposal entry (with letter, priority, title,
 *   description) to the backlog section.
 * - **get-next-id** — returns the next available proposal letter (A, B, C…).
 *
 * @returns Varies by action; see `IManageProposalResult`.
 *
 * @see {@link QListTodosTool} — scan for TODO/FIXME annotations in source code
 * @see {@link QCheckProjectHealthTool} — overall project health check
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QManageProposalTool extends QAbstractTool<
	z.ZodObject<{
		action: z.ZodEnum<{
			list: 'list';
			add: 'add';
			'get-next-id': 'get-next-id';
		}>;
		title: z.ZodOptional<z.ZodString>;
		description: z.ZodOptional<z.ZodString>;
		priority: z.ZodOptional<
			z.ZodEnum<{ alta: 'alta'; media: 'media'; baja: 'baja' }>
		>;
		impact: z.ZodOptional<z.ZodString>;
		effort: z.ZodOptional<z.ZodString>;
		tasks_path: z.ZodOptional<z.ZodString>;
	}>
> {
	name = 'manage_proposal';
	description =
		'Manage proposal entries in docs-vitepress/proposals/TASKS.md. ' +
		'action="list": returns all backlog proposals with their letter, priority, and excerpt. ' +
		'action="add": appends a new proposal to the backlog section (requires title + description). ' +
		'action="get-next-id": returns the next available proposal letter (A, B, C…).';

	schema = z.object({
		action: z
			.enum(['list', 'add', 'get-next-id'])
			.describe('Operation to perform on the proposals backlog'),
		title: z
			.string()
			.optional()
			.describe('Proposal title (required for action="add")'),
		description: z
			.string()
			.optional()
			.describe(
				'Proposal description / rationale (required for action="add")'
			),
		priority: z
			.enum(['alta', 'media', 'baja'])
			.optional()
			.describe('Priority level for action="add" (default: media)'),
		impact: z
			.string()
			.optional()
			.describe('Impact description for action="add"'),
		effort: z
			.string()
			.optional()
			.describe('Effort estimate for action="add" (e.g. "2-3 horas")'),
		tasks_path: z
			.string()
			.optional()
			.describe(
				'Override path to TASKS.md (defaults to docs-vitepress/proposals/TASKS.md). Used in tests.'
			),
	});

	/** @internal File-system abstraction, injectable for testing. */
	protected _fs = fs;

	/**
	 * Executes the requested proposal management action.
	 *
	 * @param args - Tool arguments.
	 * @returns Varies by action — see `IManageProposalResult`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(args: {
		action: 'list' | 'add' | 'get-next-id';
		title?: string;
		description?: string;
		priority?: 'alta' | 'media' | 'baja';
		impact?: string;
		effort?: string;
		tasks_path?: string;
	}): Promise<IManageProposalResult> {
		await Promise.resolve();
		const cwd = process.cwd();
		const tasksPath = args.tasks_path
			? resolve(
					args.tasks_path.startsWith('/')
						? args.tasks_path
						: join(cwd, args.tasks_path)
				)
			: join(cwd, 'docs-vitepress', 'proposals', 'TASKS.md');

		// Path-traversal guard
		if (!tasksPath.startsWith(cwd)) {
			return {
				success: false,
				error: 'Path traversal detected: tasks_path is outside project root',
			};
		}

		if (!this._fs.existsSync(tasksPath)) {
			return {
				success: false,
				error: `TASKS.md not found at: ${tasksPath}`,
			};
		}

		const content = this._fs.readFileSync(tasksPath, 'utf-8');

		if (args.action === 'list') {
			return this.handleList(content);
		}

		if (args.action === 'get-next-id') {
			return this.handleGetNextId(content);
		}

		// action === 'add'
		if (!args.title || !args.description) {
			return {
				success: false,
				error: 'title and description are required for action="add"',
			};
		}

		if (/[\r\n]/.test(args.title)) {
			return {
				success: false,
				error: 'Unsafe title: newline characters are not allowed',
			};
		}

		return this.handleAdd(tasksPath, content, args);
	}

	/**
	 * Parses the backlog section and returns structured proposal entries.
	 *
	 * @param content - Raw TASKS.md content.
	 * @returns List result with parsed proposals.
	 */
	private handleList(content: string): IManageProposalResult {
		const proposals = this.parseProposals(content);
		return {
			action: 'list',
			success: true,
			proposals,
			total: proposals.length,
			summary: `Found ${proposals.length} proposal(s) in the backlog`,
		};
	}

	/**
	 * Computes the next available proposal letter (after the last existing one).
	 *
	 * @param content - Raw TASKS.md content.
	 * @returns Next letter result.
	 */
	private handleGetNextId(content: string): IManageProposalResult {
		const proposals = this.parseProposals(content);
		const letters = proposals
			.map((prop) => prop.letter)
			.filter((lit) => /^[A-Z]$/.test(lit))
			.sort();
		const lastLetter = letters.at(-1) ?? '@';
		const nextCode = lastLetter.charCodeAt(0) + 1;
		const nextLetter = String.fromCharCode(nextCode);
		return {
			action: 'get-next-id',
			success: true,
			letter: nextLetter,
			summary: `Next proposal letter: ${nextLetter}`,
		};
	}

	/**
	 * Appends a new proposal entry to the TASKS.md backlog section.
	 *
	 * @param tasksPath - Absolute path to TASKS.md.
	 * @param content - Current file content.
	 * @param args - Full tool arguments with title, description, etc.
	 * @returns Add result.
	 */
	private handleAdd(
		tasksPath: string,
		content: string,
		args: {
			action: 'list' | 'add' | 'get-next-id';
			title?: string;
			description?: string;
			priority?: 'alta' | 'media' | 'baja';
			impact?: string;
			effort?: string;
			tasks_path?: string;
		}
	): IManageProposalResult {
		const proposals = this.parseProposals(content);
		const letters = proposals
			.map((prop) => prop.letter)
			.filter((lit) => /^[A-Z]$/.test(lit))
			.sort();
		const lastLetter = letters.at(-1) ?? '@';
		const nextCode = lastLetter.charCodeAt(0) + 1;
		const letter = String.fromCharCode(nextCode);
		const priorityLabel =
			PRIORITY_EMOJI[args.priority ?? 'media'] ?? '🟡 Media';
		const impact = args.impact ?? 'Por definir';
		const effort = args.effort ?? 'Por estimar';

		const newProposal =
			`\n\n---\n\n` +
			`### Propuesta ${letter} — ${args.title}\n\n` +
			`**Prioridad:** ${priorityLabel}\n` +
			`**Impacto:** ${impact}\n` +
			`**Esfuerzo estimado:** ${effort}\n\n` +
			`${args.description}\n`;

		const backlogMarker = '## 🆕 PROPUESTAS BACKLOG';
		const markerIdx = content.indexOf(backlogMarker);

		let updatedContent: string;
		if (markerIdx === -1) {
			// Append at end if section not found
			updatedContent = content + newProposal;
		} else {
			// Append at the very end of the file so order is preserved
			updatedContent = content + newProposal;
		}

		this._fs.writeFileSync(tasksPath, updatedContent, 'utf-8');
		return {
			action: 'add',
			success: true,
			letter,
			message: `Proposal ${letter} — "${args.title}" added to TASKS.md`,
		};
	}

	/**
	 * Parses `### Propuesta X — Title` headings from the TASKS.md backlog section.
	 *
	 * @param content - Raw TASKS.md content.
	 * @returns Array of proposal entries.
	 */
	private parseProposals(content: string): IProposalEntry[] {
		const proposals: IProposalEntry[] = [];
		const sectionRegex = /### Propuesta ([A-Z✅]) — (.+)/g;
		let match = sectionRegex.exec(content);
		while (match !== null) {
			const letter = match[1] as string;
			const title = match[2] as string;
			// Extract a short excerpt (next 2 non-empty lines after heading)
			const afterMatch = content.slice(
				(match.index ?? 0) + match[0].length
			);
			const raw = afterMatch
				.split('\n')
				.filter((ln) => ln.trim())
				.slice(0, 2)
				.join(' ');
			const priorityMatch = /\*\*Prioridad:\*\*\s*(.+)/.exec(afterMatch);
			const statusMatch =
				title.includes('Completada') || letter === '✅'
					? 'completada'
					: 'pendiente';
			proposals.push({
				letter,
				title: title.trim(),
				priority: priorityMatch
					? (priorityMatch[1] ?? '').trim()
					: 'Sin prioridad',
				status: statusMatch,
				excerpt: raw.replace(/\*\*/g, '').trim().slice(0, 120),
			});
			match = sectionRegex.exec(content);
		}
		return proposals;
	}
}
