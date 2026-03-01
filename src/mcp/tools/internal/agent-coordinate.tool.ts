import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Default TTL in milliseconds (30 minutes).
 * Agents doing long-running work should call `update` (heartbeat) periodically to refresh.
 * Entries that exceed this threshold without a heartbeat are auto-purged on the next registry read,
 * which prevents indefinite blocking when an agent crashes or VS Code restarts.
 */
const DEFAULT_TTL_MS = 30 * 60 * 1000;

/**
 * Default staleness threshold (5 minutes) used by `force` claim.
 * If the conflicting agent's last `updatedAt` is older than this, `force: true` will override the lock,
 * assuming the agent crashed or was terminated without calling `release`.
 */
const DEFAULT_STALE_MS = 5 * 60 * 1000;

/** A single active agent entry in the registry. */
interface IAgentEntry {
	agentId: string;
	task: string;
	/** File paths or glob patterns owned by this agent. */
	files: string[];
	/** ISO timestamp of when the claim was first created. */
	startedAt: string;
	/** ISO timestamp of the last claim or update call (heartbeat). */
	updatedAt: string;
	/** ISO timestamp after which this entry is automatically purged. */
	expiresAt: string;
}

/** Shape of the persisted registry JSON. */
interface IAgentRegistry {
	agents: Record<string, IAgentEntry>;
}

/**
 * Returns the base directory prefix of a glob pattern (before the first `*`).
 *
 * Used internally by {@link patternsOverlap} to determine the scope of a glob.
 *
 * @param pattern - A file path or glob pattern (e.g. `src/core/**`, `*.ts`, `src/file.ts`).
 * @returns The directory prefix up to and including the last `/` before the first `*`.
 *   Returns `''` for exact paths (no `*`).
 *   Returns `'/'` for root-level globs (e.g. `*.ts`, `**`) — treated as "matches everything".
 *
 * @example
 * ```ts
 * globBase('src/core/**')  // → 'src/core/'
 * globBase('*.ts')          // → '/' (root glob)
 * globBase('**')            // → '/' (root glob)
 * globBase('src/file.ts')  // → '' (exact path)
 * ```
 */
function globBase(pattern: string): string {
	const starIdx = pattern.indexOf('*');
	if (starIdx === -1) return ''; // exact path — no glob
	const slashIdx = pattern.lastIndexOf('/', starIdx);
	// No slash before first `*` means root-level glob → treat as "all"
	return slashIdx === -1 ? '/' : pattern.slice(0, slashIdx + 1);
}

/**
 * Returns `true` if `patA` and `patB` could refer to the same file(s).
 *
 * Conservative: false positives (reporting a conflict that may not exist) are safer
 * than false negatives (missing a real conflict).
 *
 * Rules:
 * - **Exact vs exact**: only overlaps if the strings are identical.
 * - **Glob vs exact**: overlaps if the exact path starts with the glob's base dir.
 * - **Glob vs glob**: overlaps if one base dir is a prefix of the other,
 *   meaning one pattern's scope encompasses the other's.
 * - **Root glob** (`*.ts`, `**`): always overlaps with everything.
 *
 * @param patA - First file path or glob pattern.
 * @param patB - Second file path or glob pattern.
 * @returns `true` if the two patterns could resolve to the same file(s).
 *
 * @example
 * ```ts
 * patternsOverlap('src/**', 'src/core/qm.ts')       // → true
 * patternsOverlap('src/**', 'tests/**')              // → false
 * patternsOverlap('src/**', 'src/core/**')           // → true
 * patternsOverlap('docs/en/**', 'docs/es/**')        // → false
 * patternsOverlap('*.ts', 'src/any.ts')              // → true (root glob)
 * patternsOverlap('a.ts', 'b.ts')                    // → false
 * ```
 */
function patternsOverlap(patA: string, patB: string): boolean {
	if (patA === patB) return true;
	const isGlobA = patA.includes('*');
	const isGlobB = patB.includes('*');

	if (!isGlobA && !isGlobB) return false; // different exact paths

	const baseA = globBase(patA);
	const baseB = globBase(patB);

	if (isGlobA && !isGlobB) {
		if (baseA === '/') return true; // A is a root glob → matches everything
		return patB.startsWith(baseA);
	}
	if (!isGlobA && isGlobB) {
		if (baseB === '/') return true; // B is a root glob → matches everything
		return patA.startsWith(baseB);
	}
	// Both are globs
	if (baseA === '/' || baseB === '/') return true;
	return baseA.startsWith(baseB) || baseB.startsWith(baseA);
}

/**
 * Returns `true` if any pattern in `filesA` overlaps with any pattern in `filesB`.
 *
 * Short-circuits on the first overlapping pair found.
 *
 * @param filesA - File paths / glob patterns owned by one agent.
 * @param filesB - File paths / glob patterns owned by another agent.
 * @returns `true` if at least one pair from the two sets overlaps.
 * @see {@link patternsOverlap}
 */
function setsOverlap(filesA: string[], filesB: string[]): boolean {
	for (const patA of filesA) {
		for (const patB of filesB) {
			if (patternsOverlap(patA, patB)) return true;
		}
	}
	return false;
}

type IClaimResult =
	| {
			claimed: true;
			conflict: false;
			otherAgents: IAgentEntry[];
			summary: string;
	  }
	| {
			claimed: false;
			conflict: true;
			claimedBy: string;
			conflictingTask: string;
			conflictingFiles: string[];
			claimedSince: string;
			summary: string;
	  }
	| { claimed: false; conflict: false; summary: string };

interface ICheckResult {
	agents: IAgentEntry[];
	total: number;
	purgedStale: number;
	summary: string;
}

interface IReleaseResult {
	released: boolean;
	summary: string;
}

interface IPurgeResult {
	purged: number;
	remaining: number;
	summary: string;
}

interface IUpdateResult {
	updated: boolean;
	expiresAt: string;
	summary: string;
}

type ICoordinateResult =
	| IClaimResult
	| ICheckResult
	| IReleaseResult
	| IPurgeResult
	| IUpdateResult;

/**
 * Internal tool to coordinate parallel agent work and prevent file conflicts.
 *
 * Maintains a lightweight JSON registry at `tmp/agent-registry.json` so that
 * multiple AI agents working in the same repo can declare what they are doing
 * and detect overlaps **before** touching files.
 *
 * ### Actions
 * | Action | Purpose |
 * |--------|---------|
 * | `check` | List all active agents. **Call this first** to pick a safe work area. |
 * | `claim` | Lock a task + files. Conflict-detected via glob-aware overlap matching. |
 * | `release` | Free the claim when the work is done or aborted. |
 * | `update` | Heartbeat — refresh TTL of an existing claim. Call every ~30 min for long tasks. |
 * | `purge` | Force-clear stuck/stale claims without waiting for TTL expiry. |
 *
 * ### Conflict detection
 * Uses base-path prefix matching so that glob patterns resolve correctly:
 * - `docs-vitepress/en/**` conflicts with `docs-vitepress/en/guide/qmodel.md`
 * - `src/**` conflicts with `src/core/**`
 * - `src/**` does NOT conflict with `tests/**`
 *
 * ### TTL and crash resilience
 * Claims expire automatically after **30 minutes** unless the agent calls `update` (heartbeat).
 * This prevents indefinite blocking when an agent crashes or VS Code restarts.
 * Use `force: true` on `claim` to immediately override a lock whose `updatedAt` is older than
 * ~5 minutes (configurable via `_staleCrashMs`). Stale entries are also pruned silently on every
 * `readRegistry` call.
 *
 * @example
 * ```ts
 * // 1. Before starting — see who is working on what:
 * await agent_coordinate({ action: 'check' });
 * // → { agents: [{ agentId: 'agent-A', task: 'migrate docs', files: ['docs-vitepress/en/**'] }] }
 *
 * // 2. Claim your work area:
 * await agent_coordinate({ action: 'claim', agentId: 'agent-B', task: 'fix tests', files: ['tests/**'] });
 * // → { claimed: true, conflict: false, otherAgents: [{ agentId: 'agent-A', ... }] }
 *
 * // 3. Conflict scenario:
 * await agent_coordinate({ action: 'claim', agentId: 'agent-C', task: 'update guide', files: ['docs-vitepress/en/guide/qmodel.md'] });
 * // → { claimed: false, conflict: true, claimedBy: 'agent-A', conflictingFiles: ['docs-vitepress/en/**'] }
 *
 * // 3b. Conflict from a crashed agent — force override:
 * await agent_coordinate({ action: 'claim', agentId: 'agent-C', task: 'update guide', files: ['docs-vitepress/en/guide/qmodel.md'], force: true });
 * // → { claimed: true } — if agent-A's updatedAt > 5 min ago (assumed crashed)
 * // → { claimed: false, conflict: true } — if agent-A is still actively sending heartbeats
 *
 * // 4. Heartbeat for long tasks (call every ~15 min):
 * await agent_coordinate({ action: 'update', agentId: 'agent-B' });
 *
 * // 5. Release when done:
 * await agent_coordinate({ action: 'release', agentId: 'agent-B' });
 *
 * // 6. Unstick a crashed agent:
 * await agent_coordinate({ action: 'purge', agentId: 'agent-A' });
 * // Or clear everything stale:
 * await agent_coordinate({ action: 'purge' });
 * ```
 *
 * @see {@link QGetStagedFilesTool} — companion: check which files are already staged
 * @see {@link QProjectStatusTool} — overall project health snapshot
 * @see {@link QMcpServer} — server that registers this tool
 */
export class QAgentCoordinateTool extends QAbstractTool<
	z.ZodObject<{
		action: z.ZodEnum<{
			claim: 'claim';
			check: 'check';
			release: 'release';
			update: 'update';
			purge: 'purge';
		}>;
		agentId: z.ZodOptional<z.ZodString>;
		task: z.ZodOptional<z.ZodString>;
		files: z.ZodOptional<z.ZodArray<z.ZodString>>;
		ttlMs: z.ZodOptional<z.ZodNumber>;
		force: z.ZodOptional<z.ZodBoolean>;
	}>
> {
	name = 'agent_coordinate';
	description =
		'Coordinate parallel agent work to prevent file conflicts. ' +
		'action="check": list all active agents — ALWAYS call this first. ' +
		'action="claim": register task + files; uses glob-aware overlap detection; returns conflict:true if blocked. ' +
		'  Set force=true to override a stale lock (updatedAt older than ~5 min) from a crashed agent. ' +
		'action="release": free the claim when done. ' +
		'action="update": refresh TTL heartbeat for long-running tasks (call every ~15 min). ' +
		'action="purge": forcibly clear stuck/stale claims (optional agentId to target one). ' +
		'Registry persisted to tmp/agent-registry.json; entries auto-expire after 30 min without heartbeat.';

	schema = z.object({
		action: z
			.enum(['claim', 'check', 'release', 'update', 'purge'])
			.describe('Operation: claim | check | release | update | purge'),
		agentId: z
			.string()
			.optional()
			.describe(
				'Unique agent identifier, e.g. "copilot-session-1". Required for claim, release, update.'
			),
		task: z
			.string()
			.optional()
			.describe(
				'Short task description, e.g. "migrate docs $qm". Required for claim.'
			),
		files: z
			.array(z.string())
			.optional()
			.describe(
				'File paths or glob patterns to lock, e.g. ["docs-vitepress/en/**", "src/core/**"]. ' +
					'Glob-aware: docs-vitepress/en/** conflicts with docs-vitepress/en/guide/qmodel.md.'
			),
		ttlMs: z
			.number()
			.optional()
			.describe(
				'Custom TTL in milliseconds for this claim. Defaults to 1800000 (30 minutes). ' +
					'Call update periodically for long-running tasks.'
			),
		force: z
			.boolean()
			.optional()
			.describe(
				'If true, overrides a conflicting claim whose updatedAt is older than ~5 min ' +
					'(i.e. the agent likely crashed or VS Code restarted). ' +
					'Does NOT override a fresh, active claim — use purge for that.'
			),
	});

	/** @internal Override in tests to isolate the registry file. */
	_registryPath: string = join(process.cwd(), 'tmp', 'agent-registry.json');

	/** @internal Override in tests to control TTL behaviour. */
	_ttlMs: number = DEFAULT_TTL_MS;

	/**
	 * @internal Staleness threshold for `force` claim override (default: 5 minutes).
	 * When `force: true` is passed to `claim`, a conflicting agent whose `updatedAt`
	 * is older than this value is considered crashed and its lock is overridden.
	 */
	_staleCrashMs: number = DEFAULT_STALE_MS;

	// ── Registry I/O ──────────────────────────────────────────────────────────

	private readRegistry(): { reg: IAgentRegistry; purgedStale: number } {
		if (!existsSync(this._registryPath)) {
			return { reg: { agents: {} }, purgedStale: 0 };
		}
		let raw: IAgentRegistry;
		try {
			const parsed = JSON.parse(
				readFileSync(this._registryPath, 'utf-8')
			) as unknown;
			if (
				typeof parsed !== 'object' ||
				parsed === null ||
				typeof (parsed as Record<string, unknown>)['agents'] !==
					'object' ||
				(parsed as Record<string, unknown>)['agents'] === null
			) {
				return { reg: { agents: {} }, purgedStale: 0 };
			}
			raw = parsed as IAgentRegistry;
		} catch {
			return { reg: { agents: {} }, purgedStale: 0 };
		}
		const now = Date.now();
		let purgedStale = 0;
		for (const [agentId, entry] of Object.entries(raw.agents)) {
			if (new Date(entry.expiresAt).getTime() < now) {
				delete raw.agents[agentId];
				purgedStale++;
			}
		}
		if (purgedStale > 0) this.saveRegistry(raw);
		return { reg: raw, purgedStale };
	}

	private saveRegistry(reg: IAgentRegistry): void {
		mkdirSync(dirname(this._registryPath), { recursive: true });
		writeFileSync(
			this._registryPath,
			JSON.stringify(reg, null, 2),
			'utf-8'
		);
	}

	private makeExpiry(ttlMs?: number): string {
		return new Date(Date.now() + (ttlMs ?? this._ttlMs)).toISOString();
	}

	// ── Handlers ──────────────────────────────────────────────────────────────

	private handleCheck(
		reg: IAgentRegistry,
		purgedStale: number
	): ICheckResult {
		const agents = Object.values(reg.agents);
		const total = agents.length;
		const agentList =
			total === 0
				? 'none'
				: agents
						.map(
							(agt) =>
								`${agt.agentId} → "${agt.task}" (files: ${agt.files.length > 0 ? agt.files.join(', ') : 'none'}; expires: ${agt.expiresAt})`
						)
						.join(' | ');
		const stalePart =
			purgedStale > 0
				? ` Auto-purged ${purgedStale} stale entry(s).`
				: '';
		return {
			agents,
			total,
			purgedStale,
			summary: `Active agents: ${total}. ${agentList}.${stalePart}`,
		};
	}

	private handleRelease(
		reg: IAgentRegistry,
		agentId: string | undefined
	): IReleaseResult {
		if (!agentId) {
			return {
				released: false,
				summary: 'agentId is required for release.',
			};
		}
		const entry = reg.agents[agentId];
		if (!entry) {
			return {
				released: false,
				summary: `No active claim found for agent "${agentId}".`,
			};
		}
		delete reg.agents[agentId];
		this.saveRegistry(reg);
		return {
			released: true,
			summary: `Agent "${agentId}" released task "${entry.task}".`,
		};
	}

	private handleUpdate(
		reg: IAgentRegistry,
		agentId: string | undefined,
		ttlMs: number | undefined
	): IUpdateResult {
		if (!agentId) {
			return {
				updated: false,
				expiresAt: '',
				summary: 'agentId is required for update.',
			};
		}
		const entry = reg.agents[agentId];
		if (!entry) {
			return {
				updated: false,
				expiresAt: '',
				summary: `No active claim found for agent "${agentId}". Use claim first.`,
			};
		}
		const expiresAt = this.makeExpiry(ttlMs);
		reg.agents[agentId] = {
			...entry,
			updatedAt: new Date().toISOString(),
			expiresAt,
		};
		this.saveRegistry(reg);
		return {
			updated: true,
			expiresAt,
			summary: `Agent "${agentId}" TTL refreshed. New expiry: ${expiresAt}.`,
		};
	}

	private handlePurge(
		reg: IAgentRegistry,
		agentId: string | undefined
	): IPurgeResult {
		const before = Object.keys(reg.agents).length;
		if (agentId) {
			const existed = agentId in reg.agents;
			delete reg.agents[agentId];
			const purged = existed ? 1 : 0;
			this.saveRegistry(reg);
			return {
				purged,
				remaining: Object.keys(reg.agents).length,
				summary: existed
					? `Purged claim for agent "${agentId}".`
					: `No claim found for agent "${agentId}" — nothing to purge.`,
			};
		}
		// Purge all
		reg.agents = {};
		this.saveRegistry(reg);
		return {
			purged: before,
			remaining: 0,
			summary: `Purged all ${before} active claim(s).`,
		};
	}

	private handleClaim(
		reg: IAgentRegistry,
		args: {
			agentId: string | undefined;
			task: string | undefined;
			files: string[];
			ttlMs: number | undefined;
			force: boolean | undefined;
		}
	): IClaimResult {
		const { agentId, task, files, ttlMs, force } = args;
		if (!agentId || !task) {
			return {
				claimed: false,
				conflict: false,
				summary: 'agentId and task are required for claim.',
			};
		}

		for (const entry of Object.values(reg.agents)) {
			if (entry.agentId === agentId) continue; // same agent — re-claim is allowed
			if (files.length > 0 && setsOverlap(files, entry.files)) {
				const overlapping = files.filter((fil) =>
					entry.files.some((owned) => patternsOverlap(fil, owned))
				);
				// force=true: override only if the conflicting agent hasn't sent a heartbeat
				// recently (likely crashed). Active agents are never overridden.
				const ageMs = Date.now() - new Date(entry.updatedAt).getTime();
				if (force === true && ageMs > this._staleCrashMs) {
					// Override: remove stale lock and fall through to claim below
					delete reg.agents[entry.agentId];
					continue;
				}
				return {
					claimed: false,
					conflict: true,
					claimedBy: entry.agentId,
					conflictingTask: entry.task,
					conflictingFiles: entry.files,
					claimedSince: entry.startedAt,
					summary:
						`Conflict: agent "${entry.agentId}" owns overlapping files for task "${entry.task}". ` +
						`Your conflicting files: ${overlapping.join(', ')}. ` +
						`Their claim expires at ${entry.expiresAt}. ` +
						`Options: (1) wait for TTL expiry, (2) agent_coordinate purge agentId="${entry.agentId}", ` +
						`(3) retry with force=true if their updatedAt suggests they crashed.`,
				};
			}
		}

		const now = new Date().toISOString();
		const existing = reg.agents[agentId];
		reg.agents[agentId] = {
			agentId,
			task,
			files,
			startedAt: existing?.startedAt ?? now, // preserve original startedAt on re-claim
			updatedAt: now,
			expiresAt: this.makeExpiry(ttlMs),
		};
		this.saveRegistry(reg);

		const others = Object.values(reg.agents).filter(
			(agt) => agt.agentId !== agentId
		);
		const tail =
			others.length === 0
				? 'No other active agents.'
				: `Other active: ${others.map((agt) => `${agt.agentId} → "${agt.task}"`).join(', ')}.`;

		return {
			claimed: true,
			conflict: false,
			otherAgents: others,
			summary: `Agent "${agentId}" claimed task "${task}". ${tail}`,
		};
	}

	// ── execute ───────────────────────────────────────────────────────────────

	/**
	 * Executes the requested coordination action.
	 *
	 * @param args - Validated coordination arguments.
	 * @returns A structured result whose shape depends on the action.
	 * @see {@link QAbstractTool.execute} — base contract
	 */
	async execute(args: {
		action: 'claim' | 'check' | 'release' | 'update' | 'purge';
		agentId?: string;
		task?: string;
		files?: string[];
		ttlMs?: number;
		force?: boolean;
	}): Promise<ICoordinateResult> {
		await Promise.resolve();
		const { reg, purgedStale } = this.readRegistry();

		switch (args.action) {
			case 'check':
				return this.handleCheck(reg, purgedStale);
			case 'release':
				return this.handleRelease(reg, args.agentId);
			case 'update':
				return this.handleUpdate(reg, args.agentId, args.ttlMs);
			case 'purge':
				return this.handlePurge(reg, args.agentId);
			default:
				return this.handleClaim(reg, {
					agentId: args.agentId,
					task: args.task,
					files: args.files ?? [],
					ttlMs: args.ttlMs,
					force: args.force,
				});
		}
	}
}
