#!/usr/bin/env python3
"""One-shot script to append apply_solid + sync_project sections to EN skills.md."""

APPLY_SOLID_SYNC = """
---

## `quickmodel_apply_solid`

**Guided SOLID principles review with targeted refactors and gate enforcement.**

Analyses files against all 5 SOLID principles (SRP, OCP, LSP, ISP, DIP), proposes targeted improvements and gates every change with `run_tests`, `lint_check` and `typecheck`.

### Arguments

| Argument     | Required | Description                                                                                       |
| ------------ | -------- | -------------------------------------------------------------------------------------------------- |
| `file_paths` | ✅ Yes   | Comma-separated list of source files to review (e.g. `"src/mcp/tools/internal/my-tool.ts"`)        |
| `concern`    | ✗ No     | Optional specific SOLID concern already identified (e.g. `"SRP violation: class handles parsing and IO"`) |

### SOLID Principles Reference

| Principle             | Code    | What to check                                                     | Common fix                              |
| --------------------- | ------- | ----------------------------------------------------------------- | --------------------------------------- |
| Single Responsibility | **SRP** | Does each class have exactly ONE reason to change?                | Split concerns into separate classes    |
| Open/Closed           | **OCP** | Can behaviours be extended without modifying existing code?       | Use abstract bases, strategy pattern    |
| Liskov Substitution   | **LSP** | Can subtypes fully replace base types without breaking callers?   | Don't override to throw; preserve contract |
| Interface Segregation | **ISP** | Are interfaces lean? Do clients depend on unused methods?         | Split fat interfaces into focused ones  |
| Dependency Inversion  | **DIP** | Do high-level modules depend on abstractions, not concretions?    | Inject via interface; constructor injection |

### Gates (in order, after each change)

| Gate         | What it checks                   |
| ------------ | -------------------------------- |
| `run_tests`  | No regressions introduced        |
| `lint_check` | No ESLint violations             |
| `typecheck`  | No TypeScript type errors        |

### Workflow

1. Call `run_tests` → confirm green baseline
2. Review SRP → extract if needed → run gates
3. Review OCP → introduce abstractions → run gates
4. Review LSP → fix overrides → run gates
5. Review ISP → split interfaces → run gates
6. Review DIP → replace `new Concrete()` with injected abstractions → run gates
7. Only declared done when all gates pass

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

| Gate             | What it checks                                           |
| ---------------- | -------------------------------------------------------- |
| `project_status` | Consolidated snapshot: tests + lint + typecheck          |
| `run_tests`      | Fix until `passed: true` if tests fail                   |
| `lint_check`     | Fix until `passed: true` if lint errors exist            |
| `typecheck`      | Fix until `passed: true` if TS errors exist              |
| `sync_docs`      | Regenerate API reference and auto-generated doc files    |

### Workflow

1. Call `project_status` → get current health snapshot
2. If tests fail → diagnose and fix → re-run `run_tests` until `passed: true`
3. If lint errors → fix violations → re-run `lint_check` until `passed: true`
4. If typecheck errors → fix TS errors → re-run `typecheck` until `passed: true`
5. Call `sync_docs` → regenerate documentation
6. Call `project_status` again → confirm `passed: true` across all checks
7. Only declared done when all layers are green and docs are regenerated

### Example

```
→ AI calls project_status() → { passed: false, tests: { passed: true }, lint: { passed: false }, typecheck: { passed: true } }
→ AI fixes lint violations
→ AI calls lint_check() → { passed: true }
→ AI calls sync_docs() → "Successfully updated 6 documentation files"
→ AI calls project_status() → { passed: true } → done
```
"""

with open("docs-vitepress/en/mcp/public/skills.md", "r", encoding="utf-8") as fh:
    content = fh.read()

if "## `quickmodel_apply_solid`" in content:
    print("EN: section already present — skipping")
else:
    with open("docs-vitepress/en/mcp/public/skills.md", "a", encoding="utf-8") as fh:
        fh.write(APPLY_SOLID_SYNC)
    print("EN: appended apply_solid + sync_project sections")
