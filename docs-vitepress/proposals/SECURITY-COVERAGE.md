# Security Coverage

> Last updated: 2026-03-01 (sprint 5)
> Audit tool: `run_security_audit` (MCP) — run it at any time to verify all checks below are still green.

---

## Coverage Summary

| Category               | Vector                                                           | ID       | Status   | Files                                                                           |
| ---------------------- | ---------------------------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------- |
| RCE Prevention         | Dynamic predicate injection via `new Function()`                 | CRIT-01  | ✅ Fixed | simulate-validation, simulate-rules, simulate-async-rules                       |
| RCE Prevention         | Prototype-chain reconstruction bypass (`constructor`, `Reflect`) | CRIT-01d | ✅ Fixed | predicate-sanitizer.ts                                                          |
| Path Traversal         | `sep`-bypass in path guard                                       | HIGH-01  | ✅ Fixed | patch-jsdoc.tool.ts                                                             |
| Path Traversal         | `sep`-bypass in path guard                                       | HIGH-02  | ✅ Fixed | manage-proposal.tool.ts                                                         |
| Path Traversal         | Missing path guard on config_path                                | HIGH-03  | ✅ Fixed | add-to-sidebar.tool.ts                                                          |
| Information Disclosure | Stack trace in Error serialization                               | HIGH-04  | ✅ Fixed | serializer.service.ts                                                           |
| Unsafe Deserialization | No type guard after JSON.parse                                   | MED-02   | ✅ Fixed | deserializer.service.ts                                                         |
| Markdown Injection     | Newlines in title parameters                                     | MED-03   | ✅ Fixed | manage-proposal.tool.ts, create-guide-page.tool.ts                              |
| DoS — Input Size       | Unbounded arrays/objects fed to `@Quick`                         | MED-04   | ✅ Fixed | simulate-transformation.tool.ts, roundtrip.tool.ts                              |
| DoS — Spawn            | Unbounded grep subprocess in search-docs                         | MED-05   | ✅ Fixed | search-docs.tool.ts                                                             |
| Information Disclosure | Large string value leaks in error context                        | LOW-01   | ✅ Fixed | quickmodel.error.ts                                                             |
| DoS — Spawn Timeout    | No timeout in spawnCommand                                       | LOW-02   | ✅ Fixed | utils.ts                                                                        |
| ReDoS                  | Arbitrary flags to `RegExp` constructor                          | LOW-03   | ✅ Fixed | regexp.transformer.ts                                                           |
| Path Traversal         | `.max(200)` on title fields (schema)                             | LOW-04   | ✅ Fixed | create-guide-page.tool.ts                                                       |
| Path Traversal         | `sep`-bypass in baseline path guard                              | NEW-01   | ✅ Fixed | check-api-compat.tool.ts                                                        |
| Path Traversal         | `sep`-bypass in source/test path guards                          | NEW-02   | ✅ Fixed | generate-test.tool.ts                                                           |
| Path Traversal         | Missing path guard on `target_dir` input                         | NEW-03   | ✅ Fixed | validate-examples.tool.ts                                                       |
| CLI Injection          | Flag injection via `pattern` in `run_tests`                      | MED-06   | ✅ Fixed | run-tests.tool.ts                                                               |
| CLI Injection          | Flag injection via targets in `lint_check`                       | MED-07   | ✅ Fixed | lint-check.tool.ts                                                              |
| DoS — CPU              | Unbounded `iterations` in `benchmark_performance`                | MED-08   | ✅ Fixed | benchmark-perf.tool.ts                                                          |
| DoS — Memory           | Unbounded `count` in `generate_mock`                             | MED-09   | ✅ Fixed | generate-mock.tool.ts                                                           |
| CLI Injection          | Flag injection via `files[]` in `pre_commit_check`               | MED-10   | ✅ Fixed | pre-commit-check.tool.ts                                                        |
| DoS — Parser           | Unbounded `code` string in `validate_usage`                      | LOW-05   | ✅ Fixed | validate-usage.tool.ts                                                          |
| DoS — Parser           | Unbounded `json`/`className` in `json_to_model`                  | LOW-06   | ✅ Fixed | json-to-model.tool.ts                                                           |
| DoS — Parser           | Unbounded `code` string in `interface_to_model`                  | LOW-07   | ✅ Fixed | interface-to-model.tool.ts                                                      |
| DoS — Memory           | Unbounded strings in `generate_feature_tests`                    | LOW-08   | ✅ Fixed | generate-feature-tests.tool.ts                                                  |
| DoS — Memory           | Unbounded model name strings in `generate_integration_test`      | LOW-09   | ✅ Fixed | generate-integration-test.tool.ts                                               |
| DoS — Parser           | Unbounded `code` string in `inspect_model`                       | LOW-10a  | ✅ Fixed | inspect-model.tool.ts                                                           |
| DoS — Parser           | Unbounded `code` string in `export_json_schema`                  | LOW-10b  | ✅ Fixed | export-schema.tool.ts                                                           |
| DoS — Parser           | Unbounded `model_a`/`model_b` strings in `diff_models`           | LOW-10c  | ✅ Fixed | diff-models.tool.ts                                                             |
| DoS — Memory           | Unbounded `className` string in `create_model`                   | LOW-11a  | ✅ Fixed | create-model.tool.ts                                                            |
| DoS — Parser           | Unbounded `error` string in `explain_error`                      | LOW-11b  | ✅ Fixed | explain-error.tool.ts                                                           |
| DoS — Parser           | Unbounded `schema`/`className` strings in `from_schema`          | LOW-12   | ✅ Fixed | from-schema.tool.ts                                                             |
| DoS — Path len         | Unbounded `slug` in `create_guide_page`                          | LOW-13   | ✅ Fixed | create-guide-page.tool.ts                                                       |
| DoS — CPU (N×eval)     | Unbounded `rules[]` array triggers N×`new Function()` calls      | MED-11   | ✅ Fixed | simulate-validation, simulate-rules, simulate-async-rules                       |
| Path Traversal         | Absolute path bypass in `target_dir` (deprecation-tracker)       | HIGH-05  | ✅ Fixed | deprecation-tracker.tool.ts                                                     |
| Path Traversal         | Unsanitised `base_path` in `check_doc_parity`                    | HIGH-06  | ✅ Fixed | check-doc-parity.tool.ts                                                        |
| CLI Injection / Path   | Unsanitised `target_dir` injected into git pathspec              | MED-12   | ✅ Fixed | check-doc-drift.tool.ts                                                         |
| DoS — Parser           | Unbounded `code` in `get_form_schema` / `get_model_schema`       | LOW-14   | ✅ Fixed | get-form-schema.tool.ts, get-model-schema.tool.ts                               |
| DoS — JSON persistence | Unbounded fields in `agent_coordinate` → registry file bloat     | LOW-15   | ✅ Fixed | agent-coordinate.tool.ts                                                        |
| DoS — Input Size       | Unbounded `name` / `extensions[]` / `from_version` fields        | LOW-16   | ✅ Fixed | scaffold-feature.tool.ts, list-todos.tool.ts, suggest-version-migration.tool.ts |
| DoS — Parser           | Unbounded `projectDir` in `check_changelog`                      | LOW-17   | ✅ Fixed | check-changelog.tool.ts                                                         |
| DoS — Parser           | Unbounded `targetDir` in `check_project_rules`                   | LOW-18   | ✅ Fixed | check-project-rules.tool.ts                                                     |
| DoS — CPU (filter)     | Unbounded top-level `group` filter in `simulate_validation`      | LOW-19   | ✅ Fixed | simulate-validation.tool.ts                                                     |
| DoS — Spawn / Parser   | Unbounded `targetDir` and `targetFiles[]` in `lint_check`        | LOW-20   | ✅ Fixed | lint-check.tool.ts                                                              |
| DoS — CPU (regex loop) | Unbounded `properties` record in `create_model` (regex×N)        | LOW-21   | ✅ Fixed | create-model.tool.ts                                                            |
| DoS — Memory           | Missing `capInputArrays()` in `explain_transformation`           | MED-13   | ✅ Fixed | explain-transformation.tool.ts                                                  |
| DoS — Memory           | Missing `capInputArrays()` in `check_integrity`                  | MED-14   | ✅ Fixed | check-integrity.tool.ts                                                         |
| DoS — Stack overflow   | Unbounded recursion in `hydrateOptions()` (deeply nested input)  | LOW-22   | ✅ Fixed | simulate-transformation, roundtrip, check-integrity, explain-transformation     |

---

## Defense Layers

### 1. CRIT-01 — Predicate Injection (RCE)

**Threat**: MCP simulation tools accept predicates as strings and pass them to `new Function()`, enabling arbitrary code execution.

**Defense**: `assertSafePredicate()` from `src/mcp/tools/predicate-sanitizer.ts` rejects 33 forbidden tokens before the function is compiled.

Original 28 blocked: `require`, `import`, `process`, `global`, `globalThis`, `__dirname`, `__filename`, `eval`, `Function`, `Buffer`, `fetch`, `XMLHttpRequest`, async timers, browser APIs, `WebAssembly`, etc.

Newly added (CRIT-01d) — prototype-chain reconstruction: `constructor`, `__proto__`, `prototype`, `Reflect`, `Proxy`. Without these, an attacker could reconstruct `Function` without using the `Function` keyword:

```js
// Bypass before CRIT-01d — now blocked:
[]['constructor']['constructor']('return process')();
Reflect.construct(
	Function,
	['return process'],
	Function
)({}).__proto__.polluted = 1;
```

**Files protected**:

- `src/mcp/tools/public/simulate-validation.tool.ts`
- `src/mcp/tools/public/simulate-rules.tool.ts`
- `src/mcp/tools/public/simulate-async-rules.tool.ts`

**Test coverage**: `tests/security/mcp-simulate-rce.test.ts`

---

### 2. HIGH-01/02/03 + NEW-01/02/03 — Path Traversal

**Threat**: An attacker supplies a path like `../../etc/shadow` or uses a directory name prefix that starts with the project root (e.g. `/home/user/project-evil`) to bypass a bare `startsWith(cwd)` check.

**Defense**: All path guards use `safeCwd = cwd + sep` (appending the OS path separator), ensuring the prefix includes a trailing `/`. Pattern:

```typescript
const safeCwd = cwd.endsWith(sep) ? cwd : cwd + sep;
if (!resolvedPath.startsWith(safeCwd)) {
	return { error: 'Security: path is outside project root' };
}
```

**Files protected**:

- `patch-jsdoc.tool.ts` (HIGH-01)
- `manage-proposal.tool.ts` (HIGH-02)
- `add-to-sidebar.tool.ts` (HIGH-03)
- `check-api-compat.tool.ts` (NEW-01)
- `generate-test.tool.ts` (NEW-02)
- `validate-examples.tool.ts` (NEW-03)
- `create-guide-page.tool.ts` (pre-existing)
- `scaffold-feature.tool.ts` (pre-existing)
- `check-changelog.tool.ts` (pre-existing)
- `list-todos.tool.ts` (pre-existing)

**Test coverage**: `tests/security/mcp-path-traversal.test.ts`

---

### 3. HIGH-04 — Stack Trace Information Disclosure

**Threat**: The serializer's Error fallback branch included `stack: value.stack`, exposing internal call stacks that could reveal file system paths, module structure, or implementation details.

**Defense**: The `stack` property is intentionally omitted in the Error fallback branch:

```typescript
return {
	message: value.message,
	name: value.name /* stack intentionally omitted */,
};
```

**File**: `src/core/services/serializer.service.ts`

---

### 4. MED-02 — Unsafe JSON.parse

**Threat**: `deserializeFromJson()` called `JSON.parse(json) as Record<string, unknown>` without a type guard. A payload like `"null"` or `"[1,2,3]"` would produce a non-object, causing confusing downstream failures or type-confusion attacks.

**Defense**:

```typescript
const raw: unknown = JSON.parse(json);
if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
	throw new QModelError(
		`deserializeFromJson: Expected a JSON object, got ${kind}`
	);
}
```

**File**: `src/core/services/deserializer.service.ts`

---

### 5. MED-03 — Markdown Injection via Title Newlines

**Threat**: A title like `"Legit Title\n# Injected Heading"` would produce malformed Markdown that could break navigation, XSS in rendered output, or manipulate documentation structure.

**Defense**: Input validation rejects titles containing `\n` or `\r`:

```typescript
if (/[\n\r]/.test(args.title)) {
	return {
		success: false,
		error: 'title contains unsafe characters (newlines are not allowed)',
	};
}
```

**Files**: `manage-proposal.tool.ts`, `create-guide-page.tool.ts`

---

### 6. MED-04 — DoS via Oversized `@Quick` Input

**Threat**: An adversary supplies an array with millions of elements or an object with thousands of keys, triggering `@Quick` decorators to allocate proportionally, potentially exhausting V8 memory or causing timeouts.

**Defense**: `capInputArrays()` pre-truncates arrays to 1,000 elements and object keys to 500 before feeding data to the dynamic `DynamicModel`:

```typescript
private capInputArrays(data, maxArrayLen = 1_000, maxProps = 500): Record<string, unknown> {
    return Object.fromEntries(
        Object.entries(data)
            .slice(0, maxProps)
            .map(([k, v]) => [k, Array.isArray(v) && v.length > maxArrayLen ? v.slice(0, maxArrayLen) : v])
    );
}
```

**Files**: `simulate-transformation.tool.ts`, `roundtrip.tool.ts`

---

### 7. MED-05 — DoS via Search Subprocess

**Threat**: `search-docs` spawns a `grep` subprocess with a user-supplied query. Without a timeout, a slow or hanging process would block the MCP server indefinitely.

**Defense**:

1. `query: z.string().max(200)` — limits query length to 200 characters
2. Spawn timeout of 30 seconds with `clearTimeout` cleanup:

```typescript
const timeoutId = setTimeout(() => {
	child.kill('SIGTERM');
	res();
}, 30_000);
child.on('close', () => {
	clearTimeout(timeoutId);
	res();
});
```

**File**: `src/mcp/tools/public/search-docs.tool.ts`

---

### 8. LOW-01 — Error Context Value Truncation

**Threat**: A transformer receiving a megabyte-sized string stores it verbatim in `QModelError.context.value`, which then gets serialized in logs or MCP responses — leaking large payloads.

**Defense**: `sanitizeContextValue()` truncates string context values exceeding 200 characters:

```typescript
private static sanitizeContextValue(val: unknown): unknown {
    if (typeof val === 'string' && val.length > 200) {
        return val.slice(0, 200) + '...[TRUNCATED]';
    }
    return val;
}
```

**File**: `src/core/errors/quickmodel.error.ts`

---

### 9. LOW-02 — Spawn Timeout in `spawnCommand`

**Threat**: `spawnCommand()` in MCP internal tools spawns child processes without a timeout. A hanging or blocked subprocess stalls the tool indefinitely.

**Defense**: 120-second hard timeout using `setTimeout` + `proc.kill('SIGTERM')` with `clearTimeout` in both close and error handlers.

**File**: `src/mcp/tools/internal/utils.ts`

---

### 10. LOW-03 — RegExp Flags Whitelist (ReDoS)

**Threat**: `regexp.transformer.ts` called `new RegExp(value.source, value.flags)` without validating the flags string. Arbitrary flags could cause `SyntaxError` runtime exceptions or produce unexpected regex behavior.

**Defense**: Flags are validated against a strict whitelist before constructing:

```typescript
const VALID_FLAGS_RE = /^[gimsuyDv]*$/;
if (!VALID_FLAGS_RE.test(value.flags ?? '')) {
	throw new QModelError(
		`Invalid RegExp flags: "${value.flags}". Allowed: g, i, m, s, u, y, d, v`
	);
}
```

**File**: `src/transformers/regexp.transformer.ts`

---

### 11. MED-06 — CLI Flag Injection via `run_tests` pattern

**Threat**: `run_tests` passes the user-supplied `pattern` argument directly to `bun test <pattern>`. An attacker can supply `--preload /evil.js` or `--hook /proc/self/mem` to inject arbitrary Bun flags.

**Defense**: The `execute()` method rejects any `pattern` starting with `-` before building the command:

```typescript
if (args.pattern !== undefined && args.pattern.startsWith('-')) {
	return {
		passed: false,
		summary: 'Security: pattern must not start with a CLI flag (-).',
	};
}
```

**File**: `src/mcp/tools/internal/run-tests.tool.ts`

---

### 12. MED-07 — CLI Flag Injection via `lint_check` targets

**Threat**: `lint_check` allows `targetDir` and `targetFiles` to freely specify the paths passed to `npx eslint`. An attacker can supply `--rulesdir /evil` or `--stdin-filename /evil` to inject ESLint flags.

**Defense (layered)**:

1. `assertNoFlagInjection()` rejects any target starting with `-`.
2. A `--` end-of-options separator is placed between the ESLint flags and the target paths: `['eslint', '--format', 'json', '--', ...targets]`.

**File**: `src/mcp/tools/internal/lint-check.tool.ts`

---

### 13. MED-08 — DoS via Unbounded `benchmark_performance` iterations

**Threat**: `benchmark_performance` accepts an `iterations` parameter with no upper bound. Passing `iterations: 1_000_000_000` would starve the server CPU for hours.

**Defense**: Zod schema applies `.max(100_000)`, rejecting payloads above the limit before `execute()` runs. `execute()` also applies `Math.min(args.iterations, 100_000)` as defense-in-depth.

**File**: `src/mcp/tools/internal/benchmark-perf.tool.ts`

---

### 14. MED-09 — DoS via Unbounded `generate_mock` count

**Threat**: `generate_mock` accepts a `count` parameter with no upper bound. Passing `count: 1_000_000` would exhaust memory generating mock objects.

**Defense**: Zod schema applies `.max(100)`, rejecting payloads above the limit before `execute()` runs.

**File**: `src/mcp/tools/public/generate-mock.tool.ts`

---

### 15. LOW-10 — DoS via Unbounded Source Code Strings in Analysis Tools

**Threat**: `inspect_model`, `export_json_schema`, and `diff_models` feed the entire input string to regex-based static analysis. Sending a multi-megabyte payload could exhaust CPU via catastrophic backtracking.

**Defense**: Zod schema applies `.max(50_000)` to all source-code input strings, rejecting payloads larger than 50 KB before `execute()` runs.

**Files**:

- `src/mcp/tools/public/inspect-model.tool.ts` (LOW-10a)
- `src/mcp/tools/public/export-schema.tool.ts` (LOW-10b)
- `src/mcp/tools/public/diff-models.tool.ts` (LOW-10c — `model_a` and `model_b`)

---

### 16. LOW-11 — DoS via Unbounded `create_model` className and `explain_error` error

**Threat**: `create_model` inlines `className` directly into a TypeScript code template; a very long name would generate an enormous string. `explain_error` calls `JSON.parse(args.error)` without limiting input size, enabling a large-payload parse DoS.

**Defense**:

- `className` capped at `.max(100)` — well above any reasonable class name.
- `error` capped at `.max(10_000)` — matches typical serialized validation-error payloads.

**Files**:

- `src/mcp/tools/public/create-model.tool.ts` (LOW-11a)
- `src/mcp/tools/public/explain-error.tool.ts` (LOW-11b)

---

### 17. LOW-12 — DoS via Unbounded Schema String in `from_schema`

**Threat**: `from_schema` accepts a raw schema source (JSON, TypeScript interface, GraphQL SDL, Prisma model) and parses it. An unbounded `schema` string could produce parser exhaustion.

**Defense**: Zod schema applies `.max(50_000)` to `schema` and `.max(100)` to `className` before `execute()` runs.

**File**: `src/mcp/tools/public/from-schema.tool.ts`

---

### 18. LOW-13 — Path Length DoS via Unbounded `slug` in `create_guide_page`

**Threat**: `slug` is embedded in a file-system path (`docs-vitepress/en/guide/${slug}.md`). While a path-traversal guard already rejects paths outside the workspace, an unbounded `slug` could generate a very long OS path.

**Defense**: Zod schema applies `.max(100)` to `slug`. The existing path-traversal guard (`safeCwd+sep`) remains as a second layer.

**File**: `src/mcp/tools/internal/create-guide-page.tool.ts`

---

### 19. MED-11 — N×`new Function()` DoS via Unbounded `rules[]` Array

**Threat**: `simulate_validation`, `simulate_rules`, and `simulate_async_rules` iterate over a `rules` array and call `new Function(predicate)` (or equivalent) **once per rule**. An attacker sending 100,000 rules triggers 100,000 dynamic code compilations, exhausting CPU.

**Defense (layered)**:

1. `rules` array capped at `.max(50)` — prevents N×compile by limiting rule count.
2. Individual string fields capped: `field.max(100)`, `predicate.max(500)`, `message.max(200)`, `group.max(100)`.
3. `assertSafePredicate()` still validates each predicate for RCE tokens (CRIT-01 defense unchanged).

**Files**:

- `src/mcp/tools/public/simulate-validation.tool.ts` (MED-11a)
- `src/mcp/tools/public/simulate-rules.tool.ts` (MED-11b)
- `src/mcp/tools/public/simulate-async-rules.tool.ts` (MED-11c)

---

### 20. HIGH-05 — Absolute Path Bypass in `deprecation_tracker` `target_dir`

**Threat**: `target_dir` was passed directly as `isAbsolute(rawDir) ? rawDir : join(cwd, rawDir)`. An attacker could supply `/etc` and read `.ts`-looking files from any filesystem location.

**Defense**: `safeCwd` guard — `resolve(targetDir).startsWith(safeCwd)` — applied before the directory scan. Absolute paths that resolve outside the project root throw `Security Error`.

**Files**: `src/mcp/tools/internal/deprecation-tracker.tool.ts`

---

### 21. HIGH-06 — Unsanitised `base_path` in `check_doc_parity`

**Threat**: `base_path` was used directly as `cwd` for `readFileSync`/`readdirSync` calls without any path guard, allowing arbitrary directory traversal when an absolute path was supplied.

**Defense**: `safeCwd` guard validates `resolve(base_path).startsWith(safeCwd)` before the value is used. Schema also caps `base_path` at `.max(500)`. Paths outside the project root throw `Security Error`.

**Files**: `src/mcp/tools/internal/check-doc-parity.tool.ts`

---

### 22. MED-12 — Git Pathspec Injection via `target_dir` in `check_doc_drift`

**Threat**: `target_dir` was interpolated unsanitised into a `git log` pathspec (`${args.target_dir}/**/*.ts`). A crafted value like `-- . && malicious` could interact with the shell. No length cap meant memory DoS was also possible.

**Defense**: `safeCwd` guard rejects traversal; schema limits `target_dir` to `.max(200)`. The resolved path must start with `safeCwd` before being passed to git.

**Files**: `src/mcp/tools/internal/check-doc-drift.tool.ts`

---

### 23. LOW-14 — Unbounded `code` Strings in `get_form_schema` / `get_model_schema`

**Threat**: Both tools accepted arbitrarily large `code` strings for TypeScript analysis, enabling memory/CPU exhaustion.

**Defense**: `code.max(50_000)` on both schemas — consistent with the 50 000-char cap applied to `validate_usage`, `interface_to_model`, and `inspect_model` in sprint 3.

**Files**: `src/mcp/tools/public/get-form-schema.tool.ts`, `src/mcp/tools/public/get-model-schema.tool.ts`

---

### 24. LOW-15 — JSON Persistence DoS via Unbounded Fields in `agent_coordinate`

**Threat**: `agentId`, `task`, `files[]`, and `ttlMs` were uncapped. A malicious caller could write a permanent lock entry (huge `ttlMs`) or a multi-megabyte JSON registry file (giant strings / thousands of file paths), blocking all other agents indefinitely.

**Defense**:

- `agentId.max(100)`, `task.max(200)`, `files.max(50)` (array), file items `.max(500)`
- `ttlMs.max(1_800_000)` — prevents permanent locks beyond the 30-min maximum TTL.

**Files**: `src/mcp/tools/internal/agent-coordinate.tool.ts`

---

### 25. LOW-16 — Unbounded `name`, `extensions[]`, and `from_version` Fields

**Threat**: Three tools accepted uncapped parameters:

- `scaffold-feature`: `name` with no limit
- `list-todos`: `extensions[]` array with no item-count or item-length cap
- `suggest-version-migration`: `from_version` integer with no upper bound (DoS via extreme iteration in version-migration loops)

**Defense**:

- `scaffold-feature` → `name.max(100)`
- `list-todos` → `extensions.max(20)` array, item strings `.max(10)` (extension suffixes like `.ts`)
- `suggest-version-migration` → `from_version.max(1000)`

**Files**: `src/mcp/tools/internal/scaffold-feature.tool.ts`, `src/mcp/tools/internal/list-todos.tool.ts`, `src/mcp/tools/public/suggest-version-migration.tool.ts`

---

### 26. LOW-17 — Unbounded `projectDir` in `check_changelog`

**Threat**: `projectDir` accepted arbitrarily long strings at the schema level before the safeCwd path guard ran, enabling memory exhaustion.

**Defense**: `projectDir.max(500)` — consistent with the 500-char cap applied to other path inputs (`base_path`, `target_dir`, `baseline_path`).

**Files**: `src/mcp/tools/internal/check-changelog.tool.ts`

---

### 27. LOW-18 — Unbounded `targetDir` in `check_project_rules`

**Threat**: `targetDir` accepted arbitrarily long strings at the schema level before the safeCwd path guard ran.

**Defense**: `targetDir.max(500)`.

**Files**: `src/mcp/tools/internal/check-project-rules.tool.ts`

---

### 28. LOW-19 — Unbounded Top-Level `group` Filter in `simulate_validation`

**Threat**: The top-level `group` parameter (used to filter which rules are evaluated) was unbounded. Individual rule-level `group` fields had `.max(100)` but the filter argument itself did not, allowing an oversized string to be compared against every rule's group field in a loop.

**Defense**: Top-level `group.max(100)` — consistent with the rule-level cap already in place.

**Files**: `src/mcp/tools/public/simulate-validation.tool.ts`

---

### 29. LOW-20 — Unbounded `targetDir` and `targetFiles[]` in `lint_check`

**Threat**: `targetDir` had no `.max()` cap, and `targetFiles` had no array or item caps. Both are forwarded into ESLint command-line arguments via `spawnCommand`. Oversized inputs could exhaust memory or create abnormally large command lines.

**Defense**:

- `targetDir.max(500)`
- `targetFiles.max(100)` (array), item strings `.max(500)` (file paths)

**Files**: `src/mcp/tools/internal/lint-check.tool.ts`

---

### 30. LOW-21 — Unbounded `properties` Record in `create_model` (Regex Loop DoS)

**Threat**: `create_model` iterates over `properties` keys and applies `/^[a-zA-Z_$][a-zA-Z0-9_$]*$/` regex validation and TypeScript code generation for every entry. Submitting 100,000 properties causes 100,000 regex evaluations and proportionally large string concatenation, exhausting CPU and memory.

**Defense**: Runtime guard at the top of `execute()` — `Object.keys(properties).length > 200` throws `Security Error: Too many properties (max 200)`. The max was chosen to cover all realistic model definitions while preventing abuse.

**Files**: `src/mcp/tools/public/create-model.tool.ts`

---

### 31. MED-13 — Missing `capInputArrays()` in `explain_transformation`

**Threat**: `args.data` was passed directly to `TraceModel.create()` without capping arrays. A data object containing a field with 10M+ elements would exhaust memory during model construction, unlike `simulate_transformation` which already applied `capInputArrays()`.

**Defense**: `capInputArrays()` applied to `args.data` before `TraceModel.create()` — identical to the pattern in `simulate-transformation.tool.ts` (arrays capped at 1,000 elements, keys capped at 500).

**Files**: `src/mcp/tools/public/explain-transformation.tool.ts`

---

### 32. MED-14 — Missing `capInputArrays()` in `check_integrity`

**Threat**: `args.data` values were passed to `new DynamicField({ [field]: value })` per-field without capping. Large arrays on a field value could exhaust memory during transformer construction.

**Defense**: `capInputArrays()` applied to `args.data` before the per-field construction loop (pattern copied from `simulate-transformation.tool.ts`).

**Files**: `src/mcp/tools/public/check-integrity.tool.ts`

---

### 33. LOW-22 — Stack Overflow via Deeply Nested Options in `hydrateOptions()`

**Threat**: `hydrateOptions()` recurses into nested objects and arrays without a depth limit. A caller supplying `options: { a: { a: { a: … } } }` 65,000+ levels deep would exhaust the JavaScript call stack, crashing the MCP server process.

**Defense**: Added `depth = 0` parameter; all recursive calls pass `depth + 1`. When `depth > 10` the value is returned as-is, preventing runaway recursion.

**Files**: `src/mcp/tools/public/simulate-transformation.tool.ts`, `src/mcp/tools/public/roundtrip.tool.ts`, `src/mcp/tools/public/check-integrity.tool.ts`, `src/mcp/tools/public/explain-transformation.tool.ts`

---

## Automated Audit

Use the MCP tool `run_security_audit` to re-run all of the above checks automatically:

```
run_security_audit({})
```

Returns:

- `staticChecks[]` — one entry per fix above, with `passed: boolean` and failure detail
- `testSuite` — result of `bun test tests/security/`
- `passed` — `true` only when all static checks AND test suite pass

---

## Security Test Suite

All mitigations are covered by `tests/security/`:

| File                             | Coverage                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mcp-simulate-rce.test.ts`       | CRIT-01/CRIT-01d: assertSafePredicate — 33 forbidden tokens, 20 predicate attack vectors                                                                                                                                                                                        |
| `mcp-path-traversal.test.ts`     | HIGH-01/02/03 + NEW-01/02/03 + HIGH-05/06 + MED-12: safeCwd+sep guards                                                                                                                                                                                                          |
| `mcp-medium-vulns.test.ts`       | MED-02 deserialization, MED-03 title injection, MED-05 query length, MED-10 pre-commit flag injection                                                                                                                                                                           |
| `mcp-spawn-injection.test.ts`    | MED-06 pattern flag injection, MED-07 target flag injection + -- separator, MED-08/09 schema DoS limits                                                                                                                                                                         |
| `mcp-arg-injection.test.ts`      | MED-06/07/08/09: complementary attack-vector coverage                                                                                                                                                                                                                           |
| `mcp-input-caps.test.ts`         | LOW-05..22 + MED-11/13/14: parser/regex DoS caps, rules array, agent-coordinate, scaffold, list-todos, suggest-version-migration, lint-check, check-changelog, check-project-rules, create-model properties, explain-transformation, check-integrity, simulate-validation group |
| `mcp-hydrate-dos.test.ts`        | LOW-22: hydrateOptions depth-overflow guard in simulate-transformation, roundtrip, check-integrity, explain-transformation                                                                                                                                                      |
| `mcp-security.test.ts`           | broad MCP surface: property casing, injection patterns                                                                                                                                                                                                                          |
| `prototype-pollution.test.ts`    | `__proto__`, `constructor.prototype`, `Object.create(null)`                                                                                                                                                                                                                     |
| `dos-limits.test.ts`             | `populationLimit`, deeply nested objects                                                                                                                                                                                                                                        |
| `large-array-dos.test.ts`        | 1M-element arrays, custom array limits                                                                                                                                                                                                                                          |
| `bigint-dos.test.ts`             | 100k-char BigInt strings                                                                                                                                                                                                                                                        |
| `type-confusion.test.ts`         | Type guard bypass via coercion                                                                                                                                                                                                                                                  |
| `information-disclosure.test.ts` | Serializer stack omission, context truncation                                                                                                                                                                                                                                   |
| `regexp-security.test.ts`        | LOW-03: ReDoS via malicious patterns                                                                                                                                                                                                                                            |
| `schema-poisoning.test.ts`       | `__proto__`, `constructor` as property names                                                                                                                                                                                                                                    |
| `security-policy.test.ts`        | End-to-end policy: unknownPropertyPolicy: 'strip'                                                                                                                                                                                                                               |
