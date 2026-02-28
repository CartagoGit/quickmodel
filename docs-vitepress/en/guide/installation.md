# Installation

## Prerequisites

Before installing QuickModel, ensure you have:

- **Node.js** >= 18.0.0
- **TypeScript** >= 3.4.0
- A package manager: npm, yarn, pnpm, or bun

::: details TypeScript version compatibility
QuickModel avoids TypeScript built-ins that would raise the minimum version. The table below lists every version-sensitive feature and how it is handled:

| Feature                                    | Where used                                    | Introduced in | How we handle it                                     |
| ------------------------------------------ | --------------------------------------------- | ------------- | ---------------------------------------------------- |
| Mapped types, indexed access (`T[number]`) | `IQGroupsMap<T>`, `qGroups()` return type     | TS 2.1        | Native                                               |
| Conditional types (`INoInfer<T>`)          | polyfill for `QModel.create()`                | TS 2.8        | Native (our own polyfill, no built-in used)          |
| `readonly T[]` shorthand in generics       | `qGroups()` overload                          | TS 3.4        | Native (sets the floor)                              |
| `ClassFieldDecoratorContext`               | `@QType` / `@QRule` TC39 overload             | TS 5.0        | Polyfilled as `IClassFieldDecoratorCtx` (internal)   |
| `NoInfer<T>` built-in                      | `QModel.create()` / `QModel.createMany()`     | TS 5.4        | Polyfilled as `INoInfer<T>` (internal)               |
| `const` type parameters                    | `qGroups5()` / `compat/ts5/forms` entry point | TS 5.0        | Isolated in separate `/compat/ts5/forms` entry point |

The **main package** (`quickmodel`) works with TypeScript **3.4+**.
The `/compat/ts5/forms` entry point requires TypeScript **5.0+** due to `const` type parameters.
:::

## Install QuickModel

Choose your preferred package manager:

::: code-group

```bash [npm]
npm install quickmodel
```

```bash [yarn]
yarn add quickmodel
```

```bash [pnpm]
pnpm add quickmodel
```

```bash [bun]
bun add quickmodel
```

:::

## TypeScript Configuration

QuickModel supports **two decorator modes**. Pick whichever matches your project:

### Mode 1 — Legacy decorators (classic, widest tooling compatibility)

```json
{
	"compilerOptions": {
		"experimentalDecorators": true,
		"target": "ES2022",
		"lib": ["ES2022"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

### Mode 2 — TC39 standard decorators (TypeScript 5+, no legacy flags)

```json
{
	"compilerOptions": {
		"target": "ES2022",
		"lib": ["ES2022"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

::: info TC39 mode — what changes?
When `experimentalDecorators` is **absent or `false`**, TypeScript compiles decorators using the TC39 Stage-3 spec. QuickModel handles this transparently:

- **`@Quick`** — unchanged. Class decorators still receive the class constructor as their first argument.
- **`@QType`** — metadata is now registered inside an `addInitializer` callback that fires on **first instance creation** instead of at class-definition time. For practical purposes this is invisible — the metadata is always ready before `QModel.initialize()` reads it.
- **`@QRule`** — the predicate parameter type is **automatically inferred** from the field type. No manual annotation needed:

```typescript
// TC39 mode — val inferred as Date automatically ✅
@QRule((val) => val > new Date('2000-01-01'), 'Must be after 2000')
createdAt!: Date;

// Legacy mode — annotation required
@QRule((val: Date) => val > new Date('2000-01-01'), 'Must be after 2000')
declare createdAt: Date;
```

:::

::: warning Field syntax changes with TC39
In **TC39 mode**, field decorators (`@QType`, `@QRule`) **cannot be applied to `declare` fields** — use `!` (definite assignment assertion) instead:

```typescript
// ✅ TC39 mode
@QType(Date)
createdAt!: Date;

// ✅ Legacy mode (experimentalDecorators: true)
@QType(Date)
declare createdAt: Date;
```

Undecorated fields that only need type-tracking (no `@QType` / `@QRule`) can still use `declare` in both modes.
:::

### Required Compiler Options

- **`experimentalDecorators: true`** _(legacy mode only)_ — enables legacy PropertyDecorator syntax. Omit it (or set to `false`) to use TC39 mode.

### Recommended Options

- **`strict: true`** - Enable all **TypeScript** strict type-checking options (unrelated to QuickModel's `unknownPropertyPolicy`)
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
    import { QModel, Quick } from 'quickmodel';
    ```
- **Type Definitions**: Interfaces and helper types (`IQSerializedInterface`, `IQSpec`, etc.)
    ```typescript
    import type { IQSerializedInterface } from 'quickmodel/types';
    ```
- **Advanced Utilities**: Runtime utilities for power users (`QMockGenerator`)
    ```typescript
    import { QMockGenerator } from 'quickmodel/advanced';
    ```

## Verify Installation

Create a simple test file to verify everything works:

```typescript
import { QModel, Quick } from 'quickmodel';

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
