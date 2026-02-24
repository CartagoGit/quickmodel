/**
 * @fileoverview Actualiza automáticamente los datos de benchmarks en la documentación.
 *
 * Ejecuta `bun run bench:compare`, captura el output y actualiza los valores
 * en `benchmark-chart.constants.ts` con los resultados reales de la máquina actual.
 *
 * Diseño:
 *   - Cada scenario en constants.ts declara su `benchNum` (qué BENCH # lo alimenta).
 *   - `RAW_TO_LIB_KEY` mapea el nombre tal como aparece en el test output → libKey.
 *   - `SCENARIO_BENCH_NUM` es el mapeo inverso: scenarioKey → benchNum.
 *   - Un mismo benchNum puede alimentar varios scenarios (p.ej. benchNum=8 actualiza
 *     tanto 'forms' como 'rules' automáticamente, sin tablas extra).
 *
 * Uso:
 *   bun run bench:update
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface IBenchEntry {
	benchNum: number;
	rawLibName: string;
	opsPerSec: number;
}

interface IScenarioUpdate {
	scenarioKey: string;
	libKey: string;
	value: number;
}

// ─────────────────────────────────────────────────────────────
// MAPEO: rawLibName (lowercase) → libKey canónico en constants.ts
//
// Cubre todos los nombres que aparecen en los logs de los tests:
//   "[BENCH #N] TypeBox: 1,500,000 ops/sec"  → libKey = "TypeBox"
// ─────────────────────────────────────────────────────────────

const RAW_TO_LIB_KEY: Record<string, string> = {
	typebox: 'TypeBox',
	arktype: 'arktype',
	valibot: 'valibot',
	zod: 'Zod',
	yup: 'yup',
	joi: 'joi',
	'plain js (baseline)': 'Plain JS',
	'plain json (baseline)': 'Plain JS',
	superjson: 'superjson',
	'class-transformer': 'class-transformer',
	'class-validator': 'class-validator',
	vest: 'vest',
	quickmodel: 'QuickModel',
	'quickmodel mock': 'QuickModel',
	'quickmodel @qrule': 'QuickModel',
};

// ─────────────────────────────────────────────────────────────
// SCENARIO → BENCH NUM
//
// Refleja el campo `benchNum` de cada IBenchScenario en constants.ts.
// Si se añade un scenario nuevo allí, añadir aquí también.
// Un mismo benchNum puede asignarse a varios scenarios (p.ej. 'forms'
// y 'rules' ambos usan BENCH #8).
// ─────────────────────────────────────────────────────────────

const SCENARIO_BENCH_NUM: Record<string, number> = {
	validation: 1,
	coercion: 2,
	serialization: 3,
	batch: 4,
	mocks: 5,
	forms: 8,
	rules: 8,
};

// ─────────────────────────────────────────────────────────────
// PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Extrae todas las mediciones del output del test.
 * Soporta "ops/sec" y "cycles/sec".
 *
 * Formatos capturados:
 *   [BENCH #1] TypeBox: 1,500,000 ops/sec | 0.67μs avg
 *   [BENCH #4] TypeBox: 1,500,000 cycles/sec
 */
function parseBenchOutput(rawOutput: string): IBenchEntry[] {
	const pattern =
		/\[BENCH #(\d+)\]\s+([^:\n]+?):\s+([\d,]+)\s+(?:ops|cycles)\/sec/g;
	const entries: IBenchEntry[] = [];
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(rawOutput)) !== null) {
		const benchNum = parseInt(match[1]!, 10);
		const rawLibName = match[2]!.trim().toLowerCase();
		const opsPerSec = parseInt(match[3]!.replace(/,/g, ''), 10);
		entries.push({ benchNum, rawLibName, opsPerSec });
	}

	return entries;
}

/**
 * Convierte las entradas de benchmark en actualizaciones de scenario+libKey.
 *
 * Un mismo benchNum actualiza todos los scenarios que lo declaren
 * (p.ej. benchNum=8 → 'forms' y 'rules').
 */
function mapEntriesToUpdates(entries: IBenchEntry[]): IScenarioUpdate[] {
	// Índice inverso: benchNum → lista de scenarioKeys que lo usan
	const benchToScenarios = new Map<number, string[]>();
	for (const [scenarioKey, benchNum] of Object.entries(SCENARIO_BENCH_NUM)) {
		const list = benchToScenarios.get(benchNum) ?? [];
		list.push(scenarioKey);
		benchToScenarios.set(benchNum, list);
	}

	const updates: IScenarioUpdate[] = [];

	for (const entry of entries) {
		const libKey = RAW_TO_LIB_KEY[entry.rawLibName];
		if (!libKey) {
			console.warn(
				`  [SKIP] Sin mapeo para: [BENCH #${entry.benchNum}] "${entry.rawLibName}"`
			);
			continue;
		}

		const scenarioKeys = benchToScenarios.get(entry.benchNum);
		if (!scenarioKeys || scenarioKeys.length === 0) {
			// Benchmark sin scenario asociado (BENCH #6, #7): se ignora silenciosamente
			continue;
		}

		for (const scenarioKey of scenarioKeys) {
			updates.push({ scenarioKey, libKey, value: entry.opsPerSec });
		}
	}

	return updates;
}

// ─────────────────────────────────────────────────────────────
// FORMATEO DE NÚMEROS
// ─────────────────────────────────────────────────────────────

/** Ejemplo: 1500000 → "1_500_000" */
function formatWithUnderscores(num: number): string {
	const str = Math.round(num).toString();
	const parts: string[] = [];
	let remaining = str;
	while (remaining.length > 3) {
		parts.unshift(remaining.slice(-3));
		remaining = remaining.slice(0, -3);
	}
	parts.unshift(remaining);
	return parts.join('_');
}

// ─────────────────────────────────────────────────────────────
// ACTUALIZACIÓN DEL ARCHIVO DE CONSTANTES
// ─────────────────────────────────────────────────────────────

/**
 * Máquina de estados que recorre el archivo línea a línea y reemplaza
 * los valores numéricos en los bloques `values: { ... }` de cada scenario.
 *
 * Solo actúa dentro del array `scenarios` — se detiene al llegar a
 * `export const libraries` para no tocar otras secciones del archivo.
 */
function applyUpdatesToConstantsFile(updates: IScenarioUpdate[]): number {
	const filePath = join(
		import.meta.dirname,
		'..',
		'docs-vitepress',
		'.vitepress',
		'components',
		'BenchmarkChart',
		'benchmark-chart.constants.ts'
	);

	// Mapa anidado: scenarioKey → libKey → newValue
	const updateMap = new Map<string, Map<string, number>>();
	for (const upd of updates) {
		if (!updateMap.has(upd.scenarioKey)) {
			updateMap.set(upd.scenarioKey, new Map());
		}
		updateMap.get(upd.scenarioKey)!.set(upd.libKey, upd.value);
	}

	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');

	type IState = 'scanning' | 'in_scenario' | 'in_values' | 'done';

	let state: IState = 'scanning';
	let currentScenarioKey = '';
	let braceDepth = 0;
	let replacedCount = 0;

	// Detecta `key: 'xxx'` dentro de un objeto del array scenarios
	const scenarioKeyRe = /^\s+key:\s*['"]([^'"]+)['"]/;
	// Detecta el inicio de `values: {`
	const valuesStartRe = /^\s+values:\s*\{/;
	// Detecta líneas de valor de librería:  'Plain JS': 1_234,  TypeBox: null,
	const libValueRe =
		/^(\s+(?:'([^']+)'|([\w][\w -]*))\s*:\s*)(null|[\d_]+)(,?\s*)$/;

	const updatedLines = lines.map((rawLine) => {
		if (state === 'done') return rawLine;

		// Parar al llegar a la sección de libraries (fuera del array scenarios)
		if (rawLine.includes('export const libraries')) {
			state = 'done';
			return rawLine;
		}

		if (state === 'scanning' || state === 'in_scenario') {
			const keyMatch = scenarioKeyRe.exec(rawLine);
			if (keyMatch) {
				currentScenarioKey = keyMatch[1]!;
				state = 'in_scenario';
				return rawLine;
			}

			if (state === 'in_scenario' && valuesStartRe.test(rawLine)) {
				state = 'in_values';
				braceDepth = 1;
				return rawLine;
			}

			return rawLine;
		}

		// ── state === 'in_values' ────────────────────────────────────
		braceDepth +=
			(rawLine.match(/\{/g) ?? []).length -
			(rawLine.match(/\}/g) ?? []).length;

		if (braceDepth <= 0) {
			state = 'scanning';
			currentScenarioKey = '';
			return rawLine;
		}

		const lineMatch = libValueRe.exec(rawLine);
		if (!lineMatch) return rawLine;

		const libKey = (lineMatch[2] ?? lineMatch[3] ?? '').trim();
		const scenarioMap = updateMap.get(currentScenarioKey);
		const newVal = scenarioMap?.get(libKey);

		if (newVal === undefined) return rawLine;

		const formatted = formatWithUnderscores(newVal);
		replacedCount++;
		return `${lineMatch[1]}${formatted}${lineMatch[5]}`;
	});

	writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
	return replacedCount;
}

// ─────────────────────────────────────────────────────────────
// RESUMEN POR SCENARIO
// ─────────────────────────────────────────────────────────────

function printSummaryTable(updates: IScenarioUpdate[]): void {
	const byScenario = new Map<string, Map<string, number>>();
	for (const upd of updates) {
		if (!byScenario.has(upd.scenarioKey))
			byScenario.set(upd.scenarioKey, new Map());
		byScenario.get(upd.scenarioKey)!.set(upd.libKey, upd.value);
	}

	console.log('  Scenario          BENCH  Librerías actualizadas');
	console.log(
		'  ────────────────  ─────  ────────────────────────────────────────'
	);
	for (const [scenarioKey, libMap] of byScenario) {
		const benchNum = SCENARIO_BENCH_NUM[scenarioKey] ?? '?';
		const libs = [...libMap.keys()].join(', ');
		console.log(
			`  ${scenarioKey.padEnd(16)}  #${String(benchNum).padEnd(4)} ${libs}`
		);
	}
	console.log();
}

// ─────────────────────────────────────────────────────────────
// PUNTO DE ENTRADA PRINCIPAL
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
	console.log('🔄 Ejecutando benchmarks (esto puede tardar ~2 minutos)...\n');

	const proc = Bun.spawn(
		[
			'bun',
			'--expose-gc',
			'test',
			'tests/performance/comparison-benchmarks.test.ts',
		],
		{
			cwd: join(import.meta.dirname, '..'),
			stdout: 'pipe',
			stderr: 'pipe',
		}
	);

	const rawOutput = await new Response(proc.stdout).text();
	const rawStderr = await new Response(proc.stderr).text();
	await proc.exited;

	if (proc.exitCode !== 0) {
		console.warn(
			`  ⚠️  exitCode=${proc.exitCode} (puede haber librerías opcionales ausentes)\n`
		);
	}

	// stdout en Bun contiene el output de los tests (console.log dentro de tests)
	const fullOutput = rawOutput + '\n' + rawStderr;

	console.log('📊 Parseando resultados...');
	const entries = parseBenchOutput(fullOutput);

	if (entries.length === 0) {
		console.error('\n❌ No se encontraron mediciones en el output.');
		console.error('   Prueba manualmente: bun run bench:compare');
		process.exit(1);
	}

	// Deduplicar: si un mismo benchNum+lib aparece varias veces (test individual +
	// test de comparativa), quedarse con la última medición (más estable, JIT warm).
	const deduped = new Map<string, IBenchEntry>();
	for (const entry of entries) {
		deduped.set(`${entry.benchNum}|${entry.rawLibName}`, entry);
	}
	const dedupedEntries = [...deduped.values()];

	console.log(
		`  ${entries.length} mediciones brutas → ${dedupedEntries.length} únicas\n`
	);

	const updates = mapEntriesToUpdates(dedupedEntries);
	printSummaryTable(updates);

	console.log('✏️  Actualizando benchmark-chart.constants.ts...');
	const replaced = applyUpdatesToConstantsFile(updates);

	console.log(
		`\n✅ ${replaced} valores actualizados en benchmark-chart.constants.ts`
	);
	console.log(
		'   Gráficos + cobertura de la documentación reflejan ahora los resultados de esta máquina.'
	);
}

main().catch((err: unknown) => {
	console.error('Error fatal:', err);
	process.exit(1);
});
