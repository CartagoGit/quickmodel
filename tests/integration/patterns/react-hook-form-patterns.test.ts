/**
 * React Hook Form Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with React Hook Form v7.
 * No RHF packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - qCheckRules() as the RHF validate function (no Zod/Yup resolver needed)
 * - handleSubmit builds a DTO for final coercion + strip
 * - getFormSchema() drives dynamic field rendering
 * - isDirty() complements RHF's formState.isDirty
 * - qCheckRulesAsync() for async field-level validation (e.g. email uniqueness)
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { QModel, Quick, QRule, QField, QComputed, QGroup } from '@/index';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { qCheckRulesByGroup } from '@/core/helpers/q-check-rules-by-group';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IUserSignup {
	username: string;
	email: string;
	password: string;
	age: number;
	role: string;
	displayName?: string;
}

interface IContactForm {
	name: string;
	email: string;
	message: string;
	subject: string;
}

// Plain class (no QModel) — works with @QRule and qCheckRules standalone
class ContactForm {
	@QField({ label: 'Full Name', required: true })
	@QRule((val: string) => val.trim().length >= 2, 'Name too short')
	name = '';

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	email = '';

	@QField({ label: 'Subject', required: true })
	@QRule(
		(val: string) => ['support', 'sales', 'general'].includes(val),
		'Invalid subject'
	)
	subject = '';

	@QField({ label: 'Message', widget: 'textarea', required: true })
	@QRule((val: string) => val.trim().length >= 10, 'Message too short')
	@QRule((val: string) => val.length <= 2000, 'Message too long')
	message = '';
}

@Quick(
	{
		username: 'string',
		email: 'string',
		password: 'string',
		age: 'number',
		role: 'string',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserSignupDto extends QModel<IUserSignup> {
	@QGroup('account')
	@QField({ label: 'Username', required: true })
	@QRule(
		(val: string) => val.length >= 3,
		'Username must be at least 3 characters'
	)
	@QRule(
		(val: string) => /^[a-z0-9_]+$/.test(val),
		'Username: only lowercase, digits and _'
	)
	declare username: string;

	@QGroup('account')
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QGroup('security')
	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule((val: string) => val.length >= 8, 'At least 8 characters')
	@QRule((val: string) => /[A-Z]/.test(val), 'Needs uppercase letter')
	@QRule((val: string) => /\d/.test(val), 'Needs a digit')
	declare password: string;

	@QGroup('profile')
	@QField({ label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	@QRule((val: number) => val <= 120, 'Age out of range')
	declare age: number;

	@QGroup('profile')
	@QField({ label: 'Role' })
	@QRule(
		(val: string) => ['user', 'admin', 'editor'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QComputed()
	get displayName(): string {
		return `@${this.username}`;
	}
}

// ---------------------------------------------------------------------------
// 1. validate adapter — qCheckRules() → RHF errors object
// ---------------------------------------------------------------------------

describe('React Hook Form — validate adapter', () => {
	// Simulate RHF validate: receives form data, returns true | errors object
	function createQValidator<TForm extends object>(instance: TForm) {
		return (data: Partial<TForm>): true | Record<string, string> => {
			Object.assign(instance, data);
			const { valid, errors } = qCheckRules(instance);
			if (valid) return true;
			return errors.reduce<Record<string, string>>((acc, err) => {
				if (!(err.field in acc)) acc[err.field] = err.message;
				return acc;
			}, {});
		};
	}

	let form: ContactForm;
	let validate: (
		data: Partial<IContactForm>
	) => true | Record<string, string>;

	beforeEach(() => {
		form = new ContactForm();
		validate = createQValidator(form);
	});

	test('returns true for valid data', () => {
		const result = validate({
			name: 'Alice',
			email: 'alice@example.com',
			subject: 'support',
			message: 'I have a question about my order',
		});
		expect(result).toBe(true);
	});

	test('returns errors object for invalid data', () => {
		const result = validate({
			name: 'A',
			email: 'not-email',
			subject: 'unknown',
			message: 'short',
		});
		expect(result).not.toBe(true);
		const errors = result as Record<string, string>;
		expect(errors['name']).toBeDefined();
		expect(errors['email']).toBeDefined();
	});

	test('first error per field is returned (RHF convention)', () => {
		const result = validate({
			name: 'Alice',
			email: 'bad',
			subject: 'support',
			message: 'A proper message here',
		});
		const errors = result as Record<string, string>;
		// Only one error per field
		expect(typeof errors['email']).toBe('string');
	});

	test('valid email passes email field', () => {
		const result = validate({
			name: 'Bob',
			email: 'bob@test.com',
			subject: 'sales',
			message: 'Looking for enterprise pricing',
		});
		expect(result).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 2. handleSubmit — build DTO → validate → process
// ---------------------------------------------------------------------------

describe('React Hook Form — handleSubmit: DTO coercion on submit', () => {
	// Simulate handleSubmit(onValid) behavior
	function simulateSubmit(
		formData: object,
		onValid: (dto: UserSignupDto) => void,
		onError: (errors: Record<string, string>) => void
	): void {
		const dto = new UserSignupDto(formData);
		const { valid, errors } = dto.checkRules();
		if (valid) {
			onValid(dto);
		} else {
			const errorMap = errors.reduce<Record<string, string>>(
				(acc, err) => {
					if (!(err.field in acc)) acc[err.field] = err.message;
					return acc;
				},
				{}
			);
			onError(errorMap);
		}
	}

	test('valid form data calls onValid with DTO', () => {
		let capturedDto: UserSignupDto | null = null;
		simulateSubmit(
			{
				username: 'alice_01',
				email: 'alice@example.com',
				password: 'Secret123',
				age: '25',
				role: 'user',
			},
			(dto) => {
				capturedDto = dto;
			},
			() => {}
		);
		expect(capturedDto).not.toBeNull();
		expect(capturedDto?.username).toBe('alice_01');
	});

	test('age is coerced from string to number on submit', () => {
		let capturedDto: UserSignupDto | null = null;
		simulateSubmit(
			{
				username: 'bob_02',
				email: 'bob@example.com',
				password: 'Password1',
				age: '30',
				role: 'user',
			},
			(dto) => {
				capturedDto = dto;
			},
			() => {}
		);
		expect(typeof capturedDto?.age).toBe('number');
		expect(capturedDto?.age).toBe(30);
	});

	test('extra fields are stripped on submit', () => {
		let capturedDto: UserSignupDto | null = null;
		simulateSubmit(
			{
				username: 'carol_03',
				email: 'carol@example.com',
				password: 'Carol123',
				age: 22,
				role: 'user',
				_csrf: 'abc',
			},
			(dto) => {
				capturedDto = dto;
			},
			() => {}
		);
		const serialized = capturedDto?.serialize() as
			| Record<string, unknown>
			| undefined;
		expect(serialized).not.toHaveProperty('_csrf');
	});

	test('@QComputed displayName is available on valid submit', () => {
		let capturedDto: UserSignupDto | null = null;
		simulateSubmit(
			{
				username: 'dave_04',
				email: 'dave@example.com',
				password: 'Dave1234',
				age: 28,
				role: 'user',
			},
			(dto) => {
				capturedDto = dto;
			},
			() => {}
		);
		expect(capturedDto?.displayName).toBe('@dave_04');
	});

	test('invalid data calls onError with field map', () => {
		const errors: Record<string, string> = {};
		simulateSubmit(
			{
				username: 'ab',
				email: 'bad',
				password: 'weak',
				age: 15,
				role: 'hacker',
			},
			() => {},
			(errs) => {
				Object.assign(errors, errs);
			}
		);
		expect(errors['username']).toBeDefined();
		expect(errors['email']).toBeDefined();
		expect(errors['password']).toBeDefined();
		expect(errors['age']).toBeDefined();
		expect(errors['role']).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// 3. getFormSchema() — dynamic field rendering
// ---------------------------------------------------------------------------

describe('React Hook Form — getFormSchema(): dynamic fields', () => {
	test('returns all @QField-decorated fields', () => {
		const schema = UserSignupDto.getFormSchema();
		expect(schema).toHaveLength(5); // username, email, password, age, role
	});

	test('each schema entry has label and field name', () => {
		const schema = UserSignupDto.getFormSchema();
		schema.forEach((entry) => {
			expect(entry.field).toBeDefined();
			expect(entry.label).toBeDefined();
		});
	});

	test('required fields are marked correctly', () => {
		const schema = UserSignupDto.getFormSchema();
		const emailEntry = schema.find((entry) => entry.field === 'email');
		expect(emailEntry?.required).toBe(true);
	});

	test('widget type is set for email field', () => {
		const schema = UserSignupDto.getFormSchema();
		const emailEntry = schema.find((entry) => entry.field === 'email');
		expect(emailEntry?.widget).toBe('email');
	});
});

// ---------------------------------------------------------------------------
// 4. @QGroup — multi-step form (wizard) per group validation
// ---------------------------------------------------------------------------

describe('React Hook Form — @QGroup: multi-step wizard validation', () => {
	test('step 1 (account) passes with valid username + email', () => {
		const dto = new UserSignupDto({
			username: 'eve_05',
			email: 'eve@example.com',
			password: '',
			age: 0,
			role: '',
		});
		const byGroup = qCheckRulesByGroup(dto);
		expect(byGroup['account']?.valid).toBe(true);
	});

	test('step 1 (account) fails with invalid email', () => {
		const dto = new UserSignupDto({
			username: 'frank_06',
			email: 'bad-email',
			password: '',
			age: 0,
			role: '',
		});
		const byGroup = qCheckRulesByGroup(dto);
		expect(byGroup['account']?.valid).toBe(false);
	});

	test('step 2 (security) fails with weak password', () => {
		const dto = new UserSignupDto({
			username: 'grace_07',
			email: 'grace@example.com',
			password: 'weak',
			age: 0,
			role: '',
		});
		const byGroup = qCheckRulesByGroup(dto);
		expect(byGroup['security']?.valid).toBe(false);
		expect(
			byGroup['security']?.errors.some((err) => err.field === 'password')
		).toBe(true);
	});

	test('step 3 (profile) passes with valid age and role', () => {
		const dto = new UserSignupDto({
			username: 'henry_08',
			email: 'h@example.com',
			password: 'Pass1234',
			age: 25,
			role: 'user',
		});
		const byGroup = qCheckRulesByGroup(dto);
		expect(byGroup['profile']?.valid).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 5. isDirty() vs RHF formState.isDirty
// ---------------------------------------------------------------------------

describe('React Hook Form — isDirty() integration', () => {
	test('fresh model is not dirty', () => {
		const dto = new UserSignupDto({
			username: 'init',
			email: 'i@example.com',
			password: 'Init1234',
			age: 20,
			role: 'user',
		});
		expect(dto.isDirty()).toBe(false);
	});

	test('direct mutation marks field as dirty', () => {
		const dto = new UserSignupDto({
			username: 'init',
			email: 'i@example.com',
			password: 'Init1234',
			age: 20,
			role: 'user',
		});
		dto.username = 'changed_name';
		expect(dto.isDirty('username')).toBe(true);
		expect(dto.isDirty('email')).toBe(false);
	});

	test('merge() returns new instance flagged as dirty (has pending changes)', () => {
		const dto = new UserSignupDto({
			username: 'original',
			email: 'o@example.com',
			password: 'Orig1234',
			age: 22,
			role: 'user',
		});
		const updated = dto.copy({ username: 'renamed' });
		expect(updated.username).toBe('renamed'); // value was applied
		expect(updated.isDirty()).toBe(true); // model has pending changes vs original snapshot
	});

	test('reset() clears dirty state', () => {
		const dto = new UserSignupDto({
			username: 'init',
			email: 'i@example.com',
			password: 'Init1234',
			age: 20,
			role: 'user',
		});
		dto.age = 99;
		expect(dto.isDirty()).toBe(true);
		dto.reset();
		expect(dto.isDirty()).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// 6. Async validation — qCheckRulesAsync() for field-level async
// ---------------------------------------------------------------------------

describe('React Hook Form — qCheckRulesAsync(): async field validation', () => {
	const takenEmails = new Set<string>([
		'taken@example.com',
		'admin@site.com',
	]);

	class UserSignupWithAsyncDto extends UserSignupDto {
		@QRule(
			(val: string) => !takenEmails.has(val),
			'Email already registered'
		)
		declare email: string;
	}

	test('unique email passes async validation', async () => {
		const dto = new UserSignupWithAsyncDto({
			username: 'newuser',
			email: 'new@example.com',
			password: 'NewUser1',
			age: 25,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('duplicate email fails async validation', async () => {
		const dto = new UserSignupWithAsyncDto({
			username: 'taken_user',
			email: 'taken@example.com',
			password: 'Taken123',
			age: 25,
			role: 'user',
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
		const emailErrors = result.errors.filter(
			(err) => err.field === 'email'
		);
		expect(
			emailErrors.some(
				(err) => err.message === 'Email already registered'
			)
		).toBe(true);
	});
});
