# Internal MCP Skills (Maintainers)

> [!WARNING]
> ⚠️ **Internal Use Only**: These skills are for **QuickModel contributors**. They depend on [Internal Tools](./index) and enforce project rules (TDD gates, lint, typecheck, naming conventions). They are not useful for developers who install the package via npm.

**Skills** (also called **prompts**) are guided AI workflows built on top of MCP tools. Maintainer skills orchestrate internal tools to drive the AI through complete contribution workflows — enforcing TDD, lint, typecheck gates, and documentation sync automatically.

::: tip When to use a maintainer skill
Use these skills when **working on the QuickModel codebase itself**: implementing a feature, fixing lint/typecheck errors, refactoring, applying SOLID principles, or syncing the project health and documentation.
:::

---

## Available Skills

| Skill name                                                      | Title                           | Description                                                                     |
| --------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------- |
| [`quickmodel_implement_feature`](#quickmodel_implement_feature) | Implement Feature (TDD)         | Full TDD cycle enforced by `lint_check` + `typecheck` gates                     |
| [`quickmodel_fix_lint`](#quickmodel_fix_lint)                   | Fix ESLint Errors               | Step-by-step lint fix with `lint_check` + `pre_commit_check` gates              |
| [`quickmodel_fix_typecheck`](#quickmodel_fix_typecheck)         | Fix TypeScript Type Errors      | Step-by-step TS fix with `typecheck` + `pre_commit_check` gates                 |
| [`quickmodel_refactor`](#quickmodel_refactor)                   | Safe Refactor (TDD-gated)       | Refactor cycle gated by `run_tests`, `lint_check`, `typecheck`                  |
| [`quickmodel_apply_solid`](#quickmodel_apply_solid)             | Apply SOLID Principles (guided) | Structured per-principle review gated by `run_tests`, `lint_check`, `typecheck` |
| [`quickmodel_sync_project`](#quickmodel_sync_project)           | Sync Project (health + docs)    | `project_status` snapshot → fix failures → regenerate docs via `sync_docs`      |

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
