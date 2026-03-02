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
UserDto (QModel)  ──► qCheckRules()  ──► $qToInterface() ──► Model.create()
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

		const doc = await User.create(dto.$qToInterface());
		return new UserDto({ ...dto.$qToInterface(), id: doc._id.toString() });
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

## dto.$qToInterface() as Model.create() payload

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

	// $qToInterface() gives a clean plain object for Mongoose:
	const doc = await User.create(dto.$qToInterface());
	return new UserDto({ ...dto.$qToInterface(), id: doc._id.toString() });
}
```

## $qCopy() + findByIdAndUpdate()

```typescript
async function updateUser(id: string, patch: Partial<IUser>): Promise<UserDto> {
	const existing = await repo.findById(id);
	if (!existing) throw new Error('User not found');

	// $qCopy() applies changes and creates a new immutable instance:
	const updated = existing.$qCopy(patch);

	// $qToInterface() produces the clean update payload:
	await User.findByIdAndUpdate(id, { $set: updated.$qToInterface() });

	return updated;
}

// $qIsDirty() after $qCopy() is always false — copied state is the new baseline:
const updated = existing.$qCopy({ name: 'Bob' });
console.log(updated.$qIsDirty()); // false — clean snapshot
```

## createMany() for insertMany() seed data

```typescript
async function seedUsers(rawData: ICreateUser[]): Promise<void> {
	const { instances, errors } = CreateUserDto.createMany(rawData);

	if (errors.length > 0) {
		console.warn(`Skipped ${errors.length} invalid records`);
	}

	// All instances are valid — safe to persist:
	const docs = instances.map((dto) => dto.$qToInterface());
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
// post.$qToInterface() → { id, title, content, tags, viewCount } — no computed fields
```

## Schema export with `getSchema('mongo')`

Import `quickmodel/schema` once to register all schema generators, then call `getSchema('mongo')` to obtain a plain Mongoose-compatible schema definition object:

```typescript
import 'quickmodel/schema';
import { QModel, Quick } from 'quickmodel';

interface IUser {
	name: string;
	birthDate: Date;
	score: number;
}

@Quick({ birthDate: Date, score: Number })
class User extends QModel<IUser> {
	declare name: string;
	declare birthDate: Date;
	declare score: number;
}

const mongoSchemaDef = User.getSchema('mongo');
/*
{
  name:      { type: String },
  birthDate: { type: Date },
  score:     { type: Number }
}
*/

// Use it to build a Mongoose Schema:
import mongoose from 'mongoose';
const UserSchema = new mongoose.Schema(mongoSchemaDef);
export const UserModel = mongoose.model('User', UserSchema);
```

### Keeping your Mongoose schema in sync with your QModel

Automating Mongoose schema generation from QModel means a single source of truth:

```typescript
import 'quickmodel/schema';

// One place to change the shape — QModel drives both the DTO and the DB schema
const mongoSchemaDef = UserDto.getSchema('mongo');
const UserMongooseSchema = new mongoose.Schema({
	...mongoSchemaDef,
	_id: { type: mongoose.Schema.Types.ObjectId, auto: true },
});
```

## `fromSchema`: generating a QModel class from a Mongo schema object

`QModel.fromSchema('mongo', ...)` accepts a Mongo/Mongoose schema definition object and generates TypeScript source code for a `QModel` class. Since Mongo schemas are plain JavaScript objects (not strings), you pass the object directly:

```typescript
import 'quickmodel/schema';

const mongoSchema = {
	name: { type: String, required: true },
	age: { type: Number, required: true },
	active: { type: Boolean, required: true },
	createdAt: { type: Date, required: true },
};

const code = QModel.fromSchema('mongo', mongoSchema, 'User');
// → TypeScript source string for class User extends QModel<IUser>

// fs.writeFileSync('src/models/user.model.ts', code);
```

::: warning className is required
Unlike string-based formats, the Mongo schema object has no name embedded. Always pass `className` explicitly, or the generated class will be named `GeneratedModel`.
:::

## Round-trip: QModel → Mongo schema → QModel class

```typescript
import 'quickmodel/schema';

const mongoSchemaDef = User.getSchema('mongo');
const code = QModel.fromSchema('mongo', mongoSchemaDef, 'User');
// code is valid TypeScript defining class User extends QModel<IUser>
```

::: warning BigInt limitation
Mongo maps `bigint` to `String`. The round-trip for `BigInt` fields is lossy — they become `string` in the regenerated class.
:::

## See also

- [Schema Generation](/en/guide/schema-generation) — full `getSchema()` reference
- [JSON Schema Integration](/en/integrations/json-schema-integration) — portable schema format
