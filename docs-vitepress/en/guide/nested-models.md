# Nested Models

QuickModel supports infinite nesting of models, allowing you to build complex data structures with automatic transformation at all levels.

## Basic Nesting

Transform nested objects into model instances:

```typescript
interface IAddress {
	street: string;
	city: string;
	country: string;
}

interface IProfile {
	name: string;
	birthDate: string;
	address: IAddress;
}

interface IUser {
	id: number;
	email: string;
	profile: IProfile;
}

// Define nested models
@Quick()
class Address extends QModel<IAddress> {
	declare street: string;
	declare city: string;
	declare country: string;
}

@Quick({
	birthDate: Date,
	address: Address, // Nested model
})
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
	declare address: Address;
}

@Quick({
	profile: Profile, // Nested model
})
class User extends QModel<IUser> {
	declare id: number;
	declare email: string;
	declare profile: Profile;
}

// Usage
const user = new User({
	id: 1,
	email: 'john@example.com',
	profile: {
		name: 'John Doe',
		birthDate: '1990-01-01',
		address: {
			street: '123 Main St',
			city: 'New York',
			country: 'USA',
		},
	},
});

// All levels are transformed
console.log(user.profile instanceof Profile); // true
console.log(user.profile.birthDate instanceof Date); // true
console.log(user.profile.address instanceof Address); // true
```

## Arrays of Nested Models

Use bracket notation for arrays:

```typescript
interface IOrderItem {
	productId: string;
	quantity: number;
	price: string; // BigInt as string
}

interface IOrder {
	id: string;
	items: IOrderItem[];
	createdAt: string;
}

@Quick({ price: BigInt })
class OrderItem extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare price: bigint;
}

@Quick({
	items: [OrderItem], // Array of nested models
	createdAt: Date,
})
class Order extends QModel<IOrder> {
	declare id: string;
	declare items: OrderItem[];
	declare createdAt: Date;
}

const order = new Order({
	id: 'ORD-001',
	items: [
		{ productId: 'P1', quantity: 2, price: '1999' },
		{ productId: 'P2', quantity: 1, price: '2999' },
	],
	createdAt: '2026-01-10T00:00:00.000Z',
});

console.log(order.items[0] instanceof OrderItem); // true
console.log(typeof order.items[0].price); // 'bigint'
```

## Deep Nesting

QuickModel handles arbitrary nesting depth:

```typescript
interface IComment {
	id: string;
	text: string;
	createdAt: string;
	replies: IComment[]; // Recursive nesting
}

@Quick({
	createdAt: Date,
	replies: [Comment], // Self-referential
})
class Comment extends QModel<IComment> {
	declare id: string;
	declare text: string;
	declare createdAt: Date;
	declare replies: Comment[];
}

const comment = new Comment({
	id: '1',
	text: 'Root comment',
	createdAt: '2026-01-10',
	replies: [
		{
			id: '2',
			text: 'Reply 1',
			createdAt: '2026-01-11',
			replies: [
				{
					id: '3',
					text: 'Nested reply',
					createdAt: '2026-01-12',
					replies: [],
				},
			],
		},
	],
});

// All levels transformed
console.log(comment.replies[0] instanceof Comment); // true
console.log(comment.replies[0].replies[0] instanceof Comment); // true
console.log(comment.replies[0].createdAt instanceof Date); // true
```

## Dot Notation for Nested Properties

Transform nested properties without decorating the nested class:

```typescript
// Third-party class you can't modify
class Product {
	constructor(
		public id: string,
		public name: string,
		public price: string,
		public createdAt: string
	) {}
}

interface ICartItem {
	quantity: number;
	product: Product;
}

// Use dot notation to transform nested properties
@Quick({
	product: Product,
	'product.price': BigInt, // Transform nested property
	'product.createdAt': Date, // Transform nested property
})
class CartItem extends QModel<ICartItem> {
	declare quantity: number;
	declare product: Product;
}

const item = new CartItem({
	quantity: 2,
	product: {
		id: 'P1',
		name: 'Laptop',
		price: '1999',
		createdAt: '2026-01-10',
	},
});

console.log(typeof item.product.price); // 'bigint'
console.log(item.product.createdAt instanceof Date); // true
```

### When to Use Dot Notation

**Use dot notation when:**

- Working with third-party classes you can't modify
- You need context-specific transformations
- You want all transformations in one place

**Use nested model decorators when:**

- You control the nested class
- The nested model is reused across your codebase
- You want encapsulation

## Multi-Dimensional Arrays

Explicit nesting with bracket notation:

```typescript
interface IMatrix {
	data: IPoint[][];
}

interface IPoint {
	x: number;
	y: number;
	timestamp: string;
}

@Quick({ timestamp: Date })
class Point extends QModel<IPoint> {
	declare x: number;
	declare y: number;
	declare timestamp: Date;
}

@Quick({
	data: [[Point]], // 2D array of Points
})
class Matrix extends QModel<IMatrix> {
	declare data: Point[][];
}

const matrix = new Matrix({
	data: [
		[
			{ x: 0, y: 0, timestamp: '2026-01-10' },
			{ x: 1, y: 0, timestamp: '2026-01-11' },
		],
		[
			{ x: 0, y: 1, timestamp: '2026-01-12' },
			{ x: 1, y: 1, timestamp: '2026-01-13' },
		],
	],
});

console.log(matrix.data[0][0] instanceof Point); // true
console.log(matrix.data[0][0].timestamp instanceof Date); // true
```

## Polymorphic Nesting

Use discriminators for union types:

```typescript
interface IAnimal {
	type: 'dog' | 'cat';
	name: string;
}

interface IDog extends IAnimal {
	type: 'dog';
	breed: string;
}

interface ICat extends IAnimal {
	type: 'cat';
	color: string;
}

@Quick()
class Dog extends QModel<IDog> {
	declare type: 'dog';
	declare name: string;
	declare breed: string;

	bark() {
		return 'Woof!';
	}
}

@Quick()
class Cat extends QModel<ICat> {
	declare type: 'cat';
	declare name: string;
	declare color: string;

	meow() {
		return 'Meow!';
	}
}

interface IOwner {
	name: string;
	pets: IAnimal[];
}

@Quick({
	pets: [
		{
			discriminator: (data: IAnimal) => (data.type === 'dog' ? Dog : Cat),
		},
	],
})
class Owner extends QModel<IOwner> {
	declare name: string;
	declare pets: (Dog | Cat)[];
}

const owner = new Owner({
	name: 'John',
	pets: [
		{ type: 'dog', name: 'Rex', breed: 'Labrador' },
		{ type: 'cat', name: 'Whiskers', color: 'Orange' },
	],
});

console.log(owner.pets[0] instanceof Dog); // true
console.log(owner.pets[1] instanceof Cat); // true

if (owner.pets[0] instanceof Dog) {
	console.log(owner.pets[0].bark()); // 'Woof!'
}
```

## Serialization of Nested Models

`toJSON()` recursively serializes all nested models:

```typescript
const user = new User({
	id: 1,
	email: 'john@example.com',
	profile: {
		name: 'John',
		birthDate: '1990-01-01',
		address: {
			street: '123 Main St',
			city: 'New York',
			country: 'USA',
		},
	},
});

const json = user.toJSON();
// {
//   id: 1,
//   email: 'john@example.com',
//   profile: {
//     name: 'John',
//     birthDate: '1990-01-01',  // Date → string
//     address: {
//       street: '123 Main St',
//       city: 'New York',
//       country: 'USA'
//     }
//   }
// }
```

## Circular References

QuickModel handles circular references gracefully:

```typescript
interface INode {
	id: string;
	value: number;
	parent?: INode;
	children: INode[];
}

@Quick({
	parent: Node,
	children: [Node],
})
class Node extends QModel<INode> {
	declare id: string;
	declare value: number;
	declare parent?: Node;
	declare children: Node[];
}

// Create a tree structure
const root = new Node({
	id: 'root',
	value: 1,
	children: [],
});

const child = new Node({
	id: 'child',
	value: 2,
	parent: root,
	children: [],
});

root.children.push(child);

// Serialization handles circular references
const json = root.toJSON(); // Works without infinite recursion
```

## Best Practices

### 1. Keep Nesting Shallow

Prefer flat structures when possible:

```typescript
// ❌ Too deep
user.profile.settings.preferences.theme.colors.primary;

// ✅ Better
user.themeColor;
```

### 2. Use Dot Notation Sparingly

Only use dot notation when you can't decorate the nested class:

```typescript
// ✅ Preferred - decorate the nested class
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare price: bigint;
}

@Quick({ product: Product })
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}

// ⚠️ Use only when necessary
@Quick({
	product: Product,
	'product.price': BigInt, // Only if you can't modify Product
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}
```

### 3. Define Interfaces Clearly

Separate serialization and runtime interfaces:

```typescript
// Serialization interface
interface IUser {
	profile: IProfile;
}

interface IProfile {
	birthDate: string;
}

// Runtime interface
interface IUserTransform {
	profile: IProfileTransform;
}

interface IProfileTransform {
	birthDate: Date;
}
```

### 4. Validate Nested Data

Add validation at each level:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare birthDate: Date;

	constructor(data: Partial<IProfile>) {
		super(data);
		if (this.birthDate > new Date()) {
			throw new Error('Birth date cannot be in the future');
		}
	}
}
```

## Next Steps

- [@Quick Decorator](/en/guide/quick-decorator) - Learn more about transformations
- [Custom Transformers](/en/guide/custom-transformers) - Create custom nested types
- [Examples](/en/examples/complex-types) - See complex nesting examples

## Performance

<BenchmarkChart
  :only-scenarios="['nestedConstruct']"
  :only-libs="['QuickModel', 'class-transformer', 'Plain JS']"
  :only-feature-categories="['model', 'serialization']"
  default-tab="performance"
/>
