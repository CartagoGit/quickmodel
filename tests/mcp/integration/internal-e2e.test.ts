/**
 * #26 — MCP Internal Tools E2E Integration Tests
 *
 * Tests manage-proposal and create-guide-page with real filesystem interaction,
 * using isolated temp paths within the project's tmp/ directory.
 *
 * Each test uses isolated files/directories to avoid cross-test contamination.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { QManageProposalTool } from '../../../src/mcp/tools/internal/manage-proposal.tool';
import { QCreateGuidePageTool } from '../../../src/mcp/tools/internal/create-guide-page.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const projectRoot = process.cwd();

/**
 * Resolves a path relative to the project root (required by manage-proposal's
 * path-traversal guard, which checks `tasksPath.startsWith(process.cwd())`).
 */
function inTmp(...segments: string[]): string {
	return path.join(projectRoot, 'tmp', ...segments);
}

/** Minimal TASKS.md content with one existing proposal A. */
const TASKS_WITH_ONE_PROPOSAL = `# Proposals

## 🆕 PROPUESTAS BACKLOG

### Propuesta A — Existing Proposal

**Prioridad:** 🟡 Media
**Impacto:** Demo
**Esfuerzo estimado:** 1 hora

Existing proposal content.
`;

/** Empty TASKS.md with just the backlog section. */
const TASKS_EMPTY = `# Proposals\n\n## 🆕 PROPUESTAS BACKLOG\n\n_No proposals yet._\n`;

// ---------------------------------------------------------------------------
// manage-proposal: get-next-id
// ---------------------------------------------------------------------------

describe('QManageProposalTool — get-next-id — e2e', () => {
	const tasksFile = inTmp('tasks-e2e-getid.md');

	beforeAll(() => {
		fs.writeFileSync(tasksFile, TASKS_EMPTY, 'utf-8');
	});

	afterAll(() => {
		if (fs.existsSync(tasksFile)) fs.unlinkSync(tasksFile);
	});

	test('empty backlog → next letter is A', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'get-next-id',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'get-next-id') {
			expect(result.letter).toBe('A');
			expect(result.summary).toContain('A');
		}
	});

	test('one existing proposal A → next letter is B', async () => {
		fs.writeFileSync(tasksFile, TASKS_WITH_ONE_PROPOSAL, 'utf-8');
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'get-next-id',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'get-next-id') {
			expect(result.letter).toBe('B');
		}
	});
});

// ---------------------------------------------------------------------------
// manage-proposal: list
// ---------------------------------------------------------------------------

describe('QManageProposalTool — list — e2e', () => {
	const tasksFile = inTmp('tasks-e2e-list.md');

	beforeAll(() => {
		fs.writeFileSync(tasksFile, TASKS_WITH_ONE_PROPOSAL, 'utf-8');
	});

	afterAll(() => {
		if (fs.existsSync(tasksFile)) fs.unlinkSync(tasksFile);
	});

	test('returns list with one proposal', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'list',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'list') {
			expect(result.total).toBe(1);
			expect(result.proposals).toHaveLength(1);
			expect(result.proposals[0]?.letter).toBe('A');
			expect(result.proposals[0]?.title).toBe('Existing Proposal');
		}
	});

	test('empty backlog → list returns empty array', async () => {
		fs.writeFileSync(tasksFile, TASKS_EMPTY, 'utf-8');
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'list',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'list') {
			expect(result.total).toBe(0);
			expect(result.proposals).toHaveLength(0);
		}
	});
});

// ---------------------------------------------------------------------------
// manage-proposal: add
// ---------------------------------------------------------------------------

describe('QManageProposalTool — add — e2e', () => {
	const tasksFile = inTmp('tasks-e2e-add.md');

	beforeAll(() => {
		fs.writeFileSync(tasksFile, TASKS_EMPTY, 'utf-8');
	});

	afterAll(() => {
		if (fs.existsSync(tasksFile)) fs.unlinkSync(tasksFile);
	});

	test('add first proposal → assigned letter A, file updated', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'add',
			title: 'Add Webhook Support',
			description: 'Allow models to emit change events via webhooks.',
			priority: 'alta',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'add') {
			expect(result.letter).toBe('A');
			expect(result.message).toContain('Add Webhook Support');
		}
		// Verify it was actually written
		const written = fs.readFileSync(tasksFile, 'utf-8');
		expect(written).toContain('Propuesta A');
		expect(written).toContain('Add Webhook Support');
	});

	test('add second proposal → assigned letter B', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'add',
			title: 'Batch Validation API',
			description: 'Validate multiple models in a single call.',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(true);
		if (result.success && result.action === 'add') {
			expect(result.letter).toBe('B');
		}
	});

	test('missing title → returns error', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'add',
			description: 'No title provided',
			tasks_path: tasksFile,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('title');
		}
	});
});

// ---------------------------------------------------------------------------
// manage-proposal: get-next-id + add chained (integration scenario)
// ---------------------------------------------------------------------------

describe('QManageProposalTool — chained get-next-id → add → list — e2e', () => {
	const tasksFile = inTmp('tasks-e2e-chain.md');

	beforeAll(() => {
		fs.writeFileSync(tasksFile, TASKS_EMPTY, 'utf-8');
	});

	afterAll(() => {
		if (fs.existsSync(tasksFile)) fs.unlinkSync(tasksFile);
	});

	test('get-next-id → add → list should be consistent', async () => {
		const tool = new QManageProposalTool();

		// Step 1: get next id
		const idResult = await tool.execute({
			action: 'get-next-id',
			tasks_path: tasksFile,
		});
		expect(idResult.success).toBe(true);
		const nextId =
			idResult.success && idResult.action === 'get-next-id'
				? idResult.letter
				: 'A';

		// Step 2: add proposal
		const addResult = await tool.execute({
			action: 'add',
			title: 'GraphQL Resolver Support',
			description: 'Generate resolvers from QModel definitions.',
			tasks_path: tasksFile,
		});
		expect(addResult.success).toBe(true);
		if (addResult.success && addResult.action === 'add') {
			expect(addResult.letter).toBe(nextId);
		}

		// Step 3: list should include the new proposal
		const listResult = await tool.execute({
			action: 'list',
			tasks_path: tasksFile,
		});
		expect(listResult.success).toBe(true);
		if (listResult.success && listResult.action === 'list') {
			expect(listResult.total).toBe(1);
			expect(
				listResult.proposals.some(
					(prop) => prop.title === 'GraphQL Resolver Support'
				)
			).toBe(true);
		}
	});
});

// ---------------------------------------------------------------------------
// manage-proposal: error paths
// ---------------------------------------------------------------------------

describe('QManageProposalTool — error paths — e2e', () => {
	test('non-existent tasks_path → error returned', async () => {
		const tool = new QManageProposalTool();
		const result = await tool.execute({
			action: 'list',
			tasks_path: inTmp('nonexistent-does-not-exist.md'),
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('not found');
		}
	});
});

// ---------------------------------------------------------------------------
// create-guide-page
// ---------------------------------------------------------------------------

/** Unique base directory for create-guide-page tests — created/deleted per suite. */
const guideTestBase = inTmp('cgp-test-e2e');

describe('QCreateGuidePageTool — e2e', () => {
	beforeAll(() => {
		// Clean up from previous runs
		if (fs.existsSync(guideTestBase)) {
			fs.rmSync(guideTestBase, { recursive: true, force: true });
		}
	});

	afterAll(() => {
		if (fs.existsSync(guideTestBase)) {
			fs.rmSync(guideTestBase, { recursive: true, force: true });
		}
	});

	test('valid slug + titles → EN and ES files created', async () => {
		const tool = new QCreateGuidePageTool();
		const result = await tool.execute({
			slug: 'test-feature-xyz',
			title_en: 'Test Feature',
			title_es: 'Función de Prueba',
			description_en: 'A test feature for integration testing.',
			description_es:
				'Una función de prueba para testing de integración.',
			base_path: guideTestBase,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.en_path).toContain('test-feature-xyz.md');
			expect(result.es_path).toContain('test-feature-xyz.md');
			expect(result.message).toContain('test-feature-xyz');

			// Verify files actually exist
			expect(fs.existsSync(result.en_path)).toBe(true);
			expect(fs.existsSync(result.es_path)).toBe(true);

			// Verify EN content
			const enContent = fs.readFileSync(result.en_path, 'utf-8');
			expect(enContent).toContain('# Test Feature');
			expect(enContent).toContain(
				'A test feature for integration testing.'
			);
			expect(enContent).toContain('## Overview');

			// Verify ES content
			const esContent = fs.readFileSync(result.es_path, 'utf-8');
			expect(esContent).toContain('# Función de Prueba');
			expect(esContent).toContain(
				'Una función de prueba para testing de integración.'
			);
			expect(esContent).toContain('## Descripción General');
		}
	});

	test('duplicate slug → error returned, no overwrite', async () => {
		const tool = new QCreateGuidePageTool();
		// First create succeeds
		await tool.execute({
			slug: 'duplicate-slug-test',
			title_en: 'Duplicate',
			title_es: 'Duplicado',
			base_path: guideTestBase,
		});

		// Second create with same slug → fails
		const result = await tool.execute({
			slug: 'duplicate-slug-test',
			title_en: 'Should Fail',
			title_es: 'Debería Fallar',
			base_path: guideTestBase,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('already exists');
		}
	});

	test('invalid slug (uppercase) → validation error', async () => {
		const tool = new QCreateGuidePageTool();
		const result = await tool.execute({
			slug: 'InvalidSlug',
			title_en: 'Invalid',
			title_es: 'Inválido',
			base_path: guideTestBase,
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain('slug');
		}
	});

	test('slug with no descriptions → template stubs used', async () => {
		const tool = new QCreateGuidePageTool();
		const result = await tool.execute({
			slug: 'minimal-page-abc',
			title_en: 'Minimal Page',
			title_es: 'Página Mínima',
			base_path: guideTestBase,
		});
		expect(result.success).toBe(true);
		if (result.success) {
			const enContent = fs.readFileSync(result.en_path, 'utf-8');
			expect(enContent).toContain('# Minimal Page');
			expect(enContent).toContain('This page is a stub');
		}
	});
});
