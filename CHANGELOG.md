# Changelog

## [Unreleased]

### Added

- **`excludeFields` option in `@Quick()`** — Permanently exclude fields from serialization:
    - Declared once in the decorator: `@Quick({}, { excludeFields: ['password', 'cache'] })`
    - Applied on every `serialize()` / `toJSON()` call automatically
    - Deserialization is NOT affected — the field is still populated on the instance
    - Complements existing runtime `omit`/`pick` options in `IQSerializationOptions`
- **WeakMap & WeakSet transformer** (`weak-collections.transformer.ts`):
    - `WeakMap<object, V>` and `WeakSet<object>` are now supported in `@Quick({})` decorator
    - Both types are runtime-only: they are **never serialized** to JSON (`toJSON()` omits them)
    - Useful for GC-friendly caches and event listener sets
- **Schema Generation API** (`QModel.getSchema(format)`):
    - Export your model's structure in 7 formats: `'json'` (JSON Schema Draft-07), `'openapi'` (OpenAPI 3.0), `'zod'` (Zod validator string), `'mongo'` (Mongoose SchemaTypes), `'typescript'` (TS interface), `'graphql'` (GraphQL SDL), `'ajv'` (AJV validator)
    - Available both as static method (`User.getSchema('json')`) and instance method (`user.getSchema('json')`)
- **State management & change tracking on `QModel` instances**:
    - `copy()` — immutable deep clone
    - `isDirty(field?)` — checks if a field (or any field) has been mutated since creation / last `reset()`
    - `getDirtyFields()` / `getChangedFields()` — lists modified fields
    - `getChanges()` — diff between creation state and current state
    - `diff(other)` — structural comparison between two model instances
    - `equals(other)` — deep equality via `serialize()` comparison
    - `patch(data)` — partial update preserving dirty-field tracking
    - `reset()` — restore the instance to its original state
- **`createMany(items, options?)` static method** — batch creation with per-item validation:
    - Items failing `isValid()` are reported in `errors[]` and excluded from `instances[]` by default
    - Returns `IQCreateManyResult<T>` with `{ instances, errors, successCount, errorCount }`
- **`@QComputed()` decorator** — include prototype getters in `serialize()` / `toJSON()` output:
    - Without it, computed getters on the prototype are excluded from serialization
- **`@QAlias(alias)` decorator** — field name remapping between external and internal keys:
    - Renames incoming keys on `create()` / `new Model()` and outgoing keys on `serialize()`
- **`@QGroup(name)` decorator** — assign form sections to fields:
    - Works with `@QField` and `getFormSchemaGrouped()`
    - Used by `qCheckRulesByGroup` and `qCheckRulesByGroupAsync` for group-level validation
- **`@QField(meta)` decorator** — form schema metadata on model properties:
    - Defines `widget`, `label`, `placeholder`, `required`, and arbitrary extra metadata
    - `getFormSchema()` and `getFormSchemaGrouped()` surface this data for dynamic form generation
- **`QModel.extends(BaseClass)` static helper** — simplify generics for multi-level inheritance:
    - Avoids repetition of `<IFoo, IFooAlias>` at each layer; delegates generics to the base
- **`checkRulesAsync(options?)` / `isValidAsync()` / `validationReportAsync()`** — async rule evaluation:
    - Supports `IQRulesAsyncOptions`: `timeoutMs`, `timeoutMessage`, and `mode: 'parallel' | 'serial'`
    - `parallel` (default): all predicates start simultaneously (`Promise.all`)
    - `serial`: predicates execute sequentially in declaration order
    - Timed-out predicates are flagged with `timedOut: true` in the error entry
    - `IQRule<T>` generic — predicate parameter now typed: `(value: T) => boolean | Promise<boolean>`
- **`validationReport()` / `isValid()` instance methods** — convenience wrappers for inline validation:
    - `isValid()` → `boolean`
    - `validationReport()` → `IQValidationReport` with `{ valid, errors, integrityResult }`
- **`/forms` submodule** (`@cartago-git/quickmodel/forms`) — standalone form-validation helpers:
    - `qGroups(...names)` — creates a typed group-name map (TS 4.1+)
    - `qGetGroups(instance)` — returns distinct `@QGroup` names on an instance
    - `qCheckRules(instance, options?)` — runs `@QRule` predicates (optionally filtered by group)
    - `qCheckRulesAsync(instance, options?)` — async version with timeout + mode support
    - `qCheckRulesByGroup(instance)` — runs rules grouped by `@QGroup` names
    - `qCheckRulesByGroupAsync(instance)` — async counterpart
    - `qGroups5` in `/compat/ts5/forms` — mutable arrays without `as const` (TS 5.0+)
- **14 built-in validator decorators** (thin wrappers over `@QRule`):
    - `@IsEmail()`, `@IsUrl()`, `@IsNotEmpty()`, `@IsUuid()`, `@IsDateString()`
    - `@MinLength(n)`, `@MaxLength(n)`, `@Matches(regex)`
    - `@Min(n)`, `@Max(n)`, `@IsInt()`, `@IsPositive()`, `@IsNegative()`
    - `@IsIn(values)`
    - All work on plain classes and `QModel` subclasses; compatible with `@QGroup`
- **`/matchers` submodule** (`@cartago-git/quickmodel/matchers`) — custom test matchers:
    - `toBeValidQModel()` — all `@QRule` checks pass
    - `toHaveQRuleError(field, message?)` — specific field has a rule error
    - `toHaveQField(fieldName)` — property has `@QField` decorator
    - `toMatchQModel(expected)` — deep equality via `serialize()`
    - `toBeIntact()` — `hasIntegrity()` returns true
    - `toHaveDirtyField(field)` — `isDirty(field)` returns true
    - Compatible with Vitest and Bun Test via `expect.extend(quickmodelMatchers)`
- **MCP Server** (`src/mcp/server.ts`) — AI assistant integration via Model Context Protocol:
    - **20 public tools**: `create_model`, `validate_usage`, `list_transformers`, `list_validators`, `generate_mock`, `inspect_model`, `search_docs`, `interface_to_model`, `export_json_schema`, `explain_error`, `simulate_transformation`, `json_to_model`, `check_integrity`, `diff_models`, `get_form_schema`, `get_model_schema`, `roundtrip`, `simulate_rules`, `simulate_validation`, `simulate_async_rules`
    - **20 internal dev tools**: `update_docs`, `generate_test`, `check_jsdocs`, `check_health`, `coverage_report`, `check_project_rules`, `check_security`, `sync_docs`, `scaffold_feature`, `check_api_compatibility`, `benchmark_performance`, `lint_check`, `typecheck`, `run_tests`, `pre_commit_check`, `get_staged_files`, `project_status`, `check_bundle_size`, `check_changelog`, `list_todos`
    - Start server: `npx @cartago-git/quickmodel mcp`
- **MCP Prompts / Skills** (`src/mcp/prompts/`) — 19 guided AI workflows:
    - **13 public skills**: `quickmodel_from_typescript`, `quickmodel_debug`, `quickmodel_generate_test_data`, `quickmodel_inspect_and_schema`, `quickmodel_form_validation`, `quickmodel_full_pipeline`, `quickmodel_mixin`, `quickmodel_alias_computed`, `quickmodel_migration`, `quickmodel_async_rules`, `quickmodel_add_qgroup`, `quickmodel_security_review`, `quickmodel_transformer_guide`
    - **6 internal/maintainer skills**: `quickmodel_implement_feature`, `quickmodel_fix_lint`, `quickmodel_fix_typecheck`, `quickmodel_refactor`, `quickmodel_apply_solid`, `quickmodel_sync_project`
- **Framework integration documentation** (guides + tests):
    - Angular (37 tests), React (31 tests), Vue (27 tests), Svelte (21 tests), Backend/Express (25 tests)
- **Ecosystem integration documentation** (guides + tests):
    - TanStack Query, tRPC, Prisma, Formik, React Hook Form, Zustand, MSW, Redux Toolkit, TypeORM, GraphQL/Apollo, OpenAPI/Swagger, Electron IPC, Mongoose
- **Storage & Persistence guide** — localStorage, IndexedDB, SQLite, Capacitor Preferences, caching layers
- **Test Runners integration guide** — Jest, Jasmine, Mocha/Chai, Node:test, AVA — adapters + 147 tests
- **Immer library compatibility** — `copy()` + Immer `produce` patterns for immutable updates in Redux slices
- **Test suite expanded** from ~700 to 3300+ tests, including:
    - MCP server and tool tests (all 20 public tools covered)
    - MCP prompt/skill tests
    - Framework integration tests (141 tests across 5 frameworks)
    - Ecosystem integration tests (200+ tests across 13 libraries)
    - Test runner integration tests (147 tests)
    - Coverage gap tests with Proxy-based catch-block validation
    - Security tests (DoS, prototype pollution, ReDoS, injection vectors)
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
