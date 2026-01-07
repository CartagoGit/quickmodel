#!/usr/bin/env bun

/**
 * Runs each individual test with its own executable
 * Allows viewing the result of each one separately
 */

import { execSync } from 'child_process';
import { join } from 'path';

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║          RUNNING TESTS INDIVIDUALLY                         ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const projectRoot = join(__dirname, '..');

// Find all executable .ts files
const testFiles = [
  'tests/integration/quick-model.test.ts',
  'tests/integration/all-types.test.ts',
  'tests/integration/comprehensive.test.ts',
];

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

for (const file of testFiles) {
  const filePath = join(projectRoot, file);
  console.log(`\n🚀 Running: ${file}`);
  console.log('═'.repeat(60));

  try {
    const output = execSync(`bun ${filePath}`, {
      cwd: projectRoot,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    console.log(output);
    passedTests++;
    console.log(`✅ COMPLETED: ${file}`);
  } catch (error: any) {
    failedTests++;
    console.log(error.stdout || error.stderr || error.message);
    console.log(`❌ ERROR: ${file}`);
  }

  totalTests++;
  console.log('═'.repeat(60));
}

// Summary
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                      FINAL SUMMARY                             ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log(`Total executed: ${totalTests}`);
console.log(`✅ Successful: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}\n`);

process.exit(failedTests > 0 ? 1 : 0);
