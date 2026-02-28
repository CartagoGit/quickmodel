/**
 * TDD Tests: QApiReferenceResource
 *
 * RED phase — QApiReferenceResource does not exist yet.
 * @quickmodel-rule-ignore: prefer-quick — @QType() appears only as mock data string (decorator name), not as a decorator usage.
 */
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { join } from 'path';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { QApiReferenceResource } from '../../../../src/mcp/resources/external/api-reference.resource';

const TMP = join(process.cwd(), 'tests', 'temp_api_reference_res');

const MOCK_MANIFEST = JSON.stringify({
	version: '1.2.3',
	generatedAt: '2026-01-01T00:00:00.000Z',
	publicExports: ['QModel', 'Quick', 'QConfig'],
	transformers: ['date', 'bigint', 'regexp'],
	decorators: ['@Quick()', '@QType()', '@QRule()'],
	migrationNotes: 'No breaking changes.',
});

describe('QApiReferenceResource — metadata', () => {
	it('uri is quickmodel://api/reference', () => {
		const res = new QApiReferenceResource(TMP);
		expect(res.uri).toBe('quickmodel://api/reference');
	});

	it('name is quickmodel-api-reference', () => {
		const res = new QApiReferenceResource(TMP);
		expect(res.name).toBe('quickmodel-api-reference');
	});

	it('mimeType is application/json', () => {
		const res = new QApiReferenceResource(TMP);
		expect(res.mimeType).toBe('application/json');
	});

	it('description is a non-empty string', () => {
		const res = new QApiReferenceResource(TMP);
		expect(typeof res.description).toBe('string');
		expect(res.description.length).toBeGreaterThan(10);
	});
});

describe('QApiReferenceResource — read() with manifest', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		writeFileSync(join(TMP, 'api-manifest.json'), MOCK_MANIFEST);
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns the manifest content as JSON', async () => {
		const res = new QApiReferenceResource(TMP);
		const content = await res.read();
		const parsed = JSON.parse(content) as Record<string, unknown>;
		expect(parsed['version']).toBe('1.2.3');
	});

	it('publicExports from manifest are present', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const exports = parsed['publicExports'] as string[];
		expect(exports).toContain('QModel');
		expect(exports).toContain('Quick');
	});

	it('transformers from manifest are present', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const transformers = parsed['transformers'] as string[];
		expect(transformers).toContain('date');
		expect(transformers).toContain('bigint');
	});

	it('decorators from manifest are present', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		const decorators = parsed['decorators'] as string[];
		expect(decorators).toContain('@Quick()');
	});

	it('migrationNotes from manifest are present', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['migrationNotes']).toBe('No breaking changes.');
	});
});

describe('QApiReferenceResource — read() without manifest', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns valid JSON even when manifest is missing', async () => {
		const res = new QApiReferenceResource(TMP);
		const content = await res.read();
		expect(() => JSON.parse(content)).not.toThrow();
	});

	it('fallback includes an error field', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['error']).toBeDefined();
		expect(typeof parsed['error']).toBe('string');
	});

	it('fallback includes a suggestion field', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['suggestion']).toBeDefined();
		expect(typeof parsed['suggestion']).toBe('string');
	});
});

describe('QApiReferenceResource — read() with malformed manifest', () => {
	beforeEach(() => {
		rmSync(TMP, { recursive: true, force: true });
		mkdirSync(TMP, { recursive: true });
		writeFileSync(join(TMP, 'api-manifest.json'), '{ invalid json {{{{');
	});

	afterEach(() => {
		rmSync(TMP, { recursive: true, force: true });
	});

	it('returns valid JSON even when manifest is malformed', async () => {
		const res = new QApiReferenceResource(TMP);
		const content = await res.read();
		expect(() => JSON.parse(content)).not.toThrow();
	});

	it('fallback includes an error field on parse failure', async () => {
		const res = new QApiReferenceResource(TMP);
		const parsed = JSON.parse(await res.read()) as Record<string, unknown>;
		expect(parsed['error']).toBeDefined();
	});
});
