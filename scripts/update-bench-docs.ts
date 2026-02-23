/**
 * @fileoverview Actualiza automáticamente los datos de benchmarks en la documentación.
 *
 * Ejecuta `bun run bench:compare`, captura el output y actualiza los valores
 * en `benchmark-chart.constants.ts` con los resultados reales de la máquina actual.
 *
 * Uso:
 *   bun run bench:update
 *   bun run scripts/update-bench-docs.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────

interface IBenchEntry {
	benchNum: string;
	rawLibName: string;
	opsPerSec: number;
}

interface IScenarioUpdate {
	scenario: string;
	libKey: string;
	value: number;
}

// ─────────────────────────────────────────────────────────────
// MAPEO: (benchNum, rawLibName) → (scenario, libKey)
//
// Key format: `BENCH_NUM|RAW_LIB_NAME` (normalizado: trim + lowercase)
// Cada entrada mapea al scenario correcto y al key usado en constants.ts
// ─────────────────────────────────────────────────────────────

const BENCH_MAP: Record<string, { scenario: string; libKey: string }> = {
	// ── Benchmark #1: Validación simple (10k) → scenario 'validation' ──────
	'1|plain js (baseline)': { scenario: 'validation', libKey: 'Plain JS' },
	'1|typebox': { scenario: 'validation', libKey: 'TypeBox' },
	'1|valibot': { scenario: 'validation', libKey: 'valibot' },
	'1|zod': { scenario: 'validation', libKey: 'Zod' },
	'1|yup': { scenario: 'validation', libKey: 'yup' },
	'1|arktype': { scenario: 'validation', libKey: 'arktype' },
	'1|joi': { scenario: 'validation', libKey: 'joi' },
	'1|quickmodel': { scenario: 'validation', libKey: 'QuickModel' },

	// ── Benchmark #2: Coerción tipos complejos (1k) → scenario 'coercion' ──
	'2|valibot': { scenario: 'coercion', libKey: 'valibot' },
	'2|zod': { scenario: 'coercion', libKey: 'Zod' },
	'2|class-transformer': {
		scenario: 'coercion',
		libKey: 'class-transformer',
	},
	'2|class-validator': { scenario: 'coercion', libKey: 'class-validator' },
	'2|quickmodel': { scenario: 'coercion', libKey: 'QuickModel' },

	// ── Benchmark #3: Roundtrip serialización (1k) → scenario 'serialization'
	'3|plain json (baseline)': {
		scenario: 'serialization',
		libKey: 'Plain JS',
	},
	'3|superjson': { scenario: 'serialization', libKey: 'superjson' },
	'3|class-transformer': {
		scenario: 'serialization',
		libKey: 'class-transformer',
	},
	'3|quickmodel': { scenario: 'serialization', libKey: 'QuickModel' },

	// ── Benchmark #4: Validación batch 1k (cycles/sec) → scenario 'batch' ──
	'4|typebox': { scenario: 'batch', libKey: 'TypeBox' },
	'4|valibot': { scenario: 'batch', libKey: 'valibot' },
	'4|zod': { scenario: 'batch', libKey: 'Zod' },
	'4|yup': { scenario: 'batch', libKey: 'yup' },
	'4|arktype': { scenario: 'batch', libKey: 'arktype' },
	'4|joi': { scenario: 'batch', libKey: 'joi' },
	'4|quickmodel': { scenario: 'batch', libKey: 'QuickModel' },

	// ── Benchmark #5: Generación de mocks (100 it.) → scenario 'mocks' ─────
	'5|quickmodel mock': { scenario: 'mocks', libKey: 'QuickModel' },

	// ── Benchmark #8: Reglas / @QRule (5k) → scenario 'rules' ────────────────
	'8|class-validator': { scenario: 'rules', libKey: 'class-validator' },
	'8|vest': { scenario: 'rules', libKey: 'vest' },
	'8|joi': { scenario: 'rules', libKey: 'joi' },
	'8|quickmodel @qrule': { scenario: 'rules', libKey: 'QuickModel' },
};

// ─────────────────────────────────────────────────────────────
// PARSING
// ─────────────────────────────────────────────────────────────

/**
 * Extrae todas las entradas de benchmark del output del test.
 * Soporta tanto "ops/sec" como "cycles/sec".
 *
 * Formato esperado:
 *   [BENCH #1] TypeBox: 1,500,000 ops/sec | 0.67μs avg
 *   [BENCH #4] TypeBox: 1,500,000 cycles/sec
 */
function parseBenchOutput(rawOutput: string): IBenchEntry[] {
	const pattern =
		/\[BENCH #(\d+)\]\s+([^:\n]+?):\s+([\d,]+)\s+(?:ops|cycles)\/sec/g;
	const entries: IBenchEntry[] = [];
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(rawOutput)) !== null) {
		const benchNum = match[1]!;
		const rawLibName = match[2]!.trim();
		const opsPerSec = parseInt(match[3]!.replace(/,/g, ''), 10);
		entries.push({ benchNum, rawLibName, opsPerSec });
	}

	return entries;
}

/**
 * Convierte las entradas de benchmark en actualizaciones de scenario+libKey.
 * Las entradas sin mapeo definido se descartan con un aviso.
 */
function mapEntriesToUpdates(entries: IBenchEntry[]): IScenarioUpdate[] {
	const updates: IScenarioUpdate[] = [];

	for (const entry of entries) {
		const lookupKey = `${entry.benchNum}|${entry.rawLibName.toLowerCase()}`;
		const mapping = BENCH_MAP[lookupKey];

		if (!mapping) {
			console.warn(
				`  [SKIP] Sin mapeo para: [BENCH #${entry.benchNum}] "${entry.rawLibName}"`
			);
			continue;
		}

		updates.push({
			scenario: mapping.scenario,
			libKey: mapping.libKey,
			value: entry.opsPerSec,
		});
	}

	return updates;
}

// ─────────────────────────────────────────────────────────────
// FORMATEO DE NÚMEROS
// ─────────────────────────────────────────────────────────────

/**
 * Formatea un número con guiones bajos cada 3 dígitos desde la derecha.
 * Ejemplo: 1500000 → "1_500_000"
 */
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
 * Estados:
 *  - 'scanning': buscando un bloque de scenario
 *  - 'in_values': dentro del bloque values:{...} de un scenario conocido
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

	// Construir mapa anidado: scenario → libKey → newValue
	const updateMap = new Map<string, Map<string, number>>();
	for (const upd of updates) {
		if (!updateMap.has(upd.scenario)) {
			updateMap.set(upd.scenario, new Map());
		}
		updateMap.get(upd.scenario)!.set(upd.libKey, upd.value);
	}

	const content = readFileSync(filePath, 'utf-8');
	const lines = content.split('\n');

	let currentScenario = '';
	let inValuesBlock = false;
	let braceDepth = 0;
	let replacedCount = 0;

	// Regex para detectar la línea key: 'xxx' dentro de un objeto de scenario
	const keyLineRe = /^\s+key:\s*['"]([^'"]+)['"]/;
	// Regex para detectar el inicio de values: {
	const valuesStartRe = /values:\s*\{/;
	// Regex para líneas con valor de librería: opcionalmente quoted key + número
	// El input siempre son líneas de un archivo TS del propio proyecto (controlado).

	// eslint-disable-next-line security/detect-unsafe-regex
	const libLineRe = /^(\s+(?:'([^']+)'|([\w][\w -]*)?):\s*)(-1|[\d_]+)(.*)$/;

	const updatedLines = lines.map((rawLine) => {
		// ── Fuera del bloque values ─────────────────────────────────
		if (!inValuesBlock) {
			const keyMatch = keyLineRe.exec(rawLine);
			if (keyMatch) {
				currentScenario = keyMatch[1]!;
			}

			if (currentScenario && valuesStartRe.test(rawLine)) {
				inValuesBlock = true;
				// Contar llaves en la misma línea (por si values: { ... } está inline)
				braceDepth =
					(rawLine.match(/\{/g) ?? []).length -
					(rawLine.match(/\}/g) ?? []).length;
				if (braceDepth <= 0) inValuesBlock = false;
			}
			return rawLine;
		}

		// ── Dentro del bloque values ────────────────────────────────
		braceDepth +=
			(rawLine.match(/\{/g) ?? []).length -
			(rawLine.match(/\}/g) ?? []).length;

		if (braceDepth <= 0) {
			inValuesBlock = false;
			return rawLine;
		}

		// Intentar reemplazar el valor de una librería
		const lineMatch = libLineRe.exec(rawLine);
		if (!lineMatch) return rawLine;

		const libKey = (lineMatch[2] ?? lineMatch[3] ?? '').trim();
		const scenarioMap = updateMap.get(currentScenario);
		const newVal = scenarioMap?.get(libKey);

		if (newVal === undefined) return rawLine;

		const formatted = formatWithUnderscores(newVal);
		const updated = `${lineMatch[1]}${formatted}${lineMatch[5]}`;
		replacedCount++;
		return updated;
	});

	writeFileSync(filePath, updatedLines.join('\n'), 'utf-8');
	return replacedCount;
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
		// Los tests de benchmark pueden fallar por librerías opcionales no
		// instaladas, pero aun así emiten resultados válidos — continuar.
		console.warn(
			`  ⚠️  Los tests reportaron exitCode=${proc.exitCode} (librerías opcionales ausentes)`
		);
	}

	// Combinar stdout y stderr para capturar todo el output de console.log
	const fullOutput = rawOutput + '\n' + rawStderr;

	console.log('📊 Parseando resultados...\n');
	const entries = parseBenchOutput(fullOutput);

	if (entries.length === 0) {
		console.error(
			'❌ No se encontraron resultados de benchmark en el output.'
		);
		console.error(
			'   Verifica que el script funciona con: bun run bench:compare'
		);
		process.exit(1);
	}

	console.log(`  Encontradas ${entries.length} mediciones:\n`);
	for (const entry of entries) {
		console.log(
			`    [#${entry.benchNum}] ${entry.rawLibName.padEnd(28)} ${entry.opsPerSec.toLocaleString().padStart(12)} ops/sec`
		);
	}

	const updates = mapEntriesToUpdates(entries);
	console.log(
		`\n  ${updates.length} actualizaciones mapeadas a scenarios.\n`
	);

	console.log('✏️  Actualizando benchmark-chart.constants.ts...');
	const replaced = applyUpdatesToConstantsFile(updates);

	console.log(
		`\n✅ Actualizados ${replaced} valores en benchmark-chart.constants.ts`
	);
	console.log(
		'   La documentación refleja ahora los resultados de esta máquina.'
	);
}

main().catch((err: unknown) => {
	console.error('Error fatal:', err);
	process.exit(1);
});
