# Type Safety with `IQImplements`

`IQImplements` is a helper type designed to enforce strict type safety between your raw data interface (JSON) and your runtime model class (TypeScript).

It ensures that your class **implements all properties** from the interface while correctly handling any **type transformations** defined by custom logic or decorators.

> [!NOTE] Recommended but Optional
> You can strictly work without `IQImplements`, but it is **highly recommended** to use it. Without it, you lose the bridge between your JSON interface and your runtime class, leading to potential type errors and missing property checks.

## Why use it?

When you transform data (e.g., converting a `string` ISO date from JSON into a `Date` object in your class), there is often a disconnect between the input interface and the class properties.

Without `IQImplements`:

1.  **Missing Properties**: You might forget to declare a property in your class that exists in the interface.
2.  **Type Mismatches**: TypeScript might insist your property is a `string` (because of the interface) when it's actually a `Date` at runtime.
3.  **Refactoring Risks**: Adding a new field to your API interface won't automatically trigger an error in your model class, leading to runtime bugs.

`IQImplements` solves all these problems by enforcing a strict contract.

## Usage

The type takes two generic arguments:

1.  **TInterface**: The base interface representing the raw JSON structure.
2.  **TTransforms**: An object type describing _only_ the properties that have changed types.

```typescript
implements IQImplements<BaseInterface, TransformInterface>
```

## Examples

### 1. Basic Transformation

Scenario: Your API sends a `string` for `createdAt`, but you want to work with a `Date` object.

```typescript
import { QModel, Quick, IQImplements } from '@cartago-git/quickmodel';

// 1. Raw Data (JSON)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO String
}

// 2. Transformations
// Define ONLY the fields that change
interface IUserTransforms {
	createdAt: Date;
}

// 3. Model Definition
@Quick({ createdAt: Date })
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransforms>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date; // ✅ Typed correctly as Date
}
```

### 2. Inline Transforms (Simplified)

For simple models, you don't need a separate interface for transforms. You can pass an object literal directly.

```typescript
interface IProduct {
	price: string; // "100.50"
	active: number; // 0 or 1
}

@Quick({
	price: 'number',
	active: 'boolean',
})
class Product
	extends QModel<IProduct>
	implements
		IQImplements<
			IProduct,
			{
				price: number;
				active: boolean;
			}
		>
{
	declare price: number;
	declare active: boolean;
}
```

## How It Works

Under the hood, `IQImplements` roughly does this:

```typescript
type IQImplements<T, Transforms> = Omit<T, keyof Transforms> & Transforms;
```

It takes your base interface `T`, removes the keys that are being transformed, and replaces them with the new types from `Transforms`. This creates a perfect hybrid type that your class must satisfy.

## Common Pitfalls

### forgetting `declare`

When using `IQImplements` (or standard `implements`), you usually want to use the `declare` keyword for your properties to avoid TypeScript errors about uninitialized properties, since `QModel` handles the assignment internally.

```typescript
// ❌ Error: Property 'name' has no initializer
class User extends QModel<IUser> implements IQImplements<IUser, {}> {
	name: string;
}

// ✅ Correct
class User extends QModel<IUser> implements IQImplements<IUser, {}> {
	declare name: string;
}
```

### Mismatching Decorators and Types

`IQImplements` checks your _TypeScript types_, but it doesn't know about runtime decorators. Ensure your `@Quick` decorator matches your type definitions.

```typescript
@Quick({ date: Date }) // Runtime transform
class Event
	extends QModel<IEvent>
	implements IQImplements<IEvent, { date: Date }>
{
	declare date: Date; // Compile-time type
}
```
