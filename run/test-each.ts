#!/usr/bin/env bun

/**
 * Ejecuta cada test individual con su propio ejecutable
 * Permite ver el resultado de cada uno por separado
 */

import { execSync } from 'child_process';
import { join } from 'path';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          EJECUTANDO TESTS INDIVIDUALMENTE                     ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const projectRoot = join(__dirname, '..');

// Encontrar todos los archivos .ts que son ejecutables
const testFiles = [
  'tests/integration/quick-model.test.ts',
  'tests/integration/all-types.test.ts',
  // Agregar más archivos ejecutables aquí
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const file of testFiles) {
  const filePath = join(projectRoot, file);
  console.log(`\n🚀 Ejecutando: ${file}`);
  console.log('═'.repeat(60));

  try {
    const output = execSync(`bun ${filePath}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(output);
    passedTests++;
    console.log(`✅ COMPLETADO: ${file}`);
  } catch (error: any) {
    failedTests++;
    console.log(error.stdout || error.stderr || error.message);
    console.log(`❌ ERROR: ${file}`);
  }

  totalTests++;
  console.log('═'.repeat(60));
}

// Resumen
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                      RESUMEN FINAL                            ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`Total ejecutados: ${totalTests}`);
console.log(`✅ Exitosos: ${passedTests}`);
console.log(`❌ Fallidos: ${failedTests}\n`);

process.exit(failedTests > 0 ? 1 : 0);
