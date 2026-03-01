# Validation with @QRule

Learn how to define business rules on your models with the `@QRule` decorator and validate data synchronously and asynchronously.

## Use Case

You have a user registration form and need to validate that the email has the correct format, the password meets minimum requirements, and the age is over 18.

## Basic Synchronous Validation

```typescript
import { QModel, Quick, QRule } from 'quickmodel';

interface IUserRegister {
	name: string;
	email: string;
	password: string;
	age: number;
}

@Quick()
class UserRegister extends QModel<IUserRegister> {
	declare name: string;

	@QRule({
		predicate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		message: 'Email format is invalid',
	})
	declare email: string;

	@QRule({
		predicate: (value: string) => value.length >= 8,
		message: 'Password must be at least 8 characters',
	})
	@QRule({
		predicate: (value: string) => /[A-Z]/.test(value),
		message: 'Password must contain at least one uppercase letter',
	})
	@QRule({
		predicate: (value: string) => /[0-9]/.test(value),
		message: 'Password must contain at least one number',
	})
	declare password: string;

	@QRule({
		predicate: (value: number) => value >= 18,
		message: 'You must be at least 18 years old to register',
	})
	declare age: number;
}

// ✅ Valid data
const validUser = new UserRegister({
	name: 'Jane Doe',
	email: 'jane@example.com',
	password: 'MyPass123',
	age: 25,
});

const result = validUser.$qCheckRules();
console.log(result.valid); // true
console.log(result.errors); // []

// ❌ Invalid data
const invalidUser = new UserRegister({
	name: 'Pete',
	email: 'not-an-email',
	password: 'short',
	age: 16,
});

const errors = invalidUser.$qCheckRules();
console.log(errors.valid); // false
console.log(errors.errors);
// [
//   { field: 'email',    message: 'Email format is invalid', value: 'not-an-email' },
//   { field: 'password', message: 'Password must be at least 8 characters', value: 'short' },
//   { field: 'password', message: 'Password must contain at least one uppercase letter', value: 'short' },
//   { field: 'password', message: 'Password must contain at least one number', value: 'short' },
//   { field: 'age',      message: 'You must be at least 18 years old to register', value: 16 },
// ]
```

## isValid() — Quick Check

Use `isValid()` for a boolean shortcut that combines integrity + rules:

```typescript
if (!invalidUser.$qIsValid()) {
	console.log('Form has errors');
}

// In a save flow:
async function saveUser(data: IUserRegister): Promise<void> {
	const user = new UserRegister(data);

	if (!user.$qIsValid()) {
		const report = user.$qValidationReport();
		throw new Error(
			`Invalid data: ${report.rules.errors.map((e) => e.message).join(', ')}`
		);
	}

	await fetch('/api/users', {
		method: 'POST',
		body: user.toJSON(), // toJSON() already returns a JSON string
	});
}
```

## validationReport() — Full Report

`validationReport()` combines integrity checks + `@QRule` rules into a single object:

```typescript
interface IProduct {
	id: string;
	name: string;
	price: string; // Comes as string from backend
	stock: number;
}

@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare id: string;

	@QRule({
		predicate: (value: string) => value.trim().length > 0,
		message: 'Name cannot be empty',
	})
	declare name: string;

	declare price: bigint;

	@QRule({
		predicate: (value: number) => value >= 0,
		message: 'Stock cannot be negative',
	})
	declare stock: number;
}

const product = new Product({
	id: 'P001',
	name: '',
	price: '9999',
	stock: -5,
});

const report = product.$qValidationReport();
console.log(report.valid); // false
console.log(report.integrity); // [] (no integrity issues)
console.log(report.rules.errors);
// [
//   { field: 'name',  message: 'Name cannot be empty', value: '' },
//   { field: 'stock', message: 'Stock cannot be negative', value: -5 },
// ]
```

## Rules with Context (access to full model)

Rules can access the full object as a second argument:

```typescript
interface IDateRange {
	startDate: string;
	endDate: string;
}

@Quick({ startDate: Date, endDate: Date })
class DateRange extends QModel<IDateRange> {
	declare startDate: Date;

	@QRule({
		predicate(value: Date, data: DateRange) {
			return value > data.startDate;
		},
		message: 'End date must be after start date',
	})
	declare endDate: Date;
}

const range = new DateRange({
	startDate: '2026-03-01',
	endDate: '2026-02-01', // ❌ before startDate
});

console.log(range.$qCheckRules().errors[0].message);
// 'End date must be after start date'
```

## Async Validation with checkRulesAsync()

For rules that require database or API calls:

```typescript
interface INewUser {
	username: string;
	email: string;
}

@Quick()
class NewUser extends QModel<INewUser> {
	@QRule({
		predicate: async (value: string) => {
			const response = await fetch(`/api/check-username?name=${value}`);
			const { available } = await response.json();
			return available;
		},
		message: 'Username is already taken',
	})
	declare username: string;

	declare email: string;
}

const newUser = new NewUser({
	username: 'john_doe',
	email: 'john@example.com',
});

// Run with 3-second timeout per predicate
const asyncResult = await newUser.$qCheckRulesAsync({
	timeoutMs: 3000,
	timeoutMessage: 'Could not verify username availability',
	mode: 'parallel', // All predicates run simultaneously
});

console.log(asyncResult.valid);
```

## createMany() — Batch Creation with Validation

Create multiple instances at once, separating valid from invalid:

```typescript
const rawUsers: IUserRegister[] = [
	{
		name: 'Alice',
		email: 'alice@example.com',
		password: 'ValidPass1',
		age: 22,
	},
	{ name: 'Bob', email: 'bad-email', password: 'short', age: 16 }, // ❌
	{ name: 'Carol', email: 'carol@test.com', password: 'AnotherP2', age: 30 },
	{ name: 'Dave', email: 'dave@co.uk', password: 'noNumber', age: 25 }, // ❌
];

const { instances, errors } = UserRegister.createMany(rawUsers);

console.log(`Valid users: ${instances.length}`); // 2
console.log(`Errors: ${errors.length}`); // 2

errors.forEach(({ index, errors: errs }) => {
	console.log(`Row ${index}:`, errs.map((e) => e.message).join(', '));
});

// Include invalid instances in result too:
const { instances: all } = UserRegister.createMany(rawUsers, {
	includeErrorInstances: true,
});
console.log(`Total processed: ${all.length}`); // 4
```

## Dynamic Messages (i18n)

Messages can be functions for runtime i18n support:

```typescript
let currentLang = 'en';

const MESSAGES = {
	en: { minAge: 'You must be at least 18 years old' },
	es: { minAge: 'Debes tener al menos 18 años' },
};

@Quick()
class InternationalForm extends QModel<{ age: number }> {
	@QRule({
		predicate: (value: number) => value >= 18,
		message: () => MESSAGES[currentLang as keyof typeof MESSAGES].minAge,
	})
	declare age: number;
}

const form = new InternationalForm({ age: 15 });
console.log(form.$qCheckRules().errors[0].message); // 'You must be at least 18 years old'

currentLang = 'es';
console.log(form.$qCheckRules().errors[0].message); // 'Debes tener al menos 18 años'
```

## Next Steps

- [Forms](/en/examples/forms) - Generate form schemas with `@QField`
- [Batch & Readonly](/en/examples/batch-readonly) - Deep dive into `createMany()`
- [API Reference](/tsdoc/) - Full `checkRules()` documentation
