import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { QManageProposalTool } from '../../../../src/mcp/tools/internal/manage-proposal.tool';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'fs';

const TMP = join(process.cwd(), 'tests', 'temp_manage_proposal');
const TASKS_PATH = join(TMP, 'TASKS.md');

const FIXTURE_TASKS = `# QuickModel - Tareas

## 🆕 PROPUESTAS BACKLOG

---

### Propuesta A — First Proposal

**Prioridad:** 🔴 Alta
**Impacto:** Alto

First proposal description.

---

### Propuesta B — Second Proposal

**Prioridad:** 🟡 Media
**Impacto:** Medio

Second proposal description.
`;

describe('QManageProposalTool', () => {
	let tool: QManageProposalTool;

	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		writeFileSync(TASKS_PATH, FIXTURE_TASKS, 'utf-8');
		tool = new QManageProposalTool();
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('should have correct metadata', () => {
		expect(tool.name).toBe('manage_proposal');
		expect(tool.description).toBeDefined();
	});

	it('should list existing proposals', async () => {
		const result = (await tool.execute({
			action: 'list',
			tasks_path: TASKS_PATH,
		})) as any;
		expect(result).toMatchObject({ action: 'list' });
		expect(result.total).toBeGreaterThanOrEqual(2);
		expect(result.proposals.some((prop: any) => prop.letter === 'A')).toBe(
			true
		);
		expect(result.proposals.some((prop: any) => prop.letter === 'B')).toBe(
			true
		);
	});

	it('should parse proposal titles correctly', async () => {
		const result = (await tool.execute({
			action: 'list',
			tasks_path: TASKS_PATH,
		})) as any;
		const propA = result.proposals?.find(
			(prop: any) => prop.letter === 'A'
		);
		expect(propA?.title).toContain('First Proposal');
	});

	it('should get next proposal ID after B → returns C', async () => {
		const result = (await tool.execute({
			action: 'get-next-id',
			tasks_path: TASKS_PATH,
		})) as any;
		expect(result).toMatchObject({ action: 'get-next-id' });
		expect(result.letter).toBe('C');
	});

	it('should add a new proposal and write it to file', async () => {
		const result = (await tool.execute({
			action: 'add',
			title: 'New Integration Feature',
			description: 'Add support for external integrations.',
			priority: 'alta',
			tasks_path: TASKS_PATH,
		})) as any;

		expect(result).toMatchObject({ action: 'add', success: true });
		expect(result.letter).toBe('C');

		const updatedContent = readFileSync(TASKS_PATH, 'utf-8');
		expect(updatedContent).toContain('New Integration Feature');
		expect(updatedContent).toContain(
			'Add support for external integrations.'
		);
	});

	it('should use default priority media when none specified', async () => {
		await tool.execute({
			action: 'add',
			title: 'Default Priority Test',
			description: 'Testing default priority.',
			tasks_path: TASKS_PATH,
		});

		const updatedContent = readFileSync(TASKS_PATH, 'utf-8');
		expect(updatedContent).toContain('🟡 Media');
	});

	it('should fail when title is missing for add action', async () => {
		const result = (await tool.execute({
			action: 'add',
			tasks_path: TASKS_PATH,
		})) as any;
		expect(result).toMatchObject({ success: false });
		expect(result.error).toContain('title and description are required');
	});

	it('should fail with path traversal attempt', async () => {
		const result = await tool.execute({
			action: 'list',
			tasks_path: '/etc/passwd',
		});
		expect(result).toMatchObject({ success: false });
	});

	it('should return summary string for list action', async () => {
		const result = (await tool.execute({
			action: 'list',
			tasks_path: TASKS_PATH,
		})) as any;
		expect(typeof result.summary).toBe('string');
		expect(result.summary.length).toBeGreaterThan(0);
	});
});
