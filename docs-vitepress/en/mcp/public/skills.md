# MCP Prompts / Skills

**Prompts** (also called **skills**) are guided AI workflows built on top of the [Public Tools](./). Instead of calling individual tools manually, a skill orchestrates a sequence of tool calls to solve a complete task — given just a few inputs from you.

Use skills when you want the AI to drive the process end-to-end without you having to chain tools yourself.

## Available Skills

| Skill name                                                        | Title                                  | Description                                                                     |
| ----------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convert TypeScript Interface to QModel | Generate a QModel class from a TS interface                                     |
| [`quickmodel_debug`](#quickmodel_debug)                           | Debug a QuickModel                     | Diagnose and fix validation or transformation issues                            |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generate Test Data for a QuickModel    | Create realistic mock data verified through the pipeline                        |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspect Model and Export Schema        | Inspect a model and export its schema in multiple formats                       |
| [`quickmodel_form_validation`](#quickmodel_form_validation)       | Add Form Validation to a QuickModel    | Guided workflow to add `@QField`, `@QRule`, and `@QGroup`                       |
| [`quickmodel_full_pipeline`](#quickmodel_full_pipeline)           | Walk the Full QuickModel Pipeline      | `create()` → `checkIntegrity()` → `checkRules()` → `serialize()`                |
| [`quickmodel_mixin`](#quickmodel_mixin)                           | Extend a Base Class with QModel Mixin  | `QModel.extends(BaseClass)` for TypeORM / NestJS entities                       |
| [`quickmodel_alias_computed`](#quickmodel_alias_computed)         | Use @QAlias and @QComputed             | Field name remapping and getter serialization                                   |
| [`quickmodel_migration`](#quickmodel_migration)                   | Migrate Legacy Code to QuickModel      | Convert plain classes / v1 code to idiomatic v2 patterns                        |
| [`quickmodel_async_rules`](#quickmodel_async_rules)               | ⚠️ Async Rules with checkRulesAsync()  | Async-only: DB lookups, API calls — NOT for sync predicates                     |
| [`quickmodel_add_qgroup`](#quickmodel_add_qgroup)                 | Add @QGroup to a Model                 | Group fields and enable `checkGroups()` group-level validation                  |
| [`quickmodel_security_review`](#quickmodel_security_review)       | Security Review                        | Mass assignment, DoS, prototype pollution, ReDoS audit                          |
| [`quickmodel_transformer_guide`](#quickmodel_transformer_guide)   | Transformer Guide                      | Pick the right transformer for a TS type and simulate it                        |
| [`quickmodel_implement_feature`](#quickmodel_implement_feature)   | Implement Feature (TDD)                | Full TDD cycle enforced by `lint_check` + `typecheck` gates                     |
| [`quickmodel_fix_lint`](#quickmodel_fix_lint)                     | Fix ESLint Errors                      | Step-by-step lint fix with `lint_check` + `pre_commit_check` gates              |
| [`quickmodel_fix_typecheck`](#quickmodel_fix_typecheck)           | Fix TypeScript Type Errors             | Step-by-step TS fix with `typecheck` + `pre_commit_check` gates                 |
| [`quickmodel_refactor`](#quickmodel_refactor)                     | Safe Refactor (TDD-gated)              | Refactor cycle gated by `run_tests`, `lint_check`, `typecheck`                  |
| [`quickmodel_apply_solid`](#quickmodel_apply_solid)               | Apply SOLID Principles (guided)        | Structured per-principle review gated by `run_tests`, `lint_check`, `typecheck` |
| [`quickmodel_sync_project`](#quickmodel_sync_project)             | Sync Project (health + docs)           | `project_status` snapshot → fix failures → regenerate docs via `sync_docs`      |

---

## `quickmodel_from_typescript`

**Convert a TypeScript interface into a fully annotated QuickModel class.**

Guides the AI through parsing the interface, identifying transformable types (`Date`, `BigInt`, `Set`, `Map`, …), and generating a ready-to-use `QModel` class with the correct `@Quick` decorator. After generation, `validate_usage` is called automatically to verify correctness.

### Arguments

| Argument     | Required | Description                                                                                                    |
| ------------ | -------- | -------------------------------------------------------------------------------------------------------------- |
| `typescript` | ✅ Yes   | TypeScript interface or type definition to convert (e.g. `interface IUser { id: number; createdAt: string; }`) |
| `model_name` | ✗ No     | Optional name for the generated model class (defaults to the interface name without the `I` prefix)            |

### Tools called internally

1. `interface_to_model` — converts the interface into a `QModel` class with `@Quick` decorators
2. `validate_usage` — checks the generated code for correctness and best practices

### Example

```
User prompt: "Convert this interface to a QuickModel"
typescript: "interface IUser { id: number; createdAt: string; tags: string[]; }"

→ AI calls interface_to_model({ code: "..." })
→ AI calls validate_usage({ code: "..." })
→ Returns final QModel class + usage example
```

---

## `quickmodel_debug`

**Debug a QuickModel that is throwing validation errors or producing unexpected output.**

The AI inspects the model structure, translates any thrown error into plain language, validates the class definition, and optionally simulates the transformation with your sample data to trace the exact failure path. It then returns a corrected version of the model.

### Arguments

| Argument      | Required | Description                                                                                      |
| ------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `model_code`  | ✅ Yes   | The QuickModel class code that has the issue                                                     |
| `error`       | ✗ No     | The JSON string of the thrown error, or a plain-language description of the unexpected behaviour |
| `sample_data` | ✗ No     | JSON sample data that triggers the issue (helps trace the exact transformation)                  |

### Tools called internally

1. `inspect_model` — analyses model structure, decorators, and options
2. `explain_error` _(if `error` was provided)_ — translates the error into plain language
3. `validate_usage` — checks the class for structural problems
4. `simulate_transformation` _(if `sample_data` was provided)_ — traces the exact transformation path

### Example

```
model_code: "@Quick({ createdAt: Date }) class User extends QModel<IUser> { ... }"
error: '{ "error": "User.createdAt: Invalid Date string: undefined" }'
sample_data: '{ "id": 1 }'   ← createdAt is missing

→ AI calls inspect_model
→ AI calls explain_error → "createdAt is undefined because sample_data is missing the field"
→ AI calls validate_usage
→ AI calls simulate_transformation
→ Returns corrected model + explanation
```

---

## `quickmodel_generate_test_data`

**Generate realistic mock/test data for a QuickModel class.**

The AI inspects the model to understand all property types and their transformer requirements, generates mock data (respecting format constraints like ISO strings for `Date`, digit strings for `BigInt`, arrays for `Set`/`Map`), and finally verifies the data survives the full transformation pipeline. The result is data you can drop directly into a unit test or fixture file.

### Arguments

| Argument     | Required | Description                                                                                           |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Yes   | The QuickModel class code to generate test data for                                                   |
| `count`      | ✗ No     | Number of mock instances to generate (default: `"1"`)                                                 |
| `context`    | ✗ No     | Domain context to guide realistic data generation (e.g. `"e-commerce user"`, `"banking transaction"`) |

### Tools called internally

1. `inspect_model` — understands all properties, their types, and transformer configuration
2. `generate_mock` — produces type-aware mock data matching the schema
3. `simulate_transformation` — verifies the mock data passes the full transformation pipeline

### Example

```
model_code: "@Quick({ birth: Date, balance: BigInt }) class Account extends QModel ..."
count: "3"
context: "fintech savings account"

→ AI calls inspect_model
→ AI calls generate_mock({ schema: { birth: "date", balance: "bigint" }, count: 3 })
→ AI calls simulate_transformation to verify
→ Returns 3 verified mock objects ready for tests
```

---

## `quickmodel_inspect_and_schema`

**Inspect a QuickModel and export its schema in one or more formats.**

The AI analyses the model structure (properties, types, decorators, options) and exports the schema in every requested format. It also provides integration examples showing how to use each exported schema with its respective library or tool.

### Arguments

| Argument     | Required | Description                                                                                                                                             |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Yes   | The QuickModel class code to inspect and export                                                                                                         |
| `formats`    | ✗ No     | Comma-separated list of schema formats (default: `"json,openapi"`). Available values: `json`, `openapi`, `zod`, `mongo`, `typescript`, `graphql`, `ajv` |

### Supported formats

| Format value | Output                          |
| ------------ | ------------------------------- |
| `json`       | JSON Schema Draft-07            |
| `openapi`    | OpenAPI 3.0 schema component    |
| `zod`        | Zod validator schema string     |
| `mongo`      | Mongoose / MongoDB SchemaTypes  |
| `typescript` | TypeScript interface string     |
| `graphql`    | GraphQL SDL type definition     |
| `ajv`        | AJV-compatible validator schema |

### Tools called internally

1. `inspect_model` — full analysis of model structure
2. `export_json_schema` — called once per requested format

### Example

```
model_code: "@Quick({ createdAt: Date }) class User extends QModel<IUser> { ... }"
formats: "json,zod,openapi"

→ AI calls inspect_model
→ AI calls export_json_schema({ code: "...", format: "json" })
→ AI calls export_json_schema({ code: "...", format: "zod" })
→ AI calls export_json_schema({ code: "...", format: "openapi" })
→ Returns all 3 schemas + integration examples for each
```

---

## `quickmodel_form_validation`

**Add `@QField`, `@QRule`, and `@QGroup` to a QuickModel class with guided validation.**

Walks the AI step-by-step through declaring field metadata with `@QField`, adding business-logic predicates with `@QRule`, grouping sections with `@QGroup`, verifying with `validate_usage`, and testing live with `simulate_validation`.

### Arguments

| Argument           | Required | Description                                                                |
| ------------------ | -------- | -------------------------------------------------------------------------- |
| `form_description` | ✅ Yes   | Description of the form and its validation requirements                    |
| `fields`           | ✗ No     | Comma-separated list of field names to include (e.g. `"name, email, age"`) |

### Workflow

1. Explains `@QField` usage (widget, label, required, hint)
2. Shows `@QRule` predicate syntax
3. Demonstrates `@QGroup` grouping
4. Calls `validate_usage` to verify the model code
5. Calls `simulate_validation` with representative data to test predicates live
6. Shows how to use `getFormSchema()`, `getFormSchemaGrouped()`, and `checkRules()` at runtime

### Tools called internally

1. `validate_usage` — checks the model code for structural errors and best-practice violations
2. `simulate_validation` — tests predicates live with representative data

### Example

```
form_description: "User registration form with name, email and password confirmation"
fields: "name, email, password, confirmPassword"

→ AI generates model with @QField and @QRule decorators
→ AI calls validate_usage to check for errors
→ AI calls simulate_validation with { name: "Jo", email: "not-valid", password: "abc", confirmPassword: "xyz" }
→ Returns validation report + final model code
```

---

## `quickmodel_full_pipeline`

**Walk the complete QuickModel data lifecycle end-to-end.**

Guides the AI through every stage: raw data → `create()` → `checkIntegrity()` → `checkRules()` → `serialize()` / `toJSON()`. Uses `check_integrity`, `simulate_validation`, and `simulate_transformation` to verify each step with real data.

### Arguments

| Argument      | Required | Description                                                                                     |
| ------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `model_code`  | ✅ Yes   | The QuickModel class definition to walk through                                                 |
| `sample_data` | ✗ No     | Optional JSON string with sample data to use at each step (e.g. `'{"createdAt":"2024-01-01"}'`) |

### Workflow

1. **Stage 1 — Hydration**: `create()` / `new Model(data)` — calls `simulate_transformation`
2. **Stage 2 — Integrity**: `checkIntegrity()` — calls `check_integrity`
3. **Stage 3 — Rules**: `checkRules()` — calls `simulate_validation`
4. **Stage 4 — Serialization**: `serialize()` / `toJSON()`

### Tools called internally

1. `simulate_transformation` — verifies hydration and field-level transformers
2. `check_integrity` — validates each field against its expected type constraints
3. `simulate_validation` — runs `@QRule` predicates with the provided sample data

### Example

```
model_code: "
  @Quick({ createdAt: Date, score: Number })
  class OrderModel extends QModel<OrderModel> {
    declare createdAt: Date;
    declare score: number;
  }
"
sample_data: '{"createdAt":"2024-06-15","score":"42"}'

→ AI calls simulate_transformation with sample data
→ AI calls check_integrity to verify Date is valid
→ AI calls simulate_validation for any @QRule predicates
→ Returns full pipeline report with serialized output
```

---

## `quickmodel_mixin`

**Extend any non-QModel base class with QuickModel capabilities.**

Explains the `QModel.extends(BaseClass)` mixin pattern used in Angular (TypeORM entities) and NestJS (DTOs). Covers `IQImplements` typing, the `instanceof` caveat, and uses `validate_usage` to verify correctness.

### Arguments

| Argument       | Required | Description                                                                                           |
| -------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `base_class`   | ✅ Yes   | The name of the base class to extend (e.g. `"BaseEntity"`, `"TypeORMUser"`)                           |
| `model_fields` | ✗ No     | Optional comma-separated field declarations (e.g. `"createdAt: Date, status: string, score: number"`) |

### Workflow

1. Shows `QModel.extends(BaseClass)` wiring with `@Quick`
2. Adds `IQImplements<typeof MyModel>` for strong static typing
3. Explains the `instanceof QModel` caveat and `isQModel()` alternative
4. Calls `validate_usage` to check the generated code for common mistakes

### Tools called internally

1. `validate_usage` — checks the mixin wiring for common mistakes and `IQImplements` usage

### Example

```
base_class: "BaseEntity"
model_fields: "createdAt: Date, updatedAt: Date, status: string"

→ AI generates MyModel extends QModel.extends(BaseEntity)
→ AI calls validate_usage to verify the mixin is correct
→ Returns final model code with explanations for instanceof behaviour
```

---

## `quickmodel_alias_computed`

**Explain and apply `@QAlias` and `@QComputed` decorators.**

Covers how to remap field names during serialization (`snake_case ↔ camelCase`) with `@QAlias`, and how to include computed getter values in `serialize()` / `toJSON()` output with `@QComputed`. Ends with a `validate_usage` call.

### Arguments

| Argument     | Required | Description                                                                       |
| ------------ | -------- | --------------------------------------------------------------------------------- |
| `model_code` | ✗ No     | Optional QuickModel class code to analyze or enrich with `@QAlias` / `@QComputed` |

### Workflow

1. Explains `@QAlias` — field rename on `serialize()` and `create()` key lookup
2. Explains `@QComputed` — opts a getter into the serialized output
3. Shows common mistakes (using `@QComputed` on a `declare` field instead of a getter)
4. Calls `validate_usage` to confirm the model is correct

### Tools called internally

1. `validate_usage` — confirms `@QAlias` and `@QComputed` are applied correctly

### Example

```
model_code: "@Quick({})\nclass User extends QModel<User> { declare firstName: string; }"

→ AI adds @QAlias("first_name") and @QComputed() fullName getter
→ AI calls validate_usage
→ Returns corrected model with explanation of serialize() / toJSON() output
```

---

## `quickmodel_migration`

**Migrate legacy TypeScript classes or old QuickModel v1 code to idiomatic v2 patterns.**

Guides the AI through converting property assignments to `declare` fields, wrapping the class with `@Quick({})`, adding transformer types, removing manual constructors, and calling `validate_usage` to confirm correctness.

### Arguments

| Argument      | Required | Description                                                      |
| ------------- | -------- | ---------------------------------------------------------------- |
| `legacy_code` | ✅ Yes   | The legacy TypeScript class or v1 code to migrate to v2 patterns |

### Workflow

1. Identifies all fields that need `declare` prefix
2. Determines which fields need transformer entries in `@Quick({})`
3. Removes any manual constructors that assign fields
4. Wraps class with `@Quick({})` extending `QModel<T>`
5. Calls `validate_usage` to verify the migrated code

### Tools called internally

1. `validate_usage` — confirms the migrated class uses `declare`, `@Quick({})`, and extends `QModel<T>` correctly

### Example

```
legacy_code: "class User { name: string = ''; createdAt: Date = new Date(); }"

→ AI generates: @Quick({ createdAt: Date }) class User extends QModel<User> { declare name: string; declare createdAt: Date; }
→ AI calls validate_usage
→ Returns migrated code with per-change explanation
```

---

## `quickmodel_async_rules`

> ⚠️ **Async-only**: Use this skill only when your `@QRule` predicates genuinely require asynchronous operations (database lookups, external API calls, async validators). For synchronous rules, use `checkRules()` — it is simpler and faster.

**Guide usage of `checkRulesAsync()` for async business-logic predicates.**

Covers the `timeoutMs` safety net, `parallel` vs `serial` execution mode, and NestJS / HTTP-request integration patterns.

### Arguments

| Argument     | Required | Description                                                                                                 |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Yes   | The QuickModel class with `@QRule` decorators to make async                                                 |
| `context`    | ✗ No     | Optional description of the async context (e.g. "NestJS service with TypeORM", "database uniqueness check") |

### Workflow

1. Clearly warns that this is async-only (sync rules should use `checkRules()`)
2. Shows `checkRulesAsync()` with `timeoutMs` and `parallel` / `serial` mode
3. Demonstrates NestJS / async context injection pattern
4. Shows `async (value) => Promise<boolean>` predicate syntax
5. Calls `validate_usage` to verify the model

### Tools called internally

1. `validate_usage` — verifies async `@QRule` predicates and `checkRulesAsync()` usage

### Example

```
model_code: "@Quick({}) class User extends QModel<User> { @QRule(...) declare email: string; }"
context: "NestJS service with TypeORM repository"

→ AI warns: async-only, use checkRules() for sync predicates
→ AI shows: await instance.checkRulesAsync({ timeoutMs: 5000, mode: "parallel" })
→ AI shows NestJS @Injectable() integration
→ Returns async-ready model with usage guidance
```

---

## `quickmodel_add_qgroup`

**Add `@QGroup` field grouping and enable group-level validation with `checkGroups()`.**

Explains how to annotate fields with `@QGroup`, how to stack multiple groups on a single field, how to call `checkGroups()` to validate a subset of fields, and the difference between `checkGroups()` and `checkRules()`. Calls `validate_usage` to verify the annotated model.

### Arguments

| Argument     | Required | Description                                                 |
| ------------ | -------- | ----------------------------------------------------------- |
| `model_code` | ✅ Yes   | The QuickModel class to annotate with `@QGroup`             |
| `group_name` | ✗ No     | Optional group name to use (e.g. `"personal"`, `"billing"`) |

### Workflow

1. Shows the `@QGroup("name")` decorator above `@QField` / `@QRule`
2. Demonstrates multi-group stacking: `@QGroup("a") @QGroup("b") declare field`
3. Shows `instance.checkGroups(["group"])` for group-level validation
4. Calls `validate_usage` to verify the resulting model

### Tools called internally

1. `validate_usage` — confirms `@QGroup` annotations and `checkGroups()` usage are correct

### Example

```
model_code: "@Quick({}) class User extends QModel<IUser> { declare name: string; declare email: string; }"
group_name: "contact"

→ AI annotates fields with @QGroup("contact")
→ AI explains checkGroups(["contact"]) vs checkRules()
→ AI calls validate_usage
→ Returns annotated model + usage examples
```

---

## `quickmodel_security_review`

**Audit a QuickModel class for common security vulnerabilities.**

Orchestrates `check_security` to verify the full security test suite passes, then explains the four key areas: mass assignment hardening (`unknownPropertyPolicy: 'strip'`), DoS prevention with `populationLimit`, prototype pollution prevention, and ReDoS protection.

### Arguments

| Argument     | Required | Description                                            |
| ------------ | -------- | ------------------------------------------------------ |
| `model_code` | ✗ No     | Optional model code for class-specific security review |

### Workflow

1. Calls `check_security` to run the full security test suite
2. Explains mass assignment: `unknownPropertyPolicy: 'strip'` in `@Quick`
3. Explains DoS limits: `populationLimit` and array/string limits
4. Explains prototype pollution: strict typing blocks `__proto__`, `constructor`
5. Explains ReDoS: RegExp transformer limits and complexity checks
6. If `model_code` provided, shows class-specific recommendations

### Tools called internally

1. `check_security` — runs the full security test suite (mass assignment, DoS, pollution, ReDoS)

### Example

```
→ AI calls check_security
→ AI explains: set unknownPropertyPolicy: 'strip' to block mass assignment
→ AI explains: populationLimit default (5000), how to lower it
→ AI explains: __proto__ and constructor keys are blocked
→ Returns security summary + hardening checklist
```

---

## `quickmodel_transformer_guide`

**Pick the right transformer for a TypeScript type and validate it in real time.**

Provides a quick type→transformer reference table, calls `simulate_transformation` with sample data, and explains common pitfalls per transformer type.

### Arguments

| Argument          | Required | Description                                                                       |
| ----------------- | -------- | --------------------------------------------------------------------------------- |
| `typescript_type` | ✅ Yes   | The TypeScript type (e.g. `Date`, `bigint`, `Map<string, number>`, `RegExp`)      |
| `sample_data`     | ✗ No     | Optional sample value to test the transformer (e.g. `"2024-01-15T00:00:00.000Z"`) |

### Transformer Quick Reference

| TypeScript type       | Entry in `@Quick`                                           |
| --------------------- | ----------------------------------------------------------- |
| `Date`                | `@Quick({ field: Date })`                                   |
| `bigint`              | `@Quick({ field: BigInt })`                                 |
| `Set<T>`              | `@Quick({ field: Set })`                                    |
| `Map<K,V>`            | `@Quick({ field: Map })`                                    |
| `RegExp`              | `@Quick({ field: RegExp })`                                 |
| `Symbol`              | `@Quick({ field: Symbol })`                                 |
| `ArrayBuffer`         | `@Quick({ field: ArrayBuffer })`                            |
| `WeakMap` / `WeakSet` | `@Quick({ field: WeakMap })` / `@Quick({ field: WeakSet })` |

### Workflow

1. Shows the correct `@Quick` entry for the requested type
2. Calls `simulate_transformation` with provided or generated sample data
3. Highlights common pitfalls (e.g. `Date` requires ISO string, `BigInt` requires digit string)

### Tools called internally

1. `simulate_transformation` — validates the transformer with real data and traces the result

### Example

```
typescript_type: "Date"
sample_data: "2024-06-01T10:00:00.000Z"

→ AI shows: @Quick({ createdAt: Date }) class Model extends QModel<...>
→ AI calls simulate_transformation({ data: { createdAt: "2024-06-01T..." }, ... })
→ AI warns: non-ISO strings may produce Invalid Date
→ Returns transformer guide + simulation result
```

---

## `quickmodel_implement_feature`

**Full TDD cycle for any new QuickModel feature, with mandatory lint and typecheck gates.**

This skill drives the AI through the complete red‑green‑refactor loop enforced by three automated gates: `lint_check`, `typecheck`, and `check_project_rules`. The AI **cannot** declare the feature done until all three gates return `passed: true`.

### Arguments

| Argument              | Required | Description                                                                    |
| --------------------- | -------- | ------------------------------------------------------------------------------ |
| `feature_description` | ✅ Yes   | Plain-text description of the feature to implement                             |
| `file_paths`          | ✗ No     | Space-separated list of files to lint (defaults to the whole `src/` directory) |

### Workflow

1. 🔴 **Red** — Write a failing test that describes the expected behaviour
2. 🟢 **Green** — Implement the minimum code to make the test pass
3. 🚦 **lint_check gate** — Run `lint_check`; block until `passed: true`
4. 🚦 **typecheck gate** — Run `typecheck`; block until `passed: true`
5. 🚦 **check_project_rules gate** — Verify naming, id-length, max-params, etc.
6. ✅ **Done** — Only declared complete when all three gates pass

### Tools called internally

1. `run_tests` — validates red (failing) test and green (passing) implementation
2. `lint_check` — blocks on ESLint violations after implementation
3. `typecheck` — blocks on TypeScript type errors
4. `check_project_rules` — enforces naming, id-length, max-params, and import rules

### Example

```
feature_description: "Add a QTypecheckTool that runs tsc --noEmit and returns parsed errors"
file_paths: "src/mcp/tools/internal/typecheck.tool.ts"

→ AI writes tests/mcp/unit/internal/typecheck.test.ts (red)
→ AI creates src/mcp/tools/internal/typecheck.tool.ts (green)
→ AI calls lint_check({ targetFiles: ["src/mcp/tools/internal/typecheck.tool.ts"] })
→ AI calls typecheck({})
→ AI calls check_project_rules()
→ All pass → feature declared done
```

---

## `quickmodel_fix_lint`

**Step-by-step guided resolution of ESLint errors after a pre-commit failure or a `lint_check` that returned `passed: false`.**

Explains each violation in plain language, applies the minimal correct fix following the project rules (id-length, max-params, no-implied-eval, require-await, etc.), calls `lint_check` after every change, and only declares done once `pre_commit_check` returns `{ passed: true }`.

### Arguments

| Argument      | Required | Description                                                                                     |
| ------------- | -------- | ----------------------------------------------------------------------------------------------- |
| `lint_errors` | ✅ Yes   | Full text of the ESLint output from `lint_check`, `pre_commit_check`, or the Husky hook failure |
| `file_paths`  | ✗ No     | Comma-separated list of files to re-check (defaults to `src/`)                                  |

### Workflow

1. Parse each error from `lint_errors`
2. Explain the rule that was violated
3. Apply the correct minimal fix
4. Run `lint_check` after each file edit — block until `passed: true`
5. Run `pre_commit_check` as the final gate
6. Only declared done when `pre_commit_check` returns `{ passed: true }`

### Tools called internally

1. `lint_check` — re-runs ESLint after each fix to confirm no new violations introduced
2. `pre_commit_check` — final gate: staged-file lint + typecheck in one shot

### Example

```
lint_errors: """
/src/mcp/tools/public/diff-models.tool.ts
  169:10  error  Identifier name 'tA' is too short (< 3)  id-length
  170:10  error  Identifier name 'tB' is too short (< 3)  id-length
"""
file_paths: "src/mcp/tools/public/diff-models.tool.ts"

→ AI explains: id-length requires names ≥ 3 chars
→ AI renames: tA → valA, tB → valB
→ AI calls lint_check({ targetFiles: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ lint_check returns { passed: true }
→ AI calls pre_commit_check({ files: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ pre_commit_check returns { passed: true } → done
```

---

## `quickmodel_fix_typecheck`

**Step-by-step guided resolution of TypeScript type errors after `typecheck` returns `passed: false`.**

Explains each TS error code in plain language, applies the minimal correct type fix (never `as any`), calls `typecheck` after every batch of changes, and only declares done once `typecheck` AND `pre_commit_check` both return `{ passed: true }`.

### Arguments

| Argument      | Required | Description                                                                |
| ------------- | -------- | -------------------------------------------------------------------------- |
| `type_errors` | ✅ Yes   | Full text of the TypeScript error output from `typecheck` or the `tsc` CLI |
| `file_paths`  | ✗ No     | Comma-separated list of files to focus on (defaults to full `src/`)        |

### Common TS Error Quick Reference

| Code   | Meaning                         | Fix strategy                                                    |
| ------ | ------------------------------- | --------------------------------------------------------------- |
| TS2322 | Type mismatch (assignability)   | Align types; never cast with `as any`                           |
| TS2339 | Property does not exist on type | Add property to interface; use optional chaining if intentional |
| TS7006 | Parameter has implicit `any`    | Add explicit parameter type annotation                          |
| TS2345 | Argument type mismatch          | Correct argument type or fix the function signature             |
| TS2531 | Object is possibly null         | Add null check; use optional chaining or non-null assertion     |
| TS2304 | Cannot find name                | Import missing symbol; verify path alias (`@/core/...`)         |
| TS2554 | Expected N arguments, got M     | Correct the call site or update the signature                   |

### Workflow

1. Parse each error from `type_errors`
2. Identify the TS code → explain the root cause
3. Apply the minimal correct fix (no `any`, no suppressions)
4. Run `typecheck({})` after each batch — block until `passed: true`
5. Run `pre_commit_check` as the final gate
6. Only declared done when both return `{ passed: true }`

### Tools called internally

1. `typecheck` — re-runs `tsc --noEmit` after each batch of fixes
2. `pre_commit_check` — final gate: staged-file lint + typecheck in one shot

### Example

```
type_errors: """
src/mcp/tools/internal/my-tool.ts(15,5): error TS2322: Type 'string' is not assignable to type 'number'.
"""

→ AI explains: variable declared as number but assigned a string literal
→ AI fixes: changes the type annotation from number to string (or corrects the assignment)
→ AI calls typecheck({})
→ typecheck returns { passed: true }
→ AI calls pre_commit_check({ files: ["src/mcp/tools/internal/my-tool.ts"] })
→ pre_commit_check returns { passed: true } → done
```

---

## `quickmodel_refactor`

**Safe refactoring cycle with TDD gates — ensures no regressions and full rule compliance.**

Establishes a green test baseline, applies the refactor, then gates on `run_tests` + `lint_check` + `typecheck` + `check_project_rules` before declaring done.

### Arguments

| Argument      | Required | Description                                                                               |
| ------------- | -------- | ----------------------------------------------------------------------------------------- |
| `description` | ✅ Yes   | What should be refactored and the goal (e.g. "Extract parseOutput into a private helper") |
| `file_paths`  | ✗ No     | Comma-separated list of target files (AI infers from `description` when omitted)          |

### Gates (in order)

| Gate                  | What it checks                                |
| --------------------- | --------------------------------------------- |
| `run_tests` (before)  | Green baseline — all tests pass before change |
| `run_tests` (after)   | No regressions introduced                     |
| `lint_check`          | No ESLint violations                          |
| `typecheck`           | No TypeScript type errors                     |
| `check_project_rules` | id-length, max-params, naming, imports        |

### Workflow

1. Call `run_tests` → confirm green baseline
2. Apply the targeted refactor
3. Call `run_tests` again → no regressions
4. Call `lint_check` → `passed: true`
5. Call `typecheck({})` → `passed: true`
6. Call `check_project_rules` → zero violations
7. Only declared done when all gates pass

### Tools called internally

1. `run_tests` — establishes green baseline and verifies no regressions after the refactor
2. `lint_check` — verifies no ESLint violations introduced
3. `typecheck` — verifies no TypeScript type errors introduced
4. `check_project_rules` — enforces id-length, max-params, naming, and import rules

### Example

```
description: "Extract the parseCount and parseFailures methods in QRunTestsTool into a private parser helper"
file_paths: "src/mcp/tools/internal/run-tests.tool.ts"

→ AI calls run_tests() → 489 pass, 0 fail (baseline)
→ AI extracts methods into RunTestsParser class
→ AI calls run_tests() → still 489 pass, 0 fail
→ AI calls lint_check({ targetFiles: ["src/mcp/tools/internal/run-tests.tool.ts"] })
→ lint_check returns { passed: true }
→ AI calls typecheck({}) → { passed: true }
→ AI calls check_project_rules() → zero violations → done
```

---

## `quickmodel_apply_solid`

**Guided SOLID principles review with targeted refactors and gate enforcement.**

Analyses files against all 5 SOLID principles (SRP, OCP, LSP, ISP, DIP), proposes targeted improvements and gates every change with `run_tests`, `lint_check` and `typecheck`.

### Arguments

| Argument     | Required | Description                                                                                               |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------- |
| `file_paths` | ✅ Yes   | Comma-separated list of source files to review (e.g. `"src/mcp/tools/internal/my-tool.ts"`)               |
| `concern`    | ✗ No     | Optional specific SOLID concern already identified (e.g. `"SRP violation: class handles parsing and IO"`) |

### SOLID Principles Reference

| Principle             | Code    | What to check                                                   | Common fix                                  |
| --------------------- | ------- | --------------------------------------------------------------- | ------------------------------------------- |
| Single Responsibility | **SRP** | Does each class have exactly ONE reason to change?              | Split concerns into separate classes        |
| Open/Closed           | **OCP** | Can behaviours be extended without modifying existing code?     | Use abstract bases, strategy pattern        |
| Liskov Substitution   | **LSP** | Can subtypes fully replace base types without breaking callers? | Don't override to throw; preserve contract  |
| Interface Segregation | **ISP** | Are interfaces lean? Do clients depend on unused methods?       | Split fat interfaces into focused ones      |
| Dependency Inversion  | **DIP** | Do high-level modules depend on abstractions, not concretions?  | Inject via interface; constructor injection |

### Gates (in order, after each change)

| Gate         | What it checks            |
| ------------ | ------------------------- |
| `run_tests`  | No regressions introduced |
| `lint_check` | No ESLint violations      |
| `typecheck`  | No TypeScript type errors |

### Workflow

1. Call `run_tests` → confirm green baseline
2. Review SRP → extract if needed → run gates
3. Review OCP → introduce abstractions → run gates
4. Review LSP → fix overrides → run gates
5. Review ISP → split interfaces → run gates
6. Review DIP → replace `new Concrete()` with injected abstractions → run gates
7. Only declared done when all gates pass

### Tools called internally

1. `run_tests` — establishes green baseline and verifies no regressions after each change
2. `lint_check` — verifies no ESLint violations after each change
3. `typecheck` — verifies no TypeScript type errors after each change

### Example

```
file_paths: "src/mcp/tools/internal/my-tool.ts"
concern: "The class handles both HTTP fetching and JSON parsing — SRP violation"

→ AI calls run_tests() → green baseline
→ AI extracts parser into a private helper class
→ AI calls run_tests() → still green
→ AI calls lint_check() → { passed: true }
→ AI calls typecheck({}) → { passed: true } → done
```

---

## `quickmodel_sync_project`

**Full project synchronisation — keeps tests, lint, typecheck and documentation in lockstep.**

Calls `project_status` to get a consolidated health snapshot, fixes any failures detected, then regenerates documentation with `sync_docs`. Use after completing a feature, refactor or any batch of changes.

### Arguments

_None required._

### Gates (in order)

| Gate             | What it checks                                        |
| ---------------- | ----------------------------------------------------- |
| `project_status` | Consolidated snapshot: tests + lint + typecheck       |
| `run_tests`      | Fix until `passed: true` if tests fail                |
| `lint_check`     | Fix until `passed: true` if lint errors exist         |
| `typecheck`      | Fix until `passed: true` if TS errors exist           |
| `sync_docs`      | Regenerate API reference and auto-generated doc files |

### Workflow

1. Call `project_status` → get current health snapshot
2. If tests fail → diagnose and fix → re-run `run_tests` until `passed: true`
3. If lint errors → fix violations → re-run `lint_check` until `passed: true`
4. If typecheck errors → fix TS errors → re-run `typecheck` until `passed: true`
5. Call `sync_docs` → regenerate documentation
6. Call `project_status` again → confirm `passed: true` across all checks
7. Only declared done when all layers are green and docs are regenerated

### Tools called internally

1. `project_status` — consolidated health snapshot (tests + lint + typecheck)
2. `run_tests` — fix failures until `passed: true`
3. `lint_check` — fix violations until `passed: true`
4. `typecheck` — fix errors until `passed: true`
5. `sync_docs` — regenerate API reference and documentation files

### Example

```
→ AI calls project_status() → { passed: false, tests: { passed: true }, lint: { passed: false }, typecheck: { passed: true } }
→ AI fixes lint violations
→ AI calls lint_check() → { passed: true }
→ AI calls sync_docs() → "Successfully updated 6 documentation files"
→ AI calls project_status() → { passed: true } → done
```
