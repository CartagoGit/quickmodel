// tests/integration/patterns/nestjs-patterns.test.ts
/**
 * NestJS Integration Patterns
 *
 * These tests verify that QuickModel behaves correctly in all the patterns
 * described in the NestJS Integration guide. No actual NestJS packages are
 * imported — we test the QuickModel side of the contract:
 *  - DTO coercion at controller boundary
 *  - @QRule validation + NestJS-compatible error shape
 *  - Custom ValidationPipe logic
 *  - @QComputed() in serialized API responses
 *  - getSchema('openapi') output structure
 *  - Async @QRule (DB uniqueness simulation)
 *  - Nested DTOs
 *  - Bulk create (createMany)
 *  - Repository read/write pattern
 *  - Response interceptor pattern (auto-serialize)
 *  - Exception filter pattern (structured error format)
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QComputed } from '@/index';
import { QRule } from '@/core/decorators/qrule.decorator';

// ─────────────────────────────────────────────────────────────────────────────
// DTOs used across tests (mirror real NestJS DTO structure)
// ─────────────────────────────────────────────────────────────────────────────

interface ICreateUserBody {
	name: string;
	email: string;
	age: number;
	birthDate: string | Date;
	active: boolean;
}

@Quick({ birthDate: Date, active: 'boolean' })
class CreateUserDto extends QModel<ICreateUserBody> {
	@QRule(
		(value: string) => typeof value === 'string' && value.trim().length > 0,
		'Name is required'
	)
	@QRule((value: string) => value.trim().length <= 100, 'Name too long')
	declare name: string;

	@QRule(
		(value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		'Invalid email format'
	)
	declare email: string;

	@QRule((value: number) => value >= 0, 'Age cannot be negative')
	@QRule((value: number) => value <= 130, 'Age must be realistic')
	declare age: number;

	declare birthDate: Date; // will be auto-converted from ISO string
	declare active: boolean; // will be auto-converted from truthy/falsy
}

// ─────────────────────────────────────────────────────────────────────────────
// Nested DTO — Address inside User
// ─────────────────────────────────────────────────────────────────────────────

interface IAddress {
	street: string;
	city: string;
	zip: string;
}

@Quick()
class AddressDto extends QModel<IAddress> {
	@QRule((val: string) => val.trim().length > 0, 'Street is required')
	declare street: string;

	@QRule((val: string) => val.trim().length > 0, 'City is required')
	declare city: string;

	@QRule((val: string) => /^\d{5}$/.test(val), 'ZIP must be 5 digits')
	declare zip: string;
}

interface ICreateOrderBody {
	productId: string;
	quantity: number;
	shippingAddress: IAddress;
}

@Quick({ shippingAddress: AddressDto })
class CreateOrderDto extends QModel<ICreateOrderBody> {
	@QRule((val: string) => val.trim().length > 0, 'Product ID required')
	declare productId: string;

	@QRule((val: number) => val >= 1, 'Quantity must be at least 1')
	@QRule((val: number) => val <= 999, 'Quantity exceeds maximum')
	declare quantity: number;

	declare shippingAddress: AddressDto;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response DTO with @QComputed — API response enrichment
// ─────────────────────────────────────────────────────────────────────────────

interface IUserResponse {
	firstName: string;
	lastName: string;
	birthYear: number;
	role: 'admin' | 'user' | 'guest';
	score: number;
}

@Quick({ birthYear: Number, score: Number })
class UserResponseDto extends QModel<IUserResponse> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;
	declare role: 'admin' | 'user' | 'guest';
	declare score: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return 2026 - this.birthYear;
	}

	@QComputed()
	get isAdmin(): boolean {
		return this.role === 'admin';
	}

	@QComputed()
	get scoreLabel(): string {
		if (this.score >= 90) return 'excellent';
		if (this.score >= 70) return 'good';
		if (this.score >= 50) return 'average';
		return 'poor';
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Async @QRule — simulates DB uniqueness check
// ─────────────────────────────────────────────────────────────────────────────

const REGISTERED_EMAILS = new Set(['taken@example.com', 'admin@app.com']);

async function isEmailAvailable(email: string): Promise<boolean> {
	await Bun.sleep(1); // simulate async DB lookup
	return !REGISTERED_EMAILS.has(email);
}

@Quick()
class RegisterDto extends QModel<{
	username: string;
	email: string;
	password: string;
}> {
	@QRule((val: string) => val.length >= 3, 'Username min 3 chars')
	@QRule(
		(val: string) => /^[a-zA-Z0-9_]+$/.test(val),
		'Username: letters, numbers, underscores only'
	)
	declare username: string;

	@QRule(
		async (value: string) => isEmailAvailable(value),
		'Email already registered'
	)
	declare email: string;

	@QRule((val: string) => val.length >= 8, 'Password min 8 chars')
	@QRule(
		(val: string) => /[A-Z]/.test(val),
		'Password needs uppercase letter'
	)
	@QRule((val: string) => /[0-9]/.test(val), 'Password needs a digit')
	declare password: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulated ValidationPipe (the NestJS pipe logic)
// ─────────────────────────────────────────────────────────────────────────────

interface IValidationError {
	field: string;
	message: string;
	value: unknown;
}

interface IBadRequestBody {
	statusCode: number;
	message: string;
	errors: IValidationError[];
}

function simulatePipeTransform<T extends QModel<object>>(
	DtoClass: new (data: any) => T,
	rawBody: object
): { instance: T } | { error: IBadRequestBody } {
	const instance = new DtoClass(rawBody);
	const result = instance.checkRules();

	if (!result.valid) {
		return {
			error: {
				statusCode: 400,
				message: 'Validation failed',
				errors: result.errors,
			},
		};
	}
	return { instance };
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory repository (simulates a NestJS service with persistence)
// ─────────────────────────────────────────────────────────────────────────────

class UserRepository {
	private readonly store = new Map<string, UserResponseDto>();

	save(id: string, user: UserResponseDto): void {
		this.store.set(id, user);
	}

	findById(id: string): object | null {
		const user = this.store.get(id);
		return user ? user.serialize() : null;
	}

	findAll(): object[] {
		return [...this.store.values()].map((usr) => usr.serialize());
	}
}

// ──────────────────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────────────────

describe('NestJS Pattern: DTO coercion at controller boundary', () => {
	test('converts ISO string to Date automatically', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		expect(dto.birthDate).toBeInstanceOf(Date);
		expect(dto.birthDate.getFullYear()).toBe(1994);
	});

	test('preserves boolean values (JSON body already parses true/false)', () => {
		// In NestJS, the JSON parser delivers proper booleans — no string coercion needed.
		// @Quick({ active: 'boolean' }) validates and passes through real booleans.
		const trueDto = new CreateUserDto({
			name: 'Bob',
			email: 'bob@example.com',
			age: 25,
			birthDate: '2000-01-01T00:00:00.000Z',
			active: true,
		});
		expect(trueDto.active).toBe(true);
		expect(typeof trueDto.active).toBe('boolean');

		const falseDto = new CreateUserDto({
			name: 'Bob',
			email: 'bob@example.com',
			age: 25,
			birthDate: '2000-01-01T00:00:00.000Z',
			active: false,
		});
		expect(falseDto.active).toBe(false);
		expect(typeof falseDto.active).toBe('boolean');
	});

	test('serialize() returns a JSON-safe plain object (controller return)', () => {
		const dto = new CreateUserDto({
			name: 'Charlie',
			email: 'charlie@example.com',
			age: 28,
			birthDate: '1996-03-20T00:00:00.000Z',
			active: true,
		});
		const plain = dto.serialize();
		expect(plain).not.toBeInstanceOf(QModel);
		expect(typeof plain).toBe('object');
		expect(plain.name).toBe('Charlie');
		expect(plain.email).toBe('charlie@example.com');
	});

	test('birthDate is serialized as ISO string (JSON response compatible)', () => {
		const dto = new CreateUserDto({
			name: 'Diana',
			email: 'diana@example.com',
			age: 35,
			birthDate: '1990-07-04T00:00:00.000Z',
			active: false,
		});
		const json = JSON.parse(dto.toJSON());
		expect(typeof json.birthDate).toBe('string');
		expect(json.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}/);
	});
});

describe('NestJS Pattern: @QRule validation', () => {
	test('returns valid=true for a well-formed request body', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15',
			active: true,
		});
		expect(dto.checkRules().valid).toBe(true);
	});

	test('collects all validation errors from a malformed body', () => {
		const dto = new CreateUserDto({
			name: '',
			email: 'not-an-email',
			age: -5,
			birthDate: '1994-06-15',
			active: true,
		});
		const { valid, errors } = dto.checkRules();
		expect(valid).toBe(false);
		expect(errors.length).toBeGreaterThanOrEqual(3);
	});

	test('error object has field, message, value properties (NestJS BadRequestException shape)', () => {
		const dto = new CreateUserDto({
			name: '',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15',
			active: true,
		});
		const { errors } = dto.checkRules();
		const err = errors[0];
		expect(err).toHaveProperty('field');
		expect(err).toHaveProperty('message');
		expect(err).toHaveProperty('value');
	});

	test('identifies the correct failing field', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'bad-email',
			age: 30,
			birthDate: '1994-06-15',
			active: true,
		});
		const { errors } = dto.checkRules();
		expect(errors[0]?.field).toBe('email');
	});

	test('multiple @QRule on same field: all failures collected', () => {
		const dto = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 200, // fails both >= 0 (passes) and <= 130 (fails) — only 1 error
			birthDate: '1994-06-15',
			active: true,
		});
		const { errors } = dto.checkRules();
		const ageErrors = errors.filter((err) => err.field === 'age');
		expect(ageErrors).toHaveLength(1); // only "must be realistic" fails
		expect(ageErrors[0]?.message).toBe('Age must be realistic');
	});

	test('isValid() combines type integrity check + rule validation', () => {
		const good = new CreateUserDto({
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15',
			active: true,
		});
		expect(good.isValid()).toBe(true);

		const bad = new CreateUserDto({
			name: '',
			email: 'bad',
			age: -1,
			birthDate: '1994-06-15',
			active: true,
		});
		expect(bad.isValid()).toBe(false);
	});
});

describe('NestJS Pattern: custom ValidationPipe logic', () => {
	test('pipe returns instance when validation passes', () => {
		const result = simulatePipeTransform(CreateUserDto, {
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15',
			active: true,
		});
		expect('instance' in result).toBe(true);
		if ('instance' in result) {
			expect(result.instance).toBeInstanceOf(CreateUserDto);
		}
	});

	test('pipe returns 400 error when validation fails', () => {
		const result = simulatePipeTransform(CreateUserDto, {
			name: '',
			email: 'bad',
			age: -1,
			birthDate: '1994-06-15',
			active: true,
		});
		expect('error' in result).toBe(true);
		if ('error' in result) {
			expect(result.error.statusCode).toBe(400);
			expect(result.error.message).toBe('Validation failed');
			expect(result.error.errors.length).toBeGreaterThan(0);
		}
	});

	test('pipe-returned instance already has coerced birthDate', () => {
		const result = simulatePipeTransform(CreateUserDto, {
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			birthDate: '1994-06-15T00:00:00.000Z',
			active: true,
		});
		if ('instance' in result) {
			expect(result.instance.birthDate).toBeInstanceOf(Date);
		}
	});
});

describe('NestJS Pattern: @QComputed() in API responses', () => {
	test('computed fields are included in serialize() output', () => {
		const user = new UserResponseDto({
			firstName: 'Jane',
			lastName: 'Doe',
			birthYear: 1990,
			role: 'admin',
			score: 95,
		});
		const response = user.serialize();
		expect(response).toHaveProperty('fullName', 'Jane Doe');
		expect(response).toHaveProperty('age', 36);
		expect(response).toHaveProperty('isAdmin', true);
		expect(response).toHaveProperty('scoreLabel', 'excellent');
	});

	test('computed fields are included in toJSON() output', () => {
		const user = new UserResponseDto({
			firstName: 'Bob',
			lastName: 'Smith',
			birthYear: 1985,
			role: 'user',
			score: 72,
		});
		const json = JSON.parse(user.toJSON());
		expect(json.fullName).toBe('Bob Smith');
		expect(json.age).toBe(41);
		expect(json.isAdmin).toBe(false);
		expect(json.scoreLabel).toBe('good');
	});

	test('computed fields reflect current model state after manual mutation', () => {
		const user = new UserResponseDto({
			firstName: 'Carol',
			lastName: 'Jones',
			birthYear: 2000,
			role: 'guest',
			score: 40,
		});
		// scoreLabel should be 'poor' initially
		expect((user.serialize() as Record<string, unknown>).scoreLabel).toBe(
			'poor'
		);

		// Simulate update
		(user as unknown as Record<string, unknown>).score = 85;
		expect((user.serialize() as Record<string, unknown>).scoreLabel).toBe(
			'good'
		);
	});

	test('stored properties and computed fields both appear in serialize()', () => {
		const user = new UserResponseDto({
			firstName: 'Eve',
			lastName: 'White',
			birthYear: 1998,
			role: 'user',
			score: 55,
		});
		const response = user.serialize();
		// Stored fields
		expect(response).toHaveProperty('firstName', 'Eve');
		expect(response).toHaveProperty('lastName', 'White');
		expect(response).toHaveProperty('birthYear');
		// Computed fields
		expect(response).toHaveProperty('fullName', 'Eve White');
		expect(response).toHaveProperty('age');
	});

	test('plain getter without @QComputed is NOT included in serialize()', () => {
		@Quick()
		class WithPlainGetter extends QModel<{ value: number }> {
			declare value: number;

			// No @QComputed — should NOT appear in serialize()
			get doubled(): number {
				return this.value * 2;
			}
		}

		const obj = new WithPlainGetter({ value: 5 });
		const serialized = obj.serialize();
		expect(serialized).not.toHaveProperty('doubled');
		expect(serialized).toHaveProperty('value', 5);
	});
});

// DTO with all fields explicitly typed — required for full schema generation
interface IProductDto {
	title: string;
	price: number;
	available: boolean;
	createdAt: Date;
}

@Quick({
	title: 'string',
	price: 'number',
	available: 'boolean',
	createdAt: Date,
})
class ProductDto extends QModel<IProductDto> {
	declare title: string;
	declare price: number;
	declare available: boolean;
	declare createdAt: Date;
}

describe('NestJS Pattern: OpenAPI schema generation', () => {
	test('getSchema("openapi") returns an object with "type" and "properties"', () => {
		const schema = ProductDto.getSchema('openapi');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema).toHaveProperty('properties');
	});

	test('all explicitly typed fields appear in openapi properties', () => {
		const schema = ProductDto.getSchema('openapi');
		const props = schema.properties as Record<string, unknown>;
		expect(props).toHaveProperty('title');
		expect(props).toHaveProperty('price');
		expect(props).toHaveProperty('available');
		expect(props).toHaveProperty('createdAt');
	});

	test('Date fields use string type with date-time format in openapi schema', () => {
		const schema = ProductDto.getSchema('openapi');
		const props = schema.properties as Record<
			string,
			Record<string, string>
		>;
		const createdAtSchema = props['createdAt'];
		expect(createdAtSchema?.type).toBe('string');
		expect(createdAtSchema?.format).toBe('date-time');
	});

	test('string fields use type "string" in openapi schema', () => {
		const schema = ProductDto.getSchema('openapi');
		const props = schema.properties as Record<
			string,
			Record<string, string>
		>;
		expect(props['title']?.type).toBe('string');
	});

	test('number fields use type "number" in openapi schema', () => {
		const schema = ProductDto.getSchema('openapi');
		const props = schema.properties as Record<
			string,
			Record<string, string>
		>;
		expect(props['price']?.type).toBe('number');
	});

	test('getSchema("json") returns valid JSON Schema Draft-07 structure', () => {
		const schema = ProductDto.getSchema('json');
		expect(schema).toHaveProperty('$schema');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema).toHaveProperty('properties');
	});

	test('getSchema("ajv") returns AJV-compatible schema', () => {
		const schema = ProductDto.getSchema('ajv');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema).toHaveProperty('properties');
	});
});

describe('NestJS Pattern: async @QRule (DB uniqueness)', () => {
	test('checkRulesAsync() passes for an available email', async () => {
		const dto = new RegisterDto({
			username: 'alice123',
			email: 'new@example.com', // not in REGISTERED_EMAILS
			password: 'Secure1Pass',
		});
		const result = await dto.checkRulesAsync();
		expect(result.valid).toBe(true);
	});

	test('checkRulesAsync() fails for a taken email', async () => {
		const dto = new RegisterDto({
			username: 'alice123',
			email: 'taken@example.com', // IS in REGISTERED_EMAILS
			password: 'Secure1Pass',
		});
		const result = await dto.checkRulesAsync();
		expect(result.valid).toBe(false);
		const emailErrors = result.errors.filter(
			(err) => err.field === 'email'
		);
		expect(emailErrors[0]?.message).toBe('Email already registered');
	});

	test('checkRulesAsync() collects both sync and async failures', async () => {
		const dto = new RegisterDto({
			username: 'ab', // too short (sync rule fails)
			email: 'taken@example.com', // taken (async rule fails)
			password: 'weak', // multiple sync rules fail
		});
		const result = await dto.checkRulesAsync();
		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThanOrEqual(3);
	});

	test('checkRulesAsync() passes completely valid registration data', async () => {
		const dto = new RegisterDto({
			username: 'validUser_99',
			email: 'fresh@example.com',
			password: 'MyStr0ngPass',
		});
		const result = await dto.checkRulesAsync();
		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});
});

describe('NestJS Pattern: nested DTOs', () => {
	test('nested AddressDto is automatically instantiated by @Quick', () => {
		const order = new CreateOrderDto({
			productId: 'PROD-001',
			quantity: 3,
			shippingAddress: {
				street: '123 Main St',
				city: 'Springfield',
				zip: '12345',
			},
		});
		expect(order.shippingAddress).toBeInstanceOf(AddressDto);
	});

	test('nested model rules can be validated independently', () => {
		const order = new CreateOrderDto({
			productId: 'PROD-001',
			quantity: 3,
			shippingAddress: {
				street: '123 Main St',
				city: 'Springfield',
				zip: 'BADZIP', // invalid zip
			},
		});
		const addrResult = order.shippingAddress.checkRules();
		expect(addrResult.valid).toBe(false);
		expect(addrResult.errors[0]?.field).toBe('zip');
	});

	test('nested model serializes correctly inside parent serialize()', () => {
		const order = new CreateOrderDto({
			productId: 'PROD-002',
			quantity: 2,
			shippingAddress: {
				street: '456 Oak Ave',
				city: 'Shelbyville',
				zip: '67890',
			},
		});
		const serialized = order.serialize();
		expect(serialized).toHaveProperty('productId', 'PROD-002');
		expect(serialized).toHaveProperty('shippingAddress');
		const addr = serialized.shippingAddress as Record<string, string>;
		expect(addr.street).toBe('456 Oak Ave');
		expect(addr.zip).toBe('67890');
	});
});

describe('NestJS Pattern: bulk create endpoint (createMany)', () => {
	test('createMany returns { instances, errors } result object', () => {
		const bodies = [
			{
				name: 'Alice',
				email: 'alice@example.com',
				age: 30,
				birthDate: '1994-06-15',
				active: true,
			},
			{
				name: 'Bob',
				email: 'bob@example.com',
				age: 25,
				birthDate: '1999-01-01',
				active: false,
			},
			{
				name: 'Carol',
				email: 'carol@example.com',
				age: 40,
				birthDate: '1984-03-20',
				active: true,
			},
		];
		const { instances, errors } = CreateUserDto.createMany(bodies);
		expect(instances).toHaveLength(3);
		expect(errors).toHaveLength(0);
		expect(instances[0]).toBeInstanceOf(CreateUserDto);
		expect(instances[1]?.birthDate).toBeInstanceOf(Date);
	});

	test('invalid entries land in errors[], valid ones in instances[]', () => {
		const bodies = [
			{
				name: 'Alice',
				email: 'alice@example.com',
				age: 30,
				birthDate: '1994-06-15',
				active: true,
			},
			{
				name: '',
				email: 'bad-email',
				age: -1,
				birthDate: '1994-06-15',
				active: true,
			},
		];
		const { instances, errors } = CreateUserDto.createMany(bodies);
		expect(instances).toHaveLength(1); // only Alice passes
		expect(errors).toHaveLength(1); // Bob fails
		expect(instances[0]?.name).toBe('Alice');
		expect(errors[0]?.index).toBe(1);
	});

	test('bulk serialize: instances.map serialize() for JSON response', () => {
		const bodies = [
			{
				name: 'Alice',
				email: 'a@a.com',
				age: 30,
				birthDate: '1994-06-15',
				active: true,
			},
			{
				name: 'Bob',
				email: 'b@b.com',
				age: 25,
				birthDate: '1999-01-01',
				active: false,
			},
		];
		const { instances } = CreateUserDto.createMany(bodies);
		const response = instances.map((dto) => dto.serialize());
		expect(Array.isArray(response)).toBe(true);
		expect(response[0]?.name).toBe('Alice');
		expect(response[1]?.name).toBe('Bob');
	});

	test('errors[] contains index, instance, and errors array (NestJS bulk error shape)', () => {
		const bodies = [
			{
				name: 'Alice',
				email: 'alice@example.com',
				age: 30,
				birthDate: '1994-06-15',
				active: true,
			},
			{
				name: '',
				email: 'bad',
				age: -1,
				birthDate: '1994-06-15',
				active: true,
			},
		];
		const { errors } = CreateUserDto.createMany(bodies);
		expect(errors[0]).toHaveProperty('index', 1);
		expect(errors[0]).toHaveProperty('instance');
		expect(errors[0]).toHaveProperty('errors');
		expect(Array.isArray(errors[0]?.errors)).toBe(true);
	});
});

describe('NestJS Pattern: repository / service layer', () => {
	let repo: UserRepository;

	beforeEach(() => {
		repo = new UserRepository();
	});

	test('saved model is returned as plain object by findById', () => {
		const user = new UserResponseDto({
			firstName: 'Alice',
			lastName: 'Smith',
			birthYear: 1990,
			role: 'admin',
			score: 92,
		});
		repo.save('u1', user);

		const found = repo.findById('u1');
		expect(found).not.toBeNull();
		expect(found).not.toBeInstanceOf(QModel);
		expect((found as Record<string, unknown>).fullName).toBe('Alice Smith');
	});

	test('findAll returns array of plain objects with computed fields', () => {
		repo.save(
			'u1',
			new UserResponseDto({
				firstName: 'A',
				lastName: 'B',
				birthYear: 1990,
				role: 'user',
				score: 60,
			})
		);
		repo.save(
			'u2',
			new UserResponseDto({
				firstName: 'C',
				lastName: 'D',
				birthYear: 2000,
				role: 'admin',
				score: 90,
			})
		);

		const all = repo.findAll();
		expect(all).toHaveLength(2);
		expect((all[0] as Record<string, unknown>).fullName).toBeDefined();
		expect((all[1] as Record<string, unknown>).isAdmin).toBe(true);
	});

	test('findById returns null for unknown id', () => {
		expect(repo.findById('nonexistent')).toBeNull();
	});
});

describe('NestJS Pattern: response interceptor (auto-serialize)', () => {
	test('serialize() returns same shape as JSON.parse(toJSON())', () => {
		const user = new UserResponseDto({
			firstName: 'Test',
			lastName: 'User',
			birthYear: 1985,
			role: 'user',
			score: 75,
		});
		const fromSerialize = user.serialize() as Record<string, unknown>;
		const fromToJSON = JSON.parse(user.toJSON()) as Record<string, unknown>;
		expect(fromSerialize.fullName).toBe(fromToJSON.fullName);
		expect(fromSerialize.age).toBe(fromToJSON.age);
		expect(fromSerialize.isAdmin).toBe(fromToJSON.isAdmin);
	});

	test('serialize() is safe to call in Express/Fastify response pipeline', () => {
		// Verify: no circular references, no class instances, JSON.stringify-safe
		const user = new UserResponseDto({
			firstName: 'Pipe',
			lastName: 'Test',
			birthYear: 1992,
			role: 'guest',
			score: 45,
		});
		expect(() => JSON.stringify(user.serialize())).not.toThrow();
	});
});
