# MCP Prompts / Skills

**Prompts** (also called **skills**) are guided AI workflows built on top of the [Public Tools](./). Instead of calling individual tools manually, a skill orchestrates a sequence of tool calls to solve a complete task — given just a few inputs from you.

Use skills when you want the AI to drive the process end-to-end without you having to chain tools yourself.

## Available Skills

| Skill name                                                        | Title                                  | Description                                                      |
| ----------------------------------------------------------------- | -------------------------------------- | ---------------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convert TypeScript Interface to QModel | Generate a QModel class from a TS interface                      |
| [`quickmodel_debug`](#quickmodel_debug)                           | Debug a QuickModel                     | Diagnose and fix validation or transformation issues             |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generate Test Data for a QuickModel    | Create realistic mock data verified through the pipeline         |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspect Model and Export Schema        | Inspect a model and export its schema in multiple formats        |
| [`quickmodel_form_validation`](#quickmodel_form_validation)       | Add Form Validation to a QuickModel    | Guided workflow to add `@QField`, `@QRule`, and `@QGroup`        |
| [`quickmodel_full_pipeline`](#quickmodel_full_pipeline)           | Walk the Full QuickModel Pipeline      | `create()` → `checkIntegrity()` → `checkRules()` → `serialize()` |
| [`quickmodel_mixin`](#quickmodel_mixin)                           | Extend a Base Class with QModel Mixin  | `QModel.extends(BaseClass)` for TypeORM / NestJS entities        |
| [`quickmodel_alias_computed`](#quickmodel_alias_computed)         | Use @QAlias and @QComputed             | Field name remapping and getter serialization                    |
| [`quickmodel_migration`](#quickmodel_migration)                   | Migrate Legacy Code to QuickModel      | Convert plain classes / v1 code to idiomatic v2 patterns         |
| [`quickmodel_async_rules`](#quickmodel_async_rules)               | ⚠️ Async Rules with checkRulesAsync()  | Async-only: DB lookups, API calls — NOT for sync predicates      |

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

### Example

```
model_code: "@Quick({}) class User extends QModel<User> { @QRule(...) declare email: string; }"
context: "NestJS service with TypeORM repository"

→ AI warns: async-only, use checkRules() for sync predicates
→ AI shows: await instance.checkRulesAsync({ timeoutMs: 5000, mode: "parallel" })
→ AI shows NestJS @Injectable() integration
→ Returns async-ready model with usage guidance
```
