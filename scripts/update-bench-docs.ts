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

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Paths ────────────────────────────────────────────────────────────────────

const ROOT = resolve(import.meta.dir, '..');
const CONSTANTS_PATH = resolve(
	ROOT,
	'docs-vitepress/.vitepress/components/BenchmarkChart/benchmark-chart.constants.ts'
);
const TEST_PATH = resolve(
	ROOT,
	'tests/performance/comparison-benchmarks.test.ts'
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

function serializeScenarios(scens: IScenario[]): string {
	const lines: string[] = ['export const scenarios: IBenchScenario[] = ['];
	for (const scn of scens) {
		lines.push('\t{');
		lines.push(`\t\tkey: '${scn.key}',`);
		lines.push(`\t\tbenchNum: ${scn.benchNum},`);
		lines.push(
			`\t\tappTypes: [${scn.appTypes.map((apt) => `'${apt}'`).join(', ')}],`
		);
		lines.push('\t\tvalues: {');
		for (const [lib, val] of Object.entries(scn.values)) {
			const needsQuotes = /[^a-zA-Z0-9$_]/.test(lib);
			const keyStr = needsQuotes ? `'${lib}'` : lib;
			const valStr = val === null ? 'null' : fmt(val);
			lines.push(`\t\t\t${keyStr}: ${valStr},`);
		}
		lines.push('\t\t},');
		lines.push('\t},');
	}
	lines.push('];');
	return lines.join('\n');
}

// ─── Replace only scenarios block in constants file ──────────────────────────

function replaceScenarios(source: string, newBlock: string): string {
	const OPEN = 'export const scenarios: IBenchScenario[] = [';
	const start = source.indexOf(OPEN);
	if (start === -1)
		throw new Error('Cannot find scenarios block in constants file');

	// Start bracket counting from the array literal '[', NOT from 'export const'
	// (to avoid counting the '[' inside 'IBenchScenario[]' as depth=1)
	const arrayStart = start + OPEN.length - 1; // index of the '[' that opens the array

	let depth = 0;
	let inStr = false;
	let strCh = '';
	let end = -1;

	for (let idx = arrayStart; idx < source.length; idx++) {
		const chr = source[idx]!;
		if (inStr) {
			if (chr === strCh && source[idx - 1] !== '\\') inStr = false;
			continue;
		}
		if (chr === '"' || chr === "'" || chr === '`') {
			inStr = true;
			strCh = chr;
			continue;
		}
		if (chr === '[') depth++;
		if (chr === ']') {
			depth--;
			if (depth === 0) {
				end = source[idx + 1] === ';' ? idx + 2 : idx + 1;
				break;
			}
		}
	}

	if (end === -1) throw new Error('Cannot find end of scenarios block');
	return source.slice(0, start) + newBlock + source.slice(end);
}

// ─── i18n stub insertion ──────────────────────────────────────────────────────

function addI18nStub(filepath: string, key: string, label: string): void {
	const source = readFileSync(filepath, 'utf-8');
	const scenIdx = source.indexOf('scenarios: {');
	if (scenIdx === -1) return;
	// Key already present in scenarios block? Check with literal string match.
	const chunk = source.slice(scenIdx, scenIdx + 4000);
	if (
		chunk.includes(`\n\t\t\t${key}:`) ||
		chunk.includes(`\n\t\t\t\t${key}:`)
	)
		return;

	// Find insertion point: just before \t\t},\n\n\t\t// --- Library
	const PATTERN = '\t\t},\n\n\t\t// ─── Library';
	const insertAt = source.indexOf(PATTERN, scenIdx);
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

	// Parse bench descriptions from test file (for key derivation on new benches)
	const testSource = readFileSync(TEST_PATH, 'utf-8');
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
			// New benchmark -> create scenario automatically
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

	// Sort scenarios by benchNum
	updated.sort((asc, bsc) => asc.benchNum - bsc.benchNum);

	// Write only the scenarios block back to constants (rest is untouched)
	const constantsSource = readFileSync(CONSTANTS_PATH, 'utf-8');
	const newConstants = replaceScenarios(
		constantsSource,
		serializeScenarios(updated)
	);
	writeFileSync(CONSTANTS_PATH, newConstants, 'utf-8');

	console.log('\n📊 Update summary:');
	for (const line of log) console.log(line);
	console.log(
		`\n✅ benchmark-chart.constants.ts updated (${updated.length} scenarios)`
	);
}

main().catch((err: unknown) => {
	console.error('❌ Fatal:', err);
	process.exit(1);
});
