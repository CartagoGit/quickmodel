# Custom Transformers

QuickModel allows you to create custom transformers for your own types or to override built-in behavior.

## Creating a Custom Transformer

A transformer is a class that implements the transformation logic for a specific type.

### Basic Structure

```typescript
import { ITransformer } from '@cartago-git/quickmodel/core';

class MyCustomTransformer implements ITransformer<MyType, SerializedType> {
	// Transform from JSON to runtime type
	transform(value: SerializedType): MyType {
		// Your transformation logic
		return new MyType(value);
	}

	// Transform from runtime type back to JSON
	reverseTransform(value: MyType): SerializedType {
		// Your serialization logic
		return value.toJSON();
	}
}
```

### Example: Money Type

Let's create a custom `Money` type with currency support:

```typescript
// 1. Define your custom type
class Money {
	constructor(
		public amount: number,
		public currency: string
	) {}

	toString() {
		return `${this.amount} ${this.currency}`;
	}
}

// 2. Define the serialization format
interface IMoneyJSON {
	amount: number;
	currency: string;
}

// 3. Create the transformer
import { ITransformer } from '@cartago-git/quickmodel/core';

class MoneyTransformer implements ITransformer<Money, IMoneyJSON> {
	transform(value: IMoneyJSON): Money {
		if (!value || typeof value !== 'object') {
			throw new Error('Invalid money format');
		}
		return new Money(value.amount, value.currency);
	}

	reverseTransform(value: Money): IMoneyJSON {
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}

// 4. Register the transformer
import { TransformerRegistry } from '@cartago-git/quickmodel/core';

TransformerRegistry.register(Money, new MoneyTransformer());

// 5. Use it in your models
interface IProduct {
	id: string;
	name: string;
	price: IMoneyJSON;
}

@Quick({ price: Money })
class Product extends QModel<IProduct> {
	declare id: string;
	declare name: string;
	declare price: Money;
}

// 6. Test it
const product = new Product({
	id: '1',
	name: 'Laptop',
	price: { amount: 999.99, currency: 'USD' },
});

console.log(product.price instanceof Money); // true
console.log(product.price.toString()); // '999.99 USD'

const json = product.toJSON();
console.log(json.price); // { amount: 999.99, currency: 'USD' }
```

## Example: Color Type

Create a custom color type with hex/RGB conversion:

```typescript
class Color {
	constructor(
		public r: number,
		public g: number,
		public b: number
	) {}

	toHex(): string {
		const toHex = (n: number) => n.toString(16).padStart(2, '0');
		return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
	}

	static fromHex(hex: string): Color {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return new Color(r, g, b);
	}
}

class ColorTransformer implements ITransformer<Color, string> {
	transform(value: string): Color {
		if (typeof value !== 'string' || !value.startsWith('#')) {
			throw new Error(
				'Invalid color format. Expected hex string like #FF0000'
			);
		}
		return Color.fromHex(value);
	}

	reverseTransform(value: Color): string {
		return value.toHex();
	}
}

TransformerRegistry.register(Color, new ColorTransformer());

// Usage
@Quick({ backgroundColor: Color })
class Theme extends QModel<ITheme> {
	declare backgroundColor: Color;
}

const theme = new Theme({ backgroundColor: '#FF5733' });
console.log(theme.backgroundColor.r); // 255
console.log(theme.backgroundColor.toHex()); // '#FF5733'
```

## Example: Coordinate Type

Geographic coordinates with validation:

```typescript
class Coordinate {
	constructor(
		public latitude: number,
		public longitude: number
	) {
		if (latitude < -90 || latitude > 90) {
			throw new Error('Latitude must be between -90 and 90');
		}
		if (longitude < -180 || longitude > 180) {
			throw new Error('Longitude must be between -180 and 180');
		}
	}

	distanceTo(other: Coordinate): number {
		// Haversine formula implementation
		// ...
	}
}

interface ICoordinateJSON {
	lat: number;
	lng: number;
}

class CoordinateTransformer implements ITransformer<
	Coordinate,
	ICoordinateJSON
> {
	transform(value: ICoordinateJSON): Coordinate {
		if (!value || typeof value !== 'object') {
			throw new Error('Invalid coordinate format');
		}
		return new Coordinate(value.lat, value.lng);
	}

	reverseTransform(value: Coordinate): ICoordinateJSON {
		return {
			lat: value.latitude,
			lng: value.longitude,
		};
	}
}

TransformerRegistry.register(Coordinate, new CoordinateTransformer());

// Usage
@Quick({ location: Coordinate })
class Store extends QModel<IStore> {
	declare name: string;
	declare location: Coordinate;
}

const store = new Store({
	name: 'Main Store',
	location: { lat: 40.7128, lng: -74.006 },
});

console.log(store.location instanceof Coordinate); // true
```

## Overriding Built-in Transformers

You can override built-in transformers if you need custom behavior:

```typescript
// Custom Date transformer that handles multiple formats
class CustomDateTransformer implements ITransformer<Date, string> {
	transform(value: string): Date {
		// Support multiple date formats
		if (value.includes('/')) {
			// Handle MM/DD/YYYY
			const [month, day, year] = value.split('/');
			return new Date(+year, +month - 1, +day);
		}
		// Default ISO format
		return new Date(value);
	}

	reverseTransform(value: Date): string {
		return value.toISOString();
	}
}

// Override the built-in Date transformer
TransformerRegistry.register(Date, new CustomDateTransformer());
```

## Handling Null and Undefined

Transformers should handle `null` and `undefined` gracefully:

```typescript
class MoneyTransformer implements ITransformer<Money, IMoneyJSON | null> {
	transform(value: IMoneyJSON | null): Money | null {
		if (value === null || value === undefined) {
			return null;
		}
		return new Money(value.amount, value.currency);
	}

	reverseTransform(value: Money | null): IMoneyJSON | null {
		if (value === null || value === undefined) {
			return null;
		}
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}
```

## Array Support

To support arrays of your custom type, the transformer works automatically:

```typescript
@Quick({
	price: Money, // Single Money
	prices: [Money], // Array of Money
})
class Product extends QModel<IProduct> {
	declare price: Money;
	declare prices: Money[];
}

const product = new Product({
	price: { amount: 99.99, currency: 'USD' },
	prices: [
		{ amount: 99.99, currency: 'USD' },
		{ amount: 79.99, currency: 'EUR' },
	],
});

console.log(product.prices[0] instanceof Money); // true
```

## Validation in Transformers

Add validation logic in your transformers:

```typescript
class EmailTransformer implements ITransformer<string, string> {
	private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	transform(value: string): string {
		if (!this.emailRegex.test(value)) {
			throw new Error(`Invalid email format: ${value}`);
		}
		return value.toLowerCase(); // Normalize to lowercase
	}

	reverseTransform(value: string): string {
		return value;
	}
}

// Create a custom Email type
class Email extends String {}

TransformerRegistry.register(Email, new EmailTransformer());

@Quick({ email: Email })
class User extends QModel<IUser> {
	declare email: string;
}

// This will throw an error
const user = new User({ email: 'invalid-email' }); // Error!
```

## Best Practices

### 1. Validate Input

Always validate input in `transform()`:

```typescript
transform(value: any): MyType {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid input format');
  }
  // ... rest of transformation
}
```

### 2. Handle Edge Cases

Consider `null`, `undefined`, empty strings, etc.:

```typescript
transform(value: any): MyType | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value === '') {
    return null;  // or throw error
  }
  // ... transformation logic
}
```

### 3. Provide Clear Error Messages

Help users debug transformation issues:

```typescript
transform(value: any): MyType {
  if (!value.requiredField) {
    throw new Error(
      `Missing required field 'requiredField' in ${JSON.stringify(value)}`
    );
  }
  // ...
}
```

### 4. Keep Transformers Pure

Transformers should be stateless and deterministic:

```typescript
// ✅ Good - pure function
transform(value: IMoneyJSON): Money {
  return new Money(value.amount, value.currency);
}

// ❌ Bad - stateful
private counter = 0;
transform(value: IMoneyJSON): Money {
  this.counter++;  // Side effect!
  return new Money(value.amount, value.currency);
}
```

### 5. Make Transformations Reversible

Ensure `reverseTransform(transform(x))` returns equivalent data:

```typescript
const original = { amount: 99.99, currency: 'USD' };
const money = transformer.transform(original);
const serialized = transformer.reverseTransform(money);

console.log(JSON.stringify(original) === JSON.stringify(serialized)); // true
```

## Next Steps

- [Transformers](/en/guide/transformers) - See all built-in transformers
- [Nested Models](/en/guide/nested-models) - Combine custom types with nesting
- [Examples](/en/examples/complex-types) - Real-world custom type examples
