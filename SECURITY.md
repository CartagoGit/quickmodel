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
