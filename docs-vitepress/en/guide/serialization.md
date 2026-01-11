# Serialization

QuickModel provides bidirectional transformation between runtime types and JSON-compatible formats. This page explains how serialization works and how to use the `toJSON()` method.

## The Two-Interface Pattern

QuickModel uses two interfaces to represent the same data:

1. **Serialization Interface** - JSON-compatible types (what goes over the wire)
2. **Runtime Interface** - TypeScript types (what you work with in code)

```typescript
// Serialization interface (JSON-compatible)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO date string
	balance: string; // BigInt as string
	tags: string[]; // Array
	metadata: [string, any][]; // Map as tuples
}

// Runtime interface (optional but recommended)
interface IUserTransform {
	createdAt: Date;
	balance: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
}

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> implements QImplements<IUser, IUserTransform> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}
```

## Deserialization (JSON → Runtime)

When you create a model instance, QuickModel automatically transforms JSON-compatible types into runtime types:

```typescript
const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z', // string
	balance: '999999999999999', // string
	tags: ['typescript', 'node'], // array
	metadata: [['key1', 'val1']], // array of tuples
});

// Runtime types
console.log(user.createdAt instanceof Date); // true
console.log(typeof user.balance); // 'bigint'
console.log(user.tags instanceof Set); // true
console.log(user.metadata instanceof Map); // true
```

## Serialization (Runtime → JSON)

The `toJSON()` method reverses all transformations:

```typescript
const json = user.toJSON();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',  // Date → string
//   balance: '999999999999999',              // bigint → string
//   tags: ['typescript', 'node'],            // Set → array
//   metadata: [['key1', 'val1']]             // Map → array of tuples
// }
```

## Transformation Rules

### Date → ISO String

```typescript
const event = new Event({ createdAt: '2026-01-10T12:30:00.000Z' });
const json = event.toJSON();

console.log(json.createdAt); // '2026-01-10T12:30:00.000Z'
```

Uses `Date.prototype.toISOString()`.

### BigInt → String

```typescript
const account = new Account({ balance: '999999999999999' });
const json = account.toJSON();

console.log(json.balance); // '999999999999999'
```

Converts using `String(bigint)`.

### Set → Array

```typescript
const post = new Post({ tags: ['js', 'ts', 'js'] });
const json = post.toJSON();

console.log(json.tags); // ['js', 'ts'] (duplicates removed)
```

Converts using `Array.from(set)`.

### Map → Array of Tuples

```typescript
const config = new Config({
	metadata: [
		['key1', 'val1'],
		['key2', 'val2'],
	],
});
const json = config.toJSON();

console.log(json.metadata); // [['key1', 'val1'], ['key2', 'val2']]
```

Converts using `Array.from(map.entries())`.

### RegExp → Object

```typescript
const validator = new Validator({ pattern: '^[a-z]+$' });
const json = validator.toJSON();

console.log(json.pattern); // { source: '^[a-z]+$', flags: '' }
```

### Symbol → String

```typescript
const config = new Config({ key: 'unique.key' });
const json = config.toJSON();

console.log(json.key); // 'unique.key'
```

Uses `Symbol.keyFor()`.

### ArrayBuffer → Base64

```typescript
const file = new File({ data: buffer });
const json = file.toJSON();

console.log(json.data); // 'SGVsbG8gV29ybGQ=' (base64)
```

### TypedArray → Array

```typescript
const image = new Image({ pixels: new Uint8Array([255, 128, 64]) });
const json = image.toJSON();

console.log(json.pixels); // [255, 128, 64]
```

### URL → String

```typescript
const link = new Link({ homepage: 'https://example.com' });
const json = link.toJSON();

console.log(json.homepage); // 'https://example.com'
```

Uses `URL.prototype.toString()`.

### URLSearchParams → Object

```typescript
const request = new Request({ params: { page: '1', limit: '10' } });
const json = request.toJSON();

console.log(json.params); // { page: '1', limit: '10' }
```

## Nested Models

Nested models are recursively serialized:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
}

@Quick({ profile: Profile, createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
	declare createdAt: Date;
}

const user = new User({
	id: 1,
	profile: { name: 'John', birthDate: '1990-01-01' },
	createdAt: '2026-01-10',
});

const json = user.toJSON();
// {
//   id: 1,
//   profile: {
//     name: 'John',
//     birthDate: '1990-01-01'  // Date → string
//   },
//   createdAt: '2026-01-10'    // Date → string
// }
```

## Arrays of Models

Arrays are serialized element by element:

```typescript
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare id: string;
	declare price: bigint;
}

@Quick({ items: [Product] })
class Cart extends QModel<ICart> {
	declare items: Product[];
}

const cart = new Cart({
	items: [
		{ id: '1', price: '1000' },
		{ id: '2', price: '2000' },
	],
});

const json = cart.toJSON();
// {
//   items: [
//     { id: '1', price: '1000' },  // bigint → string
//     { id: '2', price: '2000' }   // bigint → string
//   ]
// }
```

## Working with APIs

### Sending Data

```typescript
async function createUser(user: User): Promise<void> {
	await fetch('/api/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()), // Serialize to JSON
	});
}
```

### Receiving Data

```typescript
async function getUser(id: number): Promise<User> {
	const response = await fetch(`/api/users/${id}`);
	const data = await response.json();
	return new User(data); // Deserialize from JSON
}
```

### Round-Trip Example

```typescript
// 1. Fetch from API
const user = await getUser(1);
console.log(user.createdAt instanceof Date); // true

// 2. Modify
user.name = 'Jane Doe';

// 3. Send back to API
await updateUser(user);

async function updateUser(user: User): Promise<void> {
	await fetch(`/api/users/${user.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()),
	});
}
```

## JSON.stringify Integration

`toJSON()` is automatically called by `JSON.stringify()`:

```typescript
const user = new User({
	id: 1,
	name: 'John',
	createdAt: '2026-01-10',
});

// These are equivalent:
const json1 = JSON.stringify(user.toJSON());
const json2 = JSON.stringify(user); // Calls toJSON() automatically

console.log(json1 === json2); // true
```

## Cloning Models

Use `toJSON()` to create deep copies:

```typescript
const user = new User({ id: 1, name: 'John', createdAt: '2026-01-10' });

// Create a copy
const copy = new User(user.toJSON());

copy.name = 'Jane';
console.log(user.name); // 'John' (original unchanged)
console.log(copy.name); // 'Jane'
```

Or use the built-in `clone()` method:

```typescript
const copy = user.clone(); // Equivalent to new User(user.toJSON())
```

## Null and Undefined Handling

QuickModel preserves `null` and `undefined` values:

```typescript
const user = new User({
	id: 1,
	name: 'John',
	createdAt: null, // null value
});

const json = user.toJSON();
console.log(json.createdAt); // null (preserved)
```

## Custom Serialization

For custom serialization logic, override `toJSON()`:

```typescript
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;

	toJSON() {
		const json = super.toJSON();
		// Add custom fields
		json.displayName = this.name.toUpperCase();
		return json;
	}
}

const user = new User({ id: 1, name: 'John', createdAt: '2026-01-10' });
const json = user.toJSON();
console.log(json.displayName); // 'JOHN'
```

## Performance Tips

### 1. Avoid Unnecessary Serialization

Only call `toJSON()` when needed (e.g., before sending to API):

```typescript
// ❌ Bad - unnecessary serialization
function processUser(user: User) {
	const json = user.toJSON();
	console.log(json.name); // Just use user.name!
}

// ✅ Good - work with model directly
function processUser(user: User) {
	console.log(user.name);
}
```

### 2. Cache Serialized Data

If you serialize the same model multiple times:

```typescript
class CachedUser extends User {
	private _cachedJSON?: IUser;

	toJSON(): IUser {
		if (!this._cachedJSON) {
			this._cachedJSON = super.toJSON();
		}
		return this._cachedJSON;
	}
}
```

### 3. Batch Operations

When serializing multiple models, do it in one pass:

```typescript
const users = [user1, user2, user3];
const jsonArray = users.map((u) => u.toJSON());
```

## Next Steps

- [Transformers](/en/guide/transformers) - See all transformation rules
- [Nested Models](/en/guide/nested-models) - Work with complex structures
- [Examples](/en/examples/api-models) - Real-world API integration
