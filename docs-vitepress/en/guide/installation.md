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
		"emitDecoratorMetadata": true,
		"target": "ES2020",
		"lib": ["ES2020"],
		"module": "ESNext",
		"moduleResolution": "node"
	}
}
```

### Required Compiler Options

- **`experimentalDecorators: true`** - Enables decorator syntax (`@Quick()`, `@QType()`)
- **`emitDecoratorMetadata: true`** - Enables runtime type reflection

### Recommended Options

- **`strict: true`** - Enable all strict type-checking options for better type safety
- **`target: "ES2020"`** - Modern JavaScript features
- **`module: "ESNext"`** - Modern module system

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

## Optional Dependencies

### For Testing (Mocks)

QuickModel includes built-in mock generation using Faker.js:

```bash
npm install --save-dev @faker-js/faker
```

This is only needed if you plan to use the `.mock()` method for testing.

## Next Steps

- [Quick Start](/en/guide/quick-start) - Build your first model
- [QModel](/en/guide/qmodel) - Learn about the base model class
- [Examples](/en/examples/) - See real-world examples
