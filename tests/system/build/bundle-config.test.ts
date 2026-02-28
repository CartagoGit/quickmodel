/**
 * TDD: Bundle configuration integrity
 *
 * Verifica que las dependencias usadas en tiempo de runtime (CLI binario,
 * servidor MCP) están clasificadas correctamente en `package.json` y que
 * `tsup.config.ts` las externaliza de forma explícita.
 *
 * Reglas que valida este test:
 * 1. `@modelcontextprotocol/sdk` → debe estar en `dependencies` (no devDependencies)
 *    porque el binario `dist/cli.js` lo necesita en runtime des de cualquier máquina.
 * 2. `@modelcontextprotocol/sdk` → debe estar en la lista `external` de tsup para
 *    que no se incruste en el shared chunk que afecta a todos los entry points.
 * 3. `@faker-js/faker` → correctamente en `optionalDependencies`, no en dependencies
 *    ni devDependencies.
 * 4. El campo `sideEffects: false` debe mantenerse para tree-shaking.
 */

import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '../../../');

// ── Helpers ──────────────────────────────────────────────────────────────────

function readPkg(): Record<string, unknown> {
	return JSON.parse(
		readFileSync(resolve(ROOT, 'package.json'), 'utf-8')
	) as Record<string, unknown>;
}

function readTsupSource(): string {
	return readFileSync(resolve(ROOT, 'tsup.config.ts'), 'utf-8');
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Bundle configuration integrity', () => {
	test('@modelcontextprotocol/sdk must be in dependencies (not devDependencies)', () => {
		const pkg = readPkg();
		const deps = (pkg['dependencies'] as Record<string, string>) ?? {};
		const devDeps =
			(pkg['devDependencies'] as Record<string, string>) ?? {};

		expect(
			deps['@modelcontextprotocol/sdk'],
			'@modelcontextprotocol/sdk should be in dependencies (CLI runtime dep)'
		).toBeDefined();

		expect(
			devDeps['@modelcontextprotocol/sdk'],
			'@modelcontextprotocol/sdk should NOT be in devDependencies'
		).toBeUndefined();
	});

	test('@modelcontextprotocol/sdk must be listed in tsup external array', () => {
		const src = readTsupSource();

		// Busca el array external: [...] en tsup.config.ts
		expect(
			src,
			'tsup.config.ts external should include @modelcontextprotocol/sdk'
		).toContain('@modelcontextprotocol/sdk');
	});

	test('@faker-js/faker must remain in optionalDependencies (not devDependencies)', () => {
		const pkg = readPkg();
		const optDeps =
			(pkg['optionalDependencies'] as Record<string, string>) ?? {};
		const devDeps =
			(pkg['devDependencies'] as Record<string, string>) ?? {};

		expect(
			optDeps['@faker-js/faker'],
			'@faker-js/faker should be in optionalDependencies'
		).toBeDefined();

		expect(
			devDeps['@faker-js/faker'],
			'@faker-js/faker should NOT be in devDependencies'
		).toBeUndefined();
	});

	test('package.json sideEffects must be false for tree-shaking', () => {
		const pkg = readPkg();
		expect(pkg['sideEffects']).toBe(false);
	});

	test('tsup external must include reflect-metadata', () => {
		const src = readTsupSource();
		expect(src).toContain('reflect-metadata');
	});

	test('tsup config must enable splitting for shared chunk optimization', () => {
		const src = readTsupSource();
		expect(src).toContain('splitting: true');
	});

	test('tsup config must enable treeshake with smallest preset', () => {
		const src = readTsupSource();
		expect(src).toContain("preset: 'smallest'");
	});
});
