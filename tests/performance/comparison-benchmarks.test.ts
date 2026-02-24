/**
 * @fileoverview Benchmark comparativo — entry point modular
 *
 * Cada benchmark vive en su propio directorio bajo tests/performance/benchmarks/:
 *   {key}/{key}.def.ts   — datos puros del escenario (VitePress-safe)
 *   {key}/{key}.bench.ts — tests de Bun (describe + test)
 *
 * Para ejecutar:
 *   bun --expose-gc test tests/performance/comparison-benchmarks.test.ts
 *   bun run bench:compare
 *
 * Para actualizar los valores del chart de VitePress, editar los *.def.ts correspondientes.
 */

import 'reflect-metadata';

import { allBenches } from './benchmarks/registry.bench';

for (const bench of allBenches) bench.describeBench();
