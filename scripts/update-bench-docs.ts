#!/usr/bin/env bun
/**
 * update-bench-docs.ts
 *
 * Runs comparison benchmarks and auto-updates the `scenarios` array in
 * benchmark-chart.constants.ts with real measurements.
 *
 * Agnostic design:
 *  - Discovers participating libs from bench output (no hardcoded lists)
 *  - Matches bench numbers to existing scenarios via `benchNum` field
 *  - Creates new scenario entries (key = bench{N}) for unknown benches
 *  - Adds i18n stubs in en.ts / es.ts for newly created scenarios
 *  - Never touches `libraries`, `featureRows`, or anything outside `scenarios`
 *
 * Usage: bun run bench:update
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, '..');
const BENCHMARKS_DIR = resolve(ROOT, 'tests/performance/benchmarks');
const REGISTRY_PATH = resolve(BENCHMARKS_DIR, 'registry.ts');
const CONSTANTS_PATH = resolve(
	ROOT,
	'docs-vitepress/.vitepress/components/BenchmarkChart/benchmark-chart.constants.ts'
);
const I18N_EN_PATH = resolve(ROOT, 'docs-vitepress/.vitepress/i18n/en.ts');
const I18N_ES_PATH = resolve(ROOT, 'docs-vitepress/.vitepress/i18n/es.ts');

// ─── Types ────────────────────────────────────────────────────────────────────

interface IScenario {
	key: string;
	benchNum: number;
	appTypes: string[];
	values: Record<string, number | null>;
}

interface IBenchReading {
	benchNum: number;
	/** Canonical lib name (after normalization) */
	libName: string;
	value: number;
}

// ─── Lib-name normalization ───────────────────────────────────────────────────
// Maps lowercase raw names from bench output -> canonical keys used in constants.
// Only needed when the bench output name differs structurally from the canonical.
const LIB_RENAMES: Record<string, string> = {
	'plain json': 'Plain JS',
	'plain js': 'Plain JS',
};

/** Suffixes appended by some benches that don't change the lib identity */
const STRIP_SUFFIXES = [' (baseline)', ' @qrule', ' mock'];

function canonicalize(raw: string): string {
	let name = raw.trim();
	const lower = name.toLowerCase();
	for (const sfx of STRIP_SUFFIXES) {
		if (lower.endsWith(sfx)) {
			name = name.slice(0, -sfx.length).trim();
			break;
		}
	}
	return LIB_RENAMES[name.toLowerCase()] ?? name;
}

// ─── Bench output parsing ─────────────────────────────────────────────────────

function parseBenchOutput(output: string): IBenchReading[] {
	// Matches: [BENCH #N] LibName: 1,234 ops/sec  OR  cycles/sec
	const LINE_RE =
		/\[BENCH #(\d+)\]\s+([^:\n]+?):\s+([\d,]+)\s+(?:ops|cycles)\/sec/g;
	// Deduplicate: keep last occurrence per (benchNum, libName) - last = warmest JIT
	const seen = new Map<string, IBenchReading>();
	let match: RegExpExecArray | null;
	while ((match = LINE_RE.exec(output)) !== null) {
		const benchNum = parseInt(match[1]!, 10);
		const libName = canonicalize(match[2]!);
		const value = parseInt(match[3]!.replace(/,/g, ''), 10);
		seen.set(`${benchNum}|${libName}`, { benchNum, libName, value });
	}
	return Array.from(seen.values());
}

// ─── Test-file describe-block parsing ────────────────────────────────────────

function parseBenchDescriptions(testSource: string): Map<number, string> {
	const map = new Map<number, string>();
	const MARKER = 'Benchmark #';
	let pos = 0;
	while ((pos = testSource.indexOf(MARKER, pos)) !== -1) {
		const rest = testSource.slice(pos + MARKER.length);
		const numEnd = rest.search(/\D/);
		if (numEnd <= 0) {
			pos++;
			continue;
		}
		const num = parseInt(rest.slice(0, numEnd), 10);
		if (!map.has(num)) {
			// Try to grab a short description after an optional em-dash or hyphen
			const afterNum = rest.slice(numEnd).trimStart();
			const dashIdx = afterNum.search(/[-\u2014]/);
			const rawDesc =
				dashIdx >= 0 ? afterNum.slice(dashIdx + 1).trimStart() : '';
			// Stop at the closing quote/backtick (first occurrence)
			const quoteIdx = rawDesc.search(/['"` ]/);
			const desc =
				quoteIdx > 0
					? rawDesc.slice(0, quoteIdx).trim()
					: `Benchmark ${num}`;
			map.set(num, desc || `Benchmark ${num}`);
		}
		pos += MARKER.length;
	}
	return map;
}

// ─── Key derivation for new scenarios ────────────────────────────────────────

/** Falls back to bench{N} - developer can rename later; benchNum ensures future updates work */
function deriveKey(benchNum: number): string {
	return `bench${benchNum}`;
}

// ─── Number formatting ────────────────────────────────────────────────────────

function fmt(num: number): string {
	const str = num.toString();
	const parts: string[] = [];
	let count = 0;
	for (let pos = str.length - 1; pos >= 0; pos--) {
		if (count > 0 && count % 3 === 0) parts.unshift('_');
		parts.unshift(str[pos]!);
		count++;
	}
	return parts.join('');
}

// ─── Scenario serialization ──────────────────────────────────────────────────

function serializeDefFile(scn: IScenario): string {
	const lines: string[] = [
		"import type { IBenchScenario } from '../bench.types';",
		'',
		'export const scenario: IBenchScenario = {',
		`\tkey: '${scn.key}',`,
		`\tbenchNum: ${scn.benchNum},`,
		`\tappTypes: [${scn.appTypes.map((apt) => `'${apt}'`).join(', ')}],`,
		'\tvalues: {',
	];
	const nonNull = Object.entries(scn.values).filter(
		([, val]) => val !== null
	);
	const nullPad = Object.entries(scn.values).filter(
		([, val]) => val === null
	);
	for (const [lib, val] of [...nonNull, ...nullPad]) {
		const needsQuotes = /[^a-zA-Z0-9$_]/.test(lib);
		const keyStr = needsQuotes ? `'${lib}'` : lib;
		const valStr = val === null ? 'null' : fmt(val);
		lines.push(`\t\t${keyStr}: ${valStr},`);
	}
	lines.push('\t},');
	lines.push('};');
	lines.push('');
	return lines.join('\n');
}

function writeDefFile(scn: IScenario): void {
	const dir = resolve(BENCHMARKS_DIR, scn.key);
	const file = resolve(dir, `${scn.key}.def.ts`);
	mkdirSync(dir, { recursive: true });
	writeFileSync(file, serializeDefFile(scn), 'utf-8');
}

function addToRegistry(scn: IScenario): void {
	let source = readFileSync(REGISTRY_PATH, 'utf-8');

	// Add import after the last existing def import line
	const importRe = /^import \{ scenario as \w+Def \} from '\.\/.+\.def';/gm;
	const allImports = [...source.matchAll(importRe)];
	if (allImports.length > 0) {
		const lastImport = allImports[allImports.length - 1]!;
		const newImport = `import { scenario as ${scn.key}Def } from './${scn.key}/${scn.key}.def';`;
		if (!source.includes(newImport)) {
			const insertAt = lastImport.index + lastImport[0].length;
			source =
				source.slice(0, insertAt) +
				'\n' +
				newImport +
				source.slice(insertAt);
		}
	}
	const rawEnd = source.lastIndexOf('];');
	if (rawEnd !== -1 && !source.includes(`${scn.key}Def,`)) {
		source =
			source.slice(0, rawEnd) +
			`\t${scn.key}Def,\n` +
			source.slice(rawEnd);
	}

	writeFileSync(REGISTRY_PATH, source, 'utf-8');
}

// ─── i18n stub insertion ──────────────────────────────────────────────────────

function addI18nStub(filepath: string, key: string, label: string): void {
	const source = readFileSync(filepath, 'utf-8');
	const scenIdx = source.indexOf('scenarios: {');
	if (scenIdx === -1) return;
	// Key already present in scenarios block? Search up to the end of the block.
	const PATTERN = '\t\t},\n\n\t\t// ─── Library';
	const blockEnd = source.indexOf(PATTERN, scenIdx);
	const chunk =
		blockEnd !== -1
			? source.slice(scenIdx, blockEnd)
			: source.slice(scenIdx);
	if (
		chunk.includes(`\n\t\t\t${key}:`) ||
		chunk.includes(`\n\t\t\t\t${key}:`)
	)
		return;

	// Find insertion point: just before \t\t},\n\n\t\t// --- Library
	const insertAt = blockEnd;
	if (insertAt === -1) {
		console.warn(
			`  ⚠️  Cannot place i18n stub for "${key}" in ${filepath.split('/').pop()}`
		);
		return;
	}

	const stub =
		`\t\t\t${key}: {\n` +
		`\t\t\t\tlabel: '${label}',\n` +
		`\t\t\t\tnotes: 'Auto-generated — update label and notes.',\n` +
		`\t\t\t},\n`;
	writeFileSync(
		filepath,
		source.slice(0, insertAt) + stub + source.slice(insertAt),
		'utf-8'
	);
	console.log(
		`  📝 Added i18n stub "${key}" in ${filepath.split('/').pop()}`
	);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log('🔬 Running comparison benchmarks...\n');

	const proc = Bun.spawn(
		[
			'bun',
			'--expose-gc',
			'test',
			'tests/performance/comparison-benchmarks.test.ts',
		],
		{ cwd: ROOT, stdout: 'pipe', stderr: 'pipe' }
	);

	const [stdout, stderr] = await Promise.all([
		new Response(proc.stdout).text(),
		new Response(proc.stderr).text(),
	]);
	await proc.exited;

	const raw = stdout + stderr;

	// Show bench lines for visibility
	for (const line of raw
		.split('\n')
		.filter((lin) => lin.startsWith('[BENCH'))) {
		console.log(line);
	}

	const readings = parseBenchOutput(raw);
	if (readings.length === 0) {
		console.error('\n❌ No benchmark readings found. Aborting.');
		process.exit(1);
	}

	// Group readings by benchNum
	const byBench = new Map<number, IBenchReading[]>();
	for (const rdg of readings) {
		const grp = byBench.get(rdg.benchNum) ?? [];
		grp.push(rdg);
		byBench.set(rdg.benchNum, grp);
	}

	// Parse bench descriptions from all .bench.ts files (for key derivation on new benches)
	const testSource = readdirSync(BENCHMARKS_DIR, { recursive: true })
		.filter(
			(entry) => typeof entry === 'string' && entry.endsWith('.bench.ts')
		)
		.map((entry) =>
			readFileSync(resolve(BENCHMARKS_DIR, entry as string), 'utf-8')
		)
		.join('\n');
	const descriptions = parseBenchDescriptions(testSource);

	// Load current scenarios via dynamic import (Bun handles TS natively)
	const mod = await import(CONSTANTS_PATH);
	const currentScenarios: IScenario[] = (mod.scenarios as IScenario[]).map(
		(scn) => ({
			...scn,
			values: { ...scn.values },
		})
	);

	// Build benchNum -> scenario-index lookup (multiple scenarios can share same benchNum)
	const benchToIdx = new Map<number, number[]>();
	for (let idx = 0; idx < currentScenarios.length; idx++) {
		const benchNum = currentScenarios[idx]!.benchNum;
		const lst = benchToIdx.get(benchNum) ?? [];
		lst.push(idx);
		benchToIdx.set(benchNum, lst);
	}

	// Collect every lib name ever seen (for null-padding)
	const globalLibs = new Set<string>();
	for (const scn of currentScenarios) {
		for (const lib of Object.keys(scn.values)) globalLibs.add(lib);
	}
	for (const rdgs of byBench.values()) {
		for (const rdg of rdgs) globalLibs.add(rdg.libName);
	}

	const updated = [...currentScenarios];
	const log: string[] = [];

	for (const [benchNum, rdgs] of byBench.entries()) {
		const indices = benchToIdx.get(benchNum);

		if (indices && indices.length > 0) {
			// Update existing scenario(s)
			for (const idx of indices) {
				const scn = updated[idx]!;
				const changed: string[] = [];
				for (const { libName, value } of rdgs) {
					scn.values[libName] = value;
					changed.push(libName);
				}
				log.push(
					`  ✅ '${scn.key}' (BENCH #${benchNum}) — updated: ${changed.join(', ')}`
				);
			}
		} else {
			// New benchmark -> create scenario + .def.ts + add to registry automatically
			const key = deriveKey(benchNum);
			const desc = descriptions.get(benchNum) ?? `Benchmark ${benchNum}`;
			const values: Record<string, number | null> = {};
			for (const { libName, value } of rdgs) {
				values[libName] = value;
			}
			updated.push({ key, benchNum, appTypes: ['all'], values });
			log.push(
				`  🆕 '${key}' (BENCH #${benchNum}) — new scenario: "${desc}"`
			);
			addI18nStub(I18N_EN_PATH, key, `Benchmark #${benchNum}`);
			addI18nStub(I18N_ES_PATH, key, `Benchmark #${benchNum}`);
		}
	}

	// Pad all scenarios: every known lib must appear (null = N/A in chart)
	// Non-null (participating) libs first, then null ones
	for (const scn of updated) {
		for (const lib of globalLibs) {
			if (!(lib in scn.values)) scn.values[lib] = null;
		}
		const nonNull = Object.entries(scn.values).filter(
			([, val]) => val !== null
		);
		const nulls = Object.entries(scn.values).filter(
			([, val]) => val === null
		);
		scn.values = Object.fromEntries([...nonNull, ...nulls]);
	}

	// Write each scenario back to its individual .def.ts file
	let updatedCount = 0;
	const newScenarios: IScenario[] = [];
	for (const scn of updated) {
		const defPath = resolve(BENCHMARKS_DIR, scn.key, `${scn.key}.def.ts`);
		const isNew = !currentScenarios.some((cur) => cur.key === scn.key);
		writeDefFile(scn);
		if (isNew) {
			newScenarios.push(scn);
			addToRegistry(scn);
			log.push(
				`  📁 Created ${defPath.replace(ROOT + '/', '')} + added to registry.ts`
			);
		}
		updatedCount++;
	}

	console.log('\n📊 Update summary:');
	for (const line of log) console.log(line);
	console.log(
		`\n✅ ${updatedCount} .def.ts file${updatedCount !== 1 ? 's' : ''} updated${
			newScenarios.length > 0
				? ` (${newScenarios.length} new — add their .bench.ts files manually)`
				: ''
		}`
	);
}

main().catch((err: unknown) => {
	console.error('❌ Fatal:', err);
	process.exit(1);
});
