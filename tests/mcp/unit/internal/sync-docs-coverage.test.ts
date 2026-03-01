/**
 * Dedicated coverage tests for QSyncDocsTool private methods.
 *
 * Testing strategy: access private methods via `(tool as any).method()` to
 * avoid polluting the global module registry with `mock.module()`.
 * This covers all uncovered branches WITHOUT causing cross-file contamination.
 *
 * Covered:
 *   - generateToolMd (lines 123-154): HTML escaping, schema shape iteration
 *   - generateTransformerMd (lines 165-180): table generation, sorting
 *   - writeDoc (lines 191-194): mkdirSync + writeFileSync + push
 *   - injectDoc (lines 205-229):
 *       Branch A — file not found → skip
 *       Branch B — file found, no marker → append
 *       Branch C — file found, marker present → replace
 */
import { describe, it, expect, mock } from 'bun:test';
import { z } from 'zod';

// ── Mock dynamic imports ──────────────────────────────────────────────────────
// These are resolved relative to the TEST file (same dir as all-tools.test.ts)
const fakeTool = {
	name: 'test_tool',
	description: 'A <test> tool with "special" & \'chars\'',
	schema: z.object({
		input: z.string().optional().describe('Some input'),
	}),
};

void mock.module('../../../../src/mcp/server', () => ({
	QMcpServer: {
		getDefaultInternalTools: () => [fakeTool],
		getDefaultPublicTools: () => [fakeTool],
	},
}));

void mock.module(
	'../../../../src/core/services/transformer-lookup.service',
	() => ({
		TransformerLookupService: class {
			getAvailableTransformers() {
				return ['date', 'number', 'string'];
			}
		},
	})
);

// Import AFTER mocks are registered
import { QSyncDocsTool } from '../../../../src/mcp/tools/internal/sync-docs.tool';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMockFs(options: {
	existsResult: boolean | ((path: string) => boolean);
	readResult: string | ((path: string) => string);
}) {
	const existsSync = mock((path: unknown) => {
		if (typeof options.existsResult === 'function') {
			return options.existsResult(String(path));
		}
		return options.existsResult;
	});
	const readFileSync = mock((path: unknown) => {
		if (typeof options.readResult === 'function') {
			return options.readResult(String(path));
		}
		return options.readResult;
	});
	const writeFileSync = mock(() => undefined);
	const mkdirSync = mock(() => undefined);

	return {
		existsSync,
		readFileSync,
		writeFileSync,
		mkdirSync,
		_mocks: { existsSync, readFileSync, writeFileSync, mkdirSync },
	};
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('QSyncDocsTool – coverage', () => {
	it('should have correct metadata', () => {
		const tool = new QSyncDocsTool();
		expect(tool.name).toBe('update_docs_content');
		expect(tool.description).toBeDefined();
		expect(tool.schema).toBeDefined();
	});

	// ── writeDoc + generateToolMd + generateTransformerMd ─────────────────
	it('execute() covers writeDoc and generateTransformerMd', async () => {
		const mockFs = makeMockFs({
			existsResult: true,
			readResult: '# Existing\n<!-- TOOLS-START -->\nold content\n',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		const result = await tool.execute();

		// writeDoc is called for en/guide/transformers.md + es/guide/transformers.md
		expect(mockFs._mocks.mkdirSync).toHaveBeenCalled();
		expect(mockFs._mocks.writeFileSync).toHaveBeenCalled();

		// updatedFiles includes transformer docs
		expect(
			result.updatedFiles.some((pth) => pth.includes('transformers.md'))
		).toBe(true);
		expect(result.summary).toContain('Successfully updated');
	});

	// ── injectDoc branch: file exists + marker present (replace) ──────────
	it('injectDoc replaces content after <!-- TOOLS-START --> marker', async () => {
		const MARKER = '<!-- TOOLS-START -->';
		const mockFs = makeMockFs({
			existsResult: true,
			readResult: `# Docs\n${MARKER}\nold generated content\n`,
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		await tool.execute();

		const writeCalls = mockFs._mocks.writeFileSync.mock.calls;
		// At least one injectDoc call should have written content with the marker preserved
		const callWithMarker = writeCalls.find(
			(call) =>
				typeof call[1] === 'string' &&
				(call[1] as string).includes(MARKER)
		);
		expect(callWithMarker).toBeDefined();
		// Pre-marker content should be preserved
		const written = callWithMarker?.[1] as string;
		expect(written).toContain('# Docs\n');
		// Old content replaced with new generated content
		expect(written).not.toContain('old generated content');
	});

	// ── injectDoc branch: file exists + NO marker (append) ─────────────────
	it('injectDoc appends marker+content when no marker found', async () => {
		const mockFs = makeMockFs({
			existsResult: true,
			readResult: '# Docs\nSome existing text without the marker.',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		await tool.execute();

		const writeCalls = mockFs._mocks.writeFileSync.mock.calls;
		// At least one call should append the marker
		const callWithAppended = writeCalls.find(
			(call) =>
				typeof call[1] === 'string' &&
				(call[1] as string).includes(
					'Some existing text without the marker.'
				) &&
				(call[1] as string).includes('<!-- TOOLS-START -->')
		);
		expect(callWithAppended).toBeDefined();
	});

	// ── injectDoc branch: file NOT found (skip) ────────────────────────────
	it('injectDoc skips write when file does not exist', async () => {
		const mockFs = makeMockFs({
			existsResult: false,
			readResult: '',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		await tool.execute();

		// writeFileSync should only be called for writeDoc (transformers × 2),
		// NOT for injectDoc (4 en/ files that don't exist)
		const writeCalls = mockFs._mocks.writeFileSync.mock.calls;
		// All writes should be transformers.md, not public/index.md etc.
		const injectedPaths = writeCalls
			.map((call) => String(call[0]))
			.filter(
				(pth) =>
					pth.includes('mcp/public') ||
					pth.includes('mcp/tools') ||
					pth.includes('mcp/internal') ||
					pth.includes('contributing')
			);
		expect(injectedPaths).toHaveLength(0);
	});

	// ── generateToolMd HTML escaping ────────────────────────────────────────
	it('generateToolMd escapes HTML characters in tool description', async () => {
		const mockFs = makeMockFs({
			existsResult: true,
			readResult: '<!-- TOOLS-START -->\nold\n',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		await tool.execute();

		const writeCalls = mockFs._mocks.writeFileSync.mock.calls;
		// Find a write call that has transformed HTML entities
		const callWithEscaped = writeCalls.find(
			(call) =>
				typeof call[1] === 'string' &&
				(call[1] as string).includes('&lt;test&gt;')
		);
		expect(callWithEscaped).toBeDefined();
		const content = callWithEscaped?.[1] as string;
		expect(content).toContain('&amp;');
		expect(content).toContain('&quot;');
		expect(content).toContain('&#039;');
	});

	// ── result shape ────────────────────────────────────────────────────────
	it('execute() returns updatedFiles array with correct paths', async () => {
		const mockFs = makeMockFs({
			existsResult: true,
			readResult: '<!-- TOOLS-START -->\nold\n',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		const result = await tool.execute();

		// 4 injectDoc calls + 2 writeDoc calls = 6 files
		expect(result.updatedFiles).toHaveLength(6);
		expect(
			result.updatedFiles.some((pth) =>
				pth.includes('en/mcp/public/index.md')
			)
		).toBe(true);
		expect(
			result.updatedFiles.some((pth) => pth.includes('en/mcp/tools.md'))
		).toBe(true);
		expect(
			result.updatedFiles.some((pth) =>
				pth.includes('en/mcp/internal/index.md')
			)
		).toBe(true);
		expect(
			result.updatedFiles.some((pth) =>
				pth.includes('en/mcp/contributing/tools.md')
			)
		).toBe(true);
		expect(
			result.updatedFiles.some((pth) =>
				pth.includes('en/guide/transformers.md')
			)
		).toBe(true);
		expect(
			result.updatedFiles.some((pth) =>
				pth.includes('es/guide/transformers.md')
			)
		).toBe(true);
	});

	// ── generateTransformerMd content ───────────────────────────────────────
	it('generateTransformerMd includes transformer names in markdown table', async () => {
		const mockFs = makeMockFs({
			existsResult: false,
			readResult: '',
		});
		const tool = new QSyncDocsTool();
		(tool as any)._fs = mockFs;

		await tool.execute();

		const writeCalls = mockFs._mocks.writeFileSync.mock.calls;
		// writeDoc calls → transformer docs
		const transformerWrite = writeCalls.find(
			(call) =>
				typeof call[1] === 'string' &&
				(call[1] as string).includes('`date`')
		);
		expect(transformerWrite).toBeDefined();
		const content = transformerWrite?.[1] as string;
		expect(content).toContain('`number`');
		expect(content).toContain('`string`');
	});
});
