/**
 * Script: generate-api-manifest.ts
 *
 * Generates `api-manifest.json` at the project root for use by
 * `QApiReferenceResource` in external MCP consumer projects.
 *
 * Run via: `bun run scripts/generate-api-manifest.ts`
 * Hooked into: `build` script (runs after tsup compilation)
 *
 * @see {@link QApiReferenceResource} — reads this file at runtime
 * @see {@link IApiManifest} — TypeScript type that matches the output shape
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();

function readVersion(): string {
	try {
		const raw = readFileSync(join(ROOT, 'package.json'), 'utf-8');
		const pkg = JSON.parse(raw) as Record<string, unknown>;
		return typeof pkg['version'] === 'string' ? pkg['version'] : '0.0.0';
	} catch {
		return '0.0.0';
	}
}

function extractPublicExports(): string[] {
	try {
		const content = readFileSync(join(ROOT, 'src', 'index.ts'), 'utf-8');
		const collected: string[] = [];
		const pattern = /export\s+(?:type\s+)?{([^}]+)}/g;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(content)) !== null) {
			const block = match[1];
			if (!block) continue;
			for (const entry of block.split(',')) {
				const name = entry.trim().split(/\s+/).at(0)?.trim();
				if (name && name.length > 0) collected.push(name);
			}
		}
		return [...new Set(collected)];
	} catch {
		return [];
	}
}

function extractTransformerKeys(): string[] {
	try {
		const transformerDir = join(ROOT, 'src', 'transformers');
		return readdirSync(transformerDir)
			.filter((file) => file.endsWith('.transformer.ts'))
			.map((file) => file.replace('.transformer.ts', ''));
	} catch {
		return [];
	}
}

function extractDecorators(): string[] {
	// Known decorators — derived from src/core/decorators/ directory
	try {
		const decoratorsDir = join(ROOT, 'src', 'core', 'decorators');
		return readdirSync(decoratorsDir)
			.filter((file) => file.endsWith('.decorator.ts'))
			.map((file) => {
				const base = file.replace('.decorator.ts', '');
				// Convert kebab-case to PascalCase with @ prefix: qtype → @QType()
				const pascal = base
					.split('-')
					.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
					.join('');
				return `@${pascal}()`;
			});
	} catch {
		return [];
	}
}

function extractMigrationNotes(version: string): string {
	try {
		const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf-8');
		// Find the section for this version
		const versionPattern = new RegExp(
			`## \\[${version.replace(/\./g, '\\.')}\\][^\n]*\n([\\s\\S]*?)(?=\n## \\[|$)`,
			'm'
		);
		const versionMatch = versionPattern.exec(changelog);
		if (versionMatch?.[1]) {
			return versionMatch[1].trim().slice(0, 500); // cap at 500 chars
		}
		return '';
	} catch {
		return '';
	}
}

function main(): void {
	const version = readVersion();
	const manifest = {
		version,
		generatedAt: new Date().toISOString(),
		publicExports: extractPublicExports(),
		transformers: extractTransformerKeys(),
		decorators: extractDecorators(),
		migrationNotes: extractMigrationNotes(version),
	};

	const outPath = join(ROOT, 'api-manifest.json');
	writeFileSync(outPath, JSON.stringify(manifest, null, 2));
	console.log(`✓ api-manifest.json generated (version ${version})`);
	console.log(`  exports: ${manifest.publicExports.length}`);
	console.log(`  transformers: ${manifest.transformers.join(', ')}`);
	console.log(`  decorators: ${manifest.decorators.length}`);
}

main();
