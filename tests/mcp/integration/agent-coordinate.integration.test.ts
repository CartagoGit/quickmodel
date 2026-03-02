/**
 * Integration & E2E tests for QAgentCoordinateTool.
 *
 * These tests exercise the full lifecycle of the agent coordination system
 * from the outside: no mocking of internals, real file I/O, real ticker,
 * real lock files. The only override is the paths (TMP_*) so tests do not
 * pollute `tmp/`.
 *
 * Scenarios covered:
 *  - Full workflow: check → claim → work → release
 *  - Concurrent agent coordination (conflict detection and resolution)
 *  - Crash recovery: forced override, update upsert
 *  - Ticker keepalive during long-running work
 *  - Multi-VS-Code-window: two instances sharing the same registry file
 *  - Registry persistence across tool re-instantiation
 *  - status.md correctness and freshness
 *  - Edge cases: empty files, very long task names, max-param limits
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QAgentCoordinateTool } from '../../../src/mcp/tools/internal/agent-coordinate.tool';
import { join } from 'path';
import { rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';

// ── Isolated tmp paths for integration tests ─────────────────────────────────
const TMP_DIR = join(process.cwd(), 'tests', 'tmp_integration');
const TMP_REGISTRY = join(TMP_DIR, 'agent-registry.json');
const TMP_STATUS = join(TMP_DIR, 'agent-status.md');

function makeTool(ttlMs?: number): QAgentCoordinateTool {
	const tool = new QAgentCoordinateTool();
	tool._registryPath = TMP_REGISTRY;
	tool._statusPath = TMP_STATUS;
	if (ttlMs !== undefined) tool._ttlMs = ttlMs;
	return tool;
}

/** Parse registry JSON from disk, returns `{ agents: {} }` on any error. */
function readRawRegistry(): { agents: Record<string, unknown> } {
	try {
		return JSON.parse(readFileSync(TMP_REGISTRY, 'utf-8')) as {
			agents: Record<string, unknown>;
		};
	} catch {
		return { agents: {} };
	}
}

beforeEach(() => {
	mkdirSync(TMP_DIR, { recursive: true });
	// Start every test with a clean registry.
	writeFileSync(TMP_REGISTRY, JSON.stringify({ agents: {} }));
	if (existsSync(TMP_STATUS)) rmSync(TMP_STATUS);
	if (existsSync(TMP_REGISTRY + '.lock')) rmSync(TMP_REGISTRY + '.lock');
	QAgentCoordinateTool._resetForTest();
});

afterEach(() => {
	QAgentCoordinateTool._resetForTest();
	try {
		rmSync(TMP_DIR, { recursive: true, force: true });
	} catch {
		// best-effort cleanup
	}
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. CANONICAL WORKFLOW
// ═════════════════════════════════════════════════════════════════════════════

describe('canonical workflow: check → claim → work → release', () => {
	it('fresh start: check returns zero agents', async () => {
		const tool = makeTool();
		const res = await tool.execute({ action: 'check' });
		expect(res.total).toBe(0);
		expect(res.agents).toEqual([]);
	});

	it('claim registers the agent and check shows it immediately', async () => {
		const tool = makeTool();
		const claim = await tool.execute({
			action: 'claim',
			agentId: 'agent-1',
			task: 'implement feature X',
			files: ['src/core/**'],
		});
		expect(claim.claimed).toBe(true);
		expect(claim.conflict).toBe(false);

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
		expect(check.agents[0]?.agentId).toBe('agent-1');
		expect(check.agents[0]?.task).toBe('implement feature X');
		expect(check.agents[0]?.files).toEqual(['src/core/**']);
	});

	it('release removes the agent and check returns zero', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-1',
			task: 'fix bug',
			files: ['src/**'],
		});
		const rel = await tool.execute({
			action: 'release',
			agentId: 'agent-1',
		});
		expect(rel.released).toBe(true);

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(0);
	});

	it('full cycle: claim → update heartbeat → release → empty registry', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-main',
			task: 'big refactor',
			files: ['src/**', 'tests/**'],
		});
		const upd = await tool.execute({
			action: 'update',
			agentId: 'agent-main',
		});
		expect(upd.updated).toBe(true);

		await tool.execute({ action: 'release', agentId: 'agent-main' });
		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(0);
	});

	it('startedAt is stable across update calls; updatedAt advances', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'steady',
			task: 'long task',
			files: ['docs/**'],
		});
		const before = (await tool.execute({ action: 'check' })).agents[0];
		const startedAt = before?.startedAt;
		const updatedAt1 = before?.updatedAt;

		await Bun.sleep(5);
		await tool.execute({ action: 'update', agentId: 'steady' });
		const after = (await tool.execute({ action: 'check' })).agents[0];

		expect(after?.startedAt).toBe(startedAt); // unchanged
		expect(after?.updatedAt).not.toBe(updatedAt1); // advanced
	});

	it('expiresAt is a valid future ISO timestamp after claim', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-t',
			task: 't',
			files: [],
		});
		const entry = (await tool.execute({ action: 'check' })).agents[0];
		expect(entry).toBeDefined();
		const exp = new Date(entry.expiresAt).getTime();
		expect(exp).toBeGreaterThan(Date.now());
	});

	it('registry JSON is valid and readable after every mutating action', async () => {
		const tool = makeTool();
		for (const action of ['claim'] as const) {
			await tool.execute({
				action,
				agentId: 'verifier',
				task: 'check json',
				files: ['src/**'],
			});
			const raw = readRawRegistry();
			expect(raw.agents['verifier']).toBeDefined();
		}
		await tool.execute({ action: 'update', agentId: 'verifier' });
		expect(readRawRegistry().agents['verifier']).toBeDefined();
		await tool.execute({ action: 'release', agentId: 'verifier' });
		expect(Object.keys(readRawRegistry().agents)).toHaveLength(0);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. MULTI-AGENT COORDINATION
// ═════════════════════════════════════════════════════════════════════════════

describe('multi-agent coordination', () => {
	it('two agents on non-overlapping files: both claim successfully', async () => {
		const tool = makeTool();
		const claimA = await tool.execute({
			action: 'claim',
			agentId: 'agent-A',
			task: 'docs EN',
			files: ['docs-vitepress/en/**'],
		});
		const claimB = await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'tests',
			files: ['tests/**'],
		});

		expect(claimA.claimed).toBe(true);
		expect(claimB.claimed).toBe(true);
		expect(claimB.conflict).toBe(false);
		expect((await tool.execute({ action: 'check' })).total).toBe(2);
	});

	it('two agents on overlapping files: second claim is blocked', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-A',
			task: 'refactor core',
			files: ['src/core/**'],
		});
		const claimB = await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'fix core types',
			files: ['src/core/qm.ts'],
		});

		expect(claimB.claimed).toBe(false);
		expect(claimB.conflict).toBe(true);
		expect(claimB.claimedBy).toBe('agent-A');
	});

	it('check otherAgents lists all agents except the requester', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-A',
			task: 'task A',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'task B',
			files: ['docs/**'],
		});
		const res = await tool.execute({
			action: 'claim',
			agentId: 'agent-C',
			task: 'task C',
			files: ['tests/**'],
		});

		// otherAgents should contain A and B (not C itself)
		expect(res.otherAgents?.map((agt) => agt.agentId).sort()).toEqual([
			'agent-A',
			'agent-B',
		]);
	});

	it('three agents on mutually exclusive file scopes: all coexist', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'w1',
			task: 'src work',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'w2',
			task: 'test work',
			files: ['tests/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'w3',
			task: 'doc work',
			files: ['docs-vitepress/**'],
		});

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(3);
	});

	it('mass-rename agent blocks all other agents (src/**, tests/**, docs/**)', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'mass-rename',
			task: 'rename legacy methods to $q* everywhere',
			files: ['src/**', 'tests/**', 'docs-vitepress/**'],
		});

		// Any other agent trying to claim any sub-path should be blocked.
		const claimA = await tool.execute({
			action: 'claim',
			agentId: 'agent-A',
			task: 'fix types',
			files: ['src/core/qm.ts'],
		});
		const claimB = await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'update docs',
			files: ['docs-vitepress/en/guide/qmodel.md'],
		});
		const claimC = await tool.execute({
			action: 'claim',
			agentId: 'agent-C',
			task: 'fix test',
			files: ['tests/unit/qm.test.ts'],
		});

		expect(claimA.conflict).toBe(true);
		expect(claimB.conflict).toBe(true);
		expect(claimC.conflict).toBe(true);
	});

	it('releasing one of two conflicting agents unblocks the other', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-A',
			task: 'edit src',
			files: ['src/**'],
		});
		const blocked = await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'also edit src',
			files: ['src/utils.ts'],
		});
		expect(blocked.conflict).toBe(true);

		await tool.execute({ action: 'release', agentId: 'agent-A' });
		const retry = await tool.execute({
			action: 'claim',
			agentId: 'agent-B',
			task: 'also edit src',
			files: ['src/utils.ts'],
		});
		expect(retry.claimed).toBe(true);
	});

	it('purge of a specific agent unblocks other agents for those files', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'stuck-agent',
			task: 'stuck task',
			files: ['src/**'],
		});
		await tool.execute({ action: 'purge', agentId: 'stuck-agent' });

		const res = await tool.execute({
			action: 'claim',
			agentId: 'new-agent',
			task: 'proceed',
			files: ['src/core/qm.ts'],
		});
		expect(res.claimed).toBe(true);
	});

	it('purge all leaves registry empty', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'a',
			task: 'task a',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'b',
			task: 'task b',
			files: ['docs/**'],
		});
		const purge = await tool.execute({ action: 'purge' });

		expect(purge.purged).toBe(2);
		expect(purge.remaining).toBe(0);
		expect((await tool.execute({ action: 'check' })).total).toBe(0);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. CRASH RECOVERY
// ═════════════════════════════════════════════════════════════════════════════

describe('crash recovery', () => {
	it('force=true on a fresh claim (< 30 s) does NOT override it', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'alive',
			task: 'active work',
			files: ['src/**'],
		});

		const forced = await tool.execute({
			action: 'claim',
			agentId: 'newcomer',
			task: 'same area',
			files: ['src/core/qm.ts'],
			force: true,
		});
		expect(forced.claimed).toBe(false);
		expect(forced.conflict).toBe(true);
	});

	it('force=true on a very old entry (> 30 s simulated) overrides the lock', async () => {
		// Write an entry whose updatedAt is 2 minutes ago (definitely stale).
		const staleAt = new Date(Date.now() - 120_000).toISOString();
		writeFileSync(
			TMP_REGISTRY,
			JSON.stringify({
				agents: {
					'crashed-agent': {
						agentId: 'crashed-agent',
						task: 'stale task',
						files: ['src/**'],
						startedAt: staleAt,
						updatedAt: staleAt,
						expiresAt: new Date(
							Date.now() + 1_800_000
						).toISOString(),
					},
				},
			})
		);
		const tool = makeTool();
		const res = await tool.execute({
			action: 'claim',
			agentId: 'rescuer',
			task: 'rescue task',
			files: ['src/core/qm.ts'],
			force: true,
		});
		expect(res.claimed).toBe(true);
		expect(res.conflict).toBe(false);
	});

	it('update upsert: agent calls update without prior claim → auto-creates entry', async () => {
		const tool = makeTool();
		const res = await tool.execute({
			action: 'update',
			agentId: 'late-agent',
			task: 'forgot to claim',
			files: ['src/core/**'],
		});
		expect(res.updated).toBe(true);
		expect(res.summary).toContain('auto-created');

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
		expect(check.agents[0]?.agentId).toBe('late-agent');
		expect(check.agents[0]?.task).toBe('forgot to claim');
	});

	it('update upsert after VS Code restart: agent re-registers and ticker restarts', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 40;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;
		const tool = makeTool(60);

		// Simulate a VS Code restart: registry file has NO entry for this agent.
		writeFileSync(TMP_REGISTRY, JSON.stringify({ agents: {} }));

		await tool.execute({
			action: 'update',
			agentId: 'restarted-agent',
			task: 'resuming work',
			files: ['src/**'],
		});
		expect(QAgentCoordinateTool._tickerHandle).not.toBeNull();

		await Bun.sleep(120); // let ticker fire × 2
		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
	});

	it('re-claim after restart is idempotent: startedAt preserved, updatedAt moves', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'long-runner',
			task: 'main task',
			files: ['src/**'],
		});
		const original = (await tool.execute({ action: 'check' })).agents[0];

		// Simulate restart: directly write stale registry with same agentId.
		const staleAt = new Date(Date.now() - 5_000).toISOString();
		writeFileSync(
			TMP_REGISTRY,
			JSON.stringify({
				agents: {
					'long-runner': {
						...original,
						updatedAt: staleAt,
						expiresAt: new Date(
							Date.now() + 1_800_000
						).toISOString(),
					},
				},
			})
		);

		// Re-claim (idempotent).
		const reClaim = await tool.execute({
			action: 'claim',
			agentId: 'long-runner',
			task: 'main task',
			files: ['src/**'],
		});
		expect(reClaim.claimed).toBe(true);

		const after = (await tool.execute({ action: 'check' })).agents[0];
		expect(after?.startedAt).toBe(original?.startedAt); // preserved
		expect(after?.updatedAt).not.toBe(staleAt); // refreshed
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. PERSISTENCE ACROSS RE-INSTANTIATION
// ═════════════════════════════════════════════════════════════════════════════

describe('persistence: data survives across tool instances', () => {
	it('entry written by instance A is visible to a fresh instance B', async () => {
		const toolA = makeTool();
		await toolA.execute({
			action: 'claim',
			agentId: 'persistent-agent',
			task: 'persist test',
			files: ['src/**'],
		});

		// Instance B has no shared state — reads from disk.
		const toolB = makeTool();
		const check = await toolB.execute({ action: 'check' });
		expect(check.total).toBe(1);
		expect(check.agents[0]?.agentId).toBe('persistent-agent');
	});

	it('release by instance A is reflected in a fresh instance B', async () => {
		const toolA = makeTool();
		await toolA.execute({
			action: 'claim',
			agentId: 'temp-agent',
			task: 't',
			files: ['docs/**'],
		});
		await toolA.execute({ action: 'release', agentId: 'temp-agent' });

		const toolB = makeTool();
		const check = await toolB.execute({ action: 'check' });
		expect(check.total).toBe(0);
	});

	it('multiple instances sharing the same registry do not produce duplicates', async () => {
		const toolA = makeTool();
		const toolB = makeTool();

		await toolA.execute({
			action: 'claim',
			agentId: 'agent-alpha',
			task: 'task alpha',
			files: ['src/**'],
		});
		await toolB.execute({
			action: 'claim',
			agentId: 'agent-beta',
			task: 'task beta',
			files: ['tests/**'],
		});

		const check = await toolA.execute({ action: 'check' });
		expect(check.total).toBe(2);
		// Exactly one entry per agent, no doubles.
		const ids = check.agents.map((agt) => agt.agentId).sort();
		expect(ids).toEqual(['agent-alpha', 'agent-beta']);
	});

	it('conflict detection works across tool instances (two windows scenario)', async () => {
		const window1 = makeTool();
		const window2 = makeTool();

		await window1.execute({
			action: 'claim',
			agentId: 'editor-1',
			task: 'editing core',
			files: ['src/core/**'],
		});
		const blocked = await window2.execute({
			action: 'claim',
			agentId: 'editor-2',
			task: 'also editing core',
			files: ['src/core/qm.ts'],
		});

		expect(blocked.conflict).toBe(true);
		expect(blocked.claimedBy).toBe('editor-1');
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. TICKER END-TO-END KEEPALIVE
// ═════════════════════════════════════════════════════════════════════════════

describe('ticker end-to-end: keepalive while MCP is active', () => {
	it('agent registered with short TTL survives 5 ticker cycles untouched', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 30;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;
		QAgentCoordinateTool._autoRefreshOnTick = true;

		const tool = makeTool(50); // 50 ms TTL — would expire without ticker
		await tool.execute({
			action: 'claim',
			agentId: 'staying-alive',
			task: 'long task',
			files: ['src/**'],
		});

		// Sleep for 200 ms = ~6 ticker cycles. Entry would be dead without renewal.
		await Bun.sleep(200);
		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
		expect(check.agents[0]?.agentId).toBe('staying-alive');
	});

	it('ticker writes updatedAt to disk on each cycle (persistent proof of renewal)', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 30;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;
		QAgentCoordinateTool._autoRefreshOnTick = true;

		const tool = makeTool(10_000); // long TTL — only renewal matters here
		await tool.execute({
			action: 'claim',
			agentId: 'disk-watcher',
			task: 'watching',
			files: [],
		});

		const updatedAt0 = readRawRegistry().agents['disk-watcher'];
		await Bun.sleep(80);
		const updatedAt1 = readRawRegistry().agents['disk-watcher'];

		// The raw JSON on disk must show a different updatedAt.
		expect(JSON.stringify(updatedAt1)).not.toBe(JSON.stringify(updatedAt0));
	});

	it('ticker stops (unref) when all agents release — no zombie timer', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 40;
		QAgentCoordinateTool._inactivityThresholdMs = 0; // use 2× interval = 80 ms
		QAgentCoordinateTool._autoRefreshOnTick = false; // allow expiry

		const tool = makeTool(30); // 30 ms TTL — will expire after 30 ms
		await tool.execute({
			action: 'claim',
			agentId: 'ending-agent',
			task: 'short task',
			files: [],
		});
		expect(QAgentCoordinateTool._tickerHandle).not.toBeNull();

		// Wait long enough for the agent to expire AND inactivity guard to trigger.
		await Bun.sleep(200);
		expect(QAgentCoordinateTool._tickerHandle).toBeNull();
	});

	it('status.md is updated by the ticker (timestamp changes between ticks)', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 30;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;

		const tool = makeTool(10_000);
		await tool.execute({
			action: 'claim',
			agentId: 'status-agent',
			task: 'monitoring',
			files: [],
		});

		const content0 = existsSync(TMP_STATUS)
			? readFileSync(TMP_STATUS, 'utf-8')
			: '';
		await Bun.sleep(80);
		const content1 = existsSync(TMP_STATUS)
			? readFileSync(TMP_STATUS, 'utf-8')
			: '';

		// The _Updated_ line must differ between reads.
		const ts0 = content0.match(/_Updated: ([^—]+)/)?.[1];
		const ts1 = content1.match(/_Updated: ([^—]+)/)?.[1];
		expect(ts0).toBeDefined();
		expect(ts1).toBeDefined();
		expect(ts1).not.toBe(ts0);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. STATUS.MD CORRECTNESS
// ═════════════════════════════════════════════════════════════════════════════

describe('status.md correctness', () => {
	it('status.md is created and contains active agent table after claim', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'status-check-agent',
			task: 'checking status',
			files: ['src/**'],
		});

		expect(existsSync(TMP_STATUS)).toBe(true);
		const content = readFileSync(TMP_STATUS, 'utf-8');
		expect(content).toContain('status-check-agent');
		expect(content).toContain('checking status');
		expect(content).toContain('src/**');
	});

	it('status.md shows "No active agents" after all agents release', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'leaving',
			task: 'soon done',
			files: ['docs/**'],
		});
		await tool.execute({ action: 'release', agentId: 'leaving' });

		const content = readFileSync(TMP_STATUS, 'utf-8');
		expect(content).toContain('_No active agents._');
	});

	it('status.md lists all active agents in the table', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'alpha',
			task: 'task alpha',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'beta',
			task: 'task beta',
			files: ['tests/**'],
		});

		const content = readFileSync(TMP_STATUS, 'utf-8');
		expect(content).toContain('alpha');
		expect(content).toContain('beta');
		expect(content).toContain('task alpha');
		expect(content).toContain('task beta');
	});

	it('status.md contains the expected section headers', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'hdr-agent',
			task: 'validate headers',
			files: [],
		});

		const content = readFileSync(TMP_STATUS, 'utf-8');
		expect(content).toContain('# Agent Coordination Status');
		expect(content).toContain('_Updated:');
		expect(content).toContain('TTL: 30 min default');
	});

	it('status.md is updated (not stale) after update heartbeat', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'hb-agent',
			task: 'heartbeat test',
			files: [],
		});
		const before = readFileSync(TMP_STATUS, 'utf-8');

		await Bun.sleep(5);
		await tool.execute({ action: 'update', agentId: 'hb-agent' });
		const after = readFileSync(TMP_STATUS, 'utf-8');

		expect(after).not.toBe(before);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. FILE LOCK INTEGRITY
// ═════════════════════════════════════════════════════════════════════════════

describe('file lock integrity', () => {
	it('lock file is absent before and after a normal execute()', async () => {
		const tool = makeTool();
		expect(existsSync(TMP_REGISTRY + '.lock')).toBe(false);
		await tool.execute({
			action: 'claim',
			agentId: 'lock-test',
			task: 'lock',
			files: [],
		});
		expect(existsSync(TMP_REGISTRY + '.lock')).toBe(false);
	});

	it('sequential operations on the same tool do not deadlock', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'seq',
			task: 'sequential',
			files: ['src/**'],
		});
		await tool.execute({ action: 'update', agentId: 'seq' });
		await tool.execute({ action: 'update', agentId: 'seq' });
		await tool.execute({ action: 'release', agentId: 'seq' });
		// If we reach here, no deadlock occurred.
		expect(true).toBe(true);
	});

	it('interleaved operations from two instances do not corrupt registry', async () => {
		const toolA = makeTool();
		const toolB = makeTool();

		// Interleave operations: A claims, B claims different scope, A updates, B updates, both release.
		await toolA.execute({
			action: 'claim',
			agentId: 'interleave-A',
			task: 'A work',
			files: ['src/**'],
		});
		await toolB.execute({
			action: 'claim',
			agentId: 'interleave-B',
			task: 'B work',
			files: ['tests/**'],
		});
		await toolA.execute({ action: 'update', agentId: 'interleave-A' });
		await toolB.execute({ action: 'update', agentId: 'interleave-B' });
		await toolA.execute({ action: 'release', agentId: 'interleave-A' });
		await toolB.execute({ action: 'release', agentId: 'interleave-B' });

		const check = await toolA.execute({ action: 'check' });
		expect(check.total).toBe(0);
		// Registry must still be valid JSON.
		expect(() =>
			JSON.parse(readFileSync(TMP_REGISTRY, 'utf-8'))
		).not.toThrow();
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. TTL & EXPIRY
// ═════════════════════════════════════════════════════════════════════════════

describe('TTL and expiry behaviour', () => {
	it('custom TTL is respected: entry expires after ttlMs, not default', async () => {
		QAgentCoordinateTool._autoRefreshOnTick = false; // prevent renewal
		const tool = makeTool(80); // 80 ms TTL

		await tool.execute({
			action: 'claim',
			agentId: 'short-lived',
			task: 'tiny task',
			files: [],
		});
		// Entry alive at 40 ms.
		await Bun.sleep(40);
		expect((await tool.execute({ action: 'check' })).total).toBe(1);
		// Entry dead after 80 ms.
		await Bun.sleep(60);
		expect((await tool.execute({ action: 'check' })).total).toBe(0);
	});

	it('expired entries are purged on the next execute() call', async () => {
		QAgentCoordinateTool._autoRefreshOnTick = false;
		const tool = makeTool(50);
		await tool.execute({
			action: 'claim',
			agentId: 'expiring',
			task: 'expiry test',
			files: [],
		});

		await Bun.sleep(80);
		// On next call, readRegistry() purges the expired entry.
		const check = await tool.execute({ action: 'check' });
		expect(check.purgedStale).toBeGreaterThanOrEqual(1);
		expect(check.total).toBe(0);
	});

	it('update renews TTL: entry that would expire is kept alive', async () => {
		QAgentCoordinateTool._autoRefreshOnTick = false;
		const tool = makeTool(120); // 120 ms TTL

		await tool.execute({
			action: 'claim',
			agentId: 'renewable',
			task: 'renewable task',
			files: [],
		});
		await Bun.sleep(70); // 70 ms elapsed — still alive

		await tool.execute({ action: 'update', agentId: 'renewable' }); // renews to now + 120 ms
		await Bun.sleep(70); // another 70 ms — only 70 ms since last renewal → still alive

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
	});

	it('ttlMs up to 2 hours (7_200_000) is accepted without validation error', async () => {
		const tool = makeTool();
		const res = await tool.execute({
			action: 'claim',
			agentId: 'long-ttl',
			task: 'very long task',
			files: ['src/**'],
			ttlMs: 7_200_000,
		});
		expect(res.claimed).toBe(true);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. EDGE CASES & RESILIENCE
// ═════════════════════════════════════════════════════════════════════════════

describe('edge cases and resilience', () => {
	it('check on a non-existent registry file returns 0 agents (no crash)', async () => {
		const tool = makeTool();
		// No registry file exists (clean state from beforeEach already removed it,
		// but we remove completely to ensure even the blank JSON is gone).
		rmSync(TMP_REGISTRY, { force: true });
		const res = await tool.execute({ action: 'check' });
		expect(res.total).toBe(0);
	});

	it('claim with empty files array is accepted and returns no conflicts', async () => {
		const tool = makeTool();
		const res = await tool.execute({
			action: 'claim',
			agentId: 'empty-files',
			task: 'no specific files',
			files: [],
		});
		expect(res.claimed).toBe(true);
		expect(res.conflict).toBe(false);
	});

	it('releasing an agent that was never claimed returns released:false gracefully', async () => {
		const tool = makeTool();
		const res = await tool.execute({
			action: 'release',
			agentId: 'ghost-agent',
		});
		expect(res.released).toBe(false);
		expect(res.summary).toBeDefined();
	});

	it('update on a missing entry without task returns updated:false with task hint', async () => {
		const tool = makeTool();
		const res = await tool.execute({
			action: 'update',
			agentId: 'unknown-agent',
		});
		expect(res.updated).toBe(false);
		expect(res.summary.toLowerCase()).toContain('task');
	});

	it('purge on an empty registry returns purged:0 without throwing', async () => {
		const tool = makeTool();
		const res = await tool.execute({ action: 'purge' });
		expect(res.purged).toBe(0);
		expect(res.remaining).toBe(0);
	});

	it('corrupted registry JSON is silently reset on next execute()', async () => {
		writeFileSync(TMP_REGISTRY, '}}}CORRUPTED{{{');
		const tool = makeTool();
		const res = await tool.execute({ action: 'check' });
		expect(res.total).toBe(0); // parsed as empty, no crash
	});

	it('update can change the task description mid-work', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'versatile',
			task: 'initial task',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'update',
			agentId: 'versatile',
			task: 'revised task',
		});

		const check = await tool.execute({ action: 'check' });
		expect(check.agents[0]?.task).toBe('revised task');
	});

	it('update can expand the file scope mid-work', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'expanding',
			task: 'expanding scope',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'update',
			agentId: 'expanding',
			files: ['src/**', 'tests/**'],
		});

		const check = await tool.execute({ action: 'check' });
		expect(check.agents[0]?.files).toEqual(['src/**', 'tests/**']);
	});

	it('same agent claiming twice (re-claim) does not create a second entry', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'double-claim',
			task: 'task',
			files: ['src/**'],
		});
		await tool.execute({
			action: 'claim',
			agentId: 'double-claim',
			task: 'task',
			files: ['src/**'],
		});

		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1); // still exactly one
	});

	it('check with known agentId acts as an implicit heartbeat (updatedAt advances)', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'implicit-hb',
			task: 'tracking',
			files: [],
		});
		const before = (await tool.execute({ action: 'check' })).agents[0]
			?.updatedAt;

		await Bun.sleep(5);
		await tool.execute({ action: 'check', agentId: 'implicit-hb' });
		const after = (await tool.execute({ action: 'check' })).agents[0]
			?.updatedAt;

		expect(after).not.toBe(before);
	});

	it('very long task description (200 chars) is stored and retrieved correctly', async () => {
		const tool = makeTool();
		const longTask = 'x'.repeat(200);
		await tool.execute({
			action: 'claim',
			agentId: 'verbose',
			task: longTask,
			files: [],
		});
		const check = await tool.execute({ action: 'check' });
		expect(check.agents[0]?.task).toBe(longTask);
	});

	it('exact file path claim does not conflict with a different exact path', async () => {
		const tool = makeTool();
		await tool.execute({
			action: 'claim',
			agentId: 'agent-1',
			task: 'edit A',
			files: ['src/core/a.ts'],
		});
		const res = await tool.execute({
			action: 'claim',
			agentId: 'agent-2',
			task: 'edit B',
			files: ['src/core/b.ts'],
		});
		expect(res.claimed).toBe(true);
		expect(res.conflict).toBe(false);
	});
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. END-TO-END SIMULATED SESSIONS
// ═════════════════════════════════════════════════════════════════════════════

describe('e2e simulated sessions', () => {
	it('two parallel agents finish independent tasks without interference', async () => {
		const tool = makeTool();

		// Agent A: implements a feature in src/core
		const claimA = await tool.execute({
			action: 'claim',
			agentId: 'copilot-A',
			task: 'implement QSensitiveKeys',
			files: ['src/core/**'],
		});
		expect(claimA.claimed).toBe(true);

		// Agent B: updates documentation
		const claimB = await tool.execute({
			action: 'claim',
			agentId: 'copilot-B',
			task: 'update docs',
			files: ['docs-vitepress/**'],
		});
		expect(claimB.claimed).toBe(true);

		// Both work (simulated by updates)
		await tool.execute({ action: 'update', agentId: 'copilot-A' });
		await tool.execute({ action: 'update', agentId: 'copilot-B' });

		// A finishes first
		await tool.execute({ action: 'release', agentId: 'copilot-A' });
		expect((await tool.execute({ action: 'check' })).total).toBe(1);

		// B finishes
		await tool.execute({ action: 'release', agentId: 'copilot-B' });
		expect((await tool.execute({ action: 'check' })).total).toBe(0);
	});

	it('agent A crashes mid-work, agent B force-reclaims after staleness window', async () => {
		const tool = makeTool();

		// A claims but "crashes" immediately (stale updatedAt written manually)
		await tool.execute({
			action: 'claim',
			agentId: 'copilot-crashed',
			task: 'fix types',
			files: ['src/core/**'],
		});
		const staleAt = new Date(Date.now() - 60_000).toISOString();
		const raw = readRawRegistry();
		(raw.agents['copilot-crashed'] as { updatedAt: string }).updatedAt =
			staleAt;
		writeFileSync(TMP_REGISTRY, JSON.stringify(raw));

		// B detects the stale claim and overrides it.
		const res = await tool.execute({
			action: 'claim',
			agentId: 'copilot-B',
			task: 'continue type fix',
			files: ['src/core/qm.ts'],
			force: true,
		});
		expect(res.claimed).toBe(true);
		expect(
			(await tool.execute({ action: 'check' })).agents.some(
				(agt) => agt.agentId === 'copilot-B'
			)
		).toBe(true);
	});

	it('mass-rename session: sole agent claims all, works, then releases cleanly', async () => {
		const tool = makeTool();
		const bigClaim = await tool.execute({
			action: 'claim',
			agentId: 'renamer',
			task: 'rename legacy methods to $q* across entire codebase',
			files: ['src/**', 'tests/**', 'docs-vitepress/**'],
			ttlMs: 1_800_000,
		});
		expect(bigClaim.claimed).toBe(true);

		// Any other agent is blocked during the rename.
		const blocked = await tool.execute({
			action: 'claim',
			agentId: 'bystander',
			task: 'minor fix',
			files: ['src/utils.ts'],
		});
		expect(blocked.conflict).toBe(true);

		// Rename finishes.
		await tool.execute({ action: 'release', agentId: 'renamer' });

		// Now the bystander can proceed.
		const unblocked = await tool.execute({
			action: 'claim',
			agentId: 'bystander',
			task: 'minor fix',
			files: ['src/utils.ts'],
		});
		expect(unblocked.claimed).toBe(true);
	});

	it('long-running session survives VS Code restart via re-claim + ticker', async () => {
		QAgentCoordinateTool._tickerIntervalMs = 40;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;
		QAgentCoordinateTool._autoRefreshOnTick = true;
		const tool = makeTool(60); // 60 ms TTL — needs ticker to survive

		// Original claim
		await tool.execute({
			action: 'claim',
			agentId: 'long-session',
			task: 'ongoing work',
			files: ['src/**'],
		});
		const startedAt = (await tool.execute({ action: 'check' })).agents[0]
			?.startedAt;

		// Simulate VS Code restart: reset static state (ticker dies, agentId info lost client-side)
		QAgentCoordinateTool._resetForTest();
		QAgentCoordinateTool._tickerIntervalMs = 40;
		QAgentCoordinateTool._inactivityThresholdMs = 10_000;
		QAgentCoordinateTool._autoRefreshOnTick = true;

		// Agent re-claims on startup (idempotent).
		const reClaim = await tool.execute({
			action: 'claim',
			agentId: 'long-session',
			task: 'ongoing work',
			files: ['src/**'],
		});
		expect(reClaim.claimed).toBe(true);

		// Ticker fires and keeps entry alive.
		await Bun.sleep(150);
		const check = await tool.execute({ action: 'check' });
		expect(check.total).toBe(1);
		expect(check.agents[0]?.startedAt).toBe(startedAt); // startedAt preserved
	});
});
