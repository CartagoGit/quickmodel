import { z } from '@mcp/deps';
import { QAbstractTool } from '../abstract-tool';
import * as fs from 'fs';
import { join } from 'path';
import { spawnCommand } from './utils';

/** Result for a single static security check. */
interface ISecurityCheck {
	id: string;
	description: string;
	file: string;
	passed: boolean;
	detail?: string;
}

/** Full audit result returned by {@link QRunSecurityAuditTool}. */
interface ISecurityAuditResult {
	passed: boolean;
	staticChecks: ISecurityCheck[];
	testSuite: {
		passed: boolean;
		summary: string;
	};
	summary: string;
}

/** Input parameters for a single static code check. */
interface ICheckInput {
	/** Check identifier shown in the audit result (e.g. `CRIT-01`). */
	id: string;
	/** Human-readable description of what is being verified. */
	description: string;
	/** Absolute path to the source file to inspect. */
	filePath: string;
	/** Substring to search for (or require absent) in the file contents. */
	pattern: string;
}

/**
 * Internal MCP tool that performs a comprehensive security audit of the
 * QuickModel codebase.
 *
 * @remarks
 * Combines two audit layers:
 *
 * 1. **Static code checks** — verifies that known security mitigations are
 *    present in source files (path-traversal guards, predicate sanitisation,
 *    stack-trace suppression, JSON.parse type guard, etc.).
 * 2. **Dynamic test suite** — runs `tests/security/` via `bun test` and
 *    reports pass / fail.
 *
 * Returns `{ passed, staticChecks[], testSuite, summary }`.
 * `passed` is `true` only when every static check AND the test suite both pass.
 *
 * @see {@link QCheckSecurityTool} — lighter tool that only runs the test suite
 * @see {@link QCheckProjectHealthTool} — full health check (lint + typecheck + tests)
 * @see {@link QCheckProjectRulesTool} — project-specific coding rule validation
 *
 * @internal Registered on the MCP server; not part of the public library API.
 */
export class QRunSecurityAuditTool extends QAbstractTool<z.ZodObject<{}>> {
	name = 'run_security_audit';
	description =
		'Run a comprehensive security audit combining static code analysis and the full ' +
		'security test suite. Static checks verify path-traversal guards (safeCwd+sep), ' +
		'predicate sanitisation (assertSafePredicate), stack-trace suppression, ' +
		'JSON.parse type-guards, and caps on input arrays. ' +
		'Returns { passed, staticChecks[], testSuite, summary }.';
	schema = z.object({});

	/** @internal `fs` reference; overridable in tests. */
	protected _fs = fs;

	/** @internal `spawnCommand` reference; overridable in tests. */
	protected _spawn = spawnCommand;

	/**
	 * Runs the full security audit.
	 *
	 * @param _args - No arguments required.
	 * @returns `{ passed, staticChecks, testSuite, summary }`.
	 * @see {@link QAbstractTool.execute} — base contract for this method
	 */
	async execute(_args: {}): Promise<ISecurityAuditResult> {
		const cwd = process.cwd();
		const src = join(cwd, 'src');

		// ── Static checks ──────────────────────────────────────────────────────
		const staticChecks: ISecurityCheck[] = [
			// CRIT-01: assertSafePredicate in simulation tools
			this.grep({
				id: 'CRIT-01',
				description: 'assertSafePredicate applied to simulation tools',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-validation.tool.ts'
				),
				pattern: 'assertSafePredicate',
			}),
			this.grep({
				id: 'CRIT-01b',
				description: 'assertSafePredicate applied in simulate-rules',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-rules.tool.ts'
				),
				pattern: 'assertSafePredicate',
			}),
			this.grep({
				id: 'CRIT-01c',
				description:
					'assertSafePredicate applied in simulate-async-rules',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-async-rules.tool.ts'
				),
				pattern: 'assertSafePredicate',
			}),
			// CRIT-01d: predicate-sanitizer blocks prototype-chain reconstruction
			this.grep({
				id: 'CRIT-01d',
				description:
					'predicate-sanitizer blocks prototype-chain reconstruction tokens',
				filePath: join(src, 'mcp', 'tools', 'predicate-sanitizer.ts'),
				pattern: "'constructor'",
			}),

			// HIGH-01/02: safeCwd with sep in path-handling tools
			this.grep({
				id: 'HIGH-01',
				description: 'safeCwd with sep in patch-jsdoc',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'patch-jsdoc.tool.ts'
				),
				pattern: 'safeCwd',
			}),
			this.grep({
				id: 'HIGH-02',
				description: 'safeCwd with sep in manage-proposal',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'manage-proposal.tool.ts'
				),
				pattern: 'safeCwd',
			}),
			this.grep({
				id: 'HIGH-03',
				description: 'safeCwd with sep in add-to-sidebar',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'add-to-sidebar.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// HIGH-04: stack omitted from Error fallback
			this.grepAbsent({
				id: 'HIGH-04',
				description:
					'stack: value.stack absent from serializer Error fallback',
				filePath: join(
					src,
					'core',
					'services',
					'serializer.service.ts'
				),
				pattern: 'stack: value.stack',
			}),

			// MED-02: JSON.parse type guard in deserializer
			this.grep({
				id: 'MED-02',
				description: 'JSON.parse type guard in deserializeFromJson',
				filePath: join(
					src,
					'core',
					'services',
					'deserializer.service.ts'
				),
				pattern: "typeof raw !== 'object'",
			}),

			// MED-03: title newline guards
			this.grep({
				id: 'MED-03a',
				description: 'title newline guard in manage-proposal',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'manage-proposal.tool.ts'
				),
				pattern: '[\\n\\r]',
			}),
			this.grep({
				id: 'MED-03b',
				description: 'title newline guard in create-guide-page',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'create-guide-page.tool.ts'
				),
				pattern: 'UNSAFE_TITLE',
			}),

			// MED-04: capInputArrays in simulation public tools
			this.grep({
				id: 'MED-04a',
				description: 'capInputArrays in simulate-transformation',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-transformation.tool.ts'
				),
				pattern: 'capInputArrays',
			}),
			this.grep({
				id: 'MED-04b',
				description: 'capInputArrays in roundtrip',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'roundtrip.tool.ts'
				),
				pattern: 'capInputArrays',
			}),

			// MED-05: search query max length
			this.grep({
				id: 'MED-05',
				description: 'query .max(200) in search-docs',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'search-docs.tool.ts'
				),
				pattern: 'max(200)',
			}),

			// LOW-01: sanitizeContextValue in QModelError
			this.grep({
				id: 'LOW-01',
				description: 'sanitizeContextValue in QModelError',
				filePath: join(src, 'core', 'errors', 'quickmodel.error.ts'),
				pattern: 'sanitizeContextValue',
			}),

			// LOW-02: timeout in utils.ts spawnCommand
			this.grep({
				id: 'LOW-02',
				description: '120s timeout in spawnCommand',
				filePath: join(src, 'mcp', 'tools', 'internal', 'utils.ts'),
				pattern: '120_000',
			}),

			// LOW-03: RegExp flags whitelist in regexp.transformer
			this.grep({
				id: 'LOW-03',
				description: 'RegExp flags whitelist in regexp-transformer',
				filePath: join(src, 'transformers', 'regexp.transformer.ts'),
				pattern: 'VALID_FLAGS_RE',
			}),

			// NEW-01: safeCwd in check-api-compat
			this.grep({
				id: 'NEW-01',
				description: 'safeCwd in check-api-compat',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-api-compat.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// NEW-02: safeCwd in generate-test
			this.grep({
				id: 'NEW-02',
				description: 'safeCwd in generate-test',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'generate-test.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// NEW-03: safeCwd in validate-examples
			this.grep({
				id: 'NEW-03',
				description: 'safeCwd in validate-examples',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'validate-examples.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// MED-06: run-tests rejects CLI flag injection in pattern
			this.grep({
				id: 'MED-06',
				description:
					'run-tests rejects flag-prefixed pattern (CLI injection guard)',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'run-tests.tool.ts'
				),
				pattern: "startsWith('-')",
			}),

			// MED-07: lint-check uses -- separator + flag-prefix guard
			this.grep({
				id: 'MED-07a',
				description:
					'lint-check uses -- end-of-options separator before targets',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'lint-check.tool.ts'
				),
				pattern: "'--', ...targets",
			}),
			this.grep({
				id: 'MED-07b',
				description:
					'lint-check rejects flag-prefixed targetDir / targetFiles',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'lint-check.tool.ts'
				),
				pattern: 'assertNoFlagInjection',
			}),

			// MED-08: benchmark-perf caps iterations to prevent DoS
			this.grep({
				id: 'MED-08',
				description:
					'benchmark-perf caps iterations at 100_000 (DoS prevention)',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'benchmark-perf.tool.ts'
				),
				pattern: '100_000',
			}),

			// MED-09: generate-mock caps count to prevent DoS
			this.grep({
				id: 'MED-09',
				description: 'generate-mock caps count (DoS prevention)',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'generate-mock.tool.ts'
				),
				pattern: '.max(',
			}),

			// MED-10: pre-commit-check rejects flag-prefixed files
			this.grep({
				id: 'MED-10',
				description:
					'pre-commit-check rejects flag-prefixed file paths (CLI injection guard)',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'pre-commit-check.tool.ts'
				),
				pattern: "startsWith('-')",
			}),

			// LOW-05..09: string inputs capped to prevent parser/regex DoS
			this.grep({
				id: 'LOW-05',
				description: 'validate-usage code input capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'validate-usage.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-06',
				description: 'json-to-model json/className inputs capped',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'json-to-model.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-07',
				description:
					'interface-to-model code input capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'interface-to-model.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-08',
				description:
					'generate-feature-tests string inputs capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'generate-feature-tests.tool.ts'
				),
				pattern: '.max(100)',
			}),
			this.grep({
				id: 'LOW-09',
				description:
					'generate-integration-test model name inputs capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'generate-integration-test.tool.ts'
				),
				pattern: '.max(100)',
			}),

			// LOW-10: code-analysis tools cap large source code strings at 50 000 chars
			this.grep({
				id: 'LOW-10a',
				description: 'inspect-model code input capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'inspect-model.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-10b',
				description: 'export-schema code input capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'export-schema.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-10c',
				description:
					'diff-models model_a/model_b inputs capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'diff-models.tool.ts'
				),
				pattern: '.max(50_000)',
			}),

			// LOW-11: create-model className and explain-error error string capped
			this.grep({
				id: 'LOW-11a',
				description: 'create-model className capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'create-model.tool.ts'
				),
				pattern: '.max(100)',
			}),
			this.grep({
				id: 'LOW-11b',
				description:
					'explain-error error string capped at 10 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'explain-error.tool.ts'
				),
				pattern: '.max(10_000)',
			}),

			// LOW-12: from-schema schema and className capped
			this.grep({
				id: 'LOW-12',
				description: 'from-schema schema capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'from-schema.tool.ts'
				),
				pattern: '.max(50_000)',
			}),

			// LOW-13: create-guide-page slug capped at 100 chars
			this.grep({
				id: 'LOW-13',
				description: 'create-guide-page slug capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'create-guide-page.tool.ts'
				),
				pattern: '.max(100)',
			}),

			// MED-11: simulate-* tools cap rules array at 50 items (N×new Function() DoS)
			this.grep({
				id: 'MED-11a',
				description:
					'simulate-validation rules array capped at 50 items',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-validation.tool.ts'
				),
				pattern: '.max(50)',
			}),
			this.grep({
				id: 'MED-11b',
				description: 'simulate-rules rules array capped at 50 items',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-rules.tool.ts'
				),
				pattern: '.max(50)',
			}),
			this.grep({
				id: 'MED-11c',
				description:
					'simulate-async-rules rules array capped at 50 items',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-async-rules.tool.ts'
				),
				pattern: '.max(50)',
			}),

			// HIGH-05: deprecation-tracker target_dir guarded with safeCwd (absolute path bypass)
			this.grep({
				id: 'HIGH-05',
				description:
					'deprecation-tracker safeCwd guard prevents absolute path traversal',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'deprecation-tracker.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// HIGH-06: check-doc-parity base_path guarded with safeCwd
			this.grep({
				id: 'HIGH-06',
				description:
					'check-doc-parity safeCwd guard on base_path prevents path traversal',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-doc-parity.tool.ts'
				),
				pattern: 'safeCwd',
			}),

			// MED-12: check-doc-drift target_dir guarded with safeCwd + capped at 200 chars
			this.grep({
				id: 'MED-12a',
				description:
					'check-doc-drift safeCwd guard on target_dir prevents path traversal',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-doc-drift.tool.ts'
				),
				pattern: 'safeCwd',
			}),
			this.grep({
				id: 'MED-12b',
				description: 'check-doc-drift target_dir capped at 200 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-doc-drift.tool.ts'
				),
				pattern: '.max(200)',
			}),

			// LOW-14: get-form-schema and get-model-schema code capped at 50 000 chars
			this.grep({
				id: 'LOW-14a',
				description: 'get-form-schema code capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'get-form-schema.tool.ts'
				),
				pattern: '.max(50_000)',
			}),
			this.grep({
				id: 'LOW-14b',
				description: 'get-model-schema code capped at 50 000 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'get-model-schema.tool.ts'
				),
				pattern: '.max(50_000)',
			}),

			// LOW-15: agent-coordinate fields capped to prevent JSON persistence DoS
			this.grep({
				id: 'LOW-15',
				description:
					'agent-coordinate agentId/task/files/ttlMs all capped',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'agent-coordinate.tool.ts'
				),
				pattern: '.max(1_800_000)',
			}),

			// LOW-16: scaffold-feature name, list-todos extensions, suggest-version-migration from_version capped
			this.grep({
				id: 'LOW-16a',
				description: 'scaffold-feature name capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'scaffold-feature.tool.ts'
				),
				pattern: '.max(100)',
			}),
			this.grep({
				id: 'LOW-16b',
				description: 'list-todos extensions array capped at 20 items',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'list-todos.tool.ts'
				),
				pattern: '.max(20)',
			}),
			this.grep({
				id: 'LOW-16c',
				description:
					'suggest-version-migration from_version capped at 1000',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'suggest-version-migration.tool.ts'
				),
				pattern: '.max(1000)',
			}),

			// LOW-17: check-changelog projectDir capped at 500 chars
			this.grep({
				id: 'LOW-17',
				description: 'check-changelog projectDir capped at 500 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-changelog.tool.ts'
				),
				pattern: '.max(500)',
			}),

			// LOW-18: check-project-rules targetDir capped at 500 chars
			this.grep({
				id: 'LOW-18',
				description:
					'check-project-rules targetDir capped at 500 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'check-project-rules.tool.ts'
				),
				pattern: '.max(500)',
			}),

			// LOW-19: simulate-validation top-level group capped at 100 chars
			this.grep({
				id: 'LOW-19',
				description:
					'simulate-validation top-level group filter capped at 100 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-validation.tool.ts'
				),
				pattern: '.max(100)',
			}),

			// LOW-20: lint-check targetDir and targetFiles capped
			this.grep({
				id: 'LOW-20a',
				description: 'lint-check targetDir capped at 500 chars',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'lint-check.tool.ts'
				),
				pattern: '.max(500)',
			}),
			this.grep({
				id: 'LOW-20b',
				description: 'lint-check targetFiles array capped at 100 items',
				filePath: join(
					src,
					'mcp',
					'tools',
					'internal',
					'lint-check.tool.ts'
				),
				pattern: '.max(100)',
			}),

			// LOW-21: create-model properties record runtime cap at 200 entries
			this.grep({
				id: 'LOW-21',
				description:
					'create-model properties count capped at 200 at runtime',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'create-model.tool.ts'
				),
				pattern: 'Too many properties',
			}),

			// MED-13: explain-transformation applies capInputArrays before model construction
			this.grep({
				id: 'MED-13',
				description:
					'explain-transformation capInputArrays guards large data arrays',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'explain-transformation.tool.ts'
				),
				pattern: 'capInputArrays',
			}),

			// MED-14: check-integrity applies capInputArrays before field construction
			this.grep({
				id: 'MED-14',
				description:
					'check-integrity capInputArrays guards large data arrays',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'check-integrity.tool.ts'
				),
				pattern: 'capInputArrays',
			}),

			// LOW-22: hydrateOptions depth guard prevents stack overflow
			this.grep({
				id: 'LOW-22',
				description:
					'hydrateOptions depth guard (depth > 10) prevents stack overflow',
				filePath: join(
					src,
					'mcp',
					'tools',
					'public',
					'simulate-transformation.tool.ts'
				),
				pattern: 'depth > 10',
			}),
		];

		// ── Dynamic test suite ─────────────────────────────────────────────────
		let testPassed = false;
		let testSummary = '';
		try {
			const { stdout, stderr } = await this._spawn(
				'bun',
				['test', 'tests/security/'],
				cwd
			);
			testPassed = true;
			testSummary = (stdout + (stderr || ''))
				.trim()
				.split('\n')
				.slice(-3)
				.join('\n');
		} catch (err: any) {
			testPassed = false;
			testSummary = (
				(err.stdout || '') +
				(err.stderr || '') +
				(err.message || '')
			)
				.trim()
				.split('\n')
				.slice(-5)
				.join('\n');
		}

		// ── Aggregate ──────────────────────────────────────────────────────────
		const failedStatic = staticChecks.filter((chk) => !chk.passed);
		const allPassed = failedStatic.length === 0 && testPassed;

		const summary = allPassed
			? `Security audit passed. ${staticChecks.length} static checks ✓, test suite ✓.`
			: [
					`Security audit FAILED.`,
					failedStatic.length > 0
						? `  Static failures (${failedStatic.length}): ${failedStatic.map((chk) => chk.id).join(', ')}`
						: '',
					!testPassed ? `  Test suite: FAILED` : '',
				]
					.filter(Boolean)
					.join('\n');

		return {
			passed: allPassed,
			staticChecks,
			testSuite: { passed: testPassed, summary: testSummary },
			summary,
		};
	}

	/**
	 * Checks that a pattern IS present in the given file.
	 * @param check - Check parameters (id, description, filePath, pattern)
	 * @returns `ISecurityCheck` with `passed: true` if the pattern is found, `false` otherwise.
	 */
	private grep(check: ICheckInput): ISecurityCheck {
		const { id, description, filePath, pattern } = check;
		try {
			const content = this._fs.readFileSync(filePath, 'utf-8');
			const passed = content.includes(pattern);
			return {
				id,
				description,
				file: filePath.replace(process.cwd() + '/', ''),
				passed,
				detail: passed ? undefined : `Pattern not found: "${pattern}"`,
			};
		} catch {
			return {
				id,
				description,
				file: filePath.replace(process.cwd() + '/', ''),
				passed: false,
				detail: `File not found or unreadable`,
			};
		}
	}

	/**
	 * Checks that a pattern is ABSENT from the given file (verifies a fix was applied).
	 * @param check - Check parameters (id, description, filePath, pattern)
	 * @returns `ISecurityCheck` with `passed: true` if the pattern is absent, `false` if it is still present.
	 */
	private grepAbsent(check: ICheckInput): ISecurityCheck {
		const { id, description, filePath, pattern } = check;
		try {
			const content = this._fs.readFileSync(filePath, 'utf-8');
			const absent = !content.includes(pattern);
			return {
				id,
				description,
				file: filePath.replace(process.cwd() + '/', ''),
				passed: absent,
				detail: absent
					? undefined
					: `Dangerous pattern still present: "${pattern}"`,
			};
		} catch {
			return {
				id,
				description,
				file: filePath.replace(process.cwd() + '/', ''),
				passed: false,
				detail: `File not found or unreadable`,
			};
		}
	}
}
