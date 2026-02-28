/**
 * Internal MCP tools barrel — re-exports maintenance and DX tools.
 *
 * @see {@link QMcpServer} — server that registers these internal tools
 * @see {@link QCheckHealthTool} — runs lint + typecheck + tests
 */
export * from './update-docs.tool';
export * from './generate-test.tool';
export * from './check-jsdocs.tool';
export * from './check-health.tool';
export * from './coverage-report.tool';
export * from './sync-docs.tool';
export * from './utils';
export * from './scaffold-feature.tool';
export * from './check-api-compat.tool';
export * from './benchmark-perf.tool';
export * from './check-project-rules.tool';
export * from './check-security.tool';
export * from './list-todos.tool';
export * from './check-bundle-size.tool';
export * from './check-changelog.tool';
export * from './lint-check.tool';
export * from './typecheck.tool';
export * from './pre-commit-check.tool';
export * from './run-tests.tool';
export * from './get-staged-files.tool';
export * from './project-status.tool';
export * from './check-doc-drift.tool';
export * from './check-doc-parity.tool';
export * from './deprecation-tracker.tool';
export * from './manage-proposal.tool';
export * from './patch-jsdoc.tool';
export * from './validate-examples.tool';
