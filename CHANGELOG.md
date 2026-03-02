# Changelog

## [Unreleased]

### Breaking Changes — `$q*` namespace promotion (guard system removed)

- **All instance methods now use the `$q*` prefix exclusively.** The guarded layer
  (`_qCallDepth`, `_withQFlag`, `_assertQCall`) has been fully deleted; the `$q*` methods
  are now direct implementations with no overhead.
- **Legacy instance methods removed** — The following method names no longer exist on
  `QModel` or `QModelCollection` instances; any code calling them without the `$q` prefix
  will receive `TypeError: ... is not a function` at runtime:
  `serialize`, `isDirty`, `hasChanges`, `getChanges`, `patch`, `copy`, `reset`,
  `checkIntegrity`, `checkRules`, `isValid`, `toInterface`, `getInitInterface`,
  `diff`, `equals`, `hasIntegrity`, `validationReport`, `validate`,
  `getDirtyFields`, `getChangedFields`, `toPlain`, `getFormSchema`,
  `getFormSchemaGrouped`, `getMetadata`, `getSchema`.
- **Migration:** replace every call without a prefix with the `$q*` equivalent
  (e.g. `instance.serialize()` → `instance.$qSerialize()`). Static methods on the
  class (`User.getMetadata()`, `User.getSchema('json')`, etc.) are **unchanged**.
- **New instance methods added in this release:**
    - `$qToPlain()` — runtime-typed plain object (keeps `Date`, `BigInt`, `Set` as-is)
    - `$qGetFormSchema()` / `$qGetFormSchemaGrouped()` — instance-level form schema
    - `$qGetMetadata()` — instance-level field metadata
    - `$qGetSchema(type)` — instance-level schema export
    - `$qFrom(data)` — creates a new instance of the same model from a plain object
    - `$qFromJSON(json)` — creates a new instance from a JSON string

### Bug Fixes

- **`to-interface.service.ts`: false-positive circular-reference on `structuredClone`
  fallback values** — When `structuredClone(qmodelInstance)` produces a plain object copy
  (because the original is not JSON-serializable), that copy now correctly delegates to the
  source QModel's `$qToInterface()` instead of iterating over the clone's properties. This
  prevented diamond-shaped object graphs (same QModel instance referenced from multiple
  nested paths) from incorrectly throwing `[Circular reference]`.

### Performance

- **Lazy `ZodSchemaGenerator`** — `zod` is no longer in the static import graph of `quickmodel`'s
  main entry point. `ZodSchemaGenerator` was extracted to its own file
  (`src/core/services/zod-schema-generator.service.ts`) which loads `zod` via `createRequire` on
  first use (same pattern used for `@faker-js/faker` in the mock generator). Forward-compatible
  re-export kept in `schema-generators.service.ts` so existing imports are unaffected.
- **Lazy `QMockGenerator` init** — The `QMockGenerator` singleton inside `QModel` is now
  instantiated lazily on the first call to `.mock()` instead of eagerly at class-load time.
  This prevents the mock generator's constructor from running in codepaths that never use mocks.
- **New subpath `quickmodel/schema/zod`** — Exposes `ZodSchemaGenerator` as a standalone entry
  point. Consumers that only need Zod schema generation can now import it directly without pulling
  in any other schema generators or model code.
- **New subpath `quickmodel/mock`** — Exposes `QMockGenerator` and `QMockBuilder` without pulling
  in schema generators, the serializer pipeline, or `QModel`. `faker` remains lazily loaded.
- **New subpath `quickmodel/schema`** — Exposes all seven schema generators (JSON, Zod, Mongo,
  TypeScript, GraphQL, OpenAPI, AJV) as a cohesive group, without mock generation, `QModel`, or
  the serializer. `zod` remains lazily loaded.
- **Lazy `IntegrityService` init** — `IntegrityService` (and its 14 built-in transformer
  instances) is now instantiated lazily on the first call to `.checkIntegrity()` or `.isValid()`
  instead of eagerly at class-load time. This eliminates the startup cost of registering all
  built-in transformers for consumers whose code never validates integrity.
- **Bundle size documentation** — New guide page (EN + ES) explains the distinction between
  startup cost and bundle size, and lists all lazy-loaded components.

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
- **`/forms` submodule** (`quickmodel/forms`) — standalone form-validation helpers:
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
- **`/matchers` submodule** (`quickmodel/matchers`) — custom test matchers:
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
    - Start server: `npx quickmodel mcp`
- **MCP Prompts / Skills** (`src/mcp/prompts/`) — 20 guided AI workflows:
    - **14 public skills**: `quickmodel_from_typescript`, `quickmodel_debug`, `quickmodel_generate_test_data`, `quickmodel_inspect_and_schema`, `quickmodel_form_validation`, `quickmodel_full_pipeline`, `quickmodel_mixin`, `quickmodel_alias_computed`, `quickmodel_migration`, `quickmodel_async_rules`, `quickmodel_add_qgroup`, `quickmodel_security_review`, `quickmodel_transformer_guide`, `quickmodel_form_data`
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
