// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * GraphQL / Apollo Server Integration Patterns — QuickModel
 *
 * Covers: Input DTO as resolver arg, output serialization, mutation + async rules,
 *         @QComputed in response, error mapping, createMany for lists,
 *         validation middleware pattern (GraphQL Yoga)
 *
 * No graphql/apollo packages imported — pure QModel logic simulating resolver context.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed, QGroup } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface ICreateUserInput {
	name: string;
	email: string;
	age: number;
	role: string;
}

interface IUpdatePostInput {
	title: string;
	body: string;
	published: boolean;
}

interface IUserResponse {
	id: number;
	name: string;
	email: string;
	age: number;
	role: string;
	bio: string;
}

interface ICommentInput {
	postId: number;
	authorId: number;
	text: string;
}

@Quick(
	{ name: 'string', email: 'string', age: 'number', role: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserInput extends QModel<ICreateUserInput> {
	@QGroup('identity')
	@QField({ widget: 'input', label: 'Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name is too short')
	@QRule(
		(val: string) => /^[\w\s'-]+$/u.test(val),
		'Name contains invalid chars'
	)
	declare name: string;

	@QGroup('identity')
	@QField({ widget: 'input', label: 'Email', required: true })
	@QRule(
		(val: string) => val.includes('@') && val.includes('.'),
		'Invalid email format'
	)
	declare email: string;

	@QGroup('profile')
	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 0 && val <= 120, 'Age out of range')
	declare age: number;

	@QGroup('profile')
	@QField({ widget: 'input', label: 'Role', required: true })
	@QRule(
		(val: string) => ['admin', 'user', 'guest'].includes(val),
		'Invalid role value'
	)
	declare role: string;
}

@Quick(
	{ title: 'string', body: 'string', published: 'boolean' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UpdatePostInput extends QModel<IUpdatePostInput> {
	@QField({ widget: 'input', label: 'Title', required: true })
	@QRule((val: string) => val.trim().length >= 3, 'Title too short')
	declare title: string;

	@QField({ widget: 'input', label: 'Body', required: true })
	@QRule((val: string) => val.trim().length >= 10, 'Body too short')
	declare body: string;

	@QField({ label: 'Published', widget: 'checkbox' })
	declare published: boolean;
}

@Quick(
	{
		id: 'number',
		name: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
		bio: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserResponse extends QModel<IUserResponse> {
	@QField({ widget: 'input', label: 'ID' })
	declare id: number;

	@QField({ widget: 'input', label: 'Name' })
	declare name: string;

	@QField({ widget: 'input', label: 'Email' })
	declare email: string;

	@QField({ widget: 'input', label: 'Age' })
	declare age: number;

	@QField({ widget: 'input', label: 'Role' })
	declare role: string;

	@QField({ widget: 'input', label: 'Bio' })
	declare bio: string;

	@QComputed()
	get displayName(): string {
		return `${this.name} (${this.role})`;
	}

	@QComputed()
	get isAdmin(): boolean {
		return this.role === 'admin';
	}

	@QComputed()
	get initials(): string {
		return this.name
			.split(' ')
			.map((word) => word[0] ?? '')
			.join('')
			.toUpperCase();
	}
}

@Quick(
	{ postId: 'number', authorId: 'number', text: 'string' },
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CommentInput extends QModel<ICommentInput> {
	@QField({ widget: 'input', label: 'Post ID', required: true })
	declare postId: number;

	@QField({ widget: 'input', label: 'Author ID', required: true })
	declare authorId: number;

	@QField({ widget: 'input', label: 'Text', required: true })
	@QRule((val: string) => val.trim().length >= 1, 'Comment cannot be empty')
	@QRule((val: string) => val.length <= 2000, 'Comment too long')
	declare text: string;
}

// ---------------------------------------------------------------------------
// Simulated GraphQL context helpers
// ---------------------------------------------------------------------------

/** Simulates a GraphQL resolver error (without importing graphql package) */
class GraphQLError extends Error {
	extensions: Record<string, unknown>;

	constructor(message: string, extensions: Record<string, unknown> = {}) {
		super(message);
		this.extensions = extensions;
	}
}

/** Maps qCheckRules errors to GraphQL UserError pattern */
function toUserErrors(
	errors: Array<{ field: string; message: string }>
): Array<{ field: string; message: string }> {
	return errors.map(({ field, message }) => ({ field, message }));
}

/** Simulated in-memory user store */
const userStore = new Map<number, IUserResponse>();
let nextId = 100;

// ---------------------------------------------------------------------------
// 1. Input DTO — QModel as resolver arg
// ---------------------------------------------------------------------------

describe('Input DTO — QModel as resolver arg', () => {
	test('new CreateUserInput(args.input) coerces resolver arguments', () => {
		// Simulates: args.input arriving as plain object from GraphQL runtime
		const args = {
			input: {
				name: 'Alice Smith',
				email: 'alice@example.com',
				age: 30,
				role: 'user',
			},
		};
		const dto = new CreateUserInput(args.input);
		expect(dto.name).toBe('Alice Smith');
		expect(dto.email).toBe('alice@example.com');
		expect(dto.age).toBe(30);
		expect(dto.role).toBe('user');
	});

	test('unknown fields from resolver args are stripped', () => {
		const args = {
			input: {
				name: 'Bob',
				email: 'bob@x.com',
				age: 25,
				role: 'user',
				__resolveInfo: 'internal',
				_clientMutationId: 'abc123',
			},
		};
		const dto = new CreateUserInput(args.input as ICreateUserInput);
		expect(
			(dto as unknown as Record<string, unknown>)['__resolveInfo'] // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
		expect(
			(dto as unknown as Record<string, unknown>)['_clientMutationId'] // @quickmodel-rule-ignore: no-as-unknown
		).toBeUndefined();
	});

	test('string numbers coerced via loose strategy', () => {
		const dto = new CreateUserInput({
			name: 'Carol',
			email: 'c@c.com',
			age: '28' as unknown as number, // @quickmodel-rule-ignore: no-as-unknown
			role: 'guest',
		});
		expect(typeof dto.age).toBe('number');
		expect(dto.age).toBe(28);
	});

	test('checkRules() validates input before persisting', () => {
		const dto = new CreateUserInput({
			name: 'Dan',
			email: 'dan@example.com',
			age: 30,
			role: 'user',
		});
		const { valid } = qCheckRules(dto);
		expect(valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. Mutation resolver — checkRules() + error mapping
// ---------------------------------------------------------------------------

describe('Mutation resolver — validation and error mapping', () => {
	beforeEach(() => {
		userStore.clear();
		nextId = 100;
	});

	test('valid mutation input persists and returns DTO', () => {
		const input = {
			name: 'Eve Brown',
			email: 'eve@example.com',
			age: 28,
			role: 'user',
		};
		const dto = new CreateUserInput(input);
		const { valid } = qCheckRules(dto);
		expect(valid).toBe(true);

		// Simulated persist
		const saved: IUserResponse = {
			id: nextId++,
			bio: '',
			...dto.toInterface(),
		};
		userStore.set(saved.id, saved);
		const response = new UserResponse(saved);
		expect(response.id).toBe(100);
		expect(response.name).toBe('Eve Brown');
	});

	test('invalid email throws GraphQLError with field errors', () => {
		const dto = new CreateUserInput({
			name: 'Frank',
			email: 'not-email',
			age: 25,
			role: 'user',
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);

		const gqlError = new GraphQLError('Validation failed', {
			code: 'BAD_USER_INPUT',
			errors: toUserErrors(errors),
		});
		expect(gqlError.extensions['code']).toBe('BAD_USER_INPUT');
		const fieldErrors = gqlError.extensions['errors'] as Array<{
			field: string;
		}>;
		expect(fieldErrors.some((err) => err.field === 'email')).toBe(true);
	});

	test('invalid role throws error with role field', () => {
		const dto = new CreateUserInput({
			name: 'Grace',
			email: 'grace@x.com',
			age: 30,
			role: 'superuser',
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'role')).toBe(true);
	});

	test('multiple validation errors are collected', () => {
		const dto = new CreateUserInput({
			name: 'X',
			email: 'bad',
			age: -5,
			role: 'root',
		});
		const { valid, errors } = qCheckRules(dto);
		expect(valid).toBe(false);
		expect(errors.length).toBeGreaterThanOrEqual(2);
	});

	test('async mutation: checkRulesAsync() before persist', async () => {
		const knownEmails = new Set(['taken@db.io']);

		@Quick(
			{ name: 'string', email: 'string', age: 'number', role: 'string' },
			{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
		)
		class UniqueInput extends QModel<ICreateUserInput> {
			@QField({ widget: 'input', label: 'Name', required: true })
			declare name: string;

			@QField({ widget: 'input', label: 'Email', required: true })
			@QRule(
				(val: string) => Promise.resolve(!knownEmails.has(val)),
				'Email already taken'
			)
			declare email: string;

			@QField({ widget: 'input', label: 'Age' })
			declare age: number;

			@QField({ widget: 'input', label: 'Role', required: true })
			declare role: string;
		}

		const available = new UniqueInput({
			name: 'New',
			email: 'new@db.io',
			age: 25,
			role: 'user',
		});
		const taken = new UniqueInput({
			name: 'Dup',
			email: 'taken@db.io',
			age: 25,
			role: 'user',
		});

		expect((await qCheckRulesAsync(available)).valid).toBe(true);
		const result = await qCheckRulesAsync(taken);
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('email');
	});
});

// ---------------------------------------------------------------------------
// 3. Output serialization — serialize() as GraphQL response
// ---------------------------------------------------------------------------

describe('Output serialization — serialize() as GraphQL response', () => {
	test('dto.$qm.serialize() returns plain JSON-safe object', () => {
		const dto = new UserResponse({
			id: 1,
			name: 'Helen',
			email: 'h@x.com',
			age: 32,
			role: 'admin',
			bio: 'Dev',
		});
		const serialized = dto.$qm.serialize();
		expect(typeof serialized).toBe('object');
		expect(serialized).not.toBeInstanceOf(QModel);
	});

	test('serialize() includes all scalar fields', () => {
		const dto = new UserResponse({
			id: 2,
			name: 'Ivan',
			email: 'ivan@x.com',
			age: 25,
			role: 'user',
			bio: '',
		});
		const out = dto.$qm.serialize() as Record<string, unknown>;
		expect(out['id']).toBe(2);
		expect(out['name']).toBe('Ivan');
		expect(out['email']).toBe('ivan@x.com');
	});

	test('@QComputed displayName is available in resolver logic', () => {
		const dto = new UserResponse({
			id: 3,
			name: 'Jane Doe',
			email: 'j@x.com',
			age: 40,
			role: 'admin',
			bio: '',
		});
		expect(dto.displayName).toBe('Jane Doe (admin)');
	});

	test('@QComputed isAdmin returns true for admin role', () => {
		const dto = new UserResponse({
			id: 4,
			name: 'Admin',
			email: 'a@x.com',
			age: 35,
			role: 'admin',
			bio: '',
		});
		expect(dto.isAdmin).toBe(true);
	});

	test('@QComputed initials extracted from name', () => {
		const dto = new UserResponse({
			id: 5,
			name: 'John Paul Smith',
			email: 'j@x.com',
			age: 30,
			role: 'user',
			bio: '',
		});
		expect(dto.initials).toBe('JPS');
	});
});

// ---------------------------------------------------------------------------
// 4. createMany() in list query — bulk coercion from DB
// ---------------------------------------------------------------------------

describe('createMany() in list query — bulk coercion from DB resolver', () => {
	test('createMany() coerces array of raw DB rows for GraphQL list response', () => {
		const dbRows = [
			{
				id: 1,
				name: 'Alice',
				email: 'a@x.com',
				age: '28',
				role: 'user',
				bio: '',
			},
			{
				id: 2,
				name: 'Bob',
				email: 'b@x.com',
				age: '33',
				role: 'admin',
				bio: '',
			},
			{
				id: 3,
				name: 'Carol',
				email: 'c@x.com',
				age: '22',
				role: 'guest',
				bio: '',
			},
		];
		const { instances, errors } = UserResponse.createMany(dbRows as any[]);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
		expect(instances[0]?.age).toBe(28);
		expect(instances[1]?.isAdmin).toBe(true);
	});

	test('createMany() maps each instance to serialize() for JSON response', () => {
		const rows = [
			{
				id: 10,
				name: 'Dave',
				email: 'd@x.com',
				age: 40,
				role: 'user',
				bio: 'Dev',
			},
			{
				id: 11,
				name: 'Eve',
				email: 'e@x.com',
				age: 30,
				role: 'admin',
				bio: '',
			},
		];
		const { instances } = UserResponse.createMany(rows as any[]);
		const response = instances.map((dto) => dto.$qm.serialize());
		expect(response.length).toBe(2);
		expect((response[0] as Record<string, unknown>)['name']).toBe('Dave');
	});

	test('createMany() returns all parseable instances and separates errors', () => {
		// All three rows are parseable (UserResponse uses loose coercion)
		// — createMany errors come from items that cannot be constructed at all
		const rows = [
			{
				id: 1,
				name: 'OK',
				email: 'ok@x.com',
				age: 25,
				role: 'user',
				bio: '',
			},
			{
				id: 2,
				name: 'Good',
				email: 'good@x.com',
				age: 30,
				role: 'guest',
				bio: '',
			},
			{
				id: 3,
				name: 'Also',
				email: 'also@x.com',
				age: 22,
				role: 'admin',
				bio: '',
			},
		];
		const { instances, errors } = UserResponse.createMany(rows as any[]);
		expect(instances.length).toBe(3);
		expect(errors.length).toBe(0);
		// Each instance is a valid UserResponse DTO
		expect(instances[0]).toBeInstanceOf(UserResponse);
	});
});

// ---------------------------------------------------------------------------
// 5. copy() + updatePost mutation
// ---------------------------------------------------------------------------

describe('copy() in update mutation resolver', () => {
	test('copy() creates immutable patch for update mutation', () => {
		const post = new UpdatePostInput({
			title: 'Hello World',
			body: 'Initial body text here',
			published: false,
		});
		const updated = post.$qm.copy({
			title: 'Updated Title',
			published: true,
		});
		expect(updated.title).toBe('Updated Title');
		expect(updated.published).toBe(true);
		expect(updated.body).toBe('Initial body text here');
		expect(post.title).toBe('Hello World'); // original unchanged
	});

	test('copy() result passes checkRules() before persisting update', () => {
		const post = new UpdatePostInput({
			title: 'Original',
			body: 'Original body content test',
			published: false,
		});
		const updated = post.$qm.copy({
			title: 'New Valid Title',
			body: 'Updated body content here',
		});
		const { valid } = qCheckRules(updated);
		expect(valid).toBe(true);
	});

	test('copy() with invalid patch fails checkRules()', () => {
		const post = new UpdatePostInput({
			title: 'Original',
			body: 'Valid body content',
			published: false,
		});
		const bad = post.$qm.copy({ title: 'AB' }); // too short
		const { valid, errors } = qCheckRules(bad);
		expect(valid).toBe(false);
		expect(errors.some((err) => err.field === 'title')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 6. Introspection — getSchema() for GraphQL schema tools
// ---------------------------------------------------------------------------

describe('getSchema() for GraphQL tooling / schema documentation', () => {
	test('getSchema("json") works on input type DTO', () => {
		const schema = CreateUserInput.getSchema('json');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema).toHaveProperty('properties');
	});

	test('getSchema("openapi") works on response type DTO', () => {
		const schema = UserResponse.getSchema('openapi');
		expect(schema).toHaveProperty('type', 'object');
		expect(schema.properties).toHaveProperty('name');
		expect(schema.properties).toHaveProperty('email');
	});
});

// ---------------------------------------------------------------------------
// 7. GraphQL Yoga useValidation-style middleware
// ---------------------------------------------------------------------------

describe('Validation middleware pattern (GraphQL Yoga useValidation)', () => {
	/**
	 * Simulates a useValidation plugin that validates all input DTOs before resolver execution.
	 * In Yoga/Apollo, this is done via a plugin or context middleware.
	 */
	function validateInput<TInput extends Record<string, unknown>>(
		DtoClass: { new (data: TInput): QModel<TInput> },
		input: TInput
	): {
		dto: QModel<TInput>;
		errors: Array<{ field: string; message: string }>;
	} {
		const dto = new DtoClass(input);
		const { errors } = qCheckRules(dto);
		return { dto, errors };
	}

	test('validateInput returns empty errors for valid input', () => {
		const { errors } = validateInput(CreateUserInput, {
			name: 'Alice',
			email: 'alice@example.com',
			age: 30,
			role: 'user',
		});
		expect(errors.length).toBe(0);
	});

	test('validateInput returns field errors for invalid input', () => {
		const { errors } = validateInput(CreateUserInput, {
			name: 'A',
			email: 'not-email',
			age: 200,
			role: 'superadmin',
		});
		expect(errors.length).toBeGreaterThan(0);
		const fields = errors.map((err) => err.field);
		expect(fields).toContain('name');
		expect(fields).toContain('email');
	});

	test('validateInput works for CommentInput', () => {
		const { errors } = validateInput(CommentInput, {
			postId: 1,
			authorId: 2,
			text: 'Great post!',
		});
		expect(errors.length).toBe(0);
	});

	test('empty comment text fails validation', () => {
		const { errors } = validateInput(CommentInput, {
			postId: 1,
			authorId: 2,
			text: '   ',
		});
		expect(errors.some((err) => err.field === 'text')).toBe(true);
	});
});
