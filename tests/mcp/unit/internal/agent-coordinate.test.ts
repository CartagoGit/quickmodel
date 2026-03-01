import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QAgentCoordinateTool } from '../../../../src/mcp/tools/internal/agent-coordinate.tool';
import { join } from 'path';
import {
	rmSync,
	existsSync,
	readFileSync,
	writeFileSync,
	mkdirSync,
	unlinkSync,
} from 'fs';

const TMP_REGISTRY = join(process.cwd(), 'tests', 'temp_agent_registry.json');
const TMP_STATUS = join(process.cwd(), 'tests', 'temp_agent_status.md');
const TMP_LOCK = TMP_REGISTRY + '.lock';

function makeTool(ttlMs?: number): QAgentCoordinateTool {
	const tool = new QAgentCoordinateTool();
	tool._registryPath = TMP_REGISTRY;
	tool._statusPath = TMP_STATUS;
	if (ttlMs !== undefined) tool._ttlMs = ttlMs;
	return tool;
}

describe('QAgentCoordinateTool', () => {
	beforeEach(() => {
		QAgentCoordinateTool._resetForTest();
		if (existsSync(TMP_REGISTRY)) rmSync(TMP_REGISTRY);
		if (existsSync(TMP_STATUS)) rmSync(TMP_STATUS);
		if (existsSync(TMP_LOCK)) rmSync(TMP_LOCK);
	});

	afterEach(() => {
		QAgentCoordinateTool._resetForTest();
		if (existsSync(TMP_REGISTRY)) rmSync(TMP_REGISTRY);
		if (existsSync(TMP_STATUS)) rmSync(TMP_STATUS);
		if (existsSync(TMP_LOCK)) rmSync(TMP_LOCK);
	});

	// ── Metadata ────────────────────────────────────────────────────────────

	it('has correct metadata', () => {
		const tool = makeTool();
		expect(tool.name).toBe('agent_coordinate');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	// ── check ────────────────────────────────────────────────────────────────

	describe('check', () => {
		it('returns zero agents when registry does not exist', async () => {
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.agents).toHaveLength(0);
			expect(res.total).toBe(0);
			expect(res.summary).toContain('0');
		});

		it('returns registered agents after a claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/**'],
			});
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('agent-A');
			expect(res.agents[0]?.task).toBe('migrate docs');
		});

		it('auto-purges stale entries and reports count', async () => {
			// Write a registry with an already-expired entry
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'dead-agent': {
							agentId: 'dead-agent',
							task: 'old task',
							files: ['src/**'],
							startedAt: '2020-01-01T00:00:00.000Z',
							updatedAt: '2020-01-01T00:00:00.000Z',
							expiresAt: '2020-01-01T02:00:00.000Z', // expired long ago
						},
					},
				})
			);
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(res.purgedStale).toBe(1);
		});
	});

	// ── claim ─────────────────────────────────────────────────────────────────

	describe('claim — exact file matching', () => {
		it('claims successfully when no conflicts', async () => {
			const tool = makeTool();
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/**'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
			expect(res.summary).toContain('agent-A');
			expect(res.summary).toContain('migrate docs');
		});

		it('detects conflict on exact duplicate file', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/guide/qmodel.md'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'fix examples',
				files: ['docs-vitepress/en/guide/qmodel.md'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
			expect(res.claimedBy).toBe('agent-A');
			expect(res.conflictingFiles).toContain(
				'docs-vitepress/en/guide/qmodel.md'
			);
		});

		it('allows two agents on completely different files', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'fix tests',
				files: ['tests/unit/**'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
			expect(res.otherAgents).toHaveLength(1);
		});
	});

	describe('claim — glob-aware conflict detection', () => {
		it('glob vs specific file: conflict when file is under glob base', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate all docs',
				files: ['docs-vitepress/en/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'edit one guide',
				files: ['docs-vitepress/en/guide/qmodel.md'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
			expect(res.claimedBy).toBe('agent-A');
		});

		it('specific file vs glob: conflict when file is under glob base', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'edit one guide',
				files: ['docs-vitepress/en/guide/qmodel.md'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'migrate all docs',
				files: ['docs-vitepress/en/**'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
		});

		it('glob vs sub-glob: conflict when one glob base prefixes the other', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'all src',
				files: ['src/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'just core',
				files: ['src/core/**'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
		});

		it('sibling globs do NOT conflict', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'en docs',
				files: ['docs-vitepress/en/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'es docs',
				files: ['docs-vitepress/es/**'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});

		it('different exact files do NOT conflict', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task a',
				files: ['src/core/models/quick.model.ts'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'task b',
				files: ['src/core/models/qm-handle.ts'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});

		it('empty files list never conflicts', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task a',
				files: ['src/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'task b',
				files: [],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});
	});

	describe('claim — re-claim behaviour', () => {
		it('allows same agent to re-claim without conflict', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task 1',
				files: ['src/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task 2',
				files: ['src/**'],
			});
			expect(res.claimed).toBe(true);
		});

		it('preserves startedAt on re-claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task 1',
				files: [],
			});
			const first = await tool.execute({ action: 'check' });
			const startedAt = first.agents[0]?.startedAt;

			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task 2',
				files: [],
			});
			const second = await tool.execute({ action: 'check' });
			expect(second.agents[0]?.startedAt).toBe(startedAt);
		});

		it('returns error when agentId or task missing', async () => {
			const tool = makeTool();
			const res = await tool.execute({ action: 'claim' });
			expect(res.claimed).toBe(false);
		});
	});

	// ── release ───────────────────────────────────────────────────────────────

	describe('release', () => {
		it('releases an existing claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: [],
			});
			const res = await tool.execute({
				action: 'release',
				agentId: 'agent-A',
			});
			expect(res.released).toBe(true);
			expect(res.summary).toContain('agent-A');
		});

		it('check returns empty after release', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: [],
			});
			await tool.execute({ action: 'release', agentId: 'agent-A' });
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
		});

		it('returns failure when agentId missing', async () => {
			const tool = makeTool();
			const res = await tool.execute({ action: 'release' });
			expect(res.released).toBe(false);
		});

		it('returns failure when releasing unknown agent', async () => {
			const tool = makeTool();
			const res = await tool.execute({
				action: 'release',
				agentId: 'ghost',
			});
			expect(res.released).toBe(false);
			expect(res.summary).toContain('ghost');
		});
	});

	// ── update ────────────────────────────────────────────────────────────────

	describe('update (heartbeat)', () => {
		it('refreshes expiresAt for an existing claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'long task',
				files: [],
			});
			const before = (await tool.execute({ action: 'check' })).agents[0]
				?.expiresAt;
			const res = await tool.execute({
				action: 'update',
				agentId: 'agent-A',
			});
			expect(res.updated).toBe(true);
			expect(res.expiresAt).toBeDefined();
			// The new expiry should be >= the old one
			expect(new Date(res.expiresAt).getTime()).toBeGreaterThanOrEqual(
				new Date(before ?? 0).getTime()
			);
		});

		it('returns failure when agentId missing', async () => {
			const tool = makeTool();
			const res = await tool.execute({ action: 'update' });
			expect(res.updated).toBe(false);
		});

		it('returns failure when agent has no active claim', async () => {
			const tool = makeTool();
			const res = await tool.execute({
				action: 'update',
				agentId: 'ghost',
			});
			expect(res.updated).toBe(false);
		});
	});

	// ── purge ─────────────────────────────────────────────────────────────────

	describe('purge', () => {
		it('purges a specific agent by agentId', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task',
				files: [],
			});
			const res = await tool.execute({
				action: 'purge',
				agentId: 'agent-A',
			});
			expect(res.purged).toBe(1);
			expect(res.remaining).toBe(0);
		});

		it('purges all agents when no agentId given', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task A',
				files: [],
			});
			await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'task B',
				files: [],
			});
			const res = await tool.execute({ action: 'purge' });
			expect(res.purged).toBe(2);
			expect(res.remaining).toBe(0);
		});

		it('reports cleanly when target agent not found', async () => {
			const tool = makeTool();
			const res = await tool.execute({
				action: 'purge',
				agentId: 'ghost',
			});
			expect(res.purged).toBe(0);
		});

		it('after purge the slot is free for a new claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task',
				files: ['src/**'],
			});
			await tool.execute({ action: 'purge', agentId: 'agent-A' });
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'new task',
				files: ['src/**'],
			});
			expect(res.claimed).toBe(true);
		});
	});

	// ── TTL ───────────────────────────────────────────────────────────────────

	describe('TTL auto-expiry', () => {
		it('an expired claim is purged on next read and causes no conflict', async () => {
			const tool = makeTool(1); // TTL = 1 ms
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'will expire',
				files: ['src/**'],
			});
			// Wait for TTL to lapse
			await new Promise((resolve) => setTimeout(resolve, 10));

			const tool2 = makeTool();
			tool2._registryPath = TMP_REGISTRY;
			const res = await tool2.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'new task',
				files: ['src/**'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});

		it('custom ttlMs per claim arg overrides instance default', async () => {
			const tool = makeTool(60_000); // instance TTL = 1 min
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'short task',
				files: ['src/**'],
				ttlMs: 1, // per-claim TTL = 1 ms
			});
			// Wait for per-claim TTL to lapse
			await new Promise((resolve) => setTimeout(resolve, 10));

			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'new task',
				files: ['src/**'],
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});
	});

	// ── force ──────────────────────────────────────────────────────────────

	describe('force claim (crash resilience)', () => {
		it('force=true overrides a stale lock (updatedAt older than _staleCrashMs)', async () => {
			const tool = makeTool();
			// Write a registry entry that was last updated long ago
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			const longAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'crashed-agent': {
							agentId: 'crashed-agent',
							task: 'stuck task',
							files: ['src/**'],
							startedAt: longAgo,
							updatedAt: longAgo,
							expiresAt: new Date(
								Date.now() + 60 * 60 * 1000
							).toISOString(), // not expired yet
						},
					},
				})
			);
			tool._staleCrashMs = 5 * 60 * 1000; // 5 min threshold

			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'take over',
				files: ['src/**'],
				force: true,
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});

		it('force=true does NOT override a fresh, active claim', async () => {
			const tool = makeTool();
			// Agent A claims right now (updatedAt = now)
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'active task',
				files: ['src/**'],
			});
			tool._staleCrashMs = 5 * 60 * 1000; // 5 min threshold

			// Agent B tries force but agent-A is fresh
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'sneaky take',
				files: ['src/**'],
				force: true,
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
			expect(res.claimedBy).toBe('agent-A');
		});

		it('conflict message mentions purge and force options', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'active task',
				files: ['src/**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'blocked task',
				files: ['src/**'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
			expect(res.summary).toContain('purge');
			expect(res.summary).toContain('force');
		});
	});

	// ── registry resilience ───────────────────────────────────────────────

	describe('registry resilience', () => {
		it('corrupted JSON in registry file falls back to empty registry', async () => {
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_REGISTRY, '{ invalid json :::');
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(res.agents).toHaveLength(0);
		});

		it('valid JSON with missing agents key falls back to empty registry', async () => {
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_REGISTRY, JSON.stringify({ version: 1 }));
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
		});

		it('valid JSON with null agents key falls back to empty registry', async () => {
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_REGISTRY, JSON.stringify({ agents: null }));
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
		});
	});

	// ── glob edge cases ───────────────────────────────────────────────────

	describe('glob edge cases', () => {
		it('root-level glob (*.ts) conflicts with any file', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'root glob',
				files: ['*.ts'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'some file',
				files: ['src/anything.ts'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
		});

		it('** (double-star alone) conflicts with any file', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'everything',
				files: ['**'],
			});
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'specific file',
				files: ['src/core/models/quick.model.ts'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
		});

		it('when multiple agents conflict, first conflict is returned', async () => {
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
				files: ['tests/**'],
			});
			// agent-C wants both — will hit the first conflict found
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-C',
				task: 'task C',
				files: ['src/**', 'tests/**'],
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
			// claimedBy is one of the two conflicting agents
			expect(['agent-A', 'agent-B']).toContain(res.claimedBy);
		});
	});

	// ── update edge cases ─────────────────────────────────────────────────

	describe('update edge cases', () => {
		it('updatedAt actually changes after update call', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'long task',
				files: [],
			});
			const before = (await tool.execute({ action: 'check' })).agents[0]
				?.updatedAt;
			// Small delay to ensure timestamp differs
			await new Promise((resolve) => setTimeout(resolve, 5));
			await tool.execute({ action: 'update', agentId: 'agent-A' });
			const after = (await tool.execute({ action: 'check' })).agents[0]
				?.updatedAt;
			expect(after).not.toBe(before);
		});

		it('update with custom ttlMs sets expiry accordingly', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'long task',
				files: [],
			});
			const customTtl = 10 * 60 * 1000; // 10 minutes
			const before = Date.now();
			const res = await tool.execute({
				action: 'update',
				agentId: 'agent-A',
				ttlMs: customTtl,
			});
			expect(res.updated).toBe(true);
			const expiryMs = new Date(res.expiresAt).getTime();
			// Should be ~10 min from now (allow ±2 seconds)
			expect(expiryMs).toBeGreaterThanOrEqual(before + customTtl - 2000);
			expect(expiryMs).toBeLessThanOrEqual(before + customTtl + 2000);
		});
	});

	// ── status file ──────────────────────────────────────────────────────────

	describe('agent-status.md', () => {
		it('creates status file after a claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/**'],
			});
			expect(existsSync(TMP_STATUS)).toBe(true);
			const content = readFileSync(TMP_STATUS, 'utf-8');
			expect(content).toContain('agent-A');
			expect(content).toContain('migrate docs');
			expect(content).toContain('docs-vitepress/en/**');
		});

		it('updates status file to empty state after release', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'migrate docs',
				files: ['docs-vitepress/en/**'],
			});
			await tool.execute({ action: 'release', agentId: 'agent-A' });
			const content = readFileSync(TMP_STATUS, 'utf-8');
			expect(content).toContain('No active agents');
			expect(content).not.toContain('agent-A');
		});

		it('shows multiple agents in status file', async () => {
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
				files: ['tests/**'],
			});
			const content = readFileSync(TMP_STATUS, 'utf-8');
			expect(content).toContain('agent-A');
			expect(content).toContain('agent-B');
			expect(content).toContain('2 active agent');
		});
	});

	// ── implicit heartbeat ────────────────────────────────────────────────────

	describe('implicit heartbeat (check action)', () => {
		it('check with agentId refreshes expiresAt of existing claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'long task',
				files: [],
			});
			const after1st = (await tool.execute({ action: 'check' })).agents[0]
				?.expiresAt;
			await new Promise((resolve) => setTimeout(resolve, 5));
			const checkRes = await tool.execute({
				action: 'check',
				agentId: 'agent-A',
			});
			const after2nd = checkRes.agents[0]?.expiresAt;
			// Expiry should have been pushed forward
			expect(new Date(after2nd ?? 0).getTime()).toBeGreaterThanOrEqual(
				new Date(after1st ?? 0).getTime()
			);
		});

		it('check without agentId does NOT refresh any claim', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'long task',
				files: [],
			});
			const before = (await tool.execute({ action: 'check' })).agents[0]
				?.expiresAt;
			await new Promise((resolve) => setTimeout(resolve, 5));
			// No agentId — heartbeat must NOT fire
			await tool.execute({ action: 'check' });
			const after = (await tool.execute({ action: 'check' })).agents[0]
				?.expiresAt;
			expect(after).toBe(before);
		});

		it('implicit heartbeat keeps claim alive past original TTL', async () => {
			const tool = makeTool(100); // TTL = 100 ms
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'monitored task',
				files: ['src/**'],
			});
			// Heartbeat every 40 ms for 3 iterations = ~120 ms total
			// Each heartbeat resets expiry to now+100 ms, so claim stays alive
			for (let idx = 0; idx < 3; idx++) {
				await new Promise((resolve) => setTimeout(resolve, 40));
				await tool.execute({ action: 'check', agentId: 'agent-A' });
			}
			// After ~120 ms, last heartbeat was ~0-40 ms ago → expiry is still > now
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('agent-A');
		});

		it('claim without heartbeat expires after TTL', async () => {
			const tool = makeTool(50); // TTL = 50 ms
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'short task',
				files: ['src/**'],
			});
			// No heartbeat — wait 3× the TTL to be safe
			await new Promise((resolve) => setTimeout(resolve, 150));
			const res = await tool.execute({ action: 'check' });
			expect(res.agents.some((agt) => agt.agentId === 'agent-A')).toBe(
				false
			);
		});
	});

	// ── force threshold (1 min default) ──────────────────────────────────────

	describe('force threshold is 1 minute', () => {
		it('force=true does NOT override a claim that is only 30 seconds old', async () => {
			const tool = makeTool();
			const thirtySecAgo = new Date(Date.now() - 30 * 1000).toISOString();
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'recent-agent': {
							agentId: 'recent-agent',
							task: 'recent task',
							files: ['src/**'],
							startedAt: thirtySecAgo,
							updatedAt: thirtySecAgo,
							expiresAt: new Date(
								Date.now() + 5 * 60 * 1000
							).toISOString(),
						},
					},
				})
			);
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'try to take over',
				files: ['src/**'],
				force: true,
			});
			expect(res.claimed).toBe(false);
			expect(res.conflict).toBe(true);
		});

		it('force=true overrides a claim that is 2 minutes old', async () => {
			const tool = makeTool();
			const twoMinAgo = new Date(
				Date.now() - 2 * 60 * 1000
			).toISOString();
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'old-agent': {
							agentId: 'old-agent',
							task: 'stale task',
							files: ['src/**'],
							startedAt: twoMinAgo,
							updatedAt: twoMinAgo,
							expiresAt: new Date(
								Date.now() + 5 * 60 * 1000
							).toISOString(),
						},
					},
				})
			);
			const res = await tool.execute({
				action: 'claim',
				agentId: 'agent-B',
				task: 'valid take-over',
				files: ['src/**'],
				force: true,
			});
			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);
		});
	});

	// ── ticker ────────────────────────────────────────────────────────────

	describe('ticker', () => {
		it('starts after first claim when registry has agents', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 50;
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'ticker-agent',
				task: 'test ticker start',
				files: [],
			});
			expect(QAgentCoordinateTool._tickerHandle).not.toBeNull();
		});

		it('does not create a second ticker on subsequent claims', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 50;
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'ticker-agent-a',
				task: 'first claim',
				files: [],
			});
			const firstHandle = QAgentCoordinateTool._tickerHandle;
			await tool.execute({
				action: 'claim',
				agentId: 'ticker-agent-b',
				task: 'second claim',
				files: ['other/**'],
			});
			expect(QAgentCoordinateTool._tickerHandle).toBe(firstHandle);
		});

		it('stops automatically on inactivity after 2x interval', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 50;
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'idle-agent',
				task: 'idle test',
				files: [],
			});
			expect(QAgentCoordinateTool._tickerHandle).not.toBeNull();
			// After 150 ms, two ticks will have fired with idle > 50 ms threshold
			await Bun.sleep(150);
			expect(QAgentCoordinateTool._tickerHandle).toBeNull();
		});

		it('stops when all agents expire and registry becomes empty', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 5000; // disable inactivity stop
			// ttl = 50 ms so the agent expires before the second tick
			const tool = makeTool(50);
			await tool.execute({
				action: 'claim',
				agentId: 'expiring-agent',
				task: 'soon to expire',
				files: [],
			});
			// Wait long enough for two ticks; second tick will see the expired agent
			await Bun.sleep(200);
			expect(QAgentCoordinateTool._tickerHandle).toBeNull();
		});

		it('purges expired agents from registry JSON when stopping on empty registry', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 5000;
			const tool = makeTool(50);
			await tool.execute({
				action: 'claim',
				agentId: 'temp-agent',
				task: 'verify purge',
				files: [],
			});
			await Bun.sleep(200);
			const raw = readFileSync(TMP_REGISTRY, 'utf-8');
			const reg = JSON.parse(raw) as { agents: Record<string, unknown> };
			expect(Object.keys(reg.agents).length).toBe(0);
		});

		it('refreshes agent-status.md on each tick while agents are active', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 50;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			// Long TTL so the agent does not expire during the test
			const tool = makeTool(60_000);
			await tool.execute({
				action: 'claim',
				agentId: 'long-lived-agent',
				task: 'md refresh test',
				files: [],
			});
			const mdBefore = readFileSync(TMP_STATUS, 'utf-8');
			// Wait for at least one tick
			await Bun.sleep(90);
			const mdAfter = readFileSync(TMP_STATUS, 'utf-8');
			// The _Updated_ timestamp inside the .md must have changed
			expect(mdAfter).not.toBe(mdBefore);
		});
	});

	// ── lock / cross-process mutex ─────────────────────────────────────────

	describe('lock / cross-process mutex', () => {
		it('lock file is removed after a successful execute()', async () => {
			const tool = makeTool();
			await tool.execute({ action: 'check' });
			expect(existsSync(TMP_LOCK)).toBe(false);
		});

		it('lock file is removed even when execute() returns a non-trivial result', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task',
				files: ['src/**'],
			});
			await tool.execute({ action: 'release', agentId: 'agent-A' });
			expect(existsSync(TMP_LOCK)).toBe(false);
		});

		it('sequential execute() calls complete without deadlock', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'first',
				files: [],
			});
			const res = await tool.execute({ action: 'check' });
			await tool.execute({ action: 'release', agentId: 'agent-A' });
			expect(res.total).toBe(1);
			expect(existsSync(TMP_LOCK)).toBe(false);
		});

		it('auto-removes a stale lock and executes successfully', async () => {
			const tool = makeTool();
			tool._lockRetries = 3;
			tool._lockRetryMs = 5;
			tool._lockStaleMs = 0; // every lock is immediately stale
			// Simulate a crashed process that left its lock behind
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_LOCK, '', 'utf-8');
			// execute() must clear the stale lock and complete normally
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(existsSync(TMP_LOCK)).toBe(false);
		});

		it('throws after max retries when a fresh lock is held', async () => {
			const tool = makeTool();
			tool._lockRetries = 2;
			tool._lockRetryMs = 5;
			tool._lockStaleMs = 60_000; // lock is considered fresh for 1 min
			// Create a "held" lock file (simulating another active process)
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_LOCK, '', 'utf-8');
			let thrown = false;
			try {
				await tool.execute({ action: 'check' });
			} catch (err) {
				thrown = true;
				expect((err as Error).message).toContain('lock');
			}
			expect(thrown).toBe(true);
			// Manually release so afterEach cleanup works
			unlinkSync(TMP_LOCK);
		});
	});
});
