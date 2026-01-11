# Contribution Guide

Complete guide for developers contributing to the QuickModel project.

## 📋 Table of Contents

- [Environment Setup](#environment-setup)
- [Architecture](#architecture)
- [Build System](#build-system)
- [Testing](#testing)
- [Code Style](#code-style)
- [Commits and Releases](#commits-and-releases)

## 🚀 Environment Setup

### Requirements

- **Bun** >= 1.0 (runtime and package manager)
- **TypeScript** >= 5.7
- **Node.js** >= 20 (for documentation tools)

### Installation

```bash
# Clone repository
git clone https://github.com/CartagoGit/quickmodel.git
cd quickmodel

# Install dependencies
bun install

# Verify installation
bun test
bun run build
```

## 🏗️ Architecture

QuickModel follows **SOLID principles** with a clear and maintainable architecture.

### Project Structure

```
src/
├── index.ts                    # Public API exports
├── core/
│   ├── models/
│   │   └── quick.model.ts      # QModel base class
│   ├── decorators/
│   │   ├── quick.decorator.ts  # @Quick() - Bulk decorator
│   │   └── qtype.decorator.ts  # @QType() - Per-property decorator
│   ├── services/
│   │   ├── model-serializer.service.ts
│   │   ├── model-deserializer.service.ts
│   │   └── validation.service.ts
│   ├── registry/
│   │   └── transformer.registry.ts
│   ├── bases/
│   │   └── base-transformer.ts
│   └── interfaces/
│       ├── model.interface.ts
│       ├── transformer.interface.ts
│       ├── serializer.interface.ts
│       └── field-symbols.interface.ts
└── transformers/
    ├── bigint.transformer.ts
    ├── date.transformer.ts
    ├── regexp.transformer.ts
    ├── symbol.transformer.ts
    ├── error.transformer.ts
    ├── map-set.transformer.ts
    ├── buffer.transformer.ts
    ├── typed-array.transformer.ts
    └── primitive.transformer.ts
```

### SOLID Principles

#### 1. Single Responsibility Principle (SRP)

- **Transformers**: Each transformer handles ONE specific type
- **Services**: Separate services for serialization, deserialization, and validation
- **Decorators**: Only register metadata, do not contain transformation logic

#### 2. Open/Closed Principle (OCP)

- Extensible system via registration of new transformers
- Does not require modifying existing code to add types
- Registry pattern allows injection of custom transformers

#### 3. Liskov Substitution Principle (LSP)

- All transformers implement `IQTransformer<TInput, TSerialized>`
- Models behave like standard TypeScript classes
- Transparent substitution in inheritance hierarchies

#### 4. Interface Segregation Principle (ISP)

- Separate interfaces for serialization (`IUser`) and runtime (`IUserTransform`)
- Clients do not depend on interfaces they do not use
- Small and specific contracts

#### 5. Dependency Inversion Principle (DIP)

- Services depend on abstractions (`IQTransformer`), not implementations
- Registry acts as a dependency injection container
- Transformers do not know serialization details

### Data Flow

```
┌─────────────┐
│ Constructor │ → Incoming Data (JSON from backend)
└──────┬──────┘
       ↓
┌────────────────────┐
│ @Quick/@QType      │ → Transformation Metadata
│ (Decorators)       │
└─────────┬──────────┘
          ↓
┌──────────────────────┐
│ Deserializer    │ → Applies transformations
│ Service              │
└──────────┬───────────┘
           ↓
┌─────────────────────┐
│ Transformers        │ → Transform specific types
│ (Registry lookup)   │   (string → Date, array → Set, etc.)
└──────────┬──────────┘
           ↓
┌─────────────────┐
│ QModel Instance │ → Properties with correct runtime types
└─────────────────┘
```

## 🔨 Build System

### Main Scripts

```bash
# Compile project (clean, test, and build)
bun run build

# Development with watch mode
bun run dev

# Clean dist/
bun run clean

# Verify types without emitting
bun run typecheck
```

### TypeScript Configuration

**tsconfig.json** - Source code compilation:

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"module": "ESNext",
		"lib": ["ES2023"],
		"moduleResolution": "bundler",
		"baseUrl": ".",
		"paths": {
			"@/*": ["src/*"]
		},
		"rootDir": "./src",
		"outDir": "./dist",
		"strict": true,
		"experimentalDecorators": true,
		"emitDecoratorMetadata": true
	},
	"include": ["src/**/*"],
	"exclude": ["node_modules", "dist", "tests", "run", "docs"]
}
```

**tsconfig.test.json** - Test configuration:

```json
{
	"extends": "./tsconfig.json",
	"compilerOptions": {
		"noEmit": true,
		"noUnusedLocals": true,
		"noUnusedParameters": true
	},
	"include": ["src/**/*", "tests/**/*"]
}
```

### Bundling with tsup

**tsup.config.ts**:

```typescript
export default defineConfig({
	entry: { index: 'src/index.ts' },
	format: ['cjs', 'esm'],
	dts: true,
	sourcemap: true,
	clean: true,
	treeshake: true,
	external: ['reflect-metadata'],
	esbuildOptions(options) {
		options.alias = { '@': './src' };
	},
});
```

### Path Aliases

**Always use path aliases `@/*` instead of relative imports:**

```typescript
// ✅ CORRECT
import { QModel } from '@/core/models/quick.model';
import { Deserializer } from '@/core/services/model-deserializer.service';

// ❌ INCORRECT
import { QModel } from '../../core/models/quick.model';
import { Deserializer } from '../services/model-deserializer.service';
```

### NO Barrel Files

**Important Rule:** DO NOT use barrel files (index.ts) except for the main one in `src/index.ts`

```typescript
// ❌ NEVER create index.ts files like these:
// src/transformers/index.ts
// src/core/services/index.ts
// src/core/interfaces/index.ts

// ✅ Import directly from source files
import { BigIntTransformer } from '@/transformers/bigint.transformer';
```

**Reasons:**

- Avoids circular dependencies
- Faster build (fewer module resolutions)
- Better tree-shaking
- Explicit and clear imports

## 🧪 Testing

### Framework

We use **Bun Test** (native, ultra-fast, compatible with Jest/Vitest API)

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── primitives/
│   ├── collections/
│   └── transformers/
├── integration/       # Feature integration tests
│   └── decorators/
├── system/           # Full workflow tests
│   └── full-workflow/
└── e2e/              # End-to-end tests
    └── user-scenarios/
```

### Running Tests

```bash
# All tests
bun test

# With coverage
bun run test:coverage

# Only unit tests (fast)
bun test tests/unit

# Only integration tests
bun test tests/integration

# Specific test
bun test tests/unit/primitives/bigint.test.ts

# Watch mode
bun test --watch
```

### Writing Tests

**Basic Pattern:**

```typescript
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';

describe('Feature Name', () => {
	test('should do something specific', () => {
		// Arrange
		const data = {
			/* ... */
		};

		// Act
		const model = new Model(data);

		// Assert
		expect(model.property).toBe(expected);
	});
});
```

**Conventions:**

- Name files with pattern: `feature-scenario.test.ts`
- Use `describe` to group related tests
- Each `test` should validate ONE specific thing
- Use Arrange/Act/Assert comments in complex tests

## 🎨 Code Style

### Tools

- **ESLint**: Static analysis
- **Prettier**: Automatic formatting
- **TypeScript**: Type checking

### Configuration

**package.json** (Prettier):

```json
{
	"prettier": {
		"useTabs": true,
		"tabWidth": 2,
		"singleQuote": true,
		"printWidth": 100,
		"trailingComma": "es5",
		"semi": true
	}
}
```

### Main Rules

1. **Indentation**: Tabs (no spaces)
2. **Quotes**: Single quotes (`'`)
3. **Line Length**: Max 100 characters
4. **Semicolons**: Yes (always)
5. **Trailing commas**: ES5 style

### Linting Scripts

```bash
# Check code
bun run lint

# Auto-fix problems
bun run lint:fix

# Check format
bun run format:check

# Auto-format
bun run format
```

### TypeScript Conventions

**Interfaces:**

```typescript
// ✅ I Prefix for data interfaces
interface IUser { ... }

// ✅ I Prefix for contract interfaces
interface IQTransformer<T, S> { ... }
```

**Types vs Interfaces:**

```typescript
// ✅ Use interface for objects and contracts
interface IUser {
	id: number;
	name: string;
}

// ✅ Use type for unions, tuples, utilities
type Status = 'active' | 'inactive';
type Point = [number, number];
```

**Property Declaration:**

```typescript
// ✅ Option 1: declare (recommended)
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
}

// ✅ Option 2: definite assignment (!)
class User extends QModel<IUser> {
	id!: number;
	name!: string;
}
```

## 📝 Commits and Releases

### Conventional Commits

**Mandatory Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Main Types:**

- `feat`: New feature (MINOR bump)
- `fix`: Bug fix (PATCH bump)
- `docs`: Documentation only
- `style`: Formatting, no code changes
- `refactor`: Refactoring
- `test`: Adding or modifying tests
- `chore`: Maintenance
- `perf`: Performance improvement (PATCH bump)

**Project Scopes:**

- `transformers`, `decorators`, `services`, `core`, `tests`, `docs`, `build`, `deps`

**Examples:**

```bash
feat(transformers): add URL transformer support
fix(serializer): correct BigInt serialization bug
docs(readme): update installation instructions
chore(deps): update typescript to 5.7.2
```

### Release Workflow

**Before Releasing:**

```bash
# 1. Verify commits since last tag
bun run release:check

# 2. Run tests
bun test

# 3. Verify build
bun run build
```

**Release Process (Automated):**

```bash
# 1. Merge to main
git checkout main
git merge develop
git push origin main

# 2. GitHub Actions handles:
#    - Running tests
#    - Project build
#    - Analyzing commits (semantic-release)
#    - Calculating new version
#    - Creating tag
#    - Updating CHANGELOG
#    - Publishing to npm
#    - Creating GitHub release
```

### Semantic Versioning

```
MAJOR.MINOR.PATCH
```

- **MAJOR** (2.0.0): Breaking changes (`feat!:` or `BREAKING CHANGE:`)
- **MINOR** (1.1.0): New features (`feat:`)
- **PATCH** (1.0.1): Bug fixes (`fix:`, `perf:`)

## 📚 Documentation

### Tools

- **TypeDoc**: Generates API reference from JSDoc comments
- **VitePress**: Static site for guides and tutorials

### Generating Documentation

```bash
# API Reference (TypeDoc)
bun run docs:api

# VitePress dev server
bun run docs:dev

# Build VitePress
bun run docs:build

# Preview VitePress build
bun run docs:preview
```

### Writing JSDoc

````typescript
/**
 * Transforms BigInt values for serialization
 *
 * @remarks
 * Serializes as string to maintain precision in JSON
 *
 * @example
 * ```ts
 * const transformer = new BigIntTransformer();
 * transformer.serialize(123n); // "123"
 * transformer.deserialize("123"); // 123n
 * ```
 */
export class BigIntTransformer implements IQTransformer<bigint, string> {
	// ...
}
````

## 🤝 Contributing

### Recommended Workflow

1. **Fork and clone**
2. **Create branch**: `git checkout -b feat/new-feature`
3. **Develop** with tests
4. **Commit** following Conventional Commits
5. **Push** and create Pull Request
6. **Review** and merge

### Checklist before PR

- ✅ Tests pass: `bun test`
- ✅ Build works: `bun run build`
- ✅ Lint OK: `bun run lint`
- ✅ Format OK: `bun run format:check`
- ✅ Types OK: `bun run typecheck`
- ✅ Commits follow Conventional Commits
- ✅ Documentation updated (if applicable)

## 📖 References

- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Bun Documentation](https://bun.sh/docs)
- [Semantic Release](https://semantic-release.gitbook.io/)
