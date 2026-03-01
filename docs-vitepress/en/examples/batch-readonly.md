# Batch Creation & Immutability

Learn how to process arrays of API data with `createMany()` and create immutable instances with `createReadonly()`.

## createMany() — Process Arrays

When you receive an array from the API, `createMany()` processes all items, separates the valid from the invalid, and gives you full visibility into what failed.

### Basic Usage

```typescript
import { QModel, Quick, QRule } from 'quickmodel';

interface IEmployee {
	id: string;
	name: string;
	email: string;
	salary: number;
	department: string;
}

@Quick()
class Employee extends QModel<IEmployee> {
	declare id: string;

	@QRule({
		predicate: (val: string) => val.trim().length >= 2,
		message: 'Name must be at least 2 characters',
	})
	declare name: string;

	@QRule({
		predicate: (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
		message: 'Email format is invalid',
	})
	declare email: string;

	@QRule({
		predicate: (val: number) => val >= 0,
		message: 'Salary cannot be negative',
	})
	declare salary: number;

	declare department: string;
}

// Bulk import data (some invalid)
const importData: IEmployee[] = [
	{
		id: '1',
		name: 'Alice García',
		email: 'alice@company.com',
		salary: 65000,
		department: 'Eng',
	},
	{ id: '2', name: 'B', email: 'bad-email', salary: 70000, department: 'HR' }, // ❌
	{
		id: '3',
		name: 'Carlos Ruiz',
		email: 'carlos@company.com',
		salary: -500,
		department: 'Fin',
	}, // ❌
	{
		id: '4',
		name: 'Diana Torres',
		email: 'diana@company.com',
		salary: 72000,
		department: 'Mkt',
	},
	{
		id: '5',
		name: 'Eve Martínez',
		email: 'eve@company.com',
		salary: 60000,
		department: 'Eng',
	},
];

const { instances, errors } = Employee.createMany(importData);

console.log(`Successfully imported: ${instances.length}`); // 3
console.log(`With errors: ${errors.length}`); // 2

// Log the errors
errors.forEach(({ index, instance, errors: errs }) => {
	console.log(`Row ${index} (ID: ${instance.id}):`);
	errs.forEach(({ field, message }) =>
		console.log(`  - ${field}: ${message}`)
	);
});
// Row 1 (ID: 2):
//   - name: Name must be at least 2 characters
//   - email: Email format is invalid
// Row 2 (ID: 3):
//   - salary: Salary cannot be negative

// Valid instances are real model instances
instances.forEach((emp) => {
	console.log(`${emp.name} (${emp.department})`);
});
```

### Include Invalid Instances

When you also need to access invalid instances:

```typescript
const { instances: all, errors } = Employee.createMany(importData, {
	includeErrorInstances: true,
});

console.log(`Total processed: ${all.length}`); // 5 (valid + invalid)

all.forEach((emp) => {
	const hasError = errors.some(({ instance }) => instance.id === emp.id);
	console.log(`${emp.name}: ${hasError ? '❌ Has errors' : '✅ Valid'}`);
});
```

### Real World: CSV Import with Error Feedback

```typescript
async function importEmployees(csvData: IEmployee[]): Promise<void> {
	const { instances, errors } = Employee.createMany(csvData);

	// Save valid entries
	if (instances.length > 0) {
		await fetch('/api/employees/bulk', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(instances.map((emp) => emp.$qSerialize())),
		});
	}

	// Report errors to the user
	if (errors.length > 0) {
		const report = errors.map(({ index, errors: errs }) => ({
			row: index + 1,
			issues: errs.map((e) => e.message),
		}));
		console.error('Rows with issues:', report);
	}

	console.log(
		`Import complete: ${instances.length} ok, ${errors.length} errors`
	);
}
```

### createMany() with Type Transformations

`createMany()` applies all `@Quick` transformations just like the constructor:

```typescript
interface IEvent {
	id: string;
	name: string;
	startDate: string;
	endDate: string;
	attendees: string[];
}

@Quick({ startDate: Date, endDate: Date, attendees: Set })
class Event extends QModel<IEvent> {
	declare id: string;
	declare name: string;
	declare startDate: Date;
	declare endDate: Date;
	declare attendees: Set<string>;
}

const rawEvents: IEvent[] = [
	{
		id: 'E1',
		name: 'TS Conf',
		startDate: '2026-06-01',
		endDate: '2026-06-03',
		attendees: ['alice', 'bob'],
	},
	{
		id: 'E2',
		name: 'Hackathon',
		startDate: '2026-07-15',
		endDate: '2026-07-16',
		attendees: ['bob', 'bob'],
	},
];

const { instances } = Event.createMany(rawEvents);
console.log(instances[0].startDate instanceof Date); // true ✅
console.log(instances[1].attendees instanceof Set); // true ✅
console.log(instances[1].attendees.size); // 1 (duplicate removed)
```

---

## createReadonly() — Immutable Instances

When you want to guarantee that a model cannot be accidentally mutated (configuration, read data, constants):

### Basic Usage

```typescript
interface IConfig {
	apiUrl: string;
	timeout: number;
	retries: number;
	features: string[];
}

@Quick({ features: Set })
class AppConfig extends QModel<IConfig> {
	declare apiUrl: string;
	declare timeout: number;
	declare retries: number;
	declare features: Set<string>;
}

const config = AppConfig.createReadonly({
	apiUrl: 'https://api.example.com',
	timeout: 5000,
	retries: 3,
	features: ['auth', 'payments', 'analytics'],
});

// ✅ Normal read access
console.log(config.apiUrl); // 'https://api.example.com'
console.log(config.timeout); // 5000

// ❌ Any mutation throws TypeError in strict mode
try {
	(config as any).apiUrl = 'http://hacked.com';
} catch {
	console.log('Immutable: cannot be modified');
}

console.log(Object.isFrozen(config)); // true (deep freeze)
```

### Global Configuration Objects

```typescript
// config/app.config.ts
const RAW_CONFIG = {
	apiUrl: process.env.API_URL ?? 'https://api.example.com',
	timeout: 5000,
	retries: 3,
	features: ['auth', 'payments'],
};

export const APP_CONFIG = AppConfig.createReadonly(RAW_CONFIG);
// Exports a config object nobody can accidentally mutate
```

### Difference from create()

```typescript
// ✅ create(): mutable instance
const mutableUser = User.create({ name: 'Alice', email: 'alice@test.com' });
mutableUser.name = 'Beatrice'; // OK

// ✅ createReadonly(): deep immutable instance
const readonlyUser = User.createReadonly({
	name: 'Alice',
	email: 'alice@test.com',
});
readonlyUser.name = 'Beatrice'; // ❌ TypeError: Cannot assign to read only property
```

### Immutability in Tests

```typescript
// Readonly instances are perfect as immutable test fixtures
const FIXTURE_USER = User.createReadonly({
	id: '1',
	name: 'Test User',
	email: 'test@example.com',
	createdAt: '2026-01-01T00:00:00.000Z',
});

// No test can accidentally mutate the fixture
describe('UserCard', () => {
	it('renders name correctly', () => {
		render(<UserCard user={FIXTURE_USER} />);
		expect(screen.getByText(FIXTURE_USER.name)).toBeInTheDocument();
	});
});
```

---

## Combining createMany() and createReadonly()

```typescript
interface IPermission {
	code: string;
	description: string;
	resource: string;
	actions: string[];
}

@Quick({ actions: Set })
class Permission extends QModel<IPermission> {
	declare code: string;
	declare description: string;
	declare resource: string;
	declare actions: Set<string>;
}

const rawPermissions: IPermission[] = [
	{
		code: 'read:users',
		description: 'Read users',
		resource: 'users',
		actions: ['GET'],
	},
	{
		code: 'write:users',
		description: 'Write users',
		resource: 'users',
		actions: ['POST', 'PUT'],
	},
	{
		code: 'delete:users',
		description: 'Delete users',
		resource: 'users',
		actions: ['DELETE'],
	},
];

const { instances: permissions } = Permission.createMany(rawPermissions);

// Immutable lookup map
const PERMISSIONS_MAP = Object.freeze(
	new Map(permissions.map((perm) => [perm.code, perm]))
);

function hasPermission(code: string, action: string): boolean {
	const perm = PERMISSIONS_MAP.get(code);
	return perm?.actions.has(action) ?? false;
}

console.log(hasPermission('read:users', 'GET')); // true
console.log(hasPermission('read:users', 'DELETE')); // false
```

## Best Practices

```typescript
// ✅ createMany() for API or CSV imports
const { instances, errors } = MyModel.createMany(apiArray);

// ✅ createReadonly() for configuration and constants
export const CONFIG = ConfigModel.createReadonly(rawConfig);

// ✅ Always inspect errors[] when processing external data
if (errors.length > 0) {
	logger.warn(`${errors.length} records failed validation`);
}

// ❌ Don't use createReadonly() for data you need to mutate
const user = User.createReadonly(data); // ❌ if you'll do user.name = '...' later
const user = User.create(data); // ✅ use create() for mutable data
```

## Next Steps

- [Validation](/en/examples/validation) - Business rules with `@QRule`
- [Mocks & Testing](/en/examples/mocks) - Mock models for tests
