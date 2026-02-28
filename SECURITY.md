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
- **Large Object Protection**: **(New in v1.1.0)** Prevents memory exhaustion attacks via objects with excessive key counts.
    - Enforced limit: **50,000 properties** per object instance.
- **Map/Set Pre-allocation Checks**: Transformers verify input size against limits (`maxItems`) _before_ allocating memory or iterating keys, preventing CPU/Memory exhaustion from massive inputs even in legacy object-to-map conversion paths.

### 3. Circular Reference & Stack Overflow Handling

- **Circular References**: QuickModel detects circular references during serialization and conversion to interface format to prevent crashes.
- **Recursion Limits**: Strict maximum recursion depth (512 levels) is enforced in all traversal operations (`serialize`, `deserialize`, `toInterface`, `deepFreeze`) to prevent Stack Overflow attacks.

### 4. Input Validation & Injection Prevention

Transformers validate inputs strictly. The `validate()` method allows you to verify that deserialized data matches the expected schema before processing it.

**URL Injection Protection (v1.0.1+):**
The `URLTransformer` now validates protocols to prevent unsafe schemes like `javascript:` or `file:`.

- **Allowed by default:** `http:`, `https:`, `ftp:`, `ws:`, `wss:`
- **Blocked:** `javascript:`, `file:`, `data:`, `vbscript:`
- Use `transformerOptions.allowedProtocols` to customize.

**RegExp Safety (ReDoS):**
We limit input length to 1000 chars, but **do NOT validates algorithmic complexity**.
:warning: **Risk:** An attacker could supply a short but "evil" regex (e.g., `(a+)+`) that causes catastrophic backtracking.
**Advice:** Do not allow untrusted users to supply RegExp strings if your application uses them to match against large inputs.

### 5. Mass Assignment Protection

QuickModel provides protections against Mass Assignment attacks:

- **Method Shadowing Prevention**: Automatically prevents incoming JSON payloads from overwriting class methods.
- **Strict Mode**: When enabled via `@Quick({ unknownPropertyPolicy: 'error' })`, any property in the payload that is not defined in the model is rejected.

:warning: **IMPORTANT DEFAULT**: Strict mode is **DISABLED by default**.
Properties present in the JSON but not in the model **will be copied** to the instance unless you use `unknownPropertyPolicy: 'error'`.

**Recommendation:** Always enable error policy for public-facing API models:

```typescript
@Quick({}, { unknownPropertyPolicy: 'error' })
class User extends QModel<IUser> { ... }
```

### 6. Type Confusion & Polymorphism Safety

**Discriminator Integrity (v1.0.1+):**

- **Fail Secure**: If a discriminator function throws an error (e.g. malformed data), the library will **propagate the error** instead of silently falling back to a default type.
- **Null Safety**: When deserializing arrays of models (`[User]`), `null` or `undefined` values are now **preserved** (`[User, null]`) instead of being filtered out, ensuring index integrity and preventing logic errors.

### 7. Safe Error Reporting

Internal error handlers allow secure logging of malformed data without crashing the process, even when the data contains circular references that would typically cause `JSON.stringify` to throw.

### 7. Known Limitations

- **Symbol Memory Usage**: The `Symbol` transformer uses `Symbol.for()` to ensure symbols can be serialized and deserialized accurately across sessions. However, `Symbol.for()` creates entries in the global symbol registry which are never garbage collected. **Do not use `Symbol` type for high-frequency unique user input** (like session IDs) to prevent memory leaks.
- **Client-Side ReDoS**: We limit input length (1000 chars) for RegExp deserialization to prevent memory exhaustion, but the algorithmic complexity of the regex itself is not validated. Users should sanitize regex patterns from untrusted sources.
- **Arrow Function Shadowing Protection**: Class methods defined as Arrow Functions (`method = () => {}`) are instance properties. QuickModel provides **Enhanced Intrinsic Protection** that:
    - Creates a template instance to inspect default property types
    - Falls back to prototype inspection if template creation fails (e.g., strict constructors)
    - Warns and blocks attempts to overwrite arrow function methods via payload
    - Allows explicit override only if the property is decorated with `@QType` or `@Quick`
    - Works correctly even with strict constructors that throw errors during instantiation
    - To enforce strict rejection of unknown properties globally, use:
        ```typescript
        QConfig.configure({ defaults: { unknownPropertyPolicy: 'error' } });
        ```

### 8. Security Best Practices

- **Validate Input**: Always use `.isValid()` or `.checkIntegrity()` on models created from untrusted sources.
- **Use Error Policy**: Consider using `unknownPropertyPolicy: 'error'` (`@Quick({ unknownPropertyPolicy: 'error' })`) to reject unknown properties in payloads.
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

- **Code Injection Prevention**:
    - Scaffolding tools (`create_model`, `json_to_model`) enforce strict regex validation on class names and safely escape all property keys/values to prevent malicious code injection into generated TypeScript files.
    - **Test**: `tests/mcp/unit/code-injection.test.ts`.

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
    - Verifies behavior of `unknownPropertyPolicy: 'error'` mode.
    - **Test**: `tests/security/mass-assignment.test.ts`, `tests/system/security/arrow-function-warning.test.ts`

- **Map/Set Prototype Pollution (Defense in Depth)**:
    - Multi-layer filtering of `__proto__`, `constructor`, `prototype` throughout the lifecycle:
        1. **Deserialization (Input)**: `MapTransformer` strips unsafe keys.
        2. **Serialization (Output)**: `Serializer` and `MapTransformer` strip unsafe keys before `Object.fromEntries` or `JSON.stringify`.
    - **Test**: `tests/security/map-pollution.test.ts`

- **RegExp Safety**:
    - **ReDoS Prevention**: Enforces a strict length limit (1000 chars) on patterns to prevent catastrophic backtracking on massive inputs.
    - **Syntax Validation**: Ensures only valid RegExp strings are instantiated.
    - _limitation_: Short but complex ReDoS patterns are not statically analyzed.
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
