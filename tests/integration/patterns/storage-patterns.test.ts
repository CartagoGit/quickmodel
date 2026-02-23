/**
 * Storage & Persistence integration patterns
 * Covers: localStorage, IndexedDB (simulated), SQLite row mapping,
 *         Capacitor Preferences, in-memory LRU, BroadcastChannel, OPFS
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField, QComputed, QGroup } from '@/index';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

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

interface IAppCache {
	key: string;
	value: string;
	hits: number;
	ttl: number;
	tag: string;
}

interface IDbRow {
	rowId: number;
	payload: string;
	created: Date;
	updated: Date;
	deleted: boolean;
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

@Quick(
	{
		key: 'string',
		value: 'string',
		hits: 'number',
		ttl: 'number',
		tag: 'string',
	},
	{ coercionStrategy: 'loose' }
)
class AppCacheDto extends QModel<IAppCache> {
	declare key: string;
	declare value: string;
	declare hits: number;
	declare ttl: number;
	declare tag: string;
}

@Quick(
	{
		rowId: 'number',
		payload: 'string',
		created: Date,
		updated: Date,
		deleted: 'boolean',
	},
	{ coercionStrategy: 'loose' }
)
class DbRowDto extends QModel<IDbRow> {
	declare rowId: number;
	declare payload: string;
	declare created: Date;
	declare updated: Date;
	declare deleted: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(overrides: Partial<IUserRecord> = {}): IUserRecord {
	return {
		uid: `u${Math.random().toString(36).slice(2, 7)}`,
		name: 'Alice Example',
		email: 'alice@example.com',
		age: 30,
		role: 'user',
		active: true,
		score: 100,
		...overrides,
	};
}

function makeCache(overrides: Partial<IAppCache> = {}): IAppCache {
	return {
		key: 'cache-key',
		value: '{"hello":"world"}',
		hits: 0,
		ttl: 3600,
		tag: 'default',
		...overrides,
	};
}

function makeRow(overrides: Partial<IDbRow> = {}): IDbRow {
	return {
		rowId: 1,
		payload: '{"data":"value"}',
		created: new Date(),
		updated: new Date(),
		deleted: false,
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// 1. localStorage — basic operations
// ---------------------------------------------------------------------------

describe('localStorage — basic operations', () => {
	const storage = new Map<string, string>();

	beforeEach(() => {
		storage.clear();
	});

	test('serialize() produces a JSON-safe object for storage', () => {
		const dto = new UserRecordDto(makeUser());
		const serialized = JSON.stringify(dto.serialize());
		expect(typeof serialized).toBe('string');
		expect(serialized).toContain('alice@example.com');
	});

	test('roundtrip: serialize → store → parse → new instance', () => {
		const original = new UserRecordDto(makeUser());
		storage.set('user', JSON.stringify(original.serialize()));

		const raw = storage.get('user');
		expect(raw).toBeDefined();

		const restored = new UserRecordDto(JSON.parse(raw!) as object);
		expect(restored.email).toBe(original.email);
		expect(restored.name).toBe(original.name);
	});

	test('unknown fields are stripped on restore', () => {
		const raw = { ...makeUser(), _meta: 'injected', _ts: 12345 };
		storage.set('user', JSON.stringify(raw));

		const restored = new UserRecordDto(
			JSON.parse(storage.get('user')!) as object
		);
		expect(
			(restored as unknown as Record<string, unknown>)['_meta']
		).toBeUndefined();
		expect(
			(restored as unknown as Record<string, unknown>)['_ts']
		).toBeUndefined();
	});

	test('coercion applied on restore (string → number)', () => {
		const raw = { ...makeUser(), age: '42', score: '99.5' };
		const restored = new UserRecordDto(raw);
		expect(restored.age).toBe(42);
		expect(restored.score).toBe(99.5);
	});

	test('copy() returns new instance without mutating storage', () => {
		const dto = new UserRecordDto(makeUser());
		storage.set('user', JSON.stringify(dto.serialize()));

		const updated = dto.copy({ score: 200 });
		expect(dto.score).toBe(100);
		expect(updated.score).toBe(200);
	});

	test('isDirty() detects changes without touching storage', () => {
		const dto = new UserRecordDto(makeUser());
		const updated = dto.copy({ name: 'Bob' });
		expect(updated.isDirty()).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. localStorage — schema versioning
// ---------------------------------------------------------------------------

describe('localStorage — schema versioning', () => {
	test('old payload missing fields coerces to defaults gracefully', () => {
		const oldPayload = { uid: 'u1', name: 'Alice', email: 'a@b.com' };
		const dto = new UserRecordDto(oldPayload);
		expect(dto.uid).toBe('u1');
		expect(dto.name).toBe('Alice'); // defined fields are preserved
		// QuickModel does not inject defaults — missing fields remain undefined
		expect(dto.age).toBeUndefined();
	});

	test('extra fields in old payload are stripped on upgrade', () => {
		const oldPayload = {
			uid: 'u1',
			name: 'Alice',
			email: 'a@b.com',
			legacy_id: 9999,
		};
		const dto = new UserRecordDto(oldPayload);
		expect(
			(dto as unknown as Record<string, unknown>)['legacy_id']
		).toBeUndefined();
	});

	test('versioned wrapper survives JSON roundtrip', () => {
		const wrapper = { v: 2, data: makeUser() };
		const json = JSON.stringify(wrapper);
		const parsed = JSON.parse(json) as { v: number; data: IUserRecord };
		const dto = new UserRecordDto(parsed.data);
		expect(parsed.v).toBe(2);
		expect(dto.email).toBe('alice@example.com');
	});
});

// ---------------------------------------------------------------------------
// 3. IndexedDB — simulated store operations
// ---------------------------------------------------------------------------

describe('IndexedDB — simulated store operations', () => {
	const idbStore = new Map<string, unknown>();

	beforeEach(() => {
		idbStore.clear();
	});

	test('stores multiple users in simulated IDB', () => {
		const users = [
			makeUser({ uid: 'u1' }),
			makeUser({ uid: 'u2', name: 'Bob', email: 'bob@b.com' }),
		];
		users.forEach((raw) => {
			const dto = new UserRecordDto(raw);
			idbStore.set(dto.uid, dto.serialize());
		});
		expect(idbStore.size).toBe(2);
	});

	test('retrieves and restores a DTO from simulated IDB', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'idb-1' }));
		idbStore.set('idb-1', dto.serialize());

		const raw = idbStore.get('idb-1');
		expect(raw).toBeDefined();
		const restored = new UserRecordDto(raw as object);
		expect(restored.uid).toBe('idb-1');
	});

	test('createMany() from IDB cursor results', () => {
		const cursor = [
			makeUser({ uid: 'c1' }),
			makeUser({ uid: 'c2', email: 'c2@x.com' }),
			makeUser({ uid: 'c3', email: 'c3@x.com' }),
		];
		const { instances, errors } = UserRecordDto.createMany(cursor);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0); // all valid items coerce successfully
	});

	test('index lookup: filter by role', () => {
		['admin', 'user', 'user', 'guest'].forEach((role, idx) => {
			const dto = new UserRecordDto(makeUser({ uid: `r${idx}`, role }));
			idbStore.set(dto.uid, dto.serialize());
		});

		const admins = [...idbStore.values()]
			.map((raw) => new UserRecordDto(raw as object))
			.filter((dto) => dto.role === 'admin');

		expect(admins.length).toBe(1);
	});

	test('update in IDB via copy()', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'upd-1' }));
		idbStore.set('upd-1', dto.serialize());

		const updated = dto.copy({ score: 500 });
		idbStore.set('upd-1', updated.serialize());

		const retrieved = new UserRecordDto(idbStore.get('upd-1') as object);
		expect(retrieved.score).toBe(500);
	});

	test('delete entry removes from store', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'del-1' }));
		idbStore.set('del-1', dto.serialize());
		idbStore.delete('del-1');
		expect(idbStore.has('del-1')).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 4. SQLite — row mapping patterns
// ---------------------------------------------------------------------------

describe('SQLite — row mapping patterns', () => {
	const sqliteTable: IDbRow[] = [];

	beforeEach(() => {
		sqliteTable.length = 0;
	});

	test('maps a DB row object to DbRowDto', () => {
		const row = makeRow({ rowId: 1, payload: '{"val":1}' });
		const dto = new DbRowDto(row);
		expect(dto.rowId).toBe(1);
		expect(dto.payload).toBe('{"val":1}');
	});

	test('Date fields survive roundtrip through JSON', () => {
		const now = new Date('2025-06-01T00:00:00.000Z');
		const dto = new DbRowDto(makeRow({ created: now, updated: now }));
		const json = JSON.stringify(dto.serialize());
		const restored = new DbRowDto(JSON.parse(json) as object);
		expect(restored.created.getTime()).toBe(now.getTime());
	});

	test('bulk insert via createMany()', () => {
		const rows = [1, 2, 3].map((rowId) => makeRow({ rowId }));
		const { instances } = DbRowDto.createMany(rows);
		instances.forEach((row) => sqliteTable.push(row.toInterface()));
		expect(sqliteTable.length).toBe(3);
	});

	test('soft-delete via copy()', () => {
		const dto = new DbRowDto(makeRow({ rowId: 10 }));
		const deleted = dto.copy({ deleted: true, updated: new Date() });
		expect(deleted.deleted).toBe(true);
		expect(dto.deleted).toBe(false);
	});

	test('filter non-deleted rows', () => {
		const mixed = [
			new DbRowDto(makeRow({ rowId: 1, deleted: false })),
			new DbRowDto(makeRow({ rowId: 2, deleted: true })),
			new DbRowDto(makeRow({ rowId: 3, deleted: false })),
		];
		const active = mixed.filter((row) => !row.deleted);
		expect(active.length).toBe(2);
	});

	test('coercion: string rowId and boolean from 0/1', () => {
		const rawSql = {
			rowId: '42',
			payload: 'test',
			created: new Date(),
			updated: new Date(),
			deleted: 0,
		};
		const dto = new DbRowDto(rawSql);
		expect(dto.rowId).toBe(42);
		expect(dto.deleted).toBe(false);
	});

	test('serialize() for INSERT statement params', () => {
		const dto = new DbRowDto(makeRow({ rowId: 99, payload: '{"x":1}' }));
		const params = dto.serialize();
		expect(params).toHaveProperty('rowId', 99);
		expect(params).toHaveProperty('payload', '{"x":1}');
	});
});

// ---------------------------------------------------------------------------
// 5. Capacitor Preferences — typed storage
// ---------------------------------------------------------------------------

describe('Capacitor Preferences — typed storage', () => {
	const prefStore = new Map<string, string>();

	beforeEach(() => {
		prefStore.clear();
	});

	test('stores a DTO via Preferences.set() simulation', () => {
		const dto = new AppCacheDto(makeCache({ key: 'pref-a' }));
		prefStore.set(dto.key, JSON.stringify(dto.serialize()));
		expect(prefStore.has('pref-a')).toBe(true);
	});

	test('restores from Preferences.get() simulation', () => {
		const dto = new AppCacheDto(
			makeCache({ key: 'pref-b', value: '"hello"' })
		);
		prefStore.set('pref-b', JSON.stringify(dto.serialize()));

		const raw = prefStore.get('pref-b');
		const restored = new AppCacheDto(JSON.parse(raw!) as object);
		expect(restored.value).toBe('"hello"');
	});

	test('TTL expiry: expired entry returns null', () => {
		const exp = Date.now() - 1000; // already expired
		prefStore.set('ttl-key', JSON.stringify({ dto: makeCache(), exp }));

		const raw = JSON.parse(prefStore.get('ttl-key')!) as {
			dto: IAppCache;
			exp: number;
		};
		const isExpired = raw.exp < Date.now();
		expect(isExpired).toBe(true);
	});

	test('TTL valid: fresh entry restores normally', () => {
		const exp = Date.now() + 60_000;
		const dto = new AppCacheDto(makeCache({ key: 'fresh-key' }));
		prefStore.set(
			'fresh-key',
			JSON.stringify({ dto: dto.serialize(), exp })
		);

		const raw = JSON.parse(prefStore.get('fresh-key')!) as {
			dto: IAppCache;
			exp: number;
		};
		if (raw.exp >= Date.now()) {
			const restored = new AppCacheDto(raw.dto);
			expect(restored.key).toBe('fresh-key');
		}
	});

	test('hits counter incremented via copy()', () => {
		const dto = new AppCacheDto(makeCache({ key: 'hit-key', hits: 3 }));
		const updated = dto.copy({ hits: dto.hits + 1 });
		expect(updated.hits).toBe(4);
		expect(dto.hits).toBe(3);
	});

	test('clears all Preferences', () => {
		[1, 2, 3].forEach((num) =>
			prefStore.set(`k${num}`, JSON.stringify({ num }))
		);
		expect(prefStore.size).toBe(3);
		prefStore.clear();
		expect(prefStore.size).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// 6. In-memory LRU cache
// ---------------------------------------------------------------------------

describe('In-memory LRU cache', () => {
	class LruCache<T> {
		private map = new Map<string, T>();
		constructor(private readonly max: number) {}
		get(key: string): T | undefined {
			return this.map.get(key);
		}
		set(key: string, val: T): void {
			if (this.map.has(key)) this.map.delete(key);
			if (this.map.size >= this.max) {
				const oldest = this.map.keys().next().value;
				if (oldest !== undefined) this.map.delete(oldest);
			}
			this.map.set(key, val);
		}
		get size(): number {
			return this.map.size;
		}
	}

	let cache: LruCache<UserRecordDto>;

	beforeEach(() => {
		cache = new LruCache<UserRecordDto>(3);
	});

	test('stores and retrieves a DTO from LRU cache', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'lru-1' }));
		cache.set('lru-1', dto);
		expect(cache.get('lru-1')?.name).toBe('Alice Example');
	});

	test('evicts oldest entry when max capacity is reached', () => {
		['a', 'b', 'c', 'd'].forEach((uid) => {
			cache.set(uid, new UserRecordDto(makeUser({ uid })));
		});
		expect(cache.size).toBe(3);
		expect(cache.get('a')).toBeUndefined();
	});

	test('toInterface() from cache entry is stable', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'lru-iface' }));
		cache.set('lru-iface', dto);
		const iface = cache.get('lru-iface')?.toInterface();
		expect(iface?.uid).toBe('lru-iface');
	});

	test('isDirty() after copy() still works inside cache', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'lru-dirty' }));
		cache.set('lru-dirty', dto);
		const updated = cache.get('lru-dirty')!.copy({ name: 'Charlie' });
		expect(updated.isDirty()).toBe(true);
	});

	test('cache survives createMany() population', () => {
		const raws = [
			makeUser({ uid: 'cm1' }),
			makeUser({ uid: 'cm2', email: 'cm2@x.com' }),
		];
		const { instances } = UserRecordDto.createMany(raws);
		instances.forEach((dto) => cache.set(dto.uid, dto));
		expect(cache.size).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// 7. BroadcastChannel — cross-tab sync
// ---------------------------------------------------------------------------

describe('BroadcastChannel — cross-tab sync', () => {
	test('serialized DTO can be sent as BroadcastChannel message', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'bc-1' }));
		const message = { type: 'UPDATE_USER', payload: dto.serialize() };
		const json = JSON.stringify(message);
		expect(json).toContain('bc-1');
	});

	test('receiver restores DTO from BroadcastChannel message', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'bc-2' }));
		const json = JSON.stringify({
			type: 'UPDATE_USER',
			payload: dto.serialize(),
		});

		const msg = JSON.parse(json) as { type: string; payload: object };
		const restored = new UserRecordDto(msg.payload);
		expect(restored.uid).toBe('bc-2');
	});

	test('validation passes after BroadcastChannel roundtrip', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'bc-3' }));
		const json = JSON.stringify(dto.serialize());
		const restored = new UserRecordDto(JSON.parse(json) as object);
		const result = qCheckRules(restored);
		expect(result.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 8. OPFS & Service Worker cache
// ---------------------------------------------------------------------------

describe('OPFS & Service Worker cache', () => {
	test('serialize() output is suitable for OPFS write (JSON string)', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'opfs-1' }));
		const bytes = new TextEncoder().encode(JSON.stringify(dto.serialize()));
		expect(bytes.byteLength).toBeGreaterThan(0);
	});

	test('restore from OPFS read (JSON parse)', () => {
		const dto = new UserRecordDto(makeUser({ uid: 'opfs-2' }));
		const bytes = new TextEncoder().encode(JSON.stringify(dto.serialize()));

		const text = new TextDecoder().decode(bytes);
		const restored = new UserRecordDto(JSON.parse(text) as object);
		expect(restored.uid).toBe('opfs-2');
		expect(restored.name).toBe('Alice Example');
	});

	test('qCheckRulesAsync passes for valid entry read from OPFS', async () => {
		const raw = makeUser({ uid: 'opfs-3' });
		const bytes = new TextEncoder().encode(JSON.stringify(raw));
		const text = new TextDecoder().decode(bytes);

		const dto = new UserRecordDto(JSON.parse(text) as object);
		const result = await qCheckRulesAsync(dto, {
			asyncRules: { uid: [() => Promise.resolve(true)] },
		});
		expect(result.valid).toBe(true);
	});
});
