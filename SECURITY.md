# Security Policy

## Supported Versions

The following versions of QuickModel are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability within QuickModel, please send an e-mail to security@cartago.git. All security vulnerabilities will be promptly addressed.

## Security Features

QuickModel includes several built-in security features to protect your application:

### 1. Prototype Pollution Protection
The deserializer explicitly prevents prototype pollution attacks by blocking modification of `__proto__`, `constructor`, and `prototype` properties in:
- Recursive merges (PopulationService)
- Map/Set Transformers (both Input/Deserialization and Output/Serialization)
- Interface conversion (ToInterfaceService) - Prevents polluted data from being re-serialized

### 2. Denial of Service (DoS) Prevention
- **Buffer & TypedArray Safety**: `ArrayBufferTransformer` and `TypedArrayTransformer` enforce maximum size limits to prevent memory exhaustion attacks.
- **RegExp Safety**: Enforces maximum pattern length (1000 chars) to mitigate Memory DoS. Note: Users must still sanitize user-provided regex patterns against complex algorithmic ReDoS.
- **Large Array Protection**: **(New in v1.1.0)** Prevents Event Loop blocking via massive arrays.
  - Default limit: **10,000 items** per array (globally configurable).
  - Configurable via `QConfig.configure({ defaults: { maxArrayLength: 50000 } })`.
  - Configurable per-model via `@Quick({}, { maxArrayLength: 20000 })`.

### 3. Circular Reference Handling
To prevent stack overflow attacks or crashes, QuickModel detects circular references during serialization and conversion to interface format.

### 4. Input Validation
Transformers validate inputs strictly. The `validate()` method allows you to verify that deserialized data matches the expected schema before processing it.

### 5. Mass Assignment Protection
QuickModel provides protections against Mass Assignment attacks:
- **Method Shadowing Prevention**: Automatically prevents incoming JSON payloads from overwriting class methods.
- **Strict Mode**: When enabled via `@Quick({ strict: true })`, any property in the payload that is not defined in the model is rejected.

### 6. Safe Error Reporting
Internal error handlers allow secure logging of malformed data without crashing the process, even when the data contains circular references that would typically cause `JSON.stringify` to throw.

### 7. Known Limitations
- **Symbol Memory Usage**: The `Symbol` transformer uses `Symbol.for()` to ensure symbols can be serialized and deserialized accurately across sessions. However, `Symbol.for()` creates entries in the global symbol registry which are never garbage collected. **Do not use `Symbol` type for high-frequency unique user input** (like session IDs) to prevent memory leaks.
- **Client-Side ReDoS**: We limit input length (1000 chars) for RegExp deserialization to prevent memory exhaustion, but the algorithmic complexity of the regex itself is not validated. Users should sanitize regex patterns from untrusted sources.
- **Arrow Function Shadowing**: Class methods defined as Arrow Functions (`method = () => {}`) are instance properties. QuickModel provides **Intrinsic Protection** that warns and blocks attempts to overwrite them via payload, unless the property is explicitly decorated with `@QType` or `@Quick`.
  - To enforcing strict rejection of unknown properties globally, use:
    ```typescript
    QConfig.configure({ defaults: { strict: true } });
    ```

### 8. Security Best Practices

- **Validate Input**: Always use `.validate()` on models created from untrusted sources.
- **Use Strict Mode**: Consider enabling strict mode (`@Quick({ strict: true })`) to reject unknown properties in payloads.
- **Sanitize Strings**: When using the `RegExp` transformer with user input, sanitize the input to prevent ReDoS.

## Security Audits & Implemented Measures

We actively secure the QuickModel ecosystem, including the Model Context Protocol (MCP) server integration. The following specific protections and tests have been implemented:

### MCP Server Security

The MCP tools exposed to AI agents have been hardened against common vulnerabilities:

- **Command Injection Prevention**:
  - `search_docs` tool uses `spawn` instead of `exec` to prevent shell command injection.
  - Arguments are escaped using `-e` flag to prevent grep flag injection (e.g. `--help` treated as pattern).
  - **Test**: `tests/security/mcp-security.test.ts` - "QSearchDocsTool (Command Injection)", `tests/security/advanced-vectors.test.ts`

- **Path Traversal Prevention**:
  - All file system operations in tools (`scaffold_feature`, `check_api_compatibility`, `check_project_rules`) strictly validate that target paths are within the project root using secure prefix check (safe against sibling folder attacks).
  - **Test**: `tests/security/mcp-security.test.ts` - "Path Traversal Prevention" suite.

- **Cross-Site Scripting (XSS) Prevention**:
  - Documentation generation tools (`sync_docs`) escape HTML content to prevent Stored XSS in generated Markdown files.

### Core Library Security

- **Prototype Pollution**:
  - `PopulationService`, `SerializerService`, and `ToInterfaceService` explicitly ignore `__proto__`, `constructor`, and `prototype` keys during data population, serialization, and cloning.
  - **Test**: `tests/security/core-security.test.ts` & `tests/security/prototype-pollution.test.ts`

- **Memory Exhaustion (DoS)**:
  - `TypedArrayTransformer`, `ArrayBufferTransformer`, `SetTransformer`, and `MapTransformer` enforce a configurable `maxItems`/`maxBytes` limit (default 1,000,000) to prevent large memory allocation attacks.
  - **Test**: `tests/security/core-security.test.ts`, `tests/security/buffers-limit.test.ts`, `tests/security/collections-limit.test.ts`

- **Stack Overflow (Recursion DoS)**:
  - Global `MAX_DEPTH` (512) enforced and validated in `ValueTransformerService`, `DeserializerService`, `PopulationService`, `ToInterfaceService`, and `SerializerService`. This prevents process crashes from deeply nested JSON or recursive model structures.
  - **Test**: `tests/security/stack-overflow.test.ts`, `tests/security/to-interface-depth.test.ts`

- **CPU Exhaustion (DoS)**:
  - String length limits enforced for resource-intensive transformers: `RegExpTransformer`, `DateTransformer`, `BigIntTransformer` (including object wrapper bypass), `SymbolTransformer`, `ErrorTransformer`.
  - **Test**: `tests/security/*-dos.test.ts` suites.

- **Mass Assignment & Method Shadowing**:
  - Validates that payloads cannot override class methods (logic bomb prevention).
  - **Intrinsic Protection**: Arrow functions are protected by default via template inspection, issuing a warning if a payload tries to overwrite a method unless it's explicitly decorated.
  - **Robust Prototype Inspection**: **(New in v1.1.0)** Fallback mechanism inspects the prototype chain (`key in template`) to protect methods even if the class constructor is strict/throws errors during security inspection.
  - Verifies behavior of `strict: true` mode.
  - **Test**: `tests/security/mass-assignment.test.ts`, `tests/system/security/arrow-function-warning.test.ts`

- **Map/Set Prototype Pollution (Defense in Depth)**:
  - Multi-layer filtering of `__proto__`, `constructor`, `prototype` throughout the lifecycle:
    1. **Deserialization (Input)**: `MapTransformer` strips unsafe keys.
    2. **Serialization (Output)**: `Serializer` and `MapTransformer` strip unsafe keys before `Object.fromEntries` or `JSON.stringify`.
  - **Test**: `tests/security/map-pollution.test.ts`

- **RegExp Safety**:
  - **ReDoS Prevention**: Enforces a strict length limit (1000 chars) on patterns to prevent catastrophic backtracking on massive inputs.
  - **Syntax Validation**: Ensures only valid RegExp strings are instantiated.
  - *limitation*: Short but complex ReDoS patterns are not statically analyzed.
  - **Test**: `tests/security/regexp-redos.test.ts`

- **Interface Serialization Injection**:
  - `ToInterfaceService` strips unsafe keys (`__proto__`, `constructor`, `prototype`) during object reconstruction, ensuring that even if an internal model state theoretically held a dangerous key, it is not emitted in the interface output.
  - **Test**: `tests/security/to-interface-safety.test.ts`

- **Safe Error Reporting (Crash Prevention)**:
  - Ensures that reporting errors on circular data structures (like self-referencing Maps) uses a safe serialization method instead of crashing the process (Availability protection).
  - **Test**: `tests/security/safe-error-reporting.test.ts`

- **Information Disclosure**:
  - Ensures internal properties starting with `__` (e.g., `__initData`) are stripped from serialization (JSON output) to prevent leaking internal state.
  - **Test**: `tests/security/info-disclosure.test.ts`

### Running Security Tests

You can verify these security standards by running the strict security test suite:

```bash
bun test tests/security/
```

### Automated Security Checks via MCP

The project includes a specialized MCP tool called `check_security` that allows AI agents to verify safe status on demand. This tool executes the full security suite and reports any vulnerabilities found.

- **Tool Name**: `check_security`
- **Scope**: Runs all tests in `tests/security/`
- **Output**: Returns `secure` status only if all integrity checks pass.
