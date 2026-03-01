# Mongoose Integration

QuickModel works naturally with Mongoose documents. It handles **ObjectId → string coercion**, strips internal Mongoose fields (`__v`, `_id`), restores ISO-string dates to proper `Date` instances, and provides a clean DTO layer between your MongoDB documents and the rest of your application.

## Architecture

```
Mongoose Document (IUserDoc)
       │
       ▼ doc.toObject()
Plain JS Object  ──► docToObject(doc)  ──► strip _id, __v
       │
       ▼ new UserDto(plain)
UserDto (QModel)  ──► checkRules()  ──► toInterface() ──► Model.create()
```

## Document → DTO coercion

```typescript
import { QModel, Quick, QField, QComputed } from 'quickmodel';

interface IUser {
	id: string;
	email: string;
	name: string;
	role: string;
	age: number;
	createdAt: Date;
}

@Quick(
	{
		id: 'string',
		email: 'string',
		name: 'string',
		role: 'string',
		age: 'number',
		createdAt: Date,
	},
	{ unknownPropertyPolicy: 'strip', coercionStrategy: 'loose' }
)
class UserDto extends QModel<IUser> {
	@QField({ label: 'ID', required: true })
	declare id: string;

	@QField({ label: 'Email', required: true })
	declare email: string;

	@QField({ label: 'Name', required: true })
	declare name: string;

	@QField({ label: 'Role' })
	declare role: string;

	@QField({ label: 'Age' })
	declare age: number;

	@QField({ label: 'Created At' })
	declare createdAt: Date;
}
```

The key transformation converts a Mongoose document with `_id: ObjectId` to a plain object with `id: string`:

```typescript
// Helper: Mongoose doc → plain object suitable for QuickModel
function docToObject(doc: IUserDoc): IUser {
	const obj = doc.toObject();
	return {
		id: obj._id.toString(), // ObjectId → string
		email: obj.email,
		name: obj.name,
		role: obj.role ?? 'user',
		age: obj.age ?? 0,
		createdAt: obj.createdAt,
	};
}

// Usage:
const userDoc = await User.findById(id);
const dto = new UserDto(docToObject(userDoc));
// dto.id → '507f1f77bcf86cd799439011' (hex string)
// dto.createdAt → Date instance (not ISO string)
```

## Repository pattern

```typescript
class UserRepository {
	async findById(id: string): Promise<UserDto | null> {
		const doc = await User.findById(id).lean();
		if (!doc) return null;
		return new UserDto({
			id: doc._id.toString(),
			email: doc.email,
			name: doc.name,
			role: doc.role ?? 'user',
			age: doc.age ?? 0,
			createdAt: doc.createdAt,
		});
	}

	async findAll(): Promise<UserDto[]> {
		const docs = await User.find().lean();
		return docs.map(
			(doc) =>
				new UserDto({
					id: doc._id.toString(),
					email: doc.email,
					name: doc.name,
					role: doc.role ?? 'user',
					age: doc.age ?? 0,
					createdAt: doc.createdAt,
				})
		);
	}

	async save(dto: UserDto): Promise<UserDto> {
		const { valid, errors } = qCheckRules(dto);
		if (!valid) throw new Error(errors.map((e) => e.message).join(', '));

		const doc = await User.create(dto.toInterface());
		return new UserDto({ ...dto.toInterface(), id: doc._id.toString() });
	}
}
```

## ISO string dates — loose coercion

When Mongoose returns dates as ISO strings (e.g., from `.lean()` or JSON deserialization), QuickModel's `coercionStrategy: 'loose'` automatically converts them to proper `Date` instances:

```typescript
// From a lean() query or deserialized JSON:
const raw = {
	id: '507f1f77bcf86cd799439011',
	email: 'alice@example.com',
	name: 'Alice',
	role: 'admin',
	age: 30,
	createdAt: '2024-01-15T10:30:00.000Z', // ← ISO string
};

const dto = new UserDto(raw);
console.log(dto.createdAt instanceof Date); // true ✅
console.log(dto.createdAt.getFullYear()); // 2024
```

## dto.toInterface() as Model.create() payload

```typescript
interface ICreateUser {
	email: string;
	name: string;
	role: string;
	age: number;
}

@Quick(
	{ email: 'string', name: 'string', role: 'string', age: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class CreateUserDto extends QModel<ICreateUser> {
	@QField({ label: 'Email', required: true })
	@QRule((val: string) => Promise.resolve(val.includes('@')), 'Invalid email')
	declare email: string;

	@QField({ label: 'Name', required: true })
	@QRule(
		(val: string) => Promise.resolve(val.trim().length > 0),
		'Name required'
	)
	declare name: string;

	@QField({ label: 'Role' })
	declare role: string;

	@QField({ label: 'Age' })
	declare age: number;
}

// Service layer:
async function createUser(input: ICreateUser): Promise<UserDto> {
	const dto = new CreateUserDto(input);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) throw new ValidationError(errors);

	// toInterface() gives a clean plain object for Mongoose:
	const doc = await User.create(dto.toInterface());
	return new UserDto({ ...dto.toInterface(), id: doc._id.toString() });
}
```

## copy() + findByIdAndUpdate()

```typescript
async function updateUser(id: string, patch: Partial<IUser>): Promise<UserDto> {
	const existing = await repo.findById(id);
	if (!existing) throw new Error('User not found');

	// copy() applies changes and resets isDirty() → false:
	const updated = existing.$qm.copy(patch);

	// toInterface() produces the clean update payload:
	await User.findByIdAndUpdate(id, { $set: updated.toInterface() });

	return updated;
}

// isDirty() after copy() is always false:
const updated = existing.$qm.copy({ name: 'Bob' });
console.log(updated.$qm.isDirty()); // false — clean snapshot
```

## createMany() for insertMany() seed data

```typescript
async function seedUsers(rawData: ICreateUser[]): Promise<void> {
	const { instances, errors } = CreateUserDto.createMany(rawData);

	if (errors.length > 0) {
		console.warn(`Skipped ${errors.length} invalid records`);
	}

	// All instances are valid — safe to persist:
	const docs = instances.map((dto) => dto.toInterface());
	await User.insertMany(docs);
}

// In tests / migrations:
const seed = [
	{ email: 'alice@example.com', name: 'Alice', role: 'admin', age: 30 },
	{ email: 'bob@example.com', name: 'Bob', role: 'user', age: 25 },
];
await seedUsers(seed);
```

## @QComputed fields — not persisted

Computed fields are derived from document data and never written back to MongoDB:

```typescript
interface IPost {
	id: string;
	title: string;
	content: string;
	tags: string[];
	viewCount: number;
}

@Quick(
	{
		id: 'string',
		title: 'string',
		content: 'string',
		tags: Array,
		viewCount: 'number',
	},
	{ coercionStrategy: 'loose' }
)
class PostDto extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare content: string;
	declare tags: string[];
	declare viewCount: number;

	@QComputed()
	get excerpt(): string {
		return this.content.length > 100
			? this.content.slice(0, 100) + '...'
			: this.content;
	}

	@QComputed()
	get tagCount(): number {
		return this.tags.length;
	}
}

const post = new PostDto(docToPost(mongoDoc));
// post.excerpt → first 100 chars + '...' (not in MongoDB)
// post.tagCount → tags.length (not in MongoDB)
// post.toInterface() → { id, title, content, tags, viewCount } — no computed fields
```
