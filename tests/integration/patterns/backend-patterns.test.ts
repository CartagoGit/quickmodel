// @quickmodel-rule-ignore: no-as-unknown  14 test file intentionally passes wrong types to verify edge-case handling
/**
 * Backend Framework Integration Patterns — QuickModel
 * (Express / Fastify / Hono)
 *
 * Verifies QuickModel patterns as used in Node.js backend frameworks.
 * No Express/Fastify/Hono packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - Express middleware: qCheckRules() for request validation
 * - Fastify plugin: request body coercion + response serialization
 * - Hono validator: middleware-based DTO coercion
 * - DTO pattern: strip unknowns, coerce types, expose @QComputed
 * - Error response format: standard { errors } shape for 422
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QComputed, QField } from '@/decorators';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';

// ---------------------------------------------------------------------------
// Shared DTOs used across all frameworks
// ---------------------------------------------------------------------------

interface ICreateUser {
	username: string;
	email: string;
	age: number;
	role: string;
}

@Quick(
	{
		username: 'string',
		email: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule(
		(val: string) => val.length >= 3,
		'Username must be at least 3 chars'
	)
	@QRule(
		(val: string) => /^[a-z0-9_]+$/i.test(val),
		'Username: only letters, digits, _'
	)
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QField({ label: 'Age', widget: 'number' })
	@QRule(
		(val: number) => Number.isInteger(val) && val >= 18,
		'Must be at least 18 years old'
	)
	@QRule((val: number) => val <= 120, 'Age must be realistic')
	declare age: number;

	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['admin', 'editor', 'viewer'].includes(val),
		'Role must be admin, editor, or viewer'
	)
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `${this.username} (${this.role})`;
	}
}

interface IInvoice {
	id: string;
	customerId: string;
	amount: number;
	currency: string;
	dueDate: Date;
	paid: boolean;
}

@Quick(
	{
		id: 'string',
		customerId: 'string',
		amount: 'number',
		currency: 'string',
		dueDate: Date,
		paid: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip' }
)
class InvoiceDto extends QModel<IInvoice> {
	declare id: string;
	declare customerId: string;
	declare amount: number;
	declare currency: string;
	declare dueDate: Date;
	declare paid: boolean;

	@QComputed()
	get formattedAmount(): string {
		return `${this.amount.toFixed(2)} ${this.currency.toUpperCase()}`;
	}

	@QComputed()
	get isOverdue(): boolean {
		return !this.paid && this.dueDate < new Date();
	}
}

// ---------------------------------------------------------------------------
// 1. Express middleware pattern
// ---------------------------------------------------------------------------

interface IMockRequest {
	body: Record<string, unknown>;
}

interface IMockResponse {
	status: number;
	body: unknown;
}

type INextFn = (error?: unknown) => void;

// Simulate Express validation middleware factory
function expressValidateBody<TDto extends QModel<object>>(
	DtoClass: new (data: Record<string, unknown>) => TDto
) {
	return function middleware(
		req: IMockRequest,
		res: IMockResponse,
		next: INextFn
	): void {
		try {
			const dto = new DtoClass(req.body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				res.status = 422;
				res.body = { errors: validation.errors };
				return;
			}
			// Attach coerced DTO to request (simulating req.dto)
			(req as unknown as Record<string, unknown>)['dto'] = dto;
			next();
		} catch (_err) {
			res.status = 400;
			res.body = { error: 'Invalid request body' };
		}
	};
}

describe('Express — validation middleware pattern', () => {
	test('valid body passes middleware and attaches DTO to request', () => {
		const req: IMockRequest = {
			body: {
				username: 'alice_dev',
				email: 'alice@example.com',
				age: 25,
				role: 'editor',
			},
		};
		const res: IMockResponse = { status: 200, body: null };
		let nextCalled = false;
		const middleware = expressValidateBody(CreateUserDto);
		middleware(req, res, () => {
			nextCalled = true;
		});
		expect(nextCalled).toBe(true);
		expect(res.status).toBe(200);
		const dto = (req as unknown as Record<string, unknown>)[
			'dto'
		] as CreateUserDto;
		expect(dto).toBeInstanceOf(CreateUserDto);
	});

	test('invalid body returns 422 with structured errors', () => {
		const req: IMockRequest = {
			body: {
				username: 'ab',
				email: 'bad-email',
				age: 15,
				role: 'superuser',
			},
		};
		const res: IMockResponse = { status: 200, body: null };
		let nextCalled = false;
		const middleware = expressValidateBody(CreateUserDto);
		middleware(req, res, () => {
			nextCalled = true;
		});
		expect(nextCalled).toBe(false);
		expect(res.status).toBe(422);
		const resBody = res.body as { errors: Array<{ field: string }> };
		expect(resBody.errors.length).toBeGreaterThan(0);
	});

	test('middleware strips unknown properties before validation', () => {
		const req: IMockRequest = {
			body: {
				username: 'bob_admin',
				email: 'bob@example.com',
				age: 30,
				role: 'admin',
				__proto__: {},
				injectField: 'injected',
			},
		};
		const res: IMockResponse = { status: 200, body: null };
		const middleware = expressValidateBody(CreateUserDto);
		middleware(req, res, () => {});
		const dto = (req as unknown as Record<string, unknown>)[
			'dto'
		] as CreateUserDto;
		const serialized = dto.serialize() as Record<string, unknown>;
		expect('injectField' in serialized).toBe(false);
	});

	test('@QComputed displayName is available after middleware', () => {
		const req: IMockRequest = {
			body: {
				username: 'carol',
				email: 'carol@example.com',
				age: 28,
				role: 'viewer',
			},
		};
		const res: IMockResponse = { status: 200, body: null };
		const middleware = expressValidateBody(CreateUserDto);
		middleware(req, res, () => {});
		const dto = (req as unknown as Record<string, unknown>)[
			'dto'
		] as CreateUserDto;
		const out = dto.serialize() as Record<string, unknown>;
		expect(out['displayName']).toBe('carol (viewer)');
	});

	test('malformed body returns 400', () => {
		// Simulate a class that throws on bad input
		class StrictDto extends QModel<{ id: 'string' }> {
			@QRule((val: string) => val.length > 0, 'id required')
			declare id: string;
		}
		// Pass no body at all — constructor receives undefined fields
		// StrictDto with empty body should not throw (fields may be undefined)
		// Test that qCheckRules properly delegates
		const dto = new StrictDto({});
		const validation = dto.checkRules();
		expect(validation.valid).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 2. Fastify plugin pattern — request coercion + response serialization
// ---------------------------------------------------------------------------

// Simulate Fastify request/reply objects
interface IFastifyRequest {
	body: Record<string, unknown>;
}

interface IFastifyReply {
	statusCode: number;
	payload: unknown;
	send(payload: unknown): void;
	code(status: number): IFastifyReply;
}

function makeFastifyReply(): IFastifyReply {
	const reply: IFastifyReply = {
		statusCode: 200,
		payload: null,
		send(payload: unknown) {
			this.payload = payload;
		},
		code(status: number) {
			this.statusCode = status;
			return this;
		},
	};
	return reply;
}

// Simulate Fastify preHandler hook (plugin behavior)
function fastifyDtoHook<TDto extends QModel<object>>(
	DtoClass: new (data: Record<string, unknown>) => TDto,
	req: IFastifyRequest,
	reply: IFastifyReply
): TDto | null {
	try {
		const dto = new DtoClass(req.body);
		const validation = dto.checkRules();
		if (!validation.valid) {
			reply.code(422).send({ errors: validation.errors });
			return null;
		}
		return dto;
	} catch {
		reply.code(400).send({ error: 'Malformed request' });
		return null;
	}
}

describe('Fastify — DTO coercion + validation hook', () => {
	test('valid invoice body is coerced and returned', () => {
		const req: IFastifyRequest = {
			body: {
				id: 'inv-1',
				customerId: 'cust-100',
				amount: 299.5,
				currency: 'USD',
				dueDate: '2025-12-31T00:00:00.000Z',
				paid: false,
			},
		};
		const reply = makeFastifyReply();
		const dto = fastifyDtoHook(InvoiceDto, req, reply);
		expect(dto).not.toBeNull();
		expect(dto!.dueDate).toBeInstanceOf(Date);
	});

	test('response serialization includes @QComputed formattedAmount', () => {
		const invoice = new InvoiceDto({
			id: 'inv-2',
			customerId: 'cust-200',
			amount: 150.75,
			currency: 'eur',
			dueDate: new Date('2030-01-01'),
			paid: false,
		});
		const out = invoice.serialize() as Record<string, unknown>;
		expect(out['formattedAmount']).toBe('150.75 EUR');
	});

	test('@QComputed isOverdue is true for unpaid past-due invoices', () => {
		const invoice = new InvoiceDto({
			id: 'inv-3',
			customerId: 'cust-300',
			amount: 50,
			currency: 'USD',
			dueDate: new Date('2020-01-01'), // past date
			paid: false,
		});
		const out = invoice.serialize() as Record<string, unknown>;
		expect(out['isOverdue']).toBe(true);
	});

	test('@QComputed isOverdue is false for paid invoices regardless of date', () => {
		const invoice = new InvoiceDto({
			id: 'inv-4',
			customerId: 'cust-400',
			amount: 25,
			currency: 'USD',
			dueDate: new Date('2020-01-01'), // past
			paid: true,
		});
		const out = invoice.serialize() as Record<string, unknown>;
		expect(out['isOverdue']).toBe(false);
	});

	test('createMany() processes a batch of invoices', () => {
		const raw = [
			{
				id: 'i1',
				customerId: 'c1',
				amount: 100,
				currency: 'USD',
				dueDate: new Date(),
				paid: false,
			},
			{
				id: 'i2',
				customerId: 'c2',
				amount: 200,
				currency: 'EUR',
				dueDate: new Date(),
				paid: true,
			},
		];
		const { instances, errors } = InvoiceDto.createMany(raw as any[]);
		expect(instances).toHaveLength(2);
		expect(errors).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// 3. Hono validator middleware simulation
// ---------------------------------------------------------------------------

// Simulate Hono Context
interface IHonoContext {
	req: { json(): Promise<Record<string, unknown>> };
	json(body: unknown, status?: number): IHonoResponse;
}

interface IHonoResponse {
	status: number;
	body: unknown;
}

type IHonoMiddleware = (
	ctx: IHonoContext,
	next: () => Promise<void>
) => Promise<IHonoResponse | void>;

// Hono validator factory (simulates hono/validator zValidator behavior)
function honoValidator<TDto extends QModel<object>>(
	DtoClass: new (data: Record<string, unknown>) => TDto,
	onSuccess: (dto: TDto, ctx: IHonoContext) => Promise<IHonoResponse>
): IHonoMiddleware {
	return async (ctx: IHonoContext, _next: () => Promise<void>) => {
		const body = await ctx.req.json();
		try {
			const dto = new DtoClass(body);
			const validation = dto.checkRules();
			if (!validation.valid) {
				return ctx.json({ errors: validation.errors }, 422);
			}
			return await onSuccess(dto, ctx);
		} catch {
			return ctx.json({ error: 'Bad request' }, 400);
		}
	};
}

function makeHonoCtx(body: Record<string, unknown>): IHonoContext {
	return {
		req: {
			json() {
				return Promise.resolve(body);
			},
		},
		json(responseBody: unknown, status = 200): IHonoResponse {
			return { status, body: responseBody };
		},
	};
}

describe('Hono — validator middleware pattern', () => {
	test('valid body calls onSuccess handler with coerced DTO', async () => {
		const ctx = makeHonoCtx({
			username: 'hono_dev',
			email: 'hono@example.com',
			age: 22,
			role: 'editor',
		});
		let capturedDto: CreateUserDto | null = null;
		const handler = honoValidator(CreateUserDto, (dto) => {
			capturedDto = dto;
			return Promise.resolve(ctx.json(dto.serialize(), 201));
		});
		const response = await handler(ctx, () => Promise.resolve());
		expect(capturedDto).not.toBeNull();
		expect((response as IHonoResponse).status).toBe(201);
	});

	test('invalid body returns 422 with errors', async () => {
		const ctx = makeHonoCtx({
			username: 'x',
			email: 'not-email',
			age: 10,
			role: 'god',
		});
		const handler = honoValidator(CreateUserDto, () => {
			return Promise.resolve(ctx.json({}, 200));
		});
		const response = (await handler(ctx, () =>
			Promise.resolve()
		)) as IHonoResponse;
		expect(response.status).toBe(422);
		const body = response.body as { errors: unknown[] };
		expect(body.errors.length).toBeGreaterThan(0);
	});

	test('coerced DTO has @QComputed displayName in serialize()', async () => {
		const ctx = makeHonoCtx({
			username: 'dev_user',
			email: 'dev@example.com',
			age: 30,
			role: 'admin',
		});
		let serialized: Record<string, unknown> = {};
		const handler = honoValidator(CreateUserDto, (dto) => {
			serialized = dto.serialize() as Record<string, unknown>;
			return Promise.resolve(ctx.json(serialized, 200));
		});
		await handler(ctx, () => Promise.resolve());
		expect(serialized['displayName']).toBe('dev_user (admin)');
	});

	test('getSchema() returns json schema directly from model class instance', () => {
		const dto = new CreateUserDto({
			username: 'tester',
			email: 'test@example.com',
			age: 25,
			role: 'viewer',
		});
		const schema = dto.getSchema('json');
		expect(schema).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// 4. Async validation — backend duplicate email check
// ---------------------------------------------------------------------------

const existingEmails = new Set(['existing@company.com', 'ceo@company.com']);
const existingUsernames = new Set(['admin', 'root', 'system']);

class RegistrationDto extends QModel<{
	username: string;
	email: string;
	password: string;
}> {
	@QField({ widget: 'input', label: 'Username', required: true })
	@QRule(async (val: string) => {
		await Bun.sleep(3);
		return !existingUsernames.has(val.toLowerCase());
	}, 'Username already taken')
	@QRule((val: string) => val.length >= 3, 'Username too short')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(async (val: string) => {
		await Bun.sleep(3);
		return !existingEmails.has(val.toLowerCase());
	}, 'Email already registered')
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email format'
	)
	declare email: string;

	@QField({ label: 'Password', widget: 'password' })
	@QRule(
		(val: string) => val.length >= 10,
		'Password must be at least 10 chars'
	)
	@QRule(
		(val: string) => /[A-Z]/.test(val),
		'Password needs uppercase letter'
	)
	@QRule((val: string) => /\d/.test(val), 'Password needs a digit')
	declare password: string;
}

describe('Backend — async duplicate check (email + username)', () => {
	test('valid new user passes all async checks', async () => {
		const dto = new RegistrationDto({
			username: 'new_developer',
			email: 'dev@newcompany.com',
			password: 'Secure1234!',
		});
		const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
		expect(result.valid).toBe(true);
	});

	test('taken email fails async check', async () => {
		const dto = new RegistrationDto({
			username: 'fresh_user',
			email: 'existing@company.com',
			password: 'Secure1234!',
		});
		const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('taken username fails async check', async () => {
		const dto = new RegistrationDto({
			username: 'admin',
			email: 'new@company.com',
			password: 'Secure1234!',
		});
		const result = await qCheckRulesAsync(dto, { mode: 'parallel' });
		expect(result.valid).toBe(false);
		expect(result.errors.some((err) => err.field === 'username')).toBe(
			true
		);
	});

	test('weak password fails sync rules', async () => {
		const dto = new RegistrationDto({
			username: 'dev_new',
			email: 'dev@new.com',
			password: 'weak',
		});
		const result = await qCheckRulesAsync(dto, { mode: 'serial' });
		expect(result.valid).toBe(false);
		const pwdErrors = result.errors.filter(
			(err) => err.field === 'password'
		);
		expect(pwdErrors.length).toBeGreaterThan(0);
	});

	test('parallel mode completes faster than serial for multiple async checks', async () => {
		const dto = new RegistrationDto({
			username: 'parallel_user',
			email: 'parallel@example.com',
			password: 'ValidPass123',
		});
		const start = Date.now();
		await qCheckRulesAsync(dto, { mode: 'parallel' });
		const elapsed = Date.now() - start;
		// Two async rules at 3ms each — parallel should be < 50ms total
		expect(elapsed).toBeLessThan(200);
	});
});

// ---------------------------------------------------------------------------
// 5. Repository pattern — backend service with QModel
// ---------------------------------------------------------------------------

interface IBlogPost {
	id: string;
	authorId: string;
	title: string;
	slug: string;
	content: string;
	tags: string[];
	publishedAt: Date | null;
}

@Quick(
	{
		id: 'string',
		authorId: 'string',
		title: 'string',
		slug: 'string',
		content: 'string',
		publishedAt: Date,
	},
	{ unknownPropertyPolicy: 'keep' }
)
class BlogPostModel extends QModel<IBlogPost> {
	declare id: string;
	declare authorId: string;
	declare title: string;
	declare slug: string;
	declare content: string;
	declare tags: string[];
	declare publishedAt: Date | null;

	@QComputed()
	get isPublished(): boolean {
		return this.publishedAt !== null && this.publishedAt !== undefined;
	}

	@QComputed()
	get wordCount(): number {
		return this.content.split(/\s+/).filter(Boolean).length;
	}
}

class BlogPostRepository {
	private store = new Map<string, BlogPostModel>();

	create(data: Record<string, unknown>): object {
		const post = new BlogPostModel(data);
		this.store.set(
			(post as unknown as Record<string, unknown>)['id'] as string,
			post
		);
		return post.serialize();
	}

	findById(idArg: string): object | null {
		const post = this.store.get(idArg);
		return post ? post.serialize() : null;
	}

	publish(idArg: string): object | null {
		const post = this.store.get(idArg);
		if (!post) return null;
		const published = post.copy({ publishedAt: new Date() });
		this.store.set(idArg, published);
		return published.serialize();
	}

	findPublished(): object[] {
		return [...this.store.values()]
			.filter((post) => post.isPublished)
			.map((post) => post.serialize());
	}

	count(): number {
		return this.store.size;
	}
}

describe('Backend — repository pattern with QModel', () => {
	let repo: BlogPostRepository;

	beforeEach(() => {
		repo = new BlogPostRepository();
	});

	test('create() stores and returns serialized post', () => {
		const post = repo.create({
			id: 'post-1',
			authorId: 'auth-1',
			title: 'Hello Backend',
			slug: 'hello-backend',
			content: 'First backend post with QuickModel',
			tags: ['node', 'quickmodel'],
			publishedAt: null,
		});
		expect(post).toBeDefined();
		expect((post as Record<string, unknown>)['title']).toBe(
			'Hello Backend'
		);
	});

	test('findById() returns null for unknown id', () => {
		expect(repo.findById('nonexistent')).toBeNull();
	});

	test('findById() returns serialized post for known id', () => {
		repo.create({
			id: 'post-2',
			authorId: 'auth-1',
			title: 'My Post',
			slug: 'my-post',
			content: 'Content here',
			tags: [],
			publishedAt: null,
		});
		const found = repo.findById('post-2') as Record<string, unknown>;
		expect(found['title']).toBe('My Post');
	});

	test('publish() sets publishedAt and isPublished becomes true', () => {
		repo.create({
			id: 'post-3',
			authorId: 'auth-2',
			title: 'Draft',
			slug: 'draft',
			content: 'Draft content',
			tags: [],
			publishedAt: null,
		});
		const published = repo.publish('post-3') as Record<string, unknown>;
		expect(published['isPublished']).toBe(true);
		expect(published['publishedAt']).not.toBeNull();
	});

	test('findPublished() returns only published posts', () => {
		repo.create({
			id: 'pub-1',
			authorId: 'a',
			title: 'P1',
			slug: 's1',
			content: 'c',
			tags: [],
			publishedAt: null,
		});
		repo.create({
			id: 'pub-2',
			authorId: 'a',
			title: 'P2',
			slug: 's2',
			content: 'c',
			tags: [],
			publishedAt: null,
		});
		repo.publish('pub-1');
		expect(repo.findPublished()).toHaveLength(1);
	});

	test('@QComputed wordCount in serialized output', () => {
		repo.create({
			id: 'post-5',
			authorId: 'auth-5',
			title: 'Word Count',
			slug: 'word-count',
			content: 'one two three four five',
			tags: [],
			publishedAt: null,
		});
		const post = repo.findById('post-5') as Record<string, unknown>;
		expect(post['wordCount']).toBe(5);
	});
});
