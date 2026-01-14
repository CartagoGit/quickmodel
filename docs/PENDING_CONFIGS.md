# QuickModel Configuration Roadmap

This document outlines the planned configuration options for `QConfig` to enhance the library's robustness, flexibility, and developer experience.

Each feature must be implemented with dedicated unit tests (and integration tests where applicable) to ensure correctness and prevent regressions.

## 🛡️ 1. Integrity & Security (Data Integrity)

Controls how data is accepted into the model and protected.

- [ ] **`unknownPropertyPolicy`**
    - **Type**: `'keep' | 'strip' | 'error'`
    - **Description**: Defines behavior when encountering properties in the input payload that are not defined in the model.
        - `keep`: (Current default) Preserves extra properties.
        - `strip`: Silently removes extra properties (Safe for Mass Assignment).
        - `error`: Throws an error (Current `strict: true` behavior).
    - **Test File**: `tests/unit/core/config/integrity-unknown-property.test.ts`

- [ ] **`maxRecursionDepth`**
    - **Type**: `number`
    - **Description**: Limits the depth of nested objects during deserialization to prevent Stack Overflow attacks.
    - **Test File**: `tests/unit/core/config/integrity-recursion.test.ts`

- [ ] **`stripInternalIdentifiers`**
    - **Type**: `boolean` | `string[]`
    - **Description**: Automatically excludes properties starting with `_` or `$` from serialization (output), preventing internal state leakage.
    - **Test File**: `tests/unit/core/config/integrity-strip-internal.test.ts`

## 🔄 2. Transformation & Adaptation

Modifies data to fit the contract between Backend and Frontend.

- [ ] **`transformCase`**
    - **Type**: `{ in?: CaseType; out?: CaseType }`
    - **Options**:
        - `'snake_case'` (e.g., `user_id`)
        - `'camelCase'` (e.g., `userId`)
        - `'kebab-case'` (e.g., `user-id`)
        - `'PascalCase'` (e.g., `UserId`)
    - **Description**: Automates casing conversion between API (Input) and Model (Runtime) and Interface (Output).
    - **Test File**: `tests/unit/core/config/transform-case.test.ts`

- [ ] **`normalization`**
    - **Type**: `{ emptyStringAsNull?: boolean; trimStrings?: boolean }`
    - **Description**:
        - `emptyStringAsNull`: Converts `""` to `null` before processing.
        - `trimStrings`: Applies `.trim()` to all input strings.
    - **Test File**: `tests/unit/core/config/transform-normalization.test.ts`

- [ ] **`nullToUndefined`**
    - **Type**: `boolean`
    - **Description**: Standardizes all `null` values to `undefined` (or vice versa) for consistency within the application code.
    - **Test File**: `tests/unit/core/config/transform-null-undefined.test.ts`

- [ ] **`coercionStrategy`**
    - **Type**: `'strict' | 'loose'`
    - **Description**:
        - `strict`: Throws error if type mismatches (e.g., string `"123"` for number field).
        - `loose`: Attempts automatic coercion (e.g., `"123"` -> `123`, `"true"` -> `true`). Vital for FormData/URLSearchParams.
    - **Test File**: `tests/unit/core/config/transform-coercion.test.ts`

- [ ] **`dateStrategy`**
    - **Type**: `'iso' | 'timestamp' | 'native'`
    - **Description**: Defines global serialization format for Date objects.
        - `iso`: ISO 8601 String (e.g., "2024-01-01T00:00:00.000Z")
        - `timestamp`: Epoch number (e.g., 1704067200000)
        - `native`: Keeps as Date object.
    - **Test File**: `tests/unit/core/config/transform-date-strategy.test.ts`

## 🚦 3. Validation & Errors

Controls how rules are enforced and errors reported.

- [ ] **`validationErrorStrategy`**
    - **Type**: `'failFast' | 'accumulate'`
    - **Description**:
        - `failFast`: Throws on the first error encountered.
        - `accumulate`: Collects all validation errors and throws an AggregateError or returns a list.
    - **Test File**: `tests/unit/core/config/validation-strategy.test.ts`

- [ ] **`validationTrigger`**
    - **Type**: `'construction' | 'manual'`
    - **Description**:
        - `construction`: Runs validation automatically during `new Model()` or `create()`.
        - `manual`: Skips usage validation; requires explicit `.validate()` call.
    - **Test File**: `tests/unit/core/config/validation-trigger.test.ts`

## ⚡ 4. Developer Experience & System

Optimizations and debugging tools.

- [ ] **`enableDebugLogs`**
    - **Type**: `boolean`
    - **Description**: Enables internal logging to trace transformer execution and failures.
    - **Test File**: N/A (Verified manually or via spy)

- [ ] **`exposeUnsetFields`**
    - **Type**: `boolean`
    - **Description**: Controls if optional fields without values appear as `key: null/undefined` in the output JSON.
    - **Test File**: `tests/unit/core/config/system-expose-unset.test.ts`

- [ ] **`performance`**
    - **Type**: `{ disableSafetyChecks?: boolean }`
    - **Description**: "Turbo Mode" for production. Disables redundant runtime checks (like freezing) when data source is trusted.
    - **Test File**: `tests/unit/core/config/system-performance.test.ts`
