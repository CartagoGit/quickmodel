import { describe, test, expect } from 'bun:test';
import { QDeprecationTrackerTool } from '../../src/mcp/tools/internal/deprecation-tracker.tool';
import { QCheckDocParityTool } from '../../src/mcp/tools/internal/check-doc-parity.tool';
import { QCheckDocDriftTool } from '../../src/mcp/tools/internal/check-doc-drift.tool';

// HIGH-05 ─────────────────────────────────────────────────────────────────────

describe('HIGH-05 — deprecation_tracker: target_dir must be inside project root', () => {
	const tool = new QDeprecationTrackerTool();

	test('execute should reject absolute path outside project root', async () => {
		let message = '';
		try {
			await tool.execute({ target_dir: '/etc' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/security/i);
	});

	test('execute should reject path-traversal via ../', async () => {
		let message = '';
		try {
			await tool.execute({ target_dir: '../../../etc/passwd' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/security/i);
	});

	test('execute should accept default (undefined target_dir)', async () => {
		// src/ is inside project root — should not throw
		const result = await tool.execute({});
		expect(result).toHaveProperty('deprecated');
		expect(result).toHaveProperty('total');
	});
});

// HIGH-06 ─────────────────────────────────────────────────────────────────────

describe('HIGH-06 — check_doc_parity: base_path must be inside project root', () => {
	const tool = new QCheckDocParityTool();

	test('schema should reject base_path longer than 500 chars', () => {
		const schema = tool.schema;
		const result = schema.safeParse({ base_path: 'a'.repeat(501) });
		expect(result.success).toBe(false);
	});

	test('execute should reject base_path pointing outside project root', async () => {
		let message = '';
		try {
			await tool.execute({ base_path: '/etc' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/security/i);
	});

	test('execute should reject path-traversal via ../', async () => {
		let message = '';
		try {
			await tool.execute({ base_path: '../../outside' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/security/i);
	});

	test('execute should accept undefined base_path (defaults to cwd)', async () => {
		// Default: uses process.cwd() — always valid
		const result = await tool.execute({});
		expect(result).toHaveProperty('passed');
	});
});

// MED-12 ──────────────────────────────────────────────────────────────────────

describe('MED-12 — check_doc_drift: target_dir must be capped and inside project root', () => {
	const tool = new QCheckDocDriftTool();

	test('schema should reject target_dir longer than 200 chars', () => {
		const schema = tool.schema;
		const result = schema.safeParse({ target_dir: 'a'.repeat(201) });
		expect(result.success).toBe(false);
	});

	test('schema should accept target_dir within limit', () => {
		const schema = tool.schema;
		const result = schema.safeParse({ target_dir: 'src' });
		expect(result.success).toBe(true);
	});

	test('execute should reject target_dir pointing outside project root', async () => {
		let message = '';
		try {
			await tool.execute({ target_dir: '../../../etc' });
		} catch (err) {
			message = (err as Error).message;
		}
		expect(message).toMatch(/security/i);
	});
});
