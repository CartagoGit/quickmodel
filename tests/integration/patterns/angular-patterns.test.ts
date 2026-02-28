// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Angular Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used in Angular apps.
 * No Angular packages imported — pure TypeScript logic only.
 *
 * Key separation:
 * - Plain TS form classes + @QRule/@QGroup → qCheckRules() standalone helper
 * - QModel subclasses for coercion/serialization → .checkRules() / .serialize()
 */
import { describe, test, expect, beforeEach, spyOn, afterEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QGroup, QField } from '@/decorators';
import { qGroups } from '@/core/helpers/q-groups';
import {
	qCheckRules,
	_resetAsyncWarnedKeys,
} from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { qCheckRulesByGroup } from '@/core/helpers/q-check-rules-by-group';

// ---------------------------------------------------------------------------
// Plain form class — Angular Reactive Forms pattern
// Use initialized properties (= ''), NOT QModel + declare
// ---------------------------------------------------------------------------

const FormGroups = qGroups('identity', 'contact', 'security');

class UserForm {
	@QField({ widget: 'input', label: 'First Name', required: true })
	@QGroup(FormGroups.identity)
	@QRule(
		(value: string) => value.trim().length >= 2,
		'First name must be at least 2 chars'
	)
	@QRule((value: string) => value.trim().length <= 50, 'First name too long')
	firstName = '';

	@QField({ widget: 'input', label: 'Last Name', required: true })
	@QGroup(FormGroups.identity)
	@QRule(
		(value: string) => value.trim().length >= 2,
		'Last name must be at least 2 chars'
	)
	lastName = '';

	@QField({ label: 'Email', widget: 'email' })
	@QGroup(FormGroups.contact)
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Must be a valid email address'
	)
	email = '';

	@QField({ label: 'Age', widget: 'number', min: 18, max: 120 })
	@QGroup(FormGroups.identity)
	@QRule(
		(value: number) => Number.isInteger(value) && value >= 18,
		'Must be at least 18 years old'
	)
	@QRule((value: number) => value <= 120, 'Age must be realistic')
	age = 0;

	@QField({ widget: 'input', label: 'Role' })
	@QGroup(FormGroups.security)
	@QRule(
		(value: string) => ['admin', 'editor', 'viewer'].includes(value),
		'Role must be admin, editor, or viewer'
	)
	role = '';
}

// ---------------------------------------------------------------------------
// Angular AbstractControl validator adapter simulation
// Angular: null = valid, { [key]: true } = invalid
// ---------------------------------------------------------------------------

function simulateAngularValidator(
	instance: UserForm,
	field: keyof UserForm
): Record<string, boolean> | null {
	const result = qCheckRules(instance);
	const fieldErrors = result.errors.filter(
		(err) => err.field === String(field)
	);
	if (fieldErrors.length === 0) return null;
	return fieldErrors.reduce<Record<string, boolean>>((acc, err) => {
		acc[err.message.replace(/\s+/g, '_').toLowerCase()] = true;
		return acc;
	}, {});
}

async function simulateAngularAsyncValidator(
	instance: UserForm | RegisterForm,
	field: keyof UserForm | keyof RegisterForm,
	opts?: { timeoutMs?: number }
): Promise<Record<string, boolean> | null> {
	const result = await qCheckRulesAsync(instance, opts);
	const fieldErrors = result.errors.filter(
		(err) => err.field === String(field)
	);
	if (fieldErrors.length === 0) return null;
	return fieldErrors.reduce<Record<string, boolean>>((acc, err) => {
		acc[err.message.replace(/\s+/g, '_').toLowerCase()] = true;
		return acc;
	}, {});
}

// ---------------------------------------------------------------------------
// 1. Reactive Forms validator adapter
// ---------------------------------------------------------------------------

describe('Angular — Reactive Forms validator adapter', () => {
	test('returns null (valid) when all fields pass @QRule predicates', () => {
		const form = new UserForm();
		form.firstName = 'Alice';
		form.lastName = 'Smith';
		form.email = 'alice@example.com';
		form.age = 30;
		form.role = 'editor';

		expect(simulateAngularValidator(form, 'firstName')).toBeNull();
		expect(simulateAngularValidator(form, 'email')).toBeNull();
		expect(simulateAngularValidator(form, 'age')).toBeNull();
	});

	test('returns error map when firstName is too short', () => {
		const form = new UserForm();
		form.firstName = 'A';
		form.lastName = 'Smith';
		form.email = 'a@b.com';
		form.age = 25;
		form.role = 'viewer';

		const errors = simulateAngularValidator(form, 'firstName');
		expect(errors).not.toBeNull();
		expect(Object.keys(errors!).length).toBeGreaterThan(0);
	});

	test('returns error map when email is invalid', () => {
		const form = new UserForm();
		form.firstName = 'Alice';
		form.lastName = 'Smith';
		form.email = 'not-an-email';
		form.age = 25;
		form.role = 'admin';

		const errors = simulateAngularValidator(form, 'email');
		expect(errors).not.toBeNull();
	});

	test('returns null when age is exactly 18 (boundary)', () => {
		const form = new UserForm();
		form.firstName = 'Bob';
		form.lastName = 'Young';
		form.email = 'bob@example.com';
		form.age = 18;
		form.role = 'viewer';

		expect(simulateAngularValidator(form, 'age')).toBeNull();
	});

	test('accumulates errors from multiple @QRule on the same field', () => {
		const form = new UserForm();
		form.firstName = 'A'; // fails: too short
		const result = qCheckRules(form);
		const firstNameErrors = result.errors.filter(
			(err) => err.field === 'firstName'
		);
		expect(firstNameErrors.length).toBeGreaterThanOrEqual(1);
	});

	test('fully valid form returns valid: true', () => {
		const form = new UserForm();
		form.firstName = 'Alice';
		form.lastName = 'Smith';
		form.email = 'alice@example.com';
		form.age = 25;
		form.role = 'admin';

		const result = qCheckRules(form);
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// 2. Multi-step wizard (Angular CDK Stepper) with @QGroup
// ---------------------------------------------------------------------------

describe('Angular — Multi-step wizard with @QGroup', () => {
	let form: UserForm;

	beforeEach(() => {
		form = new UserForm();
	});

	test('step 1 (identity) fails when form is blank', () => {
		const groups = qCheckRulesByGroup(form);
		expect(groups['identity']?.valid).toBe(false);
	});

	test('step 2 (contact) fails when email is blank', () => {
		const groups = qCheckRulesByGroup(form);
		expect(groups['contact']?.valid).toBe(false);
	});

	test('step 3 (security) fails when role is blank', () => {
		const groups = qCheckRulesByGroup(form);
		expect(groups['security']?.valid).toBe(false);
	});

	test('step 1 passes independently while other steps are still invalid', () => {
		form.firstName = 'Alice';
		form.lastName = 'Brown';
		form.age = 22;

		const identityResult = qCheckRules(form, {
			group: FormGroups.identity,
		});
		expect(identityResult.valid).toBe(true);

		const contactResult = qCheckRules(form, { group: FormGroups.contact });
		expect(contactResult.valid).toBe(false);
	});

	test('all steps pass when form is fully valid', () => {
		form.firstName = 'Alice';
		form.lastName = 'Brown';
		form.email = 'alice@example.com';
		form.age = 22;
		form.role = 'editor';

		const groups = qCheckRulesByGroup(form);
		expect(groups['identity']?.valid).toBe(true);
		expect(groups['contact']?.valid).toBe(true);
		expect(groups['security']?.valid).toBe(true);
	});

	test('each group returns its own error list', () => {
		form.firstName = 'A';
		form.email = 'bad';
		form.role = 'unknown';

		const groups = qCheckRulesByGroup(form);
		expect(
			groups['identity']?.errors.some((err) => err.field === 'firstName')
		).toBe(true);
		expect(
			groups['contact']?.errors.some((err) => err.field === 'email')
		).toBe(true);
		expect(
			groups['security']?.errors.some((err) => err.field === 'role')
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 3. Angular Service / Repository pattern (QModel for coercion + serialization)
// ---------------------------------------------------------------------------

interface IUserRecord {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	score: number;
}

@Quick(
	{
		id: 'string',
		firstName: 'string',
		lastName: 'string',
		email: 'string',
		score: 'number',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class UserRecord extends QModel<IUserRecord> {
	declare id: string;
	declare firstName: string;
	declare lastName: string;
	declare email: string;
	declare score: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get tier(): 'gold' | 'silver' | 'bronze' {
		if (this.score >= 90) return 'gold';
		if (this.score >= 60) return 'silver';
		return 'bronze';
	}
}

class UserDataService {
	private store = new Map<string, UserRecord>();

	save(data: Record<string, unknown>): object {
		const record = new UserRecord(data);
		this.store.set(
			(record as unknown as Record<string, unknown>)['id'] as string,
			record
		);
		return record.serialize();
	}

	findById(idArg: string): object | undefined {
		const record = this.store.get(idArg);
		return record ? record.serialize() : undefined;
	}

	findAll(): object[] {
		return [...this.store.values()].map((rec) => rec.serialize());
	}

	update(idArg: string, patch: Partial<IUserRecord>): object | null {
		const record = this.store.get(idArg);
		if (!record) return null;
		const updated = record.copy(patch);
		this.store.set(idArg, updated);
		return updated.serialize();
	}
}

describe('Angular — Service / Repository pattern', () => {
	let service: UserDataService;

	beforeEach(() => {
		service = new UserDataService();
	});

	test('save() returns serialized record', () => {
		const result = service.save({
			id: 'u1',
			firstName: 'Carol',
			lastName: 'White',
			email: 'carol@example.com',
			score: 75,
		});
		expect(result).toMatchObject({
			id: 'u1',
			firstName: 'Carol',
			score: 75,
		});
	});

	test('@QComputed() fields appear in serialize() output', () => {
		service.save({
			id: 'u2',
			firstName: 'Dan',
			lastName: 'Black',
			email: 'dan@example.com',
			score: 95,
		});
		const record = service.findById('u2') as Record<string, unknown>;
		expect(record['tier']).toBe('gold');
		expect(record['fullName']).toBe('Dan Black');
	});

	test('findAll() returns all records', () => {
		service.save({
			id: 'a1',
			firstName: 'Eve',
			lastName: 'Adams',
			email: 'e@a.com',
			score: 50,
		});
		service.save({
			id: 'a2',
			firstName: 'Frank',
			lastName: 'Stone',
			email: 'f@s.com',
			score: 60,
		});
		expect(service.findAll()).toHaveLength(2);
	});

	test('update() patches record and recomputes @QComputed fields', () => {
		service.save({
			id: 'u3',
			firstName: 'Grace',
			lastName: 'Lee',
			email: 'grace@example.com',
			score: 55,
		});
		const updated = service.update('u3', { score: 91 }) as Record<
			string,
			unknown
		>;
		expect(updated['score']).toBe(91);
		expect(updated['tier']).toBe('gold');
	});

	test('update() returns null for unknown id', () => {
		expect(service.update('nonexistent', { score: 99 })).toBeNull();
	});

	test('isDirty() tracks direct mutations on a record', () => {
		const record = new UserRecord({
			id: 'x1',
			firstName: 'Helen',
			lastName: 'Ford',
			email: 'helen@example.com',
			score: 70,
		});
		expect(record.isDirty()).toBe(false);
		record.score = 80;
		expect(record.isDirty()).toBe(true);
		expect(record.isDirty('score')).toBe(true);
		expect(record.isDirty('email')).toBe(false);
		record.reset();
		expect(record.isDirty()).toBe(false);
		expect(record.score).toBe(70);
	});

	test('merge() is immutable — original and new instance are independent', () => {
		const record = new UserRecord({
			id: 'x2',
			firstName: 'Ivan',
			lastName: 'Koch',
			email: 'ivan@example.com',
			score: 70,
		});
		const updated = record.copy({ score: 90 });
		// Original untouched
		expect(record.isDirty()).toBe(false);
		expect(record.score).toBe(70);
		// New instance has merged value
		expect(updated.score).toBe(90);
		expect(updated).not.toBe(record);
		// Mutating original does not affect new instance
		record.score = 55;
		expect(record.isDirty()).toBe(true);
		expect(updated.score).toBe(90);
	});
});

// ---------------------------------------------------------------------------
// 4. HttpClient response coercion (Angular interceptor pattern)
// ---------------------------------------------------------------------------

interface IApiItem {
	id: number;
	name: string;
	createdAt: Date | string;
	updatedAt: Date | string;
	active: boolean;
}

@Quick(
	{
		id: 'number',
		name: 'string',
		createdAt: Date,
		updatedAt: Date,
		active: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class ApiItemDto extends QModel<IApiItem> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare active: boolean;
}

function simulateHttpInterceptor(rawBody: Record<string, unknown>): ApiItemDto {
	return new ApiItemDto(rawBody);
}

describe('Angular — HttpClient interceptor coercion', () => {
	test('ISO date strings are coerced to Date instances', () => {
		const dto = simulateHttpInterceptor({
			id: 1,
			name: 'Item One',
			createdAt: '2024-01-15T10:30:00.000Z',
			updatedAt: '2024-06-01T08:00:00.000Z',
			active: true,
		});
		expect(dto.createdAt).toBeInstanceOf(Date);
		expect(dto.updatedAt).toBeInstanceOf(Date);
	});

	test('unknown server properties are stripped', () => {
		const dto = simulateHttpInterceptor({
			id: 2,
			name: 'Item Two',
			createdAt: '2024-02-01T00:00:00.000Z',
			updatedAt: '2024-02-01T00:00:00.000Z',
			active: false,
			_internalMeta: 'stripped',
			debugToken: 'secret',
		});
		const serialized = dto.serialize() as Record<string, unknown>;
		expect('_internalMeta' in serialized).toBe(false);
		expect('debugToken' in serialized).toBe(false);
	});

	test('boolean field is preserved correctly', () => {
		const dtoT = simulateHttpInterceptor({
			id: 3,
			name: 'Active',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			active: true,
		});
		const dtoF = simulateHttpInterceptor({
			id: 4,
			name: 'Inactive',
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
			active: false,
		});
		expect(dtoT.active).toBe(true);
		expect(dtoF.active).toBe(false);
	});

	test('createMany() coerces a whole array response at once', () => {
		const rawArr = [
			{
				id: 1,
				name: 'One',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
				active: true,
			},
			{
				id: 2,
				name: 'Two',
				createdAt: '2024-03-01T00:00:00.000Z',
				updatedAt: '2024-03-01T00:00:00.000Z',
				active: false,
			},
		];
		const { instances } = ApiItemDto.createMany(rawArr as any[]);
		expect(instances).toHaveLength(2);
		instances.forEach((item) =>
			expect(item.createdAt).toBeInstanceOf(Date)
		);
	});
});

// ---------------------------------------------------------------------------
// 5. Angular Signals-like reactive pattern (v17+)
// ---------------------------------------------------------------------------

class QSignal<TVal> {
	private current: TVal;
	constructor(initial: TVal) {
		this.current = initial;
	}
	read(): TVal {
		return this.current;
	}
	write(val: TVal): void {
		this.current = val;
	}
	update(callbackFn: (prev: TVal) => TVal): void {
		this.current = callbackFn(this.current);
	}
}

interface IProfileData {
	name: string;
	bio: string;
	followers: number;
}

@Quick(
	{ name: 'string', bio: 'string', followers: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class ProfileModel extends QModel<IProfileData> {
	declare name: string;
	declare bio: string;
	declare followers: number;

	@QComputed()
	get summary(): string {
		return `${this.name} · ${this.followers} followers`;
	}
}

describe('Angular — Signals reactive state (v17+)', () => {
	test('signal wraps QModel and exposes reactive read', () => {
		const sig = new QSignal(
			new ProfileModel({ name: 'Alice', bio: 'Dev', followers: 1200 })
		);
		expect(sig.read().name).toBe('Alice');
	});

	test('update() + merge() patches model reactively', () => {
		const sig = new QSignal(
			new ProfileModel({ name: 'Bob', bio: 'Designer', followers: 500 })
		);
		sig.update((prev) => prev.copy({ followers: 600 }));
		expect(sig.read().followers).toBe(600);
	});

	test('serialize() from signal includes @QComputed() fields', () => {
		const sig = new QSignal(
			new ProfileModel({ name: 'Carol', bio: 'Engineer', followers: 999 })
		);
		const out = sig.read().serialize() as Record<string, unknown>;
		expect(out['summary']).toBe('Carol · 999 followers');
	});

	test('isDirty() tracks model dirty state through direct mutation', () => {
		const model = new ProfileModel({
			name: 'Dave',
			bio: 'Tester',
			followers: 100,
		});
		expect(model.isDirty()).toBe(false);
		model.bio = 'Senior Tester';
		expect(model.isDirty()).toBe(true);
		expect(model.isDirty('bio')).toBe(true);
		expect(model.isDirty('name')).toBe(false);
		model.reset();
		expect(model.isDirty()).toBe(false);
		expect(model.bio).toBe('Tester');
	});

	test('write() replaces the model in the signal', () => {
		const sig = new QSignal(
			new ProfileModel({ name: 'Old', bio: 'Bio', followers: 10 })
		);
		sig.write(
			new ProfileModel({ name: 'New', bio: 'Updated', followers: 20 })
		);
		expect(sig.read().name).toBe('New');
		expect(sig.read().followers).toBe(20);
	});
});

// ---------------------------------------------------------------------------
// 6. Async validator — email uniqueness (Angular AsyncValidatorFn)
// ---------------------------------------------------------------------------

const knownEmails = new Set(['taken@example.com', 'admin@example.com']);

class RegisterForm {
	@QGroup(FormGroups.identity)
	@QRule(
		(value: string) => value.length >= 3,
		'Username must be at least 3 chars'
	)
	@QRule(
		(value: string) => /^[a-zA-Z0-9_]+$/.test(value),
		'Username: only letters, digits, _'
	)
	username = '';

	@QGroup(FormGroups.contact)
	@QRule(async (value: string) => {
		await Bun.sleep(5);
		return !knownEmails.has(value);
	}, 'Email already registered')
	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email format'
	)
	email = '';

	@QGroup(FormGroups.security)
	@QRule(
		(value: string) => value.length >= 8,
		'Password must be at least 8 chars'
	)
	@QRule(
		(value: string) => /[A-Z]/.test(value),
		'Password needs an uppercase letter'
	)
	password = '';
}

describe('Angular — Async validator (email uniqueness)', () => {
	test('resolves valid when email is available', async () => {
		const form = new RegisterForm();
		form.username = 'alice_99';
		form.email = 'alice@example.com';
		form.password = 'Secure123';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(true);
	});

	test('fails when email is already taken', async () => {
		const form = new RegisterForm();
		form.username = 'alice_99';
		form.email = 'taken@example.com';
		form.password = 'Secure123';
		const result = await qCheckRulesAsync(form);
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('maps to Angular AsyncValidatorFn format', async () => {
		const form = new RegisterForm();
		form.username = 'user_x';
		form.email = 'admin@example.com';
		form.password = 'Valid1234';
		const angularResult = await simulateAngularAsyncValidator(
			form,
			'email',
			{ timeoutMs: 200 }
		);
		expect(angularResult).not.toBeNull();
	});

	test('serial mode validates predicates in declaration order', async () => {
		const form = new RegisterForm();
		form.username = 'ab';
		form.email = 'new@example.com';
		form.password = 'short';
		const result = await qCheckRulesAsync(form, { mode: 'serial' });
		expect(result.valid).toBe(false);
		const fields = result.errors.map((err) => err.field);
		expect(fields).toContain('username');
		expect(fields).toContain('password');
	});

	test('parallel mode finishes in time proportional to max predicate', async () => {
		const form = new RegisterForm();
		form.username = 'alice_ok';
		form.email = 'alice@example.com';
		form.password = 'Secure123';
		const start = Date.now();
		await qCheckRulesAsync(form, { mode: 'parallel' });
		expect(Date.now() - start).toBeLessThan(200);
	});
});

// ---------------------------------------------------------------------------
// 7. createMany() — list resolver / bulk HTTP response
// ---------------------------------------------------------------------------

describe('Angular — createMany() in resolver / bulk HTTP response', () => {
	test('coerces all items from a JSON array', () => {
		const raw = [
			{
				id: 'r1',
				firstName: 'Alice',
				lastName: 'Smith',
				email: 'alice@example.com',
				score: 88,
			},
			{
				id: 'r2',
				firstName: 'Bob',
				lastName: 'Jones',
				email: 'bob@example.com',
				score: 72,
			},
		];
		const { instances, errors } = UserRecord.createMany(raw as any[]);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
	});

	test('each instance includes @QComputed() tier and fullName', () => {
		const raw = [
			{
				id: 's1',
				firstName: 'Dave',
				lastName: 'Brown',
				email: 'dave@example.com',
				score: 95,
			},
		];
		const { instances } = UserRecord.createMany(raw as any[]);
		const out = instances[0].serialize() as Record<string, unknown>;
		expect(out['tier']).toBe('gold');
		expect(out['fullName']).toBe('Dave Brown');
	});

	test('createMany() result shape has instances and errors arrays', () => {
		const raw = [
			{
				id: 'v1',
				firstName: 'Carol',
				lastName: 'W',
				email: 'carol@example.com',
				score: 90,
			},
		];
		const result = UserRecord.createMany(raw as any[]);
		expect(Array.isArray(result.instances)).toBe(true);
		expect(Array.isArray(result.errors)).toBe(true);
	});

	test('createMany() validates @QRule on each instance', () => {
		class ValidatedItem extends QModel<{ name: string; qty: number }> {
			@QRule((val: string) => val.length > 0, 'Name required')
			declare name: string;
			declare qty: number;
		}
		const mixed = [
			{ name: 'Widget', qty: 10 },
			{ name: '', qty: 5 },
		];
		const { errors } = ValidatedItem.createMany(mixed as any[]);
		expect(errors.length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// 8. Reglas mixtas: comportamiento de checkRules() vs checkRulesAsync()
//
// REGLA CLAVE:
//   checkRules()      → los predicados async se IGNORAN (siempre pasan)
//   checkRulesAsync() → evalúa correctamente síncronos Y asíncronos
// ---------------------------------------------------------------------------

class MixedRulesForm {
	/** Reglas: sync (longitud) + async (disponibilidad en "servidor"). */
	@QRule((val: string) => val.length >= 3, 'Username too short') // sync
	@QRule(
		async (val: string) => {
			await Bun.sleep(5);
			return val !== 'taken_user'; // simula consulta remota
		},
		'Username already taken' // async
	)
	username = '';

	/**  Solo regla síncrona — referencia para comparar. */
	@QRule((val: string) => val.length >= 2, 'Name too short') // sync
	name = '';
}

describe('Reglas mixtas — checkRules() ignora predicados async', () => {
	let warnSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		_resetAsyncWarnedKeys();
		warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warnSpy.mockRestore();
	});

	test('checkRules() reporta el fallo sync pero silencia el fallo async', () => {
		const form = new MixedRulesForm();
		form.username = 'taken_user'; // ← fallaría la regla async
		form.name = 'OK';

		const result = qCheckRules(form);

		// La regla SYNC pasa (longitud >= 3 ✓), la ASYNC se silencia (siempre pasa)
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('emite console.warn indicando el campo con predicado async ignorado', () => {
		const form = new MixedRulesForm();
		form.username = 'taken_user';
		form.name = 'OK';

		qCheckRules(form);

		const calls = (warnSpy.mock.calls as string[][]).flat().join(' ');
		expect(calls).toContain('MixedRulesForm#username');
		expect(calls).toContain('checkRulesAsync');
	});

	test('el warning no se repite en llamadas sucesivas (deduplicado)', () => {
		const form = new MixedRulesForm();
		form.username = 'taken_user';
		form.name = 'OK';

		qCheckRules(form);
		qCheckRules(form);
		qCheckRules(form);

		const usernameWarnings = (warnSpy.mock.calls as string[][]).filter(
			(args) => args.join(' ').includes('MixedRulesForm#username')
		);
		expect(usernameWarnings).toHaveLength(1);
	});

	test('checkRules() detecta el fallo sync aunque la regla async también fallaría', () => {
		const form = new MixedRulesForm();
		form.username = 'ab'; // ← falla sync (< 3 chars) Y fallaría async (taken_user)
		form.name = 'OK';

		const result = qCheckRules(form);

		// Solo aparece el error sincrónico
		expect(result.valid).toBe(false);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toBe('Username too short');
	});

	test('checkRules() no puede detectar el fallo async cuando la regla sync pasa', () => {
		const form = new MixedRulesForm();
		form.username = 'taken_user'; // longitud ≥ 3 ✓, pero "tomado" en servidor
		form.name = 'OK';

		const result = qCheckRules(form);

		// ⚠️ checkRules() devuelve válido aunque "taken_user" debería fallar
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

describe('Reglas mixtas — checkRulesAsync() evalúa todas las reglas', () => {
	test('checkRulesAsync() detecta el fallo async que checkRules() ignora', async () => {
		const form = new MixedRulesForm();
		form.username = 'taken_user'; // longitud ≥ 3 ✓, "tomado" en servidor ✗
		form.name = 'OK';

		const syncResult = qCheckRules(form);
		const asyncResult = await qCheckRulesAsync(form);

		// checkRules() no ve el fallo async
		expect(syncResult.valid).toBe(true);

		// checkRulesAsync() sí lo detecta
		expect(asyncResult.valid).toBe(false);
		expect(asyncResult.errors[0].field).toBe('username');
		expect(asyncResult.errors[0].message).toBe('Username already taken');
	});

	test('checkRulesAsync() también detecta fallos sincronos junto a los async', async () => {
		const form = new MixedRulesForm();
		form.username = 'ab'; // falla sync (< 3) Y async (no aplica por longitud, pero se ejecuta)
		form.name = 'X'; // falla sync (< 2)

		const result = await qCheckRulesAsync(form);

		expect(result.valid).toBe(false);
		const fields = result.errors.map((err) => err.field);
		expect(fields).toContain('username');
		expect(fields).toContain('name');
	});

	test('checkRulesAsync() devuelve válido cuando todas las reglas (sync + async) pasan', async () => {
		const form = new MixedRulesForm();
		form.username = 'free_user'; // longitud ≥ 3 ✓, no tomado ✓
		form.name = 'Alice'; // longitud ≥ 2 ✓

		const result = await qCheckRulesAsync(form);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	test('checkRulesAsync() en mode:serial evalúa en orden de declaración', async () => {
		const form = new MixedRulesForm();
		form.username = 'ab'; // falla sync (< 3 chars) — la regla async NO llega a evaluarse
		form.name = 'OK';

		const result = await qCheckRulesAsync(form, { mode: 'serial' });

		expect(result.valid).toBe(false);
		// El primer error es el sync (declarado primero)
		expect(result.errors[0].message).toBe('Username too short');
	});

	test('QModel.checkRulesAsync() tiene el mismo comportamiento que qCheckRulesAsync()', async () => {
		// Verifica que el método en QModel delega correctamente al helper

		@Quick({ username: 'string', name: 'string' })
		class MixedModel extends QModel<{ username: string; name: string }> {
			@QRule((val: string) => val.length >= 3, 'Username too short')
			@QRule(async (val: string) => {
				await Bun.sleep(5);
				return val !== 'taken_user';
			}, 'Username already taken')
			declare username: string;

			@QRule((val: string) => val.length >= 2, 'Name too short')
			declare name: string;
		}

		const instance = new MixedModel({
			username: 'taken_user',
			name: 'Alice',
		});

		// Método en instancia QModel
		const result = await instance.checkRulesAsync();

		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('username');
		expect(result.errors[0].message).toBe('Username already taken');
	});
});
