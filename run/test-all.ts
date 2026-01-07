#!/usr/bin/env bun

/**
 * Runs ALL system tests
 */

import { readdirSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname for ESM modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║              RUNNING ALL TESTS                             ║');
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
    console.log(`\n📝 Running: ${file}`);
    console.log('─'.repeat(60));

    try {
      // Use dynamic import instead of require
      await import(filePath);
      passedTests++;
      console.log(`✅ PASSED: ${file}\n`);
    } catch (error: any) {
      failedTests++;
      console.log(`❌ FAILED: ${file}`);
      console.log(`   Error: ${error.message}\n`);
    }
    totalTests++;
  }
}

// Run tests
async function main() {
  for (const dir of testDirs) {
    try {
      await runTestsInDir(dir);
    } catch {
      // Directory doesn't exist, continue
    }
  }

  // Final summary
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║                      SUMMARY                                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`Total:   ${totalTests} tests`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
