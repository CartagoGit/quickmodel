# Examples

Welcome to the QuickModel examples. These practical examples demonstrate real-world usage patterns and best practices for all framework features.

## Fundamentals

### [Basic Usage](/en/examples/basic)

Learn the fundamentals with simple, straightforward examples:

- Creating your first model with `@Quick`
- Property transformations (Date, BigInt, Set, Map)
- Serialization with `toJSON()`
- Working with arrays of transformed types

### [API Models](/en/examples/api-models)

Integrate QuickModel with REST APIs:

- Fetching and transforming API responses
- Sending data with `toJSON()`
- Handling pagination and nesting
- Service patterns (full CRUD)

### [Complex Types](/en/examples/complex-types)

Advanced type transformations:

- Nested models and deep nesting
- Collections (Set, Map)
- BigInt for large numbers
- Polymorphic models

## Decorators & Features

### [Validation with @QRule](/en/examples/validation)

Define business rules and validate data:

- `@QRule` for property-level rules
- `checkRules()`, `isValid()`, `validationReport()`
- Async validation with `checkRulesAsync()`
- `createMany()` separating valid from invalid
- Dynamic messages for i18n

### [Forms with @QField and @QGroup](/en/examples/forms)

Dynamically generate form schemas:

- `@QField` for widget metadata (input, select, datepicker...)
- `@QGroup` to organize fields into sections
- `getFormSchema()` and `getFormSchemaGrouped()`
- React integration (dynamic form)
- Custom metadata for your framework

### [Alias Mapping with @QAlias](/en/examples/alias-mapping)

Bridge snake_case and camelCase:

- `@QAlias` to rename properties
- Full roundtrip (input and output)
- Nested models with aliases
- Combining with `@QField` and `@QRule`

### [Computed Fields with @QComputed](/en/examples/computed)

Derived properties included in serialization:

- `@QComputed` for serializable getters
- Price, VAT, discount calculations
- Age, status, formatted labels
- Difference between decorated and plain getters

## Creation & Testing

### [Mocks & Testing](/en/examples/mocks)

Generate test data with the `mock()` API:

- `mock().random()`, `mock().empty()`, `mock().sample()`
- `mock().array(n)` with per-index overrides
- `mock().interfaceRandom()` for API fixtures
- Unit tests with Vitest / Jest
- Storybook: generating example props

### [Batch Creation & Immutability](/en/examples/batch-readonly)

Process arrays and create immutable instances:

- `createMany()` for bulk imports
- Separating valid from invalid with `errors[]`
- `createReadonly()` for config and constants
- Immutable fixtures for tests

## Quick Reference

| I want to...                    | I use...                                         |
| ------------------------------- | ------------------------------------------------ |
| Transform dates/BigInt          | `@Quick({ field: Date })`                        |
| Validate business data          | `@QRule({ predicate, message })`                 |
| Map snake_case → camelCase      | `@QAlias('field_name')`                          |
| Generate a form schema          | `@QField({ widget, label })` + `getFormSchema()` |
| Group form fields into sections | `@QGroup('Section')` + `getFormSchemaGrouped()`  |
| Include getter in serialization | `@QComputed()`                                   |
| Generate test data              | `Model.mock().random()`                          |
| Bulk process with validation    | `Model.createMany(array)`                        |
| Create immutable instance       | `Model.createReadonly(data)`                     |

## Running Examples

All examples are TypeScript and can be run with:

```bash
# Using Bun
bun run example.ts

# Using ts-node
npx ts-node example.ts
```
