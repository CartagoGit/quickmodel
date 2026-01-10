# Transformers

QuickModel includes built-in transformers for 30+ JavaScript and TypeScript types. This page documents all available transformers and their usage.

## Primitive Types

### Date

Transforms ISO date strings into `Date` objects.

```typescript
interface IEvent {
	createdAt: string; // '2026-01-10T00:00:00.000Z'
}

@Quick({ createdAt: Date })
class Event extends QModel<IEvent> {
	declare createdAt: Date;
}

const event = new Event({ createdAt: '2026-01-10T00:00:00.000Z' });
console.log(event.createdAt instanceof Date); // true
```

**Serialization:** `Date` → ISO string (`toISOString()`)

### BigInt

Transforms string representations of large integers into `bigint`.

```typescript
interface IAccount {
	balance: string; // '999999999999999'
}

@Quick({ balance: BigInt })
class Account extends QModel<IAccount> {
	declare balance: bigint;
}

const account = new Account({ balance: '999999999999999' });
console.log(typeof account.balance); // 'bigint'
console.log(account.balance); // 999999999999999n
```

**Serialization:** `bigint` → string

### RegExp

Transforms strings or objects into `RegExp` instances.

```typescript
interface IValidator {
	pattern: string | { source: string; flags: string };
}

@Quick({ pattern: RegExp })
class Validator extends QModel<IValidator> {
	declare pattern: RegExp;
}

const validator = new Validator({ pattern: '^[a-z]+$' });
console.log(validator.pattern instanceof RegExp); // true

// Or with flags
const validator2 = new Validator({
	pattern: { source: '^[a-z]+$', flags: 'i' },
});
```

**Serialization:** `RegExp` → `{ source: string, flags: string }`

### Symbol

Transforms strings into `Symbol` instances using `Symbol.for()`.

```typescript
interface IConfig {
	key: string;
}

@Quick({ key: Symbol })
class Config extends QModel<IConfig> {
	declare key: symbol;
}

const config = new Config({ key: 'unique.key' });
console.log(typeof config.key); // 'symbol'
console.log(config.key === Symbol.for('unique.key')); // true
```

**Serialization:** `Symbol` → string (via `Symbol.keyFor()`)

### Error

Transforms error objects.

```typescript
interface ILog {
	error: { message: string; stack?: string };
}

@Quick({ error: Error })
class Log extends QModel<ILog> {
	declare error: Error;
}

const log = new Log({
	error: { message: 'Something went wrong', stack: '...' },
});
console.log(log.error instanceof Error); // true
```

**Serialization:** `Error` → `{ message: string, stack?: string }`

## Collection Types

### Set

Transforms arrays into `Set` instances.

```typescript
interface IPost {
	tags: string[]; // ['typescript', 'node', 'typescript']
}

@Quick({ tags: Set })
class Post extends QModel<IPost> {
	declare tags: Set<string>;
}

const post = new Post({ tags: ['typescript', 'node', 'typescript'] });
console.log(post.tags instanceof Set); // true
console.log(post.tags.size); // 2 (duplicates removed)
```

**Serialization:** `Set` → array

### Map

Transforms arrays of tuples into `Map` instances.

```typescript
interface IConfig {
	metadata: [string, any][]; // [['key1', 'val1'], ['key2', 'val2']]
}

@Quick({ metadata: Map })
class Config extends QModel<IConfig> {
	declare metadata: Map<string, any>;
}

const config = new Config({
	metadata: [
		['key1', 'val1'],
		['key2', 'val2'],
	],
});
console.log(config.metadata instanceof Map); // true
console.log(config.metadata.get('key1')); // 'val1'
```

**Serialization:** `Map` → array of tuples

### Arrays with Transformations

Use bracket notation for arrays of transformed types:

```typescript
interface ICalendar {
	dates: string[]; // Array of ISO strings
	events: IEvent[]; // Array of event objects
	categories: string[][]; // Nested arrays
}

@Quick({
	dates: [Date], // string[] → Date[]
	events: [Event], // IEvent[] → Event[]
	categories: [Set], // string[][] → Set<string>[]
})
class Calendar extends QModel<ICalendar> {
	declare dates: Date[];
	declare events: Event[];
	declare categories: Set<string>[];
}
```

## Binary Types

### ArrayBuffer

Transforms base64 strings or arrays into `ArrayBuffer`.

```typescript
interface IFile {
	data: string; // base64 encoded
}

@Quick({ data: ArrayBuffer })
class File extends QModel<IFile> {
	declare data: ArrayBuffer;
}

const file = new File({ data: 'SGVsbG8gV29ybGQ=' });
console.log(file.data instanceof ArrayBuffer); // true
```

**Serialization:** `ArrayBuffer` → base64 string

### TypedArrays

All TypedArray types are supported:

- `Int8Array`
- `Uint8Array`
- `Uint8ClampedArray`
- `Int16Array`
- `Uint16Array`
- `Int32Array`
- `Uint32Array`
- `Float32Array`
- `Float64Array`
- `BigInt64Array`
- `BigUint64Array`

```typescript
interface IImage {
	pixels: number[];
}

@Quick({ pixels: Uint8Array })
class Image extends QModel<IImage> {
	declare pixels: Uint8Array;
}

const image = new Image({ pixels: [255, 128, 64, 0] });
console.log(image.pixels instanceof Uint8Array); // true
```

**Serialization:** TypedArray → regular array

### DataView

Transforms buffer data into `DataView`.

```typescript
interface IBinary {
	view: { buffer: number[]; byteOffset?: number; byteLength?: number };
}

@Quick({ view: DataView })
class Binary extends QModel<IBinary> {
	declare view: DataView;
}
```

**Serialization:** `DataView` → `{ buffer: number[], byteOffset, byteLength }`

## Web API Types

### URL

Transforms strings into `URL` objects.

```typescript
interface ILink {
	homepage: string; // 'https://example.com'
}

@Quick({ homepage: URL })
class Link extends QModel<ILink> {
	declare homepage: URL;
}

const link = new Link({ homepage: 'https://example.com' });
console.log(link.homepage instanceof URL); // true
console.log(link.homepage.hostname); // 'example.com'
```

**Serialization:** `URL` → string (via `toString()`)

### URLSearchParams

Transforms objects or strings into `URLSearchParams`.

```typescript
interface IRequest {
	params: Record<string, string> | string;
}

@Quick({ params: URLSearchParams })
class Request extends QModel<IRequest> {
	declare params: URLSearchParams;
}

const request = new Request({
	params: { page: '1', limit: '10' },
});
console.log(request.params instanceof URLSearchParams); // true
console.log(request.params.get('page')); // '1'
```

**Serialization:** `URLSearchParams` → object

## Nested Models

Transform nested objects into model instances:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
}

@Quick({ profile: Profile })
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
}

const user = new User({
	id: 1,
	profile: { name: 'John', birthDate: '1990-01-01' },
});

console.log(user.profile instanceof Profile); // true
console.log(user.profile.birthDate instanceof Date); // true
```

## Multi-Dimensional Arrays

Explicit nesting with bracket notation:

```typescript
@Quick({
	matrix: [[Date]], // Date[][]
	cube: [[[BigInt]]], // bigint[][][]
	grid: [[Product]], // Product[][]
})
class Data extends QModel<IData> {
	declare matrix: Date[][];
	declare cube: bigint[][][];
	declare grid: Product[][];
}
```

## Transformation Rules

### 1. Explicit Declaration Required

QuickModel **does not auto-detect** types. All transformations must be explicitly declared:

```typescript
// ❌ WRONG - Date won't transform
@Quick()
class Event extends QModel<IEvent> {
	declare createdAt: Date; // Stays as string!
}

// ✅ CORRECT - Explicit transformation
@Quick({ createdAt: Date })
class Event extends QModel<IEvent> {
	declare createdAt: Date; // Transforms to Date
}
```

### 2. Array Syntax

Always use brackets for arrays:

```typescript
// ✅ CORRECT
@Quick({
  dates: [Date],        // Date[]
  items: [Product]      // Product[]
})

// ❌ WRONG - Ambiguous
@Quick({
  dates: Date,          // Single Date, not Date[]
  items: Product        // Single Product, not Product[]
})
```

### 3. Null and Undefined

Transformers handle `null` and `undefined` gracefully:

```typescript
const user = new User({
	id: 1,
	createdAt: null, // Won't throw error
});

console.log(user.createdAt); // null
```

### 4. Validation

Transformers validate input and throw descriptive errors:

```typescript
const user = new User({
	id: 1,
	createdAt: 'invalid-date', // Throws error with details
});
```

## Performance Considerations

### Lazy Transformation

Transformations happen during construction, not on access:

```typescript
const user = new User(data); // All transformations happen here
console.log(user.createdAt); // No transformation, just property access
```

### Caching

Transformed values are cached. Accessing a property multiple times doesn't re-transform:

```typescript
const date1 = user.createdAt; // First access
const date2 = user.createdAt; // Same instance
console.log(date1 === date2); // true
```

## Next Steps

- [Custom Transformers](/en/guide/custom-transformers) - Create your own transformers
- [Nested Models](/en/guide/nested-models) - Work with complex structures
- [Serialization](/en/guide/serialization) - Understand toJSON()
- [Examples](/en/examples/complex-types) - See transformers in action
