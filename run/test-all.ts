#!/usr/bin/env bun

/**
 * Ejecuta TODOS los tests del sistema
 */

import { readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Obtener __dirname para módulos ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              EJECUTANDO TODOS LOS TESTS                       ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const testDirs = [join(__dirname, '../tests/unit'), join(__dirname, '../tests/integration')];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

async function runTestsInDir(dir: string) {
  if (!statSync(dir).isDirectory()) return;

  const files = readdirSync(dir);
  const testFiles = files.filter((f) => f.endsWith('.test.ts'));

  for (const file of testFiles) {
    const filePath = join(dir, file);
    console.log(`\n📝 Ejecutando: ${file}`);
    console.log('─'.repeat(60));

    try {
      // Usar import dinámico en lugar de require
      await import(filePath);
      passedTests++;
      console.log(`✅ PASÓ: ${file}\n`);
    } catch (error: any) {
      failedTests++;
      console.log(`❌ FALLÓ: ${file}`);
      console.log(`   Error: ${error.message}\n`);
    }
    totalTests++;
  }
}

// Ejecutar tests
async function main() {
  for (const dir of testDirs) {
    try {
      await runTestsInDir(dir);
    } catch {
      // Directorio no existe, continuar
    }
  }

  // Resumen final
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      RESUMEN                                  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Total:   ${totalTests} tests`);
  console.log(`✅ Pasaron: ${passedTests}`);
  console.log(`❌ Fallaron: ${failedTests}`);
  console.log(`📊 Tasa de éxito: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Error fatal:', error);
  process.exit(1);
});
