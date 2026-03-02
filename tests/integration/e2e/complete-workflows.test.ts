/**
 * Integration tests: complete end-to-end workflows.
 * Covers: integration/J
 *
 * Tests full real-world flows combining multiple QuickModel features.
 */
import { describe, expect, test } from 'bun:test';
import { QModel, Quick } from '@/index';
import {
	QAlias,
	QDefault,
	QSensitive,
	QRule,
	QField,
	QGroup,
} from '@/decorators';

// ─── J-1: REST API flow ───────────────────────────────────────────────────────
// snake_case JSON → @QAlias + @QSensitive + Date → checkRules → serialize

interface IRestUser {
	userId: string;
	fullName: string;
	email: string;
	passwordHash: string;
	createdAt: string;
}

@Quick({ createdAt: Date }, { unknownPropertyPolicy: 'keep' })
class RestUserModel extends QModel<IRestUser> {
	@QAlias('user_id')
	@QDefault('anonymous')
	declare userId: string;

	@QAlias('full_name')
	@QDefault('Unknown')
	declare fullName: string;

	@QRule(
		(val: string) => typeof val === 'string' && val.includes('@'),
		'Email must contain @'
	)
	declare email: string;

	@QSensitive()
	declare passwordHash: string;

	declare createdAt: Date;
}

// ─── J-2: Form flow ───────────────────────────────────────────────────────────
// @QField + @QGroup + @QRule → form schema → submit → check by group → serialize

interface IContactForm {
	firstName: string;
	lastName: string;
	email: string;
	phone: string;
	subject: string;
	message: string;
}

@Quick({}, { unknownPropertyPolicy: 'keep' })
class ContactFormModel extends QModel<IContactForm> {
	@QField({ widget: 'input', required: true, label: 'First Name' })
	@QGroup('Personal')
	declare firstName: string;

	@QField({ widget: 'input', required: true, label: 'Last Name' })
	@QGroup('Personal')
	declare lastName: string;

	@QField({
		widget: 'input',
		inputType: 'email',
		required: true,
		label: 'Email',
	})
	@QGroup('Contact')
	@QRule(
		(val: string) => typeof val === 'string' && val.includes('@'),
		'Invalid email address'
	)
	declare email: string;

	@QField({ widget: 'input', required: false, label: 'Phone' })
	@QGroup('Contact')
	declare phone: string;

	@QField({ widget: 'input', required: true, label: 'Subject' })
	@QGroup('Message')
	declare subject: string;

	@QField({ widget: 'textarea', required: true, label: 'Message' })
	@QGroup('Message')
	@QRule(
		(val: string) => typeof val === 'string' && val.trim().length >= 10,
		'Message must be at least 10 characters'
	)
	declare message: string;
}

// ─── J-3: Batch import flow ───────────────────────────────────────────────────

interface IImportRow {
	code: string;
	name: string;
	quantity: number;
}

@Quick({ quantity: Number }, { unknownPropertyPolicy: 'keep' })
class ImportRowModel extends QModel<IImportRow> {
	@QRule(
		(val: string) =>
			typeof val === 'string' && /^[A-Z]{3}-\d{3}$/.test(val),
		'Code must be in format ABC-123'
	)
	declare code: string;

	@QDefault('Unnamed')
	declare name: string;

	@QRule(
		(val: number) => typeof val === 'number' && val >= 0,
		'Quantity cannot be negative'
	)
	declare quantity: number;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Integration: complete end-to-end workflows (e2e/J)', () => {
	describe('J-1: REST API flow — snake_case → model → validate → serialize', () => {
		test('builds model from snake_case API response', () => {
			const apiResponse = {
				user_id: 'u-123',
				full_name: 'John Doe',
				email: 'john@example.com',
				passwordHash: 'bcrypt$2b$...',
				createdAt: new Date('2024-01-15T10:00:00Z'),
			};

			const user = new RestUserModel(apiResponse as unknown as IRestUser);
			expect(user.userId).toBe('u-123');
			expect(user.fullName).toBe('John Doe');
			expect(user.email).toBe('john@example.com');
		});

		test('createdAt is coerced to Date', () => {
			const apiResponse = {
				user_id: 'u-124',
				full_name: 'Jane Doe',
				email: 'jane@example.com',
				passwordHash: 'hash',
				createdAt: '2024-02-01T08:00:00Z',
			};
			const user = new RestUserModel(apiResponse as unknown as IRestUser);
			expect(user.createdAt).toBeInstanceOf(Date);
		});

		test('email validation passes for valid email', () => {
			const user = new RestUserModel({
				user_id: 'u-1',
				full_name: 'Test',
				email: 'test@example.com',
				passwordHash: 'hash',
				createdAt: new Date(),
			} as unknown as IRestUser);

			const { valid } = user.$qCheckRules();
			expect(valid).toBe(true);
		});

		test('email validation fails for invalid email', () => {
			const user = new RestUserModel({
				user_id: 'u-1',
				full_name: 'Test',
				email: 'not-an-email',
				passwordHash: 'hash',
				createdAt: new Date(),
			} as unknown as IRestUser);

			const { valid, errors } = user.$qCheckRules();
			expect(valid).toBe(false);
			expect(errors.some((err) => err.field === 'email')).toBe(true);
		});

		test('$qSerialize() excludes @QSensitive passwordHash by default', () => {
			const user = new RestUserModel({
				user_id: 'u-1',
				full_name: 'Test User',
				email: 'test@example.com',
				passwordHash: 'secret-hash',
				createdAt: new Date(),
			} as unknown as IRestUser);

			const serialized = user.$qSerialize();
			expect(serialized['passwordHash']).toBeUndefined();
			expect(serialized['email']).toBe('test@example.com');
		});

		test('$qSerialize({ includeSensitive: true }) includes all fields for internal use', () => {
			const user = new RestUserModel({
				user_id: 'u-1',
				full_name: 'Test User',
				email: 'test@example.com',
				passwordHash: 'secret-hash',
				createdAt: new Date('2024-01-01T00:00:00Z'),
			} as unknown as IRestUser);

			const serialized = user.$qSerialize({ includeSensitive: true });
			expect(serialized['email']).toBe('test@example.com');
			expect(serialized['passwordHash']).toBe('secret-hash');
		});
	});

	describe('J-2: Form flow — @QField + @QGroup + @QRule → validate → serialize', () => {
		test('valid form submission passes all rules', () => {
			const form = new ContactFormModel({
				firstName: 'Alice',
				lastName: 'Smith',
				email: 'alice@example.com',
				phone: '555-1234',
				subject: 'Hello',
				message:
					'This is a longer message that meets the minimum length requirement.',
			});

			const { valid, errors } = form.$qCheckRules();
			expect(valid).toBe(true);
			expect(errors.length).toBe(0);
		});

		test('invalid email fails rule validation', () => {
			const form = new ContactFormModel({
				firstName: 'Bob',
				lastName: 'Jones',
				email: 'not-an-email',
				phone: '',
				subject: 'Test',
				message: 'This is a valid message',
			});

			const { valid, errors } = form.$qCheckRules();
			expect(valid).toBe(false);
			expect(errors.some((err) => err.field === 'email')).toBe(true);
		});

		test('short message fails rule validation', () => {
			const form = new ContactFormModel({
				firstName: 'Carol',
				lastName: 'White',
				email: 'carol@example.com',
				phone: '',
				subject: 'Hi',
				message: 'Too short',
			});

			const { valid, errors } = form.$qCheckRules();
			expect(valid).toBe(false);
			expect(errors.some((err) => err.field === 'message')).toBe(true);
		});

		test('form schema returns groups', () => {
			const schema = ContactFormModel.getFormSchema();
			expect(Array.isArray(schema)).toBe(true);
			expect(schema.length).toBeGreaterThan(0);
		});

		test('after correction, valid form can be serialized', () => {
			const form = new ContactFormModel({
				firstName: 'Dave',
				lastName: 'Brown',
				email: 'dave@example.com',
				phone: '555-9876',
				subject: 'Inquiry',
				message: 'Please let me know about your services in detail.',
			});

			const { valid } = form.$qCheckRules();
			expect(valid).toBe(true);

			const serialized = form.$qSerialize();
			expect(serialized['email']).toBe('dave@example.com');
			expect(serialized['firstName']).toBe('Dave');
		});
	});

	describe('J-3: Batch import — createMany with partial errors', () => {
		const rawData = [
			{ code: 'ABC-001', name: 'Widget A', quantity: 10 },
			{ code: 'INVALID', name: 'Bad Code', quantity: 5 }, // invalid code
			{ code: 'DEF-002', name: 'Widget B', quantity: 3 },
			{ code: 'GHI-003', name: 'Widget C', quantity: -1 }, // negative qty (passes construction, fails rule)
			{ code: 'JKL-004', name: 'Widget D', quantity: 7 },
		];

		test('createMany processes all rows without crash', () => {
			const { instances, errors } = ImportRowModel.createMany(rawData);
			expect(instances.length + errors.length).toBe(rawData.length);
		});

		test('valid rows become ImportRowModel instances', () => {
			const { instances } = ImportRowModel.createMany(rawData);
			for (const inst of instances) {
				expect(inst).toBeInstanceOf(ImportRowModel);
			}
		});

		test('filter valid instances by $qCheckRules()', () => {
			const { instances } = ImportRowModel.createMany(rawData);
			const valid = instances.filter((mod) => mod.$qCheckRules().valid);
			// ABC-001 (10), DEF-002 (3), JKL-004 (7) → 3 valid
			// GHI-003 has quantity -1 → fails rule → not valid
			expect(valid.length).toBeGreaterThanOrEqual(3);
		});

		test('valid instances can be serialized as batch', () => {
			const { instances } = ImportRowModel.createMany(rawData);
			const valid = instances.filter((mod) => mod.$qCheckRules().valid);
			const serialized = valid.map((mod) => mod.$qSerialize());
			for (const row of serialized) {
				expect(row['code']).toBeDefined();
				expect(typeof row['quantity']).toBe('number');
			}
		});
	});
});
