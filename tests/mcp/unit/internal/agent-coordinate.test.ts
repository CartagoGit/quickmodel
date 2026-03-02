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

/**
 * Writes a stale registry file with two expired entries whose `updatedAt === startedAt`,
 * reproducing the exact state observed in `tmp/agent-registry.json`.
 * The `ttlMs` parameter controls how far in the past the entries expire.
 */
function buildStaleRegistry(
	ttlMs: number,
	filesA: string[],
	filesB: string[]
): void {
	mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
	const startedA = new Date(Date.now() - ttlMs * 3).toISOString();
	const startedB = new Date(Date.now() - ttlMs * 2).toISOString();
	writeFileSync(
		TMP_REGISTRY,
		JSON.stringify({
			agents: {
				'copilot-main': {
					agentId: 'copilot-main',
					task: 'fix all as any casts in tests/',
					files: filesA,
					startedAt: startedA,
					updatedAt: startedA,
					expiresAt: new Date(
						new Date(startedA).getTime() + ttlMs
					).toISOString(),
				},
				'copilot-sensitive-types': {
					agentId: 'copilot-sensitive-types',
					task: 'add TSensitiveKeys generic to QModel for type-safe sensitive fields',
					files: filesB,
					startedAt: startedB,
					updatedAt: startedB,
					expiresAt: new Date(
						new Date(startedB).getTime() + ttlMs
					).toISOString(),
				},
			},
		})
	);
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
				files: ['src/core/services/audit.service.ts'],
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
			expect(res.claimedBy).toBeDefined();
			expect(['agent-A', 'agent-B']).toContain(res.claimedBy ?? '');
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

	// ── force threshold (30 s default) ─────────────────────────────────────

	describe('force threshold is 30 seconds', () => {
		it('force=true does NOT override a claim that is only 15 seconds old (well within threshold)', async () => {
			const tool = makeTool();
			// Use 15 s ago — clearly within the 30 s default _staleCrashMs threshold.
			// Using exactly 30 s creates a timing race: a few extra ms during test
			// execution push ageMs > 30000, making force succeed unexpectedly.
			const fifteenSecAgo = new Date(
				Date.now() - 15 * 1000
			).toISOString();
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'recent-agent': {
							agentId: 'recent-agent',
							task: 'recent task',
							files: ['src/**'],
							startedAt: fifteenSecAgo,
							updatedAt: fifteenSecAgo,
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
			QAgentCoordinateTool._autoRefreshOnTick = false; // must not renew — test verifies expiry path
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
			QAgentCoordinateTool._autoRefreshOnTick = false; // must not renew — test verifies expiry path
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

		it('auto-renews TTL of active agents on each tick (keepalive while MCP is running)', async () => {
			// This test verifies the core fix: agents do not need to send explicit heartbeats.
			// The ticker keeps their entries alive as long as the MCP server process is running.
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000; // disable idle stop
			QAgentCoordinateTool._autoRefreshOnTick = true; // explicit — this is the default
			const tool = makeTool(60); // TTL = 60 ms — shorter than 2× tick interval (80 ms)
			await tool.execute({
				action: 'claim',
				agentId: 'no-heartbeat-but-alive',
				task: 'long work without explicit heartbeats',
				files: ['src/**'],
			});
			// Wait 3× TTL — without auto-refresh the entry would have expired after 60 ms.
			// With auto-refresh the ticker fires at ~40 ms and renews before expiry.
			await Bun.sleep(200);
			// Entry must still be alive because ticker kept renewing it.
			const tool2 = makeTool();
			tool2._registryPath = TMP_REGISTRY;
			tool2._statusPath = TMP_STATUS;
			const res = await tool2.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('no-heartbeat-but-alive');
			// Verified: updatedAt was refreshed by the ticker (no longer equals startedAt)
			expect(res.agents[0]?.updatedAt).not.toBe(res.agents[0]?.startedAt);
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

	// ── Real-world: agent never sends a heartbeat ────────────────────────────
	// Reproduces the exact state seen in tmp/agent-registry.json:
	// both entries had updatedAt === startedAt, meaning the agents claimed but
	// never called update or check+agentId, so the TTL silently drained.

	describe('real-world: agent never sends a heartbeat', () => {
		it('initial claim has updatedAt identical to startedAt', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'no-heartbeat-agent',
				task: 'fix as any casts',
				files: ['tests/**'],
			});
			const res = await tool.execute({ action: 'check' });
			const entry = res.agents[0];
			// Immediately after claim, updatedAt must equal startedAt — no automatic refresh has fired.
			// If these are ever different before any heartbeat, the system is refreshing silently
			// without being asked to, which would mask the "no heartbeat" footgun.
			expect(entry?.updatedAt).toBe(entry?.startedAt);
		});

		it('check WITHOUT agentId does not refresh updatedAt or expiresAt', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'no-heartbeat-agent',
				task: 'fix as any casts',
				files: ['tests/**'],
			});
			const before = (await tool.execute({ action: 'check' })).agents[0];
			await new Promise((resolve) => setTimeout(resolve, 5));
			// A plain check without the agent's own agentId must NOT refresh TTL.
			await tool.execute({ action: 'check' });
			const after = (await tool.execute({ action: 'check' })).agents[0];
			expect(after?.updatedAt).toBe(before?.updatedAt);
			expect(after?.expiresAt).toBe(before?.expiresAt);
		});

		it('entry expires after TTL with no heartbeat and is cleaned on next execute()', async () => {
			const tool = makeTool(50); // TTL = 50 ms
			await tool.execute({
				action: 'claim',
				agentId: 'no-heartbeat-agent',
				task: 'fix as any casts',
				files: ['tests/**'],
			});
			// No heartbeat calls. Wait for TTL to expire.
			await new Promise((resolve) => setTimeout(resolve, 100));
			// The next call triggers readRegistry() which auto-purges expired entries.
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(res.purgedStale).toBe(1);
		});

		it('between expiry and next execute(), the JSON file on disk still contains the expired entry', async () => {
			// This is the exact scenario the user observed: both agents in tmp/agent-registry.json
			// had expiresAt in the past but were still on disk. The file is only cleaned on
			// the next readRegistry() call — there is NO background mechanism that cleans it
			// if the MCP process (and its ticker) has terminated.
			const tool = makeTool(50); // TTL = 50 ms
			await tool.execute({
				action: 'claim',
				agentId: 'no-heartbeat-agent',
				task: 'fix as any casts',
				files: ['tests/**'],
			});
			// Wait for TTL to expire, but do NOT call execute() again yet.
			await new Promise((resolve) => setTimeout(resolve, 100));
			// Read the raw JSON directly from disk — entry is still there.
			const raw = JSON.parse(readFileSync(TMP_REGISTRY, 'utf-8')) as {
				agents: Record<string, { expiresAt: string }>;
			};
			const onDisk = raw.agents['no-heartbeat-agent'];
			expect(onDisk).toBeDefined();
			// Confirm it really is expired.
			expect(new Date(onDisk?.expiresAt ?? 0).getTime()).toBeLessThan(
				Date.now()
			);
		});

		it('two expired stale entries coexist on disk, matching the observed registry state', async () => {
			// Reproduces the exact registry that prompted this test suite:
			// two agents, both with updatedAt === startedAt, both expired.
			buildStaleRegistry(
				50,
				['tests/**'],
				['src/core/interfaces/**', 'src/core/models/quick.model.ts']
			);
			// Both entries exist on disk and are past their expiresAt.
			const raw = JSON.parse(readFileSync(TMP_REGISTRY, 'utf-8')) as {
				agents: Record<
					string,
					{ startedAt: string; updatedAt: string; expiresAt: string }
				>;
			};
			const agentA = raw.agents['copilot-main'];
			const agentB = raw.agents['copilot-sensitive-types'];
			expect(agentA).toBeDefined();
			expect(agentB).toBeDefined();
			// updatedAt === startedAt — neither agent ever heartbeated.
			expect(agentA?.updatedAt).toBe(agentA?.startedAt);
			expect(agentB?.updatedAt).toBe(agentB?.startedAt);
			// Both are expired.
			const now = Date.now();
			expect(new Date(agentA?.expiresAt ?? 0).getTime()).toBeLessThan(
				now
			);
			expect(new Date(agentB?.expiresAt ?? 0).getTime()).toBeLessThan(
				now
			);
			// A single check() call purges both.
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(res.purgedStale).toBe(2);
		});
	});

	// ── Real-world: status.md becomes stale when MCP process dies ───────────
	// When the VS Code Extension Host (and therefore the ticker) is killed,
	// no more ticks fire. The status file on disk is frozen at the last write.
	// It may still show a "Expires in Xs" value that has since become "EXPIRED".

	describe('real-world: status.md becomes stale when ticker is dead', () => {
		it('status.md retains last-written content after ticker stops; a new execute() refreshes it', async () => {
			// Use a very short TTL + ticker interval so the ticker stops quickly.
			// _autoRefreshOnTick = false: we want to test the "ticker expires entries and stops"
			// code path — otherwise the ticker would keep renewing the TTL indefinitely.
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 5000; // disable inactivity stop so ticker runs
			QAgentCoordinateTool._autoRefreshOnTick = false;
			const tool = makeTool(50); // TTL = 50 ms
			await tool.execute({
				action: 'claim',
				agentId: 'soon-dead-agent',
				task: 'task that will expire',
				files: [],
			});
			// Wait for ticker to purge the entry and stop.
			await Bun.sleep(200);
			expect(QAgentCoordinateTool._tickerHandle).toBeNull();
			// Ticker wrote the final empty status.md when it stopped.
			const mdAfterStop = readFileSync(TMP_STATUS, 'utf-8');
			expect(mdAfterStop).toContain('No active agents');

			// Now simulate a new agent claiming AFTER the old ticker is gone.
			const tool2 = makeTool(60_000); // long-lived claim
			tool2._registryPath = TMP_REGISTRY;
			tool2._statusPath = TMP_STATUS;
			await tool2.execute({
				action: 'claim',
				agentId: 'new-agent',
				task: 'fresh work',
				files: ['src/**'],
			});
			const mdAfterNewClaim = readFileSync(TMP_STATUS, 'utf-8');
			// Status file must now reflect the new agent.
			expect(mdAfterNewClaim).toContain('new-agent');
			expect(mdAfterNewClaim).toContain('fresh work');
		});

		it('if ticker never ran (MCP was restarted), status.md from before restart may show stale entries', async () => {
			// Write a registry and status file that look like they were left by a dead process.
			const longAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 min ago
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'zombie-agent': {
							agentId: 'zombie-agent',
							task: 'never finished',
							files: ['tests/**'],
							startedAt: longAgo,
							updatedAt: longAgo,
							expiresAt: new Date(
								Date.now() - 8 * 60 * 1000
							).toISOString(), // expired 8 min ago
						},
					},
				})
			);
			// Write a stale status file that still shows the zombie agent as "active".
			writeFileSync(
				TMP_STATUS,
				`# Agent Coordination Status\n_Updated: ${longAgo} — 1 active agent(s)_\n\n| Agent | Task | Files | Last activity | Expires in |\n|-------|------|-------|---------------|------------|\n| zombie-agent | never finished | \`tests/**\` | 10m ago | 23s |\n`
			);

			// Without calling execute(), the stale status file persists — this is the real-world bug.
			const staleMd = readFileSync(TMP_STATUS, 'utf-8');
			expect(staleMd).toContain('zombie-agent');
			// The "Expires in" value is clearly wrong: the agent expired 8 minutes ago.

			// Calling execute() triggers readRegistry() which purges the entry.
			const tool = makeTool();
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(0);
			expect(res.purgedStale).toBe(1);

			// Now status.md reflects reality.
			const freshMd = readFileSync(TMP_STATUS, 'utf-8');
			expect(freshMd).toContain('No active agents');
			expect(freshMd).not.toContain('zombie-agent');
		});

		it('agent re-claims after VS Code restart: re-claim is idempotent and restores tracking', async () => {
			// Simulate what happens in practice:
			// 1. Before restart: agent claimed and was working. VS Code stopped, ticker died.
			// 2. Entry is on disk but NOT expired (within 30 min window or still fresh).
			// 3. After restart: agent calls claim with the same agentId.
			//    Expected: claim succeeds, startedAt preserved, updatedAt/expiresAt refreshed,
			//    new ticker starts and will keep renewing the TTL going forward.
			const originalStartedAt = new Date(
				Date.now() - 5 * 60 * 1000
			).toISOString();
			const originalUpdatedAt = originalStartedAt; // never heartbeated before restart
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'resuming-agent': {
							agentId: 'resuming-agent',
							task: 'add TSensitiveKeys generic to QModel',
							files: [
								'src/core/models/quick.model.ts',
								'src/core/interfaces/**',
							],
							startedAt: originalStartedAt,
							updatedAt: originalUpdatedAt,
							expiresAt: new Date(
								Date.now() + 25 * 60 * 1000
							).toISOString(), // 25 min left
						},
					},
				})
			);

			// After restart, agent re-claims with same agentId and same task.
			const tool = makeTool();
			const res = await tool.execute({
				action: 'claim',
				agentId: 'resuming-agent',
				task: 'add TSensitiveKeys generic to QModel',
				files: [
					'src/core/models/quick.model.ts',
					'src/core/interfaces/**',
				],
			});

			expect(res.claimed).toBe(true);
			expect(res.conflict).toBe(false);

			// startedAt is preserved from the original session.
			const check = await tool.execute({ action: 'check' });
			const entry = check.agents[0];
			expect(entry?.startedAt).toBe(originalStartedAt);
			// updatedAt was refreshed by the re-claim — no longer equal to the pre-restart value.
			expect(entry?.updatedAt).not.toBe(originalUpdatedAt);
			// Ticker started again — will keep renewing TTL.
			expect(QAgentCoordinateTool._tickerHandle).not.toBeNull();
		});
	});

	// ── robustness: entry always present while MCP is active ─────────────────
	// Core guarantee: as long as the MCP server process is running (ticker alive),
	// any agent that has called claim MUST stay in the registry — regardless of
	// whether the agent calls agent_coordinate again or not.

	describe('robustness: entry always present while MCP is active', () => {
		it('single agent survives multiple ticker cycles with TTL shorter than total run time', async () => {
			// TTL = 60 ms, ticker interval = 40 ms → ticker fires BEFORE expiry and renews.
			// Without auto-renew the entry would die after 60 ms; with it, it survives 200 ms.
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			QAgentCoordinateTool._autoRefreshOnTick = true;
			const tool = makeTool(60);
			await tool.execute({
				action: 'claim',
				agentId: 'lone-agent',
				task: 'long running task',
				files: ['src/**'],
			});
			// Wait for ~5 ticker cycles. Without keepalive the entry would be dead.
			await Bun.sleep(250);
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('lone-agent');
		});

		it('three agents all stay registered through multiple ticker cycles', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			QAgentCoordinateTool._autoRefreshOnTick = true;
			const tool = makeTool(60);
			for (const [agentId, files] of [
				['worker-1', ['src/**']],
				['worker-2', ['tests/**']],
				['worker-3', ['docs-vitepress/**']],
			] as [string, string[]][]) {
				await tool.execute({
					action: 'claim',
					agentId,
					task: `task of ${agentId}`,
					files,
				});
			}
			// Wait for 4 ticker cycles.
			await Bun.sleep(200);
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(3);
			const ids = res.agents.map((agt) => agt.agentId).sort();
			expect(ids).toEqual(['worker-1', 'worker-2', 'worker-3']);
		});

		it('when one agent finishes (release), remaining agents stay registered', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			QAgentCoordinateTool._autoRefreshOnTick = true;
			const tool = makeTool(60);
			await tool.execute({
				action: 'claim',
				agentId: 'agent-short',
				task: 'quick fix',
				files: ['docs/**'],
			});
			await tool.execute({
				action: 'claim',
				agentId: 'agent-long',
				task: 'big refactor',
				files: ['src/**'],
			});
			// Short agent finishes immediately.
			await tool.execute({ action: 'release', agentId: 'agent-short' });
			// Long agent keeps working (no calls for 200 ms).
			await Bun.sleep(200);
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('agent-long');
		});

		it('entry removed externally (out-of-band delete) → agent calls check with agentId → no auto-recreate (task unknown)', async () => {
			// check cannot recreate: it only has agentId, not task/files.
			// This test documents the expected behaviour so it is never accidentally "fixed"
			// in a way that creates phantom entries with empty tasks.
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'victim',
				task: 'some task',
				files: ['src/**'],
			});
			// Simulate external deletion (e.g. user manually cleared the file).
			writeFileSync(TMP_REGISTRY, JSON.stringify({ agents: {} }));
			// check with agentId: entry not found, cannot recreate without task → returns 0 agents.
			const res = await tool.execute({
				action: 'check',
				agentId: 'victim',
			});
			expect(res.total).toBe(0);
		});

		it('ticker updatedAt advances on each renewal (proves ticker is writing)', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			QAgentCoordinateTool._autoRefreshOnTick = true;
			const tool = makeTool(60_000); // long TTL — ticker ONLY renews, no expiry risk
			await tool.execute({
				action: 'claim',
				agentId: 'watcher',
				task: 'observe',
				files: [],
			});
			const before = (await tool.execute({ action: 'check' })).agents[0]
				?.updatedAt;
			await Bun.sleep(100); // 2+ ticker cycles
			const after = (await tool.execute({ action: 'check' })).agents[0]
				?.updatedAt;
			// updatedAt must have been written by the ticker (agent made no other calls).
			expect(after).not.toBe(before);
		});
	});

	// ── robustness: update as universal heal action ───────────────────────────
	// No matter HOW the registry entry was lost (expiry, external deletion,
	// registry corruption, VS Code restart), calling update with task restores it.

	describe('robustness: update as universal heal action', () => {
		it('entry expired during work → update with task immediately restores it', async () => {
			// Write an expired entry directly to disk (simulates an entry that drained).
			const expiredAt = new Date(Date.now() - 1000).toISOString();
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(
				TMP_REGISTRY,
				JSON.stringify({
					agents: {
						'lapsed-agent': {
							agentId: 'lapsed-agent',
							task: 'add TSensitiveKeys',
							files: ['src/core/models/quick.model.ts'],
							startedAt: expiredAt,
							updatedAt: expiredAt,
							expiresAt: expiredAt, // already expired
						},
					},
				})
			);
			const tool = makeTool();
			// readRegistry() will purge the expired entry; then update creates a fresh one.
			const res = await tool.execute({
				action: 'update',
				agentId: 'lapsed-agent',
				task: 'add TSensitiveKeys',
				files: ['src/core/models/quick.model.ts'],
			});
			expect(res.updated).toBe(true);
			expect(res.summary).toContain('auto-created');
			const check = await tool.execute({ action: 'check' });
			expect(check.total).toBe(1);
			expect(check.agents[0]?.agentId).toBe('lapsed-agent');
			expect(
				new Date(check.agents[0]?.expiresAt ?? 0).getTime()
			).toBeGreaterThan(Date.now());
		});

		it('registry file deleted externally → update with task recreates file and entry', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'busy-agent',
				task: 'big task',
				files: ['src/**'],
			});
			// Simulate: someone deleted the file (or the OS cleaned tmp/).
			if (existsSync(TMP_REGISTRY)) rmSync(TMP_REGISTRY);
			const res = await tool.execute({
				action: 'update',
				agentId: 'busy-agent',
				task: 'big task',
				files: ['src/**'],
			});
			expect(res.updated).toBe(true);
			expect(existsSync(TMP_REGISTRY)).toBe(true);
			const check = await tool.execute({ action: 'check' });
			expect(check.total).toBe(1);
		});

		it('registry file corrupted externally → update with task recovers gracefully', async () => {
			mkdirSync(join(process.cwd(), 'tests'), { recursive: true });
			writeFileSync(TMP_REGISTRY, '{ CORRUPTED JSON :::'); // unreadable
			const tool = makeTool();
			const res = await tool.execute({
				action: 'update',
				agentId: 'resilient-agent',
				task: 'fix types',
				files: ['src/core/**'],
			});
			expect(res.updated).toBe(true);
			expect(res.summary).toContain('auto-created');
			// Registry is now valid JSON again.
			const raw = JSON.parse(readFileSync(TMP_REGISTRY, 'utf-8')) as {
				agents: Record<string, unknown>;
			};
			expect(raw.agents['resilient-agent']).toBeDefined();
		});

		it('multiple rapid update calls on same agentId produce exactly one entry', async () => {
			const tool = makeTool();
			// Simulate an agent calling update rapidly (e.g. due to retry logic).
			await Promise.all([
				tool.execute({
					action: 'update',
					agentId: 'rapid-agent',
					task: 'task',
					files: ['src/**'],
				}),
				tool.execute({
					action: 'update',
					agentId: 'rapid-agent',
					task: 'task',
					files: ['src/**'],
				}),
				tool.execute({
					action: 'update',
					agentId: 'rapid-agent',
					task: 'task',
					files: ['src/**'],
				}),
			]);
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1); // strictly one entry
			expect(res.agents[0]?.agentId).toBe('rapid-agent');
		});

		it('update without task on missing entry gives actionable error message', async () => {
			const tool = makeTool();
			const res = await tool.execute({
				action: 'update',
				agentId: 'lost-agent',
			});
			expect(res.updated).toBe(false);
			// Message must tell the agent what to do.
			expect(res.summary).toContain('task');
			expect(res.summary).toMatch(/claim|auto-create/i);
		});

		it('update upsert does not conflict with existing agents on other files', async () => {
			const tool = makeTool();
			await tool.execute({
				action: 'claim',
				agentId: 'agent-A',
				task: 'task A',
				files: ['src/**'],
			});
			// agent-B's entry is missing; it calls update to restore itself on different files.
			const res = await tool.execute({
				action: 'update',
				agentId: 'agent-B',
				task: 'task B',
				files: ['tests/**'],
			});
			expect(res.updated).toBe(true);
			const check = await tool.execute({ action: 'check' });
			expect(check.total).toBe(2);
		});

		it('update upsert preserves ticker: after auto-create, ticker renews the new entry', async () => {
			QAgentCoordinateTool._tickerIntervalMs = 40;
			QAgentCoordinateTool._inactivityThresholdMs = 10_000;
			QAgentCoordinateTool._autoRefreshOnTick = true;
			const tool = makeTool(60); // short TTL — would expire without ticker
			// No prior claim; agent restores itself via update.
			await tool.execute({
				action: 'update',
				agentId: 'restored-agent',
				task: 'resumed work',
				files: ['src/**'],
			});
			// Wait for ticker to fire and renew.
			await Bun.sleep(150);
			const res = await tool.execute({ action: 'check' });
			expect(res.total).toBe(1);
			expect(res.agents[0]?.agentId).toBe('restored-agent');
		});
	});
});
