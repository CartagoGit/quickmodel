# Integración con Mongoose

QuickModel encaja de forma natural con documentos Mongoose. Gestiona la **coerción de ObjectId → string**, elimina los campos internos de Mongoose (`__v`, `_id`), restaura fechas en ISO string a instancias `Date` reales, y proporciona una capa DTO limpia entre tus documentos MongoDB y el resto de tu aplicación.

## Arquitectura

```
Documento Mongoose (IUserDoc)
       │
       ▼ doc.toObject()
Objeto JS plano  ──► docToObject(doc)  ──► elimina _id, __v
       │
       ▼ new UserDto(plain)
UserDto (QModel)  ──► checkRules()  ──► toInterface() ──► Model.create()
```

## Documento → coerción DTO

```typescript
import { QModel, Quick, QField, QComputed } from 'quickmodel';
import { qCheckRules } from 'quickmodel';

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

	@QField({ label: 'Nombre', required: true })
	declare name: string;

	@QField({ label: 'Rol' })
	declare role: string;

	@QField({ label: 'Edad' })
	declare age: number;

	@QField({ label: 'Creado el' })
	declare createdAt: Date;
}
```

La transformación clave convierte un documento Mongoose con `_id: ObjectId` a un objeto plano con `id: string`:

```typescript
// Helper: documento Mongoose → objeto plano apto para QuickModel
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

// Uso:
const userDoc = await User.findById(id);
const dto = new UserDto(docToObject(userDoc));
// dto.id → '507f1f77bcf86cd799439011' (hex string)
// dto.createdAt → instancia Date (no ISO string)
```

## Patrón repositorio

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

## Fechas ISO string — coerción loose

Cuando Mongoose devuelve fechas como ISO strings (p. ej. desde `.lean()` o deserialización JSON), `coercionStrategy: 'loose'` de QuickModel las convierte automáticamente a instancias `Date`:

```typescript
// Desde una consulta lean() o JSON deserializado:
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

## dto.toInterface() como payload para Model.create()

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
	@QRule(
		(val: string) => Promise.resolve(val.includes('@')),
		'Email inválido'
	)
	declare email: string;

	@QField({ label: 'Nombre', required: true })
	@QRule(
		(val: string) => Promise.resolve(val.trim().length > 0),
		'El nombre es obligatorio'
	)
	declare name: string;

	@QField({ label: 'Rol' })
	declare role: string;

	@QField({ label: 'Edad' })
	declare age: number;
}

// Capa de servicio:
async function createUser(input: ICreateUser): Promise<UserDto> {
	const dto = new CreateUserDto(input);
	const { valid, errors } = await qCheckRulesAsync(dto);

	if (!valid) throw new ValidationError(errors);

	// toInterface() produce un objeto plano limpio para Mongoose:
	const doc = await User.create(dto.toInterface());
	return new UserDto({ ...dto.toInterface(), id: doc._id.toString() });
}
```

## copy() + findByIdAndUpdate()

```typescript
async function updateUser(id: string, patch: Partial<IUser>): Promise<UserDto> {
	const existing = await repo.findById(id);
	if (!existing) throw new Error('Usuario no encontrado');

	// copy() aplica los cambios y resetea isDirty() → false:
	const updated = existing.copy(patch);

	// toInterface() produce el payload limpio para la actualización:
	await User.findByIdAndUpdate(id, { $set: updated.toInterface() });

	return updated;
}

// isDirty() tras copy() siempre es false:
const updated = existing.copy({ name: 'Bob' });
console.log(updated.isDirty()); // false — snapshot fresco
```

## createMany() para seed data con insertMany()

```typescript
async function seedUsers(rawData: ICreateUser[]): Promise<void> {
	const { instances, errors } = CreateUserDto.createMany(rawData);

	if (errors.length > 0) {
		console.warn(`Omitidos ${errors.length} registros inválidos`);
	}

	// Todas las instancias son válidas — seguro para persistir:
	const docs = instances.map((dto) => dto.toInterface());
	await User.insertMany(docs);
}

// En tests / migraciones:
const seed = [
	{ email: 'alice@example.com', name: 'Alice', role: 'admin', age: 30 },
	{ email: 'bob@example.com', name: 'Bob', role: 'user', age: 25 },
];
await seedUsers(seed);
```

## @QComputed — campos no persistidos

Los campos computados se derivan de los datos del documento y nunca se escriben de vuelta en MongoDB:

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
// post.excerpt → primeros 100 chars + '...' (no está en MongoDB)
// post.tagCount → tags.length (no está en MongoDB)
// post.toInterface() → { id, title, content, tags, viewCount } — sin campos computados
```
