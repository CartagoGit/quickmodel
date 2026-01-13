# Installation

## Prerequisites

Before installing QuickModel, ensure you have:

- **Node.js** >= 18.0.0
- **TypeScript** >= 5.0.0
- A package manager: npm, yarn, pnpm, or bun

## Install QuickModel

Choose your preferred package manager:

::: code-group

```bash [npm]
npm install @cartago-git/quickmodel
```

```bash [yarn]
yarn add @cartago-git/quickmodel
```

```bash [pnpm]
pnpm add @cartago-git/quickmodel
```

```bash [bun]
bun add @cartago-git/quickmodel
```

:::

## TypeScript Configuration

QuickModel uses decorators, so you need to enable them in your `tsconfig.json`:

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"target": "ES2020",
		"lib": ["ES2020"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

### Required Compiler Options

- **`experimentalDecorators: true`** - Enables decorator syntax (`@Quick()`)

### Recommended Options

- **`strict: true`** - Enable all strict type-checking options for better type safety
- **`target: "ES2020"`** - Modern JavaScript features
- **`module: "ESNext"`** - Modern module system

::: warning emitDecoratorMetadata is NOT required
Unlike many other libraries, **QuickModel does NOT require `"emitDecoratorMetadata": true`**.

QuickModel relies on **explicit type mapping** (e.g., `@Quick({ date: Date })`) as the source of truth. This ensures robust behavior regardless of your compiler settings or build tool (esbuild, swc, babel, etc.).

**Specific Case:** When using `@QType()` **without arguments**, QuickModel attempts to read metadata. If `emitDecoratorMetadata` is disabled, it simply falls back to treating the value **"as-is"** (no transformation). This is perfectly fine for primitives but means you must use explicit mapping for special types (Date, BigInt, etc.).
:::

## Import Structure

QuickModel uses a modular import structure to keep your project clean:

- **Core**: Main classes and decorators (`QModel`, `Quick`, `QType`)
    ```typescript
    import { QModel, Quick } from '@cartago-git/quickmodel';
    ```
- **Type Definitions**: Interfaces and helper types (`IQSerializedInterface`, `IQSpec`, etc.)
    ```typescript
    import type { IQSerializedInterface } from '@cartago-git/quickmodel/types';
    ```
- **Advanced Utilities**: Runtime utilities for power users (`QMockGenerator`)
    ```typescript
    import { QMockGenerator } from '@cartago-git/quickmodel/advanced';
    ```

## Verify Installation

Create a simple test file to verify everything works:

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
	createdAt: string;
}

@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
}

const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z',
});

console.log(user.createdAt instanceof Date); // true ✅
```

If this runs without errors and prints `true`, you're all set!

## Next Steps

- [Quick Start](/en/guide/quick-start) - Build your first model
- [QModel](/en/guide/qmodel) - Learn about the base model class
- [Examples](/en/examples/) - See real-world examples
