# MCP Prompts / Skills

**Prompts** (also called **skills**) are guided AI workflows built on top of the [Public Tools](./). Instead of calling individual tools manually, a skill orchestrates a sequence of tool calls to solve a complete task — given just a few inputs from you.

Use skills when you want the AI to drive the process end-to-end without you having to chain tools yourself.

## Available Skills

| Skill name                                                        | Title                                  | Description                                               |
| ----------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convert TypeScript Interface to QModel | Generate a QModel class from a TS interface               |
| [`quickmodel_debug`](#quickmodel_debug)                           | Debug a QuickModel                     | Diagnose and fix validation or transformation issues      |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generate Test Data for a QuickModel    | Create realistic mock data verified through the pipeline  |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspect Model and Export Schema        | Inspect a model and export its schema in multiple formats |

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
