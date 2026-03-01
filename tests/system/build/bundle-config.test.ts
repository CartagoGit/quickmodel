/**
 * TDD: Bundle configuration integrity
 *
 * Verifica que las dependencias usadas en tiempo de runtime (CLI binario,
 * servidor MCP) están clasificadas correctamente en `package.json` y que
 * `tsup.config.ts` las externaliza de forma explícita.
 *
 * Reglas que valida este test:
 * 1. `@modelcontextprotocol/sdk` → debe estar en `optionalDependencies` (no dependencies
 *    ni devDependencies) porque solo lo necesitan los usuarios del CLI/MCP.
 * 2. `@modelcontextprotocol/sdk` → debe estar en la lista `external` de tsup para
 *    que no se incruste en el shared chunk que afecta a todos los entry points.
 * 3. `@faker-js/faker` → correctamente en `optionalDependencies`, no en dependencies
 *    ni devDependencies.
 * 4. El campo `sideEffects` debe ser un array listando los archivos con efectos
 *    secundarios reales (registros de schemas/mocks), no `false`.
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
	test('@modelcontextprotocol/sdk must be in optionalDependencies (not dependencies or devDependencies)', () => {
		const pkg = readPkg();
		const deps = (pkg['dependencies'] as Record<string, string>) ?? {};
		const devDeps =
			(pkg['devDependencies'] as Record<string, string>) ?? {};
		const optDeps =
			(pkg['optionalDependencies'] as Record<string, string>) ?? {};

		expect(
			optDeps['@modelcontextprotocol/sdk'],
			'@modelcontextprotocol/sdk should be in optionalDependencies (optional CLI/MCP dep)'
		).toBeDefined();

		expect(
			deps['@modelcontextprotocol/sdk'],
			'@modelcontextprotocol/sdk should NOT be in dependencies'
		).toBeUndefined();

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

	test('package.json sideEffects must be an array listing side-effect files', () => {
		const pkg = readPkg();
		const sideEffects = pkg['sideEffects'];

		expect(
			Array.isArray(sideEffects),
			'sideEffects should be an array (not false)'
		).toBe(true);

		const arr = sideEffects as string[];
		expect(
			arr.some((entry) => entry.includes('index')),
			'sideEffects should include dist/index.*'
		).toBe(true);
		expect(
			arr.some((entry) => entry.includes('schema')),
			'sideEffects should include dist/schema.*'
		).toBe(true);
		expect(
			arr.some((entry) => entry.includes('mock')),
			'sideEffects should include dist/mock.*'
		).toBe(true);
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
