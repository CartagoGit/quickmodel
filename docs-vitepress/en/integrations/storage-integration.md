# Storage & Persistence Integration

QuickModel provides a clean, serialization-first API that integrates naturally with any persistence layer — from `localStorage` to IndexedDB, SQLite, Capacitor Preferences, in-memory caches, and browser storage APIs like OPFS.

## Key Patterns

| Storage Layer         | QuickModel Pattern                                                          |
| --------------------- | --------------------------------------------------------------------------- |
| `localStorage`        | `dto.serialize()` → `JSON.stringify()` → store                              |
| IndexedDB             | `dto.serialize()` → IDB object store → `new MyDto(raw)`                     |
| SQLite                | `dto.toInterface()` → parameterized query                                   |
| Capacitor Preferences | `JSON.stringify(dto.serialize())` → `Preferences.set()`                     |
| In-memory LRU         | Store `MyDto` instances directly                                            |
| BroadcastChannel      | `dto.serialize()` → message payload                                         |
| OPFS / Service Worker | `new TextEncoder().encode(JSON.stringify(dto.serialize()))`                 |
| Schema migration      | `new MyDto(oldPayload)` — unknown fields stripped, missing fields defaulted |

## Model Setup

```typescript
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
	QGroup,
} from '@cartago-git/quickmodel';

interface IUserRecord {
	uid: string;
	name: string;
	email: string;
	age: number;
	role: string;
	active: boolean;
	score: number;
	summary?: string;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		active: 'boolean',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserRecordDto extends QModel<IUserRecord> {
	declare uid: string;

	@QGroup('profile')
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QGroup('credentials')
	@QField({ label: 'Email', required: true })
	@QRule((val: string) => val.includes('@'), 'Invalid email')
	declare email: string;

	@QGroup('profile')
	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Invalid age')
	declare age: number;

	@QGroup('credentials')
	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	declare active: boolean;
	declare score: number;

	@QComputed()
	get summary(): string {
		return `${this.name} <${this.email}> | ${this.role} | score: ${this.score}`;
	}
}
```

The `unknownPropertyPolicy: 'strip'` setting ensures that database rows with extra columns or legacy properties are automatically pruned. `coercionStrategy: 'loose'` handles SQLite's weak typing (e.g. integers stored as strings, booleans as 0/1).

## localStorage

### Basic Round-Trip

```typescript
const dto = new UserRecordDto({
	uid: 'u1',
	name: 'Alice',
	email: 'alice@example.com',
	age: 30,
	role: 'user',
	active: true,
	score: 100,
});

// Persist
localStorage.setItem('user', JSON.stringify(dto.serialize()));

// Restore
const stored = localStorage.getItem('user');
const restored = new UserRecordDto(JSON.parse(stored!) as object);
```

### Schema Versioning

When your model schema evolves, old payload fields are stripped and missing ones receive default values:

```typescript
// Old payload from a previous app version
const oldPayload = {
	uid: 'u1',
	name: 'Alice',
	email: 'a@b.com',
	legacy_id: 9999,
};
const dto = new UserRecordDto(oldPayload);
// legacy_id → undefined (stripped) ✅
// age → 0 (type default) ✅
// role → '' (type default) ✅
```

### Detecting Changes Before Saving

```typescript
const original = new UserRecordDto(raw);
const updated = original.copy({ score: 200 });
if (updated.isDirty()) {
	localStorage.setItem('user', JSON.stringify(updated.serialize()));
}
```

## IndexedDB

### Store Multiple Records

```typescript
const db = new Map<string, unknown>(); // simulates an IDB object store

const rawList = await fetchUsersFromApi();
const { instances } = UserRecordDto.createMany(rawList);
instances.forEach((dto) => db.set(dto.uid, dto.serialize()));
```

### Index Lookup by Role

```typescript
const admins = [...db.values()]
	.map((raw) => new UserRecordDto(raw as object))
	.filter((dto) => dto.role === 'admin');
```

### Update in IDB

```typescript
const updated = dto.copy({ score: 500 });
db.set(updated.uid, updated.serialize()); // replaces existing entry
```

## SQLite Row Mapping

`coercionStrategy: 'loose'` handles SQLite's weak type system — booleans from 0/1, dates from ISO strings, numbers from text columns:

```typescript
// Row as returned by a SQLite driver (all values may be stringified)
const sqliteRow = {
	rowId: '42',
	payload: '{"x":1}',
	created: '2025-01-01T00:00:00.000Z',
	updated: '2025-06-01T00:00:00.000Z',
	deleted: 0,
};

const dto = new DbRowDto(sqliteRow);
// dto.rowId === 42        (number) ✅
// dto.created instanceof Date ✅
// dto.deleted === false  (boolean) ✅
```

### Soft Delete Pattern

```typescript
const deleted = dto.copy({ deleted: true, updated: new Date() });
// Store deleted back to SQLite — original dto remains unchanged
await db.run('UPDATE rows SET deleted=?, updated=? WHERE rowId=?', [
	1,
	deleted.updated.toISOString(),
	deleted.rowId,
]);
```

### Bulk Seed Insert

```typescript
const { instances } = DbRowDto.createMany(csvRows);
const params = instances.map((dto) => dto.toInterface());
await db.run('INSERT INTO table_rows VALUES (?, ?, ?, ?, ?)', params);
```

## Capacitor Preferences

```typescript
import { Preferences } from '@capacitor/preferences';

// Save
const dto = new AppCacheDto({
	key: 'settings',
	value: '...',
	hits: 0,
	ttl: 3600,
	tag: 'config',
});
await Preferences.set({ key: dto.key, value: JSON.stringify(dto.serialize()) });

// Load
const { value } = await Preferences.get({ key: 'settings' });
const restored = new AppCacheDto(value ? (JSON.parse(value) as object) : {});
```

### TTL Pattern

```typescript
interface ICachedEntry<T> {
	data: T;
	exp: number;
}

async function saveWithTtl(dto: AppCacheDto, ttlMs: number) {
	const entry: ICachedEntry<object> = {
		data: dto.serialize() as object,
		exp: Date.now() + ttlMs,
	};
	await Preferences.set({ key: dto.key, value: JSON.stringify(entry) });
}

async function loadIfFresh(key: string): Promise<AppCacheDto | null> {
	const { value } = await Preferences.get({ key });
	if (!value) return null;
	const entry = JSON.parse(value) as ICachedEntry<object>;
	if (entry.exp < Date.now()) return null; // expired
	return new AppCacheDto(entry.data);
}
```

## In-Memory LRU Cache

Store QuickModel DTOs as first-class values in any cache structure:

```typescript
class LruCache<T> {
	private map = new Map<string, T>();
	constructor(private readonly max: number) {}
	set(key: string, val: T) {
		if (this.map.has(key)) this.map.delete(key);
		if (this.map.size >= this.max)
			this.map.delete(this.map.keys().next().value!);
		this.map.set(key, val);
	}
	get(key: string): T | undefined {
		return this.map.get(key);
	}
}

const cache = new LruCache<UserRecordDto>(100);

// Populate from API
const { instances } = UserRecordDto.createMany(apiResponse);
instances.forEach((dto) => cache.set(dto.uid, dto));

// Read and update immutably
const user = cache.get('u1')!;
const updated = user.copy({ score: user.score + 10 });
cache.set('u1', updated);
```

## BroadcastChannel — Cross-Tab Sync

```typescript
const channel = new BroadcastChannel('user-sync');

// Sender tab
const dto = new UserRecordDto(updatedUser);
channel.postMessage({ type: 'UPDATE_USER', payload: dto.serialize() });

// Receiver tab
channel.addEventListener('message', (event: MessageEvent) => {
	const msg = event.data as { type: string; payload: object };
	if (msg.type === 'UPDATE_USER') {
		const restored = new UserRecordDto(msg.payload);
		updateLocalState(restored);
	}
});
```

## OPFS & Service Worker

```typescript
// Write to OPFS
const dto = new UserRecordDto(user);
const root = await navigator.storage.getDirectory();
const fileHandle = await root.getFileHandle('user.json', { create: true });
const writable = await fileHandle.createWritable();
await writable.write(new TextEncoder().encode(JSON.stringify(dto.serialize())));
await writable.close();

// Read from OPFS
const file = await fileHandle.getFile();
const text = await file.text();
const restored = new UserRecordDto(JSON.parse(text) as object);
```

## Async Validation Before Persist

Use `qCheckRulesAsync` to run async business rules (e.g. uniqueness checks) before writing to any storage layer:

```typescript
import { qCheckRulesAsync } from '@cartago-git/quickmodel';

async function save(dto: UserRecordDto) {
	const result = await qCheckRulesAsync(dto, {
		asyncRules: {
			email: [
				async (val) => {
					const exists = await db.findByEmail(val as string);
					return !exists; // false = validation error
				},
			],
		},
	});

	if (!result.valid) {
		throw new Error(result.errors[0]?.message ?? 'Validation failed');
	}

	await db.save(dto.toInterface());
}
```
