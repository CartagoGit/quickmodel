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
The deserializer explicitly prevents prototype pollution attacks by blocking modification of `__proto__`, `constructor`, and `prototype` properties during recursive merges.

### 2. Denial of Service (DoS) Prevention
- **Buffer Allocation**: `ArrayBufferTransformer` enforces a maximum size limit (1MB default) to prevent memory exhaustion attacks.
- **RegExp Safety**: While we support RegExp serialization, users should validate input patterns to prevent ReDoS (Regular Expression Denial of Service) in their own regular expressions.

### 3. Circular Reference Handling
To prevent stack overflow attacks or crashes, QuickModel detects circular references during serialization and conversion to interface format.

### 4. Input Validation
Transformers validate inputs strictly. The `validate()` method allows you to verify that deserialized data matches the expected schema before processing it.

## Best Practices

- **Validate Input**: Always use `.validate()` on models created from untrusted sources.
- **Use Strict Mode**: Consider enabling strict mode (`@Quick({ strict: true })`) to reject unknown properties in payloads.
- **Sanitize Strings**: When using the `RegExp` transformer with user input, sanitize the input to prevent ReDoS.

## Security Audits & Implemented Measures

We actively secure the QuickModel ecosystem, including the Model Context Protocol (MCP) server integration. The following specific protections and tests have been implemented:

### MCP Server Security

The MCP tools exposed to AI agents have been hardened against common vulnerabilities:

- **Command Injection Prevention**:
  - `search_docs` tool uses `spawn` instead of `exec` to prevent shell command injection.
  - **Test**: `tests/security/mcp-security.test.ts` - "QSearchDocsTool (Command Injection)"

- **Path Traversal Prevention**:
  - All file system operations in tools (`scaffold_feature`, `check_api_compatibility`, `check_project_rules`) strictly validate that target paths are within the project root.
  - **Test**: `tests/security/mcp-security.test.ts` - "Path Traversal Prevention" suite.

- **Cross-Site Scripting (XSS) Prevention**:
  - Documentation generation tools (`sync_docs`) escape HTML content to prevent Stored XSS in generated Markdown files.

### Core Library Security

- **Prototype Pollution**:
  - `PopulationService` explicitly ignores `__proto__`, `constructor`, and `prototype` keys during data population.
  - **Test**: `tests/security/core-security.test.ts` - "Prototype Pollution Prevention"

- **Memory Exhaustion (DoS)**:
  - `TypedArrayTransformer` enforces a configurable `MAX_ITEMS` limit (default 1,000,000) to prevent large memory allocation attacks.
  - **Test**: `tests/security/core-security.test.ts` - "DoS Prevention"

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
