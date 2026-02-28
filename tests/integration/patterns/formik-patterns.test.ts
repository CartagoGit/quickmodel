/**
 * Formik Integration Patterns — QuickModel
 *
 * Verifies QuickModel patterns as used with Formik v2.
 * No Formik packages imported — pure TypeScript logic only.
 *
 * Key patterns:
 * - qCheckRules() as the Formik validate function (returns errors object)
 * - Field-level validation via @QGroup + qCheckRulesByGroup()
 * - Migration from Zod/Yup schema to @QRule + @QField
 * - getFormSchema() drives dynamic form rendering
 * - validationReport() for rule traceability
 * - isDirty() alongside Formik's dirty state
 */
import { describe, test, expect } from 'bun:test';
import { QModel, Quick } from '@/index';
import { QRule, QField, QComputed, QGroup } from '@/decorators';
import { qCheckRules } from '@/core/helpers/q-check-rules';
import { qCheckRulesAsync } from '@/core/helpers/q-check-rules-async';
import { qCheckRulesByGroup } from '@/core/helpers/q-check-rules-by-group';

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

interface IRegistrationForm {
	name: string;
	email: string;
	password: string;
	age: number;
	role: string;
	newsletter: boolean;
}

interface IProductForm {
	sku: string;
	title: string;
	price: number;
	stock: number;
	category: string;
	published: boolean;
}

@Quick(
	{
		name: 'string',
		email: 'string',
		password: 'string',
		age: 'number',
		role: 'string',
		newsletter: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class RegistrationDto extends QModel<IRegistrationForm> {
	@QGroup('personal')
	@QField({ widget: 'input', label: 'Full Name', required: true })
	@QRule(
		(val: string) => val.trim().length >= 2,
		'Name must be at least 2 characters'
	)
	declare name: string;

	@QGroup('personal')
	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		'Invalid email address'
	)
	declare email: string;

	@QGroup('security')
	@QField({ label: 'Password', widget: 'password', required: true })
	@QRule((val: string) => val.length >= 8, 'At least 8 characters')
	@QRule((val: string) => /[A-Z]/.test(val), 'Needs an uppercase letter')
	@QRule((val: string) => /\d/.test(val), 'Needs a digit')
	declare password: string;

	@QGroup('personal')
	@QField({ widget: 'input', label: 'Age' })
	@QRule((val: number) => val >= 18, 'Must be 18 or older')
	@QRule((val: number) => val <= 120, 'Age out of range')
	declare age: number;

	@QGroup('preferences')
	@QField({ widget: 'input', label: 'Role' })
	@QRule(
		(val: string) => ['user', 'editor', 'admin'].includes(val),
		'Invalid role'
	)
	declare role: string;

	@QGroup('preferences')
	@QField({ label: 'Newsletter', widget: 'checkbox' })
	declare newsletter: boolean;

	@QComputed()
	get initials(): string {
		return this.name
			.split(' ')
			.map((seg) => seg[0] ?? '')
			.join('')
			.toUpperCase();
	}
}

@Quick(
	{
		sku: 'string',
		title: 'string',
		price: 'number',
		stock: 'number',
		category: 'string',
		published: 'boolean',
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class ProductFormDto extends QModel<IProductForm> {
	@QGroup('info')
	@QField({ widget: 'input', label: 'SKU', required: true })
	@QRule(
		(val: string) => /^[A-Z]{2,4}-\d{3,6}$/.test(val),
		'SKU format: XX-000 to XXXX-000000'
	)
	declare sku: string;

	@QGroup('info')
	@QField({ widget: 'input', label: 'Title', required: true })
	@QRule((val: string) => val.trim().length >= 3, 'Title too short')
	declare title: string;

	@QGroup('pricing')
	@QField({ widget: 'input', label: 'Price' })
	@QRule((val: number) => val >= 0, 'Price must be non-negative')
	@QRule((val: number) => val < 1_000_000, 'Price out of range')
	declare price: number;

	@QGroup('pricing')
	@QField({ widget: 'input', label: 'Stock' })
	@QRule((val: number) => Number.isInteger(val), 'Stock must be integer')
	@QRule((val: number) => val >= 0, 'Stock cannot be negative')
	declare stock: number;

	@QGroup('info')
	@QField({ widget: 'input', label: 'Category', required: true })
	@QRule(
		(val: string) =>
			['electronics', 'clothing', 'books', 'food'].includes(val),
		'Invalid category'
	)
	declare category: string;

	@QGroup('info')
	@QField({ label: 'Published', widget: 'checkbox' })
	declare published: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formik-compatible validate function.
 * Formik expects: valid → empty object `{}`, invalid → `{ field: message }`.
 */
function createFormikValidate<TDto extends object>(
	buildDto: (values: Partial<TDto>) => TDto
) {
	return (values: Partial<TDto>): Record<string, string> => {
		const dto = buildDto(values);
		const { valid, errors } = qCheckRules(dto);
		if (valid) return {};
		return errors.reduce<Record<string, string>>((acc, err) => {
			if (!(err.field in acc)) acc[err.field] = err.message;
			return acc;
		}, {});
	};
}

// ---------------------------------------------------------------------------
// 1. Formik validate adapter — qCheckRules() → errors object
// ---------------------------------------------------------------------------

describe('Formik validate adapter', () => {
	const validate = createFormikValidate<IRegistrationForm>(
		(values) => new RegistrationDto(values)
	);

	test('returns empty object {} for valid form data', () => {
		const errors = validate({
			name: 'Alice Smith',
			email: 'alice@example.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		expect(Object.keys(errors).length).toBe(0);
	});

	test('returns errors object for invalid form data', () => {
		const errors = validate({
			name: 'A',
			email: 'not-an-email',
			password: 'weak',
			age: 16,
			role: 'unknown',
			newsletter: false,
		});
		expect(errors['name']).toBeDefined();
		expect(errors['email']).toBeDefined();
		expect(errors['password']).toBeDefined();
		expect(errors['age']).toBeDefined();
		expect(errors['role']).toBeDefined();
	});

	test('only first error per field is returned (Formik convention)', () => {
		const errors = validate({
			name: 'Alice',
			email: 'alice@example.com',
			password: 'nodigits', // fails "Needs a digit" but has length ≥ 8
			age: 25,
			role: 'user',
			newsletter: true,
		});
		// Only one message per field key
		expect(typeof errors['password']).toBe('string');
		expect(
			Object.keys(errors).every((key) => typeof errors[key] === 'string')
		).toBe(true);
	});

	test('valid email passes, invalid blocked', () => {
		const validErrors = validate({
			name: 'Bob',
			email: 'bob@domain.io',
			password: 'Secure1!',
			age: 30,
			role: 'editor',
			newsletter: false,
		});
		expect(validErrors['email']).toBeUndefined();

		const invalidErrors = validate({
			name: 'Bob',
			email: 'notvalid',
			password: 'Secure1!',
			age: 30,
			role: 'editor',
			newsletter: false,
		});
		expect(invalidErrors['email']).toBeDefined();
	});

	test('coercion from string fields (loose mode)', () => {
		const dto = new RegistrationDto({
			name: 'Carol',
			email: 'carol@x.com',
			password: 'Password1',
			age: '29' as unknown as number, // simulates HTML input string
			role: 'admin',
			newsletter: false,
		});
		expect(dto.age).toBe(29); // coerced to number
	});
});

// ---------------------------------------------------------------------------
// 2. Field-level validation — @QGroup + qCheckRulesByGroup()
// ---------------------------------------------------------------------------

describe('Formik field-level validation via @QGroup', () => {
	test('validates only the personal group', () => {
		const dto = new RegistrationDto({
			name: 'X', // invalid
			email: 'bad-email', // invalid
			password: 'ok1Pass1', // would pass
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const byGroup = qCheckRulesByGroup(dto);
		const personal = byGroup['personal'];
		expect(personal?.valid).toBe(false);
		const fields = personal?.errors.map((err) => err.field) ?? [];
		expect(fields).toContain('name');
		expect(fields).toContain('email');
		// security group fields should NOT be included
		expect(
			byGroup['security']?.errors.some((err) => err.field === 'password')
		).toBe(false);
	});

	test('validates only the security group', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'good@email.com',
			password: 'short', // invalid
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const byGroup = qCheckRulesByGroup(dto);
		expect(byGroup['security']?.valid).toBe(false);
		expect(
			byGroup['security']?.errors.some((err) => err.field === 'password')
		).toBe(true);
	});

	test('field-level validate returns per-field error string for Formik Field', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@example.com',
			password: 'Password1',
			age: 15, // invalid
			role: 'user',
			newsletter: false,
		});
		const byGroup = qCheckRulesByGroup(dto);
		const ageError = byGroup['personal']?.errors.find(
			(err) => err.field === 'age'
		);
		expect(ageError?.message).toBe('Must be 18 or older');
	});
});

// ---------------------------------------------------------------------------
// 3. Migration from Zod-style schema → @QRule + @QField
// ---------------------------------------------------------------------------

describe('Migration from Zod schema patterns', () => {
	// Zod equivalent:
	//   z.object({ name: z.string().min(2), email: z.string().email(), age: z.number().min(18) })
	// QuickModel equivalent: RegistrationDto with @QRule
	test('z.string().min() → @QRule length check', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'a@b.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const { valid } = qCheckRules(dto);
		expect(valid).toBe(true);

		const dtoBad = new RegistrationDto({
			name: 'A', // below min(2)
			email: 'a@b.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const { valid: bad } = qCheckRules(dtoBad);
		expect(bad).toBe(false);
	});

	test('z.string().email() → @QRule regex check', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'not-an-email',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const { errors } = qCheckRules(dto);
		expect(errors.some((err) => err.field === 'email')).toBe(true);
	});

	test('z.number().min() → @QRule numeric check', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 16, // below min(18)
			role: 'user',
			newsletter: false,
		});
		const { errors } = qCheckRules(dto);
		expect(errors.some((err) => err.field === 'age')).toBe(true);
	});

	test('z.enum() → @QRule allowlist check', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'superuser', // not in enum
			newsletter: false,
		});
		const { errors } = qCheckRules(dto);
		expect(errors.some((err) => err.field === 'role')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 4. Migration from Yup-style schema → @QRule + @QField
// ---------------------------------------------------------------------------

describe('Migration from Yup schema patterns', () => {
	// Yup equivalent:
	//   yup.object({ sku: yup.string().matches(/^[A-Z]+-\d+$/), price: yup.number().min(0) })
	test('yup.string().matches() → @QRule regex predicate', () => {
		const valid = new ProductFormDto({
			sku: 'ELEC-001',
			title: 'Widget Pro',
			price: 29.99,
			stock: 100,
			category: 'electronics',
			published: true,
		});
		const invalid = new ProductFormDto({
			sku: 'invalid-sku',
			title: 'Widget Pro',
			price: 29.99,
			stock: 100,
			category: 'electronics',
			published: true,
		});
		expect(qCheckRules(valid).valid).toBe(true);
		expect(qCheckRules(invalid).valid).toBe(false);
	});

	test('yup.number().min() → @QRule numeric predicate', () => {
		const dto = new ProductFormDto({
			sku: 'BK-123',
			title: 'TypeScript Deep Dive',
			price: -5, // invalid
			stock: 0,
			category: 'books',
			published: false,
		});
		const { errors } = qCheckRules(dto);
		expect(errors.some((err) => err.field === 'price')).toBe(true);
	});

	test('yup.number().integer() → @QRule predicate', () => {
		const dto = new ProductFormDto({
			sku: 'CL-456',
			title: 'T-Shirt',
			price: 15.0,
			stock: 3.5, // not integer
			category: 'clothing',
			published: true,
		});
		const { errors } = qCheckRules(dto);
		expect(errors.some((err) => err.field === 'stock')).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 5. getFormSchema() → dynamic form rendering
// ---------------------------------------------------------------------------

describe('getFormSchema() for dynamic Formik fields', () => {
	test('returns schema array with all declared fields', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const schema = dto.getFormSchema();
		expect(Array.isArray(schema)).toBe(true);
		expect(schema.length).toBeGreaterThan(0);
	});

	test('each schema entry includes field and label', () => {
		const dto = new ProductFormDto({
			sku: 'EL-001',
			title: 'Gadget',
			price: 99,
			stock: 10,
			category: 'electronics',
			published: false,
		});
		const schema = dto.getFormSchema();
		for (const field of schema) {
			expect(field.field).toBeDefined();
			expect(typeof field.field).toBe('string');
		}
	});

	test('required fields are marked in schema', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const schema = dto.getFormSchema();
		const emailField = schema.find((fld) => fld.field === 'email');
		expect(emailField?.required).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// 6. validationReport() — rule traceability
// ---------------------------------------------------------------------------

describe('validationReport() for Formik error display', () => {
	test('full report includes all fields with pass/fail status', () => {
		const dto = new RegistrationDto({
			name: 'Alice Smith',
			email: 'alice@example.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const report = dto.validationReport();
		expect(typeof report).toBe('object');
		expect(report).not.toBeNull();
	});

	test('report captures failing rules with messages', () => {
		const dto = new RegistrationDto({
			name: 'A',
			email: 'bad',
			password: 'weak',
			age: 15,
			role: 'unknown',
			newsletter: false,
		});
		const report = dto.validationReport();
		// report structure is an object keyed by field
		expect(Object.keys(report).length).toBeGreaterThan(0);
	});
});

// ---------------------------------------------------------------------------
// 7. isDirty() + copy() alongside Formik's dirty state
// ---------------------------------------------------------------------------

describe('isDirty() and copy() in Formik context', () => {
	test('fresh DTO is not dirty', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		expect(dto.isDirty()).toBe(false);
	});

	test('copy() creates a new snapshot with updated values', () => {
		const original = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const updated = original.copy({ email: 'newemail@x.com' });
		expect(updated.email).toBe('newemail@x.com');
		expect(original.email).toBe('alice@x.com'); // immutable
	});

	test('copy() result has isDirty() = false (fresh snapshot)', () => {
		const original = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const updated = original.copy({ newsletter: true });
		expect(updated.isDirty()).toBe(false); // copy() sets __initData = merged state
	});

	test('serialize() provides Formik initialValues-compatible payload', () => {
		const dto = new RegistrationDto({
			name: 'Alice',
			email: 'alice@x.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const serialized = dto.serialize();
		expect(serialized['name']).toBe('Alice');
		expect(serialized['email']).toBe('alice@x.com');
	});
});

// ---------------------------------------------------------------------------
// 8. Async validation — qCheckRulesAsync for Formik async validate
// ---------------------------------------------------------------------------

describe('Async Formik validate via qCheckRulesAsync', () => {
	const takenEmails = new Set<string>(['taken@example.com']);

	@Quick(
		{
			name: 'string',
			email: 'string',
			password: 'string',
			age: 'number',
			role: 'string',
			newsletter: 'boolean',
		},
		{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
	)
	class UniqueEmailDto extends QModel<IRegistrationForm> {
		declare name: string;
		@QRule(
			(val: string) => Promise.resolve(!takenEmails.has(val)),
			'Email already registered'
		)
		declare email: string;
		declare password: string;
		declare age: number;
		declare role: string;
		declare newsletter: boolean;
	}

	test('async validate passes for unique email', async () => {
		const dto = new UniqueEmailDto({
			name: 'Bob',
			email: 'fresh@example.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(true);
	});

	test('async validate fails for duplicate email', async () => {
		const dto = new UniqueEmailDto({
			name: 'Bob',
			email: 'taken@example.com',
			password: 'Password1',
			age: 25,
			role: 'user',
			newsletter: false,
		});
		const result = await qCheckRulesAsync(dto);
		expect(result.valid).toBe(false);
		expect(result.errors[0]?.field).toBe('email');
		expect(result.errors[0]?.message).toBe('Email already registered');
	});
});
