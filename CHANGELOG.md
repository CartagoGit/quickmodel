# Changelog

## [Unreleased]

### Added

- **WeakMap & WeakSet transformer** (`weak-collections.transformer.ts`):
    - `WeakMap<object, V>` and `WeakSet<object>` are now supported in `@Quick({})` decorator
    - Both types are runtime-only: they are **never serialized** to JSON (`toJSON()` omits them)
    - Useful for GC-friendly caches and event listener sets
- **Schema Generation API** (`QModel.getSchema(format)`):
    - Export your model's structure in 7 formats: `'json'` (JSON Schema Draft-07), `'openapi'` (OpenAPI 3.0), `'zod'` (Zod validator string), `'mongo'` (Mongoose SchemaTypes), `'typescript'` (TS interface), `'graphql'` (GraphQL SDL), `'ajv'` (AJV validator)
    - Available both as static method (`User.getSchema('json')`) and instance method (`user.getSchema('json')`)
- **MCP Server** (`src/mcp/server.ts`) — AI assistant integration via Model Context Protocol:
    - 10 public tools: `create_model`, `validate_usage`, `list_transformers`, `generate_mock`, `inspect_model`, `search_docs`, `interface_to_model`, `export_json_schema`, `explain_error`, `simulate_transformation`, `json_to_model`
    - 11 internal dev tools: `update_docs`, `generate_test`, `check_jsdocs`, `check_health`, `coverage_report`, `check_project_rules`, `check_security`, `sync_docs`, `scaffold_feature`, `check_api_compatibility`, `benchmark_performance`
    - Start server: `bun run mcp:start` or `npx @cartago-git/quickmodel mcp`
- **MCP Prompts (skills)** (`src/mcp/prompts/`) — 4 guided AI workflows:
    - `quickmodel_from_typescript` — Convert TypeScript interfaces to QModel classes
    - `quickmodel_debug` — Diagnose and fix QuickModel issues
    - `quickmodel_generate_test_data` — Create test data strategies for a model
    - `quickmodel_inspect_and_schema` — Inspect model properties and export schemas in all formats
- **Test suite expanded** from ~700 to 1569 tests, including:
    - MCP server and tool tests
    - MCP prompt/skill tests
    - Coverage gap tests with Proxy-based catch-block validation
- CI/CD enhancements:
    - Automatic coverage reporting to Codecov
    - Bundle size tracking in PRs
    - Separate security audit job
    - Performance benchmark job
    - CodeQL security scanning (scheduled weekly + on PRs)
- Package metadata:
    - `publishConfig` for npm registry
    - `funding` field for GitHub Sponsors
- README badges for CI status, coverage, npm version, and bundle size
- **New documentation files:**
    - `CONTRIBUTING.md` in root (quick reference linking to full guides)
    - `.nvmrc` for Node version management (18.0.0)
    - `docs-vitepress/{en,es}/guide/unknown-property-policy.md` (replaces strict-mode.md)

### Changed

- **BREAKING**: Removed deprecated `strict` property from `IQConfig` and `IQOptions`
    - Use `unknownPropertyPolicy: 'error'` instead of `strict: true`
    - Use `unknownPropertyPolicy: 'keep'` instead of `strict: false` (default)
    - Use `unknownPropertyPolicy: 'strip'` for sanitization (new option)
- Removed deprecated `getTemplateInstance()` wrapper from `PopulationService`
    - Now uses `securityInspector.getTemplateInstance()` directly
- CI workflow now runs on `develop` branch in addition to `main`
- Tests now run with coverage by default in CI
- **Documentation overhaul:**
    - All references to `strict: true/false` updated to `unknownPropertyPolicy`
    - Corrected version references from "QuickModel 3.0" to "QuickModel 1.0"
    - Renamed `strict-mode.md` → `unknown-property-policy.md` (EN + ES)
    - Clarified TypeScript `strict: true` vs QuickModel's `unknownPropertyPolicy` in installation guides
    - Updated README.md security notice
    - Updated SECURITY.md recommendations
    - Updated 10+ documentation files across EN/ES
- **Build optimization:**
    - Enhanced tree-shaking with `preset: 'smallest'` and `moduleSideEffects: false`
    - Aggressive minification: identifiers, syntax, whitespace

### Removed

- Temporary debug files: `test_case.ts`, `test_json.ts`
- Backup files: `src/core/services/to-interface.service.ts.bak`
- Legacy config: `.eslintrc.json` (using flat config `eslint.config.mjs`)
- Deprecated `strict-mode.md` documentation files (replaced with `unknown-property-policy.md`)

### Documentation

- Updated ESLint config comments to explain disabled TypeScript rules for reflection-based operations
- Complete documentation sync between English and Spanish versions
- All code examples updated to current API

## [1.0.0] - 2026-01-07
