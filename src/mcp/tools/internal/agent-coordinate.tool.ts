import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import {
	readFileSync,
	writeFileSync,
	existsSync,
	mkdirSync,
	openSync,
	closeSync,
	unlinkSync,
	statSync,
} from 'fs';
import { dirname, join } from 'path';

/**
 * Default TTL in milliseconds (5 minutes).
 * Any call to `execute()` that carries a valid `agentId` with an active claim automatically
 * refreshes the TTL — no explicit `update` call needed as long as the agent is making requests.
 * If no activity is observed for this duration the entry is auto-purged on the next registry
 * read, freeing the files for other agents.
 */
const DEFAULT_TTL_MS = 5 * 60 * 1000;

/**
 * Default staleness threshold (1 minute) used by `force` claim.
 * If the conflicting agent's last `updatedAt` is older than this, `force: true` will override
 * the lock, assuming the agent crashed or VS Code restarted.
 */
const DEFAULT_STALE_MS = 60 * 1000;

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
 * | `update` | Heartbeat — refresh TTL of an existing claim. Also: any `check` call with `agentId` auto-refreshes. |
 * | `purge` | Force-clear stuck/stale claims without waiting for TTL expiry. |
 *
 * ### Conflict detection
 * Uses base-path prefix matching so that glob patterns resolve correctly:
 * - `docs-vitepress/en/**` conflicts with `docs-vitepress/en/guide/qmodel.md`
 * - `src/**` conflicts with `src/core/**`
 * - `src/**` does NOT conflict with `tests/**`
 *
 * ### TTL and crash resilience
 * Claims expire automatically after **5 minutes** unless the agent sends a heartbeat — any
 * `check` call that includes a valid `agentId` refreshes the TTL automatically.
 * Use `force: true` on `claim` to immediately override a lock whose `updatedAt` is older than
 * ~1 minute (configurable via `_staleCrashMs`). Stale entries are also pruned silently on every
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
 * // → { claimed: true } — if agent-A's updatedAt > 1 min ago (assumed crashed)
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
		'  Set force=true to override a stale lock (updatedAt older than ~1 min) from a crashed agent. ' +
		'action="release": free the claim when done. ' +
		'action="update": refresh TTL heartbeat for long-running tasks (call every ~15 min). ' +
		'action="purge": forcibly clear stuck/stale claims (optional agentId to target one). ' +
		'Registry persisted to tmp/agent-registry.json; entries auto-expire after 5 min without heartbeat.';

	schema = z.object({
		action: z
			.enum(['claim', 'check', 'release', 'update', 'purge'])
			.describe('Operation: claim | check | release | update | purge'),
		agentId: z
			.string()
			.max(100)
			.optional()
			.describe(
				'Unique agent identifier, e.g. "copilot-session-1". Required for claim, release, update.'
			),
		task: z
			.string()
			.max(200)
			.optional()
			.describe(
				'Short task description, e.g. "migrate docs $qm". Required for claim.'
			),
		files: z
			.array(z.string().max(500))
			.max(50)
			.optional()
			.describe(
				'File paths or glob patterns to lock, e.g. ["docs-vitepress/en/**", "src/core/**"]. ' +
					'Glob-aware: docs-vitepress/en/** conflicts with docs-vitepress/en/guide/qmodel.md.'
			),
		ttlMs: z
			.number()
			.max(1_800_000)
			.optional()
			.describe(
				'Custom TTL in milliseconds for this claim. Defaults to 300000 (5 minutes). ' +
					'Any check() call with agentId acts as an implicit heartbeat and resets this timer.'
			),
		force: z
			.boolean()
			.optional()
			.describe(
				'If true, overrides a conflicting claim whose updatedAt is older than ~1 min ' +
					'(i.e. the agent likely crashed or VS Code restarted). ' +
					'Does NOT override a fresh, active claim — use purge for that.'
			),
	});

	/** @internal Override in tests to isolate the registry file. */
	_registryPath: string = join(process.cwd(), 'tmp', 'agent-registry.json');

	/** @internal Override in tests to control TTL behaviour. */
	_ttlMs: number = DEFAULT_TTL_MS;

	/**
	 * @internal Staleness threshold for `force` claim override (default: 1 minute).
	 * When `force: true` is passed to `claim`, a conflicting agent whose `updatedAt`
	 * is older than this value is considered crashed and its lock is overridden.
	 */
	_staleCrashMs: number = DEFAULT_STALE_MS;

	/**
	 * @internal Path to the human-readable status file written after every registry mutation.
	 * Any agent or developer can read `tmp/agent-status.md` to see current state at a glance.
	 * Override in tests to avoid polluting `tmp/`.
	 */
	_statusPath: string = join(process.cwd(), 'tmp', 'agent-status.md');

	/**
	 * @internal Maximum number of attempts to acquire the file lock before giving up.
	 * Each attempt waits `_lockRetryMs` ms. Default: 20 × 10 ms = 200 ms max wait.
	 * Override in tests to make contention scenarios fail faster.
	 */
	_lockRetries: number = 20;

	/**
	 * @internal Milliseconds to wait between lock acquisition attempts.
	 * @see {@link _lockRetries}
	 */
	_lockRetryMs: number = 10;

	/**
	 * @internal A lock file older than this many ms is considered stale (the owning process
	 * crashed without releasing). It will be removed automatically and the lock re-attempted.
	 * Default: 5 s.
	 */
	_lockStaleMs: number = 5_000;

	// ── Singleton ticker (static — one per process, cannot accumulate) ────────

	/**
	 * @internal Single `setInterval` handle shared across all instances in the process.
	 * `null` when the ticker is not running. Static guarantees only one ticker exists
	 * regardless of how many `QAgentCoordinateTool` instances are created.
	 */
	private static _tickerHandle: ReturnType<typeof setInterval> | null = null;

	/**
	 * @internal Epoch ms of the last real operation (claim/release/update/purge).
	 * Updated inside `saveRegistry`. The ticker reads this to detect inactivity:
	 * if no operation happened for `2 × _tickerIntervalMs`, it stops itself.
	 */
	private static _lastActivityAt: number = 0;

	/**
	 * @internal Ticker interval in milliseconds (default 30 s).
	 * Override **before** the first claim in tests:
	 * `QAgentCoordinateTool._tickerIntervalMs = 50;`
	 */
	static _tickerIntervalMs: number = 30_000;

	/**
	 * @internal Inactivity threshold in ms. When `> 0` it overrides the computed
	 * `2 × _tickerIntervalMs`. Set in tests to control how quickly the ticker stops.
	 */
	static _inactivityThresholdMs: number = 0;

	/** @internal Registry path captured when the ticker started. */
	private static _tickerRegistryPath: string | null = null;

	/** @internal Status path captured when the ticker started. */
	private static _tickerStatusPath: string | null = null;

	/**
	 * Resets all static ticker state. **Call in `afterEach` when testing ticker behaviour**
	 * to avoid state leaking between tests.
	 * @internal
	 */
	static _resetForTest(): void {
		if (QAgentCoordinateTool._tickerHandle !== null) {
			clearInterval(QAgentCoordinateTool._tickerHandle);
			QAgentCoordinateTool._tickerHandle = null;
		}
		QAgentCoordinateTool._lastActivityAt = 0;
		QAgentCoordinateTool._tickerRegistryPath = null;
		QAgentCoordinateTool._tickerStatusPath = null;
		QAgentCoordinateTool._tickerIntervalMs = 30_000;
		QAgentCoordinateTool._inactivityThresholdMs = 0;
	}

	// ── File-level mutex (cross-process safety) ─────────────────────────────

	/**
	 * Acquires an exclusive file lock via `open(lockPath, 'wx')` — atomically guaranteed
	 * by the OS. Retries up to `_lockRetries` times (`_lockRetryMs` ms apart) before
	 * throwing. Stale locks (older than `_lockStaleMs`) are cleared automatically.
	 *
	 * Serializes concurrent registry writes across multiple VS Code windows: each window
	 * runs its own Extension Host + MCP server process and could otherwise produce
	 * corrupted writes via interleaved read-modify-write cycles.
	 * @internal
	 */
	private async _acquireLock(): Promise<void> {
		const lockPath = this._registryPath + '.lock';
		for (let idx = 0; idx < this._lockRetries; idx++) {
			try {
				closeSync(openSync(lockPath, 'wx'));
				return; // lock acquired
			} catch {
				// Check if the existing lock is stale (owner process crashed)
				try {
					const mtime = statSync(lockPath).mtimeMs;
					if (Date.now() - mtime > this._lockStaleMs) {
						unlinkSync(lockPath);
						continue; // retry immediately after clearing stale lock
					}
				} catch {
					// Lock was removed between attempts — retry
				}
				if (idx === this._lockRetries - 1) {
					throw new Error(
						`agent_coordinate: failed to acquire registry lock after ${this._lockRetries} retries`
					);
				}
				await new Promise<void>((resolve) =>
					setTimeout(resolve, this._lockRetryMs)
				);
			}
		}
	}

	/**
	 * Releases the file lock by removing the lock file. Always called in `finally` — never
	 * throws. A missing lock file (already removed) is silently ignored.
	 * @internal
	 */
	private _releaseLock(): void {
		try {
			unlinkSync(this._registryPath + '.lock');
		} catch {
			// Already released or never acquired — fine
		}
	}

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
		// Mark real activity so the ticker inactivity guard resets correctly
		QAgentCoordinateTool._lastActivityAt = Date.now();
		QAgentCoordinateTool._writeStatusToPath(this._statusPath, reg);
		// Start the ticker if there are active agents and it is not already running
		if (Object.keys(reg.agents).length > 0) {
			QAgentCoordinateTool._startTicker(
				this._registryPath,
				this._statusPath
			);
		}
	}

	/**
	 * Writes the markdown status table to `statusPath`. Used by both `saveRegistry`
	 * and the static ticker (`_runTick`) so the logic lives in exactly one place.
	 *
	 * Never throws — the file is informational only.
	 * @internal
	 */
	private static _writeStatusToPath(
		statusPath: string,
		reg: IAgentRegistry
	): void {
		const now = new Date();
		const agents = Object.values(reg.agents);

		const formatAgo = (iso: string): string => {
			const diffMs = now.getTime() - new Date(iso).getTime();
			if (diffMs < 1000) return 'just now';
			const sec = Math.floor(diffMs / 1000);
			if (sec < 60) return `${sec}s ago`;
			const min = Math.floor(sec / 60);
			const rem = sec % 60;
			return rem === 0 ? `${min}m ago` : `${min}m ${rem}s ago`;
		};

		const formatExpiry = (iso: string): string => {
			const diffMs = new Date(iso).getTime() - now.getTime();
			if (diffMs <= 0) return 'EXPIRED';
			const sec = Math.ceil(diffMs / 1000);
			if (sec < 60) return `${sec}s`;
			const min = Math.floor(sec / 60);
			const rem = sec % 60;
			return rem === 0 ? `${min}m` : `${min}m ${rem}s`;
		};

		const rows =
			agents.length === 0
				? '_No active agents._'
				: [
						'| Agent | Task | Files | Last activity | Expires in |',
						'|-------|------|-------|---------------|------------|',
						...agents.map(
							(agt) =>
								`| ${agt.agentId} | ${agt.task} | ${
									agt.files.length > 0
										? agt.files
												.map((fil) => `\`${fil}\``)
												.join(', ')
										: '—'
								} | ${formatAgo(agt.updatedAt)} | ${formatExpiry(agt.expiresAt)} |`
						),
					].join('\n');

		const content = [
			'# Agent Coordination Status',
			`_Updated: ${now.toISOString()} — ${agents.length} active agent(s)_`,
			'',
			rows,
			'',
			'> TTL: 5 min of inactivity auto-releases the lock.',
			'> Any `agent_coordinate` call with a valid `agentId` acts as an implicit heartbeat.',
			'> Ticker: status refreshes every 30 s while agents are active; stops automatically on idle.',
		].join('\n');

		try {
			mkdirSync(dirname(statusPath), { recursive: true });
			writeFileSync(statusPath, content, 'utf-8');
		} catch {
			// Status file is informational — never fail the main operation
		}
	}

	/**
	 * Starts the singleton background ticker if it is not already running.
	 *
	 * Guards:
	 * - `_tickerHandle !== null` → already running, no second ticker
	 * - `handle.unref()` → timer will NOT prevent the process from exiting naturally
	 *
	 * @internal
	 */
	private static _startTicker(regPath: string, statusPath: string): void {
		if (QAgentCoordinateTool._tickerHandle !== null) return; // already running
		QAgentCoordinateTool._tickerRegistryPath = regPath;
		QAgentCoordinateTool._tickerStatusPath = statusPath;
		const handle = setInterval(
			() => QAgentCoordinateTool._runTick(),
			QAgentCoordinateTool._tickerIntervalMs
		);
		// unref: the ticker must NOT keep the process alive when all MCP work is done
		if (typeof handle.unref === 'function') {
			handle.unref();
		}
		QAgentCoordinateTool._tickerHandle = handle;
	}

	/**
	 * Background tick logic — runs every `_tickerIntervalMs` milliseconds.
	 *
	 * Stops itself when:
	 * 1. No real operation happened for `2 × _tickerIntervalMs` (inactivity guard) —
	 *    catches zombie/stuck processes where the MCP is no longer active.
	 * 2. Registry is empty or unreadable — no agents left to track.
	 *
	 * Otherwise: purges expired entries, rewrites `agent-status.md`.
	 * @internal
	 */
	private static _runTick(): void {
		// ── 1. Inactivity guard ──────────────────────────────────────────────────
		// If no real saveRegistry call happened recently, the MCP is likely idle or
		// dead. Stop the ticker so it does not run indefinitely as a zombie.
		const idleMs = Date.now() - QAgentCoordinateTool._lastActivityAt;
		const threshold =
			QAgentCoordinateTool._inactivityThresholdMs > 0
				? QAgentCoordinateTool._inactivityThresholdMs
				: 2 * QAgentCoordinateTool._tickerIntervalMs;
		if (idleMs > threshold) {
			clearInterval(QAgentCoordinateTool._tickerHandle!);
			QAgentCoordinateTool._tickerHandle = null;
			return;
		}

		const regPath = QAgentCoordinateTool._tickerRegistryPath;
		const statusPath = QAgentCoordinateTool._tickerStatusPath;
		if (!regPath || !statusPath) return;

		// ── 2. Read registry ─────────────────────────────────────────────────────
		let reg: IAgentRegistry;
		try {
			if (!existsSync(regPath)) {
				clearInterval(QAgentCoordinateTool._tickerHandle!);
				QAgentCoordinateTool._tickerHandle = null;
				return;
			}
			const parsed = JSON.parse(
				readFileSync(regPath, 'utf-8')
			) as unknown;
			if (
				typeof parsed !== 'object' ||
				parsed === null ||
				typeof (parsed as Record<string, unknown>)['agents'] !==
					'object' ||
				(parsed as Record<string, unknown>)['agents'] === null
			) {
				clearInterval(QAgentCoordinateTool._tickerHandle!);
				QAgentCoordinateTool._tickerHandle = null;
				return;
			}
			reg = parsed as IAgentRegistry;
		} catch {
			// IO error — stop ticker; will restart on next real operation
			clearInterval(QAgentCoordinateTool._tickerHandle!);
			QAgentCoordinateTool._tickerHandle = null;
			return;
		}

		// ── 3. Purge expired entries ─────────────────────────────────────────────
		const now = Date.now();
		let purged = 0;
		for (const [aid, entry] of Object.entries(reg.agents)) {
			if (new Date(entry.expiresAt).getTime() < now) {
				delete reg.agents[aid];
				purged++;
			}
		}

		// ── 4. Stop if empty ─────────────────────────────────────────────────────
		if (Object.keys(reg.agents).length === 0) {
			clearInterval(QAgentCoordinateTool._tickerHandle!);
			QAgentCoordinateTool._tickerHandle = null;
			// Write final empty status so the .md reflects reality
			QAgentCoordinateTool._writeStatusToPath(statusPath, reg);
			if (purged > 0) {
				try {
					mkdirSync(dirname(regPath), { recursive: true });
					writeFileSync(
						regPath,
						JSON.stringify(reg, null, 2),
						'utf-8'
					);
				} catch {
					/* best effort */
				}
			}
			return;
		}

		// ── 5. Write updated .md (and purged registry if needed) ─────────────────
		if (purged > 0) {
			try {
				mkdirSync(dirname(regPath), { recursive: true });
				writeFileSync(regPath, JSON.stringify(reg, null, 2), 'utf-8');
			} catch {
				/* best effort */
			}
		}
		QAgentCoordinateTool._writeStatusToPath(statusPath, reg);
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

	/**
	 * Executes the requested coordination action.
	 *
	 * Before dispatching, implicitly refreshes the TTL of the calling agent if they have
	 * an active claim and the action is `check`. This means any agent that is monitoring
	 * the registry (e.g. watching for new agents) keeps their lock alive automatically —
	 * no explicit `update` call needed while the agent is actively working.
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
		await this._acquireLock();
		try {
			const { reg, purgedStale } = this.readRegistry();

			// ── Implicit heartbeat ────────────────────────────────────────────────
			// Any check() call from an agent that already has a claim silently refreshes
			// their TTL, simulating websocket-style "connection = liveness". We skip this
			// for claim (handler sets it itself), release, and purge (intentional removals).
			const { agentId, action } = args;
			if (agentId && action === 'check') {
				const entry = reg.agents[agentId];
				if (entry) {
					reg.agents[agentId] = {
						...entry,
						updatedAt: new Date().toISOString(),
						expiresAt: this.makeExpiry(args.ttlMs),
					};
					this.saveRegistry(reg);
				}
			}

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
		} finally {
			this._releaseLock();
		}
	}
}
