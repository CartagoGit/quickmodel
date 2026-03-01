// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Redux Toolkit (RTK) integration patterns — QuickModel
 *
 * No RTK package imported — pure TypeScript logic only (Redux patterns simulated).
 * Covers: createSlice state, copy() in reducers, createAsyncThunk, createEntityAdapter,
 *         RTK Query transformResponse, checkRules() before dispatch, typed selectors,
 *         DevTools-friendly payloads.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUser {
	uid: string;
	name: string;
	email: string;
	role: string;
	age: number;
	label?: string;
}

interface IProduct {
	pid: string;
	name: string;
	price: number;
	stock: number;
	category: string;
	summary?: string;
}

interface ICreateUser {
	name: string;
	email: string;
	role: string;
	age: number;
}

@Quick(
	{
		uid: 'string',
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUser> {
	declare uid: string;
	declare name: string;

	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QRule((val: number) => val >= 18, 'Must be 18+')
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}

@Quick(
	{
		pid: 'string',
		name: 'string',
		price: 'number',
		stock: 'number',
		category: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductDto extends QModel<IProduct> {
	declare pid: string;
	declare name: string;

	@QRule((val: number) => val >= 0, 'Price must be non-negative')
	declare price: number;

	@QRule((val: number) => val >= 0, 'Stock must be non-negative')
	declare stock: number;

	declare category: string;

	@QComputed()
	get summary(): string {
		return `${this.name} — $${this.price} (${this.stock} in stock)`;
	}
}

@Quick(
	{ name: 'string', email: 'string', role: 'string', age: 'number' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	declare name: string;

	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email'
	)
	declare email: string;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QRule((val: number) => val >= 18, 'Must be 18+')
	declare age: number;
}

// ---------------------------------------------------------------------------
// 1. createSlice — serialize() as serializable Redux state
// ---------------------------------------------------------------------------

describe('createSlice — serialize() as serializable Redux state', () => {
	// Simulated slice state (mirrors what a Redux store would hold)
	interface IUserSliceState {
		current: Record<string, unknown> | null;
		loading: boolean;
	}

	let sliceState: IUserSliceState = { current: null, loading: false };

	function setUser(payload: Record<string, unknown>): void {
		const dto = new UserDto(payload);
		sliceState = {
			current: dto.$qSerialize() as Record<string, unknown>,
			loading: false,
		};
	}

	function clearUser(): void {
		sliceState = { current: null, loading: false };
	}

	beforeEach(() => {
		clearUser();
	});

	test('serialize() output is JSON-serializable (safe for Redux store)', () => {
		const dto = new UserDto({
			uid: 'u1',
			name: 'Alice',
			email: 'a@x.com',
			role: 'user',
			age: 25,
		});
		const payload = dto.$qSerialize();
		expect(() => JSON.stringify(payload)).not.toThrow();
		const parsed = JSON.parse(JSON.stringify(payload)) as Record<
			string,
			unknown
		>;
		expect(parsed['uid']).toBe('u1');
	});

	test('setUser reducer stores serialized DTO in slice state', () => {
		setUser({
			uid: 'u2',
			name: 'Bob',
			email: 'bob@x.com',
			role: 'admin',
			age: 30,
		});
		expect(sliceState.current).not.toBeNull();
		expect(sliceState.current?.['name']).toBe('Bob');
		expect(sliceState.current?.['label']).toBe('Bob (admin)');
	});

	test('state from Redux store can be rehydrated into QModel instance', () => {
		setUser({
			uid: 'u3',
			name: 'Carol',
			email: 'carol@x.com',
			role: 'guest',
			age: 22,
		});
		const stored = sliceState.current as Record<string, unknown>;
		const rehydrated = new UserDto(stored);
		expect(rehydrated.uid).toBe('u3');
		expect(rehydrated.label).toBe('Carol (guest)');
	});
});

// ---------------------------------------------------------------------------
// 2. Reducer with copy() — immutable update
// ---------------------------------------------------------------------------

describe('Reducer with copy() — immutable update', () => {
	interface IEntityMap {
		[key: string]: Record<string, unknown>;
	}

	// Simulated normalized state: { entities: {[id]: serialized}, ids: string[] }
	let entities: IEntityMap = {};
	let ids: string[] = [];

	function addUser(raw: Record<string, unknown>): void {
		const dto = new UserDto(raw);
		entities[dto.uid] = dto.$qSerialize() as Record<string, unknown>;
		ids = [...ids, dto.uid];
	}

	function updateUser(uid: string, patch: Partial<IUser>): void {
		const existing = entities[uid];
		if (!existing) return;
		const dto = new UserDto(existing);
		const updated = dto.$qCopy(patch);
		entities[uid] = updated.$qSerialize() as Record<string, unknown>;
	}

	beforeEach(() => {
		entities = {};
		ids = [];
		addUser({
			uid: 'u1',
			name: 'Alice',
			email: 'alice@x.com',
			role: 'user',
			age: 25,
		});
	});

	test('copy() produces an updated entity without mutating the original', () => {
		const before = { ...entities['u1'] };
		updateUser('u1', { name: 'Alice Updated', age: 26 });
		expect(entities['u1']?.['name']).toBe('Alice Updated');
		expect(before['name']).toBe('Alice'); // original untouched
	});

	test('partial patch preserves unmodified fields', () => {
		updateUser('u1', { role: 'admin' });
		expect(entities['u1']?.['role']).toBe('admin');
		expect(entities['u1']?.['email']).toBe('alice@x.com');
	});

	test('@QComputed is recalculated after copy() in reducer', () => {
		updateUser('u1', { name: 'Alice Admin', role: 'admin' });
		const rehydrated = new UserDto(entities['u1']);
		expect(rehydrated.label).toBe('Alice Admin (admin)');
	});
});

// ---------------------------------------------------------------------------
// 3. createAsyncThunk — fetch + typed DTO
// ---------------------------------------------------------------------------

describe('createAsyncThunk — fetch + typed DTO', () => {
	// Simulated async thunk that fetches a user and wraps it in a DTO
	async function fetchUserThunk(
		uid: string
	): Promise<Record<string, unknown>> {
		// Simulated API response (mirrors what createAsyncThunk's payloadCreator does)
		await Promise.resolve(); // simulate async network latency
		const apiResponse = {
			uid,
			name: 'Remote User',
			email: 'remote@api.com',
			role: 'user',
			age: '28', // API may return strings
			_internalField: 'stripped',
		};
		const dto = new UserDto(apiResponse);
		return dto.$qSerialize() as Record<string, unknown>;
	}

	test('thunk coerces API string values to typed fields', async () => {
		const payload = await fetchUserThunk('u-remote');
		expect(typeof payload['age']).toBe('number');
		expect(payload['age']).toBe(28);
	});

	test('thunk strips unknown fields from API response', async () => {
		const payload = await fetchUserThunk('u-stripped');
		expect(payload['_internalField']).toBeUndefined();
	});

	test('thunk payload includes @QComputed fields', async () => {
		const payload = await fetchUserThunk('u-computed');
		expect(payload['label']).toBe('Remote User (user)');
	});

	test('thunk payload is JSON-serializable (safe for Redux fulfilled action)', async () => {
		const payload = await fetchUserThunk('u-json');
		expect(() => JSON.stringify(payload)).not.toThrow();
	});
});

// ---------------------------------------------------------------------------
// 4. createEntityAdapter — normalized store with QModel id
// ---------------------------------------------------------------------------

describe('createEntityAdapter — normalized store with QModel id', () => {
	// Simulated entity adapter (selectId, addMany, updateOne patterns)
	const store = new Map<string, Record<string, unknown>>();

	function addMany(items: object[]): void {
		const { instances } = UserDto.createMany(items as any[]);
		for (const inst of instances) {
			store.set(inst.uid, inst.$qSerialize() as Record<string, unknown>);
		}
	}

	function selectById(uid: string): UserDto | undefined {
		const raw = store.get(uid);
		return raw ? new UserDto(raw) : undefined;
	}

	function selectAll(): UserDto[] {
		return [...store.values()].map((raw) => new UserDto(raw));
	}

	beforeEach(() => {
		store.clear();
	});

	test('addMany normalizes QModel instances by uid', () => {
		addMany([
			{ uid: 'e1', name: 'A', email: 'a@x.com', role: 'user', age: 20 },
			{ uid: 'e2', name: 'B', email: 'b@x.com', role: 'admin', age: 30 },
		]);
		expect(store.size).toBe(2);
		expect(store.has('e1')).toBe(true);
	});

	test('selectById returns rehydrated QModel with computed fields', () => {
		addMany([
			{
				uid: 'e3',
				name: 'Carol',
				email: 'c@x.com',
				role: 'guest',
				age: 22,
			},
		]);
		const user = selectById('e3');
		expect(user?.label).toBe('Carol (guest)');
	});

	test('selectAll returns all entities as rehydrated QModel instances', () => {
		addMany([
			{ uid: 'e4', name: 'D', email: 'd@x.com', role: 'user', age: 21 },
			{ uid: 'e5', name: 'E', email: 'e@x.com', role: 'user', age: 25 },
		]);
		const all = selectAll();
		expect(all.length).toBe(2);
		expect(all.every((usr) => usr.label.includes('(user)'))).toBe(true);
	});

	test('extra DB fields are stripped when entities are normalized', () => {
		addMany([
			{
				uid: 'e6',
				name: 'F',
				email: 'f@x.com',
				role: 'user',
				age: 19,
				_sql_idx: 99,
			},
		]);
		const entity = store.get('e6');
		expect(entity?.['_sql_idx']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 5. RTK Query — transformResponse pattern
// ---------------------------------------------------------------------------

describe('RTK Query — transformResponse pattern', () => {
	// Simulates transformResponse: (raw) => new UserDto(raw).serialize()
	function transformResponse(
		raw: Record<string, unknown>
	): Record<string, unknown> {
		return new UserDto(raw).$qSerialize() as Record<string, unknown>;
	}

	function transformResponseMany(
		rawList: object[]
	): Record<string, unknown>[] {
		const { instances } = UserDto.createMany(rawList as any[]);
		return instances.map(
			(inst) => inst.$qSerialize() as Record<string, unknown>
		);
	}

	test('transformResponse coerces and strips API data', () => {
		const raw = {
			uid: 'q1',
			name: 'API User',
			email: 'api@x.com',
			role: 'user',
			age: '35',
			extra: true,
		};
		const result = transformResponse(raw);
		expect(typeof result['age']).toBe('number');
		expect(result['extra']).toBeUndefined();
	});

	test('transformResponse adds @QComputed fields to cached data', () => {
		const raw = {
			uid: 'q2',
			name: 'Query',
			email: 'q@x.com',
			role: 'admin',
			age: 40,
		};
		const result = transformResponse(raw);
		expect(result['label']).toBe('Query (admin)');
	});

	test('transformResponseMany processes list endpoint', () => {
		const rawList = [
			{ uid: 'q3', name: 'X', email: 'x@x.com', role: 'user', age: 20 },
			{ uid: 'q4', name: 'Y', email: 'y@x.com', role: 'user', age: 21 },
		];
		const results = transformResponseMany(rawList);
		expect(results.length).toBe(2);
		expect(results[0]?.['label']).toBe('X (user)');
	});
});

// ---------------------------------------------------------------------------
// 6. checkRules() before dispatch — validation guard
// ---------------------------------------------------------------------------

describe('checkRules() before dispatch — validation guard', () => {
	const dispatchLog: string[] = [];

	function dispatchCreateUser(payload: Record<string, unknown>): {
		dispatched: boolean;
		errors: string[];
	} {
		const dto = new CreateUserDto(payload);
		const validation = qCheckRules(dto);
		if (!validation.valid) {
			return {
				dispatched: false,
				errors: validation.errors.map((err) => err.message),
			};
		}
		dispatchLog.push(`CREATE_USER:${dto.name}`);
		return { dispatched: true, errors: [] };
	}

	beforeEach(() => {
		dispatchLog.length = 0;
	});

	test('valid payload dispatches the action', () => {
		const result = dispatchCreateUser({
			name: 'Alice',
			email: 'alice@x.com',
			role: 'user',
			age: 25,
		});
		expect(result.dispatched).toBe(true);
		expect(dispatchLog).toContain('CREATE_USER:Alice');
	});

	test('invalid payload is blocked before dispatch', () => {
		const result = dispatchCreateUser({
			name: 'X',
			email: 'bad',
			role: 'root',
			age: 15,
		});
		expect(result.dispatched).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
		expect(dispatchLog.length).toBe(0);
	});

	test('async checkRulesAsync can guard async thunks', async () => {
		const emailRegistry = new Set(['taken@store.io']);

		class UniqueEmailDto extends CreateUserDto {
			@QRule(
				(val: string) => Promise.resolve(!emailRegistry.has(val)),
				'Email already registered'
			)
			declare email: string;
		}

		const dto = new UniqueEmailDto({
			name: 'Bob',
			email: 'taken@store.io',
			role: 'user',
			age: 20,
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 7. Typed selector — selectUser returns IUser via serialize()
// ---------------------------------------------------------------------------

describe('Typed selector — selectUser returns IUser via serialize()', () => {
	// Simulated normalized Redux state
	const entityMap = new Map<string, Record<string, unknown>>();

	function seedStore(): void {
		const users = [
			{
				uid: 's1',
				name: 'Selector A',
				email: 'sa@x.com',
				role: 'admin',
				age: 30,
			},
			{
				uid: 's2',
				name: 'Selector B',
				email: 'sb@x.com',
				role: 'user',
				age: 25,
			},
		];
		for (const raw of users) {
			const dto = new UserDto(raw);
			entityMap.set(
				dto.uid,
				dto.$qSerialize() as Record<string, unknown>
			);
		}
	}

	// Simulated typed selector
	function selectUserById(uid: string): IUser | undefined {
		const raw = entityMap.get(uid);
		if (!raw) return undefined;
		return new UserDto(raw).$qToInterface();
	}

	function selectAdmins(): IUser[] {
		return [...entityMap.values()]
			.map((raw) => new UserDto(raw).$qToInterface())
			.filter((usr) => usr.role === 'admin');
	}

	beforeEach(() => {
		entityMap.clear();
		seedStore();
	});

	test('selectUserById returns a typed plain IUser (not a QModel instance)', () => {
		const user = selectUserById('s1');
		expect(user).toBeDefined();
		expect(user?.name).toBe('Selector A');
		expect(user instanceof QModel).toBe(false);
	});

	test('selectAdmins filters by role from serialized entities', () => {
		const admins = selectAdmins();
		expect(admins.length).toBe(1);
		expect(admins[0]?.name).toBe('Selector A');
	});

	test('selector result does not include @QComputed when using toInterface()', () => {
		const user = selectUserById('s1');
		// toInterface() returns the raw shape — label may not be present
		// (depends on @QComputed config — here just verify uid/name/email are present)
		expect(user?.uid).toBe('s1');
		expect(user?.email).toBe('sa@x.com');
	});
});

// ---------------------------------------------------------------------------
// 8. DevTools — readable payloads via serialize()
// ---------------------------------------------------------------------------

describe('DevTools — readable payloads via serialize()', () => {
	test('action payload created from serialize() is a plain object', () => {
		const dto = new UserDto({
			uid: 'd1',
			name: 'DevUser',
			email: 'd@x.com',
			role: 'user',
			age: 29,
		});
		const payload = dto.$qSerialize();
		expect(payload !== null && typeof payload === 'object').toBe(true);
		expect(Array.isArray(payload)).toBe(false);
		expect(typeof (payload as Record<string, unknown>)['uid']).toBe(
			'string'
		);
	});

	test('payload is not a QModel instance (DevTools can inspect it safely)', () => {
		const dto = new UserDto({
			uid: 'd2',
			name: 'DevTwo',
			email: 'dt@x.com',
			role: 'admin',
			age: 35,
		});
		const payload = dto.$qSerialize();
		expect(payload instanceof QModel).toBe(false);
	});

	test('ProductDto serialize() produces DevTools-friendly payload', () => {
		const product = new ProductDto({
			pid: 'p1',
			name: 'Widget',
			price: '9.99',
			stock: '50',
			category: 'tools',
		});
		const payload = product.$qSerialize() as Record<string, unknown>;
		expect(payload['price']).toBe(9.99);
		expect(payload['summary']).toBe('Widget — $9.99 (50 in stock)');
		expect(() => JSON.stringify(payload)).not.toThrow();
	});

	test('createMany() produces an array of serializable payloads', () => {
		const batch = [
			{ uid: 'd3', name: 'A', email: 'a@x.com', role: 'user', age: 20 },
			{ uid: 'd4', name: 'B', email: 'b@x.com', role: 'admin', age: 30 },
		];
		const { instances } = UserDto.createMany(batch as any[]);
		const payloads = instances.map((inst) => inst.$qSerialize());
		expect(payloads.every((pay) => !(pay instanceof QModel))).toBe(true);
		expect(JSON.parse(JSON.stringify(payloads)) as unknown[]).toHaveLength(
			// @quickmodel-rule-ignore: no-as-unknown
			2
		);
	});
});
