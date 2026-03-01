# Transform Fields (`@QTransform`)

The `@QTransform()` decorator applies a **post-deserialization transformation** to a field value during model construction. The transform runs after type coercion, so the received value is already properly typed.

## Basic usage

```typescript
import { Quick, QModel, QTransform } from 'quickmodel';

interface IUser {
	email: string;
	username: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	@QTransform((val: string) => val.trim().toLowerCase())
	declare email: string;

	@QTransform((val: string) => val.trim())
	declare username: string;
}

new UserModel({ email: '  Alice@Example.COM  ', username: '  alice  ' });
// → email: 'alice@example.com', username: 'alice'
```

## Composing multiple transforms

You can stack multiple `@QTransform` decorators on a single field. They execute from the **bottommost** decorator upwards, forming a pipeline:

```typescript
@Quick()
class ProductModel extends QModel<IProduct> {
	@QTransform((val: string) => val.replace(/\s+/g, '-')) // 3rd: spaces → dashes
	@QTransform((val: string) => val.toLowerCase()) // 2nd: lowercase
	@QTransform((val: string) => val.trim()) // 1st: trim
	declare slug: string;
}

new ProductModel({ slug: '  Hello World  ' }).slug;
// → 'hello-world'
```

The order is: the decorator **closest to the field declaration** runs first.

## Running after type coercion

Transforms run **after** `@Quick` type coercion. This means you can safely assume the incoming value is already the coerced type:

```typescript
interface IPost {
	title: string;
	publishedAt: Date;
	wordCount: number;
}

@Quick({ publishedAt: Date })
class PostModel extends QModel<IPost> {
	// At this point, val is already a Date — coercion happened first
	@QTransform((val: Date) => {
		const utc = new Date(val);
		utc.setUTCHours(0, 0, 0, 0);
		return utc;
	})
	declare publishedAt: Date;

	@QTransform((val: number) => Math.max(0, val))
	declare wordCount: number;
}
```

## Practical examples

### Normalizing strings

```typescript
@QTransform((v: string) => v.trim().toLowerCase())
declare email: string;

@QTransform((v: string) => v.replace(/\D/g, ''))
declare phone: string; // strips non-digits
```

### Clamping numbers

```typescript
@QTransform((v: number) => Math.min(Math.max(v, 0), 100))
declare percentage: number; // clamped to [0, 100]
```

### Computing a derived value

```typescript
@QTransform((v: string) => v.trim().toLowerCase().replace(/\s+/g, '-'))
declare slug: string;
```

### Date normalization

```typescript
@Quick({ expiresAt: Date })
class Session extends QModel<ISession> {
	@QTransform((v: Date) => (v > new Date() ? v : new Date()))
	declare expiresAt: Date; // ensures date is never in the past
}
```

## Combining with `@QDefault`

When both `@QDefault` and `@QTransform` are present, the order is:

1. Incoming value is checked — if `undefined`/`null`, the default is applied
2. The transform pipeline runs on the resulting value

```typescript
@QTransform((v: string) => v.trim().toLowerCase())
@QDefault('anonymous')
declare username: string;

new UserModel({}).username;                    // → 'anonymous'
new UserModel({ username: '  ALICE  ' }).username; // → 'alice'
```

## Type safety

The transform function must match the field's type. TypeScript infers the type from the context:

```typescript
// ✅ Typed — val inferred as string
@QTransform((val: string) => val.trim())
declare name: string;
```

## API reference

| Symbol             | Description                                      |
| ------------------ | ------------------------------------------------ |
| `@QTransform(fn)`  | Applies `fn(value) => value` after type coercion |
| `IQTransformFn<T>` | Type alias: `(value: T) => T`                    |

Multiple `@QTransform` decorators on the same field execute bottom-to-top (innermost first).

## See also

- [`@QDefault`](./qdefault) — set fallback values at construction time
- [`@QReadonly`](./qreadonly) — field immutability after construction
- [Custom Transformers](./custom-transformers) — register reusable type transformers
- [Transformers](./transformers) — built-in type coercions via `@Quick`
