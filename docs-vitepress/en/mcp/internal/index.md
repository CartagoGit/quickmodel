# Internal MCP Tools

> [!WARNING]
> ⚠️ **Internal Use Only**: This is NOT for end users installing the package via npm.

These tools are designed for **maintainers** of the QuickModel library. They automate common development tasks and project health checks.

## Internal Tools

### `generate_test`

Scaffolds a new unit test file for a given source file.

- **Input**: Source file path (e.g., `src/core/my-feature.ts`).
- **Action**: Creates `tests/unit/core/my-feature.test.ts` with imports pre-filled.

### `update_docs`

Triggers the documentation build process.

- **Actions**: `build` (full rebuild), `clean` (remove dist).
- **Usage**: "Rebuild the docs to check my changes."

## Quality Assurance

### `check_project_health`

Runs a comprehensive check of the project status.

- **Runs**: `bun run check` (Lint, Typecheck, Tests).
- **Usage**: "Is the project healthy?"

### `check_jsdocs`

Scans the source code for exported members that are missing JSDoc documentation.

- **Usage**: "Are there any missing docs?"
- **Output**: List of files and lines with missing documentation.

### `get_coverage_report`

Runs the test suite with coverage enabled and reports the summary.

- **Usage**: "What is the current test coverage?"
- **Output**: Summary table of coverage percentages.
