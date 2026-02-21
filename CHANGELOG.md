# Changelog

## [Unreleased]

### Added

- CI/CD enhancements:
    - Automatic coverage reporting to Codecov
    - Bundle size tracking in PRs
    - Separate security audit job
    - Performance benchmark job
    - CodeQL security scanning (scheduled weekly + on PRs)
- Package metadata:
    - `publishConfig` for npm registry
    - `funding` field for GitHub Sponsors
- README badges for CI status, coverage, npm version, and bundle size
- **New documentation files:**
    - `CONTRIBUTING.md` in root (quick reference linking to full guides)
    - `.nvmrc` for Node version management (18.0.0)
    - `docs-vitepress/{en,es}/guide/unknown-property-policy.md` (replaces strict-mode.md)

### Changed

- **BREAKING**: Removed deprecated `strict` property from `IQConfig` and `IQOptions`
    - Use `unknownPropertyPolicy: 'error'` instead of `strict: true`
    - Use `unknownPropertyPolicy: 'keep'` instead of `strict: false` (default)
    - Use `unknownPropertyPolicy: 'strip'` for sanitization (new option)
- Removed deprecated `getTemplateInstance()` wrapper from `PopulationService`
    - Now uses `securityInspector.getTemplateInstance()` directly
- CI workflow now runs on `develop` branch in addition to `main`
- Tests now run with coverage by default in CI
- **Documentation overhaul:**
    - All references to `strict: true/false` updated to `unknownPropertyPolicy`
    - Corrected version references from "QuickModel 3.0" to "QuickModel 1.0"
    - Renamed `strict-mode.md` → `unknown-property-policy.md` (EN + ES)
    - Clarified TypeScript `strict: true` vs QuickModel's `unknownPropertyPolicy` in installation guides
    - Updated README.md security notice
    - Updated SECURITY.md recommendations
    - Updated 10+ documentation files across EN/ES
- **Build optimization:**
    - Enhanced tree-shaking with `preset: 'smallest'` and `moduleSideEffects: false`
    - Aggressive minification: identifiers, syntax, whitespace

### Removed

- Temporary debug files: `test_case.ts`, `test_json.ts`
- Backup files: `src/core/services/to-interface.service.ts.bak`
- Legacy config: `.eslintrc.json` (using flat config `eslint.config.mjs`)
- Deprecated `strict-mode.md` documentation files (replaced with `unknown-property-policy.md`)

### Documentation

- Updated ESLint config comments to explain disabled TypeScript rules for reflection-based operations
- Complete documentation sync between English and Spanish versions
- All code examples updated to current API

## [1.0.0] - 2026-01-07
