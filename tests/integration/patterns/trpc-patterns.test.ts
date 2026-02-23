/**
 * tRPC integration patterns
 * Covers: input validation, output serialization, middleware coercion,
 *         async DB validation, batch queries, error mapping, copy() patches
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import {
	QModel,
	Quick,
	QRule,
	QField,
	QComputed,
	QGroup,
	qCheckRules,
	qCheckRulesAsync,
} from '@/index';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface ICreateUserInput {
	name: string;
	email: string;
	role: string;
	age: number;
}

interface IUserOutput {
	uid: string;
	name: string;
	email: string;
	role: string;
	age: number;
	label?: string;
}

interface IUpdateUserInput {
	uid: string;
	name: string;
	age: number;
}

interface IListQueryInput {
	page: number;
	size: number;
	tag: string;
}

interface IBatchItem {
	bid: string;
	title: string;
	qty: number;
	active: boolean;
}

@Quick(
	{
		name: 'string',
		email: 'string',
		role: 'string',
		age: 'number',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserInput extends QModel<ICreateUserInput> {
	@QGroup('identity')
	@QField({ label: 'Name', required: true })
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;

	@QGroup('identity')
	@QField({ label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email format'
	)
	declare email: string;

	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	declare age: number;
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
class UserOutput extends QModel<IUserOutput> {
	declare uid: string;
	declare name: string;
	declare email: string;
	declare role: string;
	declare age: number;

	@QComputed()
	get label(): string {
		return `${this.name} (${this.role})`;
	}
}

@Quick(
	{ uid: 'string', name: 'string', age: 'number' },
	{ coercionStrategy: 'loose' }
)
class UpdateUserInput extends QModel<IUpdateUserInput> {
	declare uid: string;
	@QRule((val: string) => val.length >= 2, 'Name too short')
	declare name: string;
	@QRule((val: number) => val >= 0, 'Invalid age')
	declare age: number;
}

@Quick(
	{ page: 'number', size: 'number', tag: 'string' },
	{ coercionStrategy: 'loose' }
)
class ListQueryInput extends QModel<IListQueryInput> {
	@QRule((val: number) => val >= 1, 'Page must be >= 1')
	declare page: number;
	@QRule((val: number) => val >= 1 && val <= 100, 'Size must be 1-100')
	declare size: number;
	declare tag: string;
}

@Quick(
	{ bid: 'string', title: 'string', qty: 'number', active: 'boolean' },
	{ coercionStrategy: 'loose' }
)
class _BatchItemDto extends QModel<IBatchItem> {
	declare bid: string;
	@QRule((val: string) => val.trim().length > 0, 'Title required')
	declare title: string;
	@QRule((val: number) => val >= 0, 'Qty must be >= 0')
	declare qty: number;
	declare active: boolean;
}

// ---------------------------------------------------------------------------
// 1. tRPC input — QModel as input validator
// ---------------------------------------------------------------------------

describe('tRPC input — QModel as input validator', () => {
	test('coerces string age from query params to number', () => {
		const input = new CreateUserInput({
			name: 'Alice',
			email: 'alice@example.com',
			role: 'user',
			age: '25',
		});
		expect(input.age).toBe(25);
	});

	test('checkRules passes for valid input', () => {
		const input = new CreateUserInput({
			name: 'Alice',
			email: 'alice@example.com',
			role: 'user',
			age: 25,
		});
		const result = qCheckRules(input);
		expect(result.valid).toBe(true);
	});

	test('checkRules fails with invalid email', () => {
		const input = new CreateUserInput({
			name: 'Alice',
			email: 'not-an-email',
			role: 'user',
			age: 25,
		});
		const result = qCheckRules(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('checkRules fails when age < 18', () => {
		const input = new CreateUserInput({
			name: 'Bob',
			email: 'bob@x.com',
			role: 'user',
			age: 16,
		});
		const result = qCheckRules(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'age')).toBe(true);
	});

	test('checkRules fails with invalid role', () => {
		const input = new CreateUserInput({
			name: 'Carol',
			email: 'carol@x.com',
			role: 'superuser',
			age: 30,
		});
		const result = qCheckRules(input);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'role')).toBe(true);
	});

	test('extra fields are stripped before validation', () => {
		const raw = {
			name: 'Dave',
			email: 'dave@x.com',
			role: 'user',
			age: 22,
			__proto__: 'injected',
			extra: 99,
		};
		const input = new CreateUserInput(raw);
		expect(
			(input as unknown as Record<string, unknown>)['extra']
		).toBeUndefined();
		expect(
			(input as unknown as Record<string, unknown>)['__proto__']
		).not.toBe('injected');
	});

	test('getFormSchema for @QGroup identity fields', () => {
		const input = new CreateUserInput({
			name: '',
			email: '',
			role: 'user',
			age: 18,
		});
		const schema = input.getFormSchema({ group: 'identity' });
		const keys = schema.map((fie: { field: string }) => fie.field);
		expect(keys).toContain('name');
		expect(keys).toContain('email');
	});
});

// ---------------------------------------------------------------------------
// 2. tRPC output — serialize() as procedure output
// ---------------------------------------------------------------------------

describe('tRPC output — serialize() as procedure output', () => {
	test('serialize() returns a plain object suitable for tRPC output', () => {
		const out = new UserOutput({
			uid: 'u1',
			name: 'Alice',
			email: 'alice@x.com',
			role: 'user',
			age: 25,
		});
		const payload = out.serialize();
		expect(typeof payload).toBe('object');
		expect((payload as Record<string, unknown>)['uid']).toBe('u1');
	});

	test('@QComputed label is included in serialized output', () => {
		const out = new UserOutput({
			uid: 'u2',
			name: 'Bob',
			email: 'bob@x.com',
			role: 'admin',
			age: 30,
		});
		const payload = out.serialize() as Record<string, unknown>;
		expect(payload['label']).toBe('Bob (admin)');
	});

	test('extra DB fields are stripped from tRPC response', () => {
		const dbRow = {
			uid: 'u3',
			name: 'Carol',
			email: 'carol@x.com',
			role: 'guest',
			age: 28,
			sql_idx: 777,
		};
		const out = new UserOutput(dbRow);
		const payload = out.serialize() as Record<string, unknown>;
		expect(payload['sql_idx']).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// 3. tRPC middleware — context coercion
// ---------------------------------------------------------------------------

describe('tRPC middleware — context coercion', () => {
	test('middleware coerces JSON body to typed ListQueryInput', () => {
		const body = { page: '2', size: '20', tag: 'premium' };
		const input = new ListQueryInput(body);
		expect(input.page).toBe(2);
		expect(input.size).toBe(20);
	});

	test('checkRules validates middleware-coerced input', () => {
		const input = new ListQueryInput({ page: 1, size: 50, tag: 'all' });
		const result = qCheckRules(input);
		expect(result.valid).toBe(true);
	});

	test('checkRules rejects invalid query params in middleware', () => {
		const input = new ListQueryInput({ page: 0, size: 200, tag: 'x' });
		const result = qCheckRules(input);
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(2);
	});
});

// ---------------------------------------------------------------------------
// 4. tRPC checkRulesAsync — DB validation
// ---------------------------------------------------------------------------

describe('tRPC checkRulesAsync — DB validation', () => {
	const emailRegistry = new Set<string>(['taken@example.com']);

	test('async rule passes for unique email', async () => {
		const input = new CreateUserInput({
			name: 'New',
			email: 'fresh@example.com',
			role: 'user',
			age: 20,
		});
		const result = await qCheckRulesAsync(input, {
			asyncRules: {
				email: [
					async (val) => {
						await Bun.sleep(1);
						return !emailRegistry.has(val as string);
					},
				],
			},
		});
		expect(result.valid).toBe(true);
	});

	test('async rule fails for duplicate email', async () => {
		const input = new CreateUserInput({
			name: 'Dup',
			email: 'taken@example.com',
			role: 'user',
			age: 20,
		});
		const result = await qCheckRulesAsync(input, {
			asyncRules: {
				email: [
					(val) => Promise.resolve(!emailRegistry.has(val as string)),
				],
			},
		});
		expect(result.valid).toBe(false);
	});

	test('async validation runs alongside sync rules', async () => {
		const input = new CreateUserInput({
			name: 'X',
			email: 'bad-email',
			role: 'user',
			age: 20,
		});
		const syncResult = qCheckRules(input);
		expect(syncResult.valid).toBe(false);

		const asyncResult = await qCheckRulesAsync(input, {
			asyncRules: { name: [() => Promise.resolve(false)] },
		});
		expect(asyncResult.valid).toBe(false);
	});

	test('async validation with Bun.sleep simulates DB latency', async () => {
		const input = new CreateUserInput({
			name: 'Slow',
			email: 'slow@x.com',
			role: 'guest',
			age: 21,
		});
		const start = Date.now();
		await qCheckRulesAsync(input, {
			asyncRules: {
				email: [
					async () => {
						await Bun.sleep(1);
						return true;
					},
				],
			},
		});
		expect(Date.now() - start).toBeGreaterThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// 5. tRPC batch query — createMany
// ---------------------------------------------------------------------------

describe('tRPC batch query — createMany', () => {
	test('createMany processes tRPC batch response array', () => {
		const batch = [
			{ uid: 'b1', name: 'A', email: 'a@x.com', role: 'user', age: 21 },
			{ uid: 'b2', name: 'B', email: 'b@x.com', role: 'admin', age: 35 },
			{ uid: 'b3', name: 'C', email: 'c@x.com', role: 'guest', age: 29 },
		];
		const { instances, errors } = UserOutput.createMany(batch);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
	});

	test('createMany strips extra fields from each batch item', () => {
		const batch = [
			{
				uid: 'b4',
				name: 'D',
				email: 'd@x.com',
				role: 'user',
				age: 22,
				_internal: true,
			},
		];
		const { instances } = UserOutput.createMany(batch);
		expect(
			(instances[0] as unknown as Record<string, unknown>)['_internal']
		).toBeUndefined();
	});

	test('createMany labels are accessible via @QComputed', () => {
		const batch = [
			{
				uid: 'b5',
				name: 'Eve',
				email: 'eve@x.com',
				role: 'admin',
				age: 28,
			},
		];
		const { instances } = UserOutput.createMany(batch);
		expect(instances[0]?.label).toBe('Eve (admin)');
	});
});

// ---------------------------------------------------------------------------
// 6. tRPC error mapping
// ---------------------------------------------------------------------------

describe('tRPC error mapping', () => {
	interface ITrpcError {
		code: string;
		message: string;
		field?: string;
	}

	function mapToTrpcError(
		errors: Array<{ field: string; message: string }>
	): ITrpcError[] {
		return errors.map((err) => ({
			code: 'BAD_REQUEST',
			message: err.message,
			field: err.field,
		}));
	}

	test('maps qCheckRules errors to tRPC BAD_REQUEST format', () => {
		const input = new CreateUserInput({
			name: 'Z',
			email: 'bad',
			role: 'unknown',
			age: 10,
		});
		const result = qCheckRules(input);
		const trpcErrors = mapToTrpcError(result.errors);
		expect(trpcErrors.every((err) => err.code === 'BAD_REQUEST')).toBe(
			true
		);
		expect(trpcErrors.length).toBeGreaterThanOrEqual(3);
	});

	test('field name is preserved in tRPC error', () => {
		const input = new CreateUserInput({
			name: 'Valid',
			email: 'not-valid',
			role: 'user',
			age: 25,
		});
		const result = qCheckRules(input);
		const trpcErrors = mapToTrpcError(result.errors);
		expect(trpcErrors.some((err) => err.field === 'email')).toBe(true);
	});

	test('valid input produces no tRPC errors', () => {
		const input = new CreateUserInput({
			name: 'Alice',
			email: 'alice@x.com',
			role: 'user',
			age: 25,
		});
		const result = qCheckRules(input);
		const trpcErrors = mapToTrpcError(result.errors);
		expect(trpcErrors.length).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// 7. updateUser — patch with copy()
// ---------------------------------------------------------------------------

describe('updateUser — patch with copy()', () => {
	const userDb = new Map<string, IUserOutput>();

	beforeEach(() => {
		userDb.clear();
		userDb.set('u1', {
			uid: 'u1',
			name: 'Alice',
			email: 'alice@x.com',
			role: 'user',
			age: 25,
		});
	});

	test('copy() applies partial patch from tRPC mutation input', () => {
		const existing = new UserOutput(userDb.get('u1')!);
		const patch = new UpdateUserInput({
			uid: 'u1',
			name: 'Alice Updated',
			age: 26,
		});
		const updated = existing.copy({ name: patch.name, age: patch.age });
		expect(updated.name).toBe('Alice Updated');
		expect(updated.age).toBe(26);
		expect(existing.name).toBe('Alice'); // immutable
	});

	test('patch does not affect unchanged fields', () => {
		const existing = new UserOutput(userDb.get('u1')!);
		const updated = existing.copy({ name: 'New Name' });
		expect(updated.email).toBe('alice@x.com');
		expect(updated.role).toBe('user');
	});

	test('isDirty() detects patch changes', () => {
		const existing = new UserOutput(userDb.get('u1')!);
		const updated = existing.copy({ age: 99 });
		expect(updated.isDirty()).toBe(true);
		expect(existing.isDirty()).toBe(false);
	});
});
