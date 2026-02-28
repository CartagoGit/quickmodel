# Serialización

QuickModel proporciona transformación bidireccional entre tipos en runtime y formatos compatibles con JSON. Esta página explica cómo funciona la serialización y cómo usar el método `toJSON()`.

## El Patrón de Dos Interfaces

QuickModel usa dos interfaces para representar los mismos datos:

1. **Interfaz de Serialización** - Tipos compatibles con JSON (lo que viaja por la red)
2. **Interfaz de Runtime** - Tipos de TypeScript (con lo que trabajas en el código)

```typescript
// Interfaz de serialización (Compatible con JSON)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // ISO date string
	balance: string; // BigInt como string
	tags: string[]; // Array
	metadata: [string, any][]; // Map como tuplas
}

// Interfaz de runtime (opcional pero recomendada)
interface IUserTransform {
	createdAt: Date;
	balance: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
}

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User
	extends QModel<IUser>
	implements IQImplements<IUser, IUserTransform>
{
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}
```

## Deserialización (JSON → Runtime)

Cuando creas una instancia de modelo, QuickModel transforma automáticamente los tipos compatibles con JSON en tipos de runtime:

```typescript
const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z', // string
	balance: '999999999999999', // string
	tags: ['typescript', 'node'], // array
	metadata: [['key1', 'val1']], // array de tuplas
});

// Tipos en Runtime
console.log(user.createdAt instanceof Date); // true
console.log(typeof user.balance); // 'bigint'
console.log(user.tags instanceof Set); // true
console.log(user.metadata instanceof Map); // true
```

## Serialización (Runtime → JSON)

El método `toJSON()` revierte todas las transformaciones:

```typescript
const json = user.toJSON();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',  // Date → string
//   balance: '999999999999999',              // bigint → string
//   tags: ['typescript', 'node'],            // Set → array
//   metadata: [['key1', 'val1']]             // Map → array de tuplas
// }
```

## Reglas de Transformación

### Date → String ISO

```typescript
const event = new Event({ createdAt: '2026-01-10T12:30:00.000Z' });
const json = event.toJSON();

console.log(json.createdAt); // '2026-01-10T12:30:00.000Z'
```

Usa `Date.prototype.toISOString()`.

### BigInt → String

```typescript
const account = new Account({ balance: '999999999999999' });
const json = account.toJSON();

console.log(json.balance); // '999999999999999'
```

Convierte usando `String(bigint)`.

### Set → Array

```typescript
const post = new Post({ tags: ['js', 'ts', 'js'] });
const json = post.toJSON();

console.log(json.tags); // ['js', 'ts'] (duplicados eliminados)
```

Convierte usando `Array.from(set)`.

### Map → Array de Tuplas

```typescript
const config = new Config({
	metadata: [
		['key1', 'val1'],
		['key2', 'val2'],
	],
});
const json = config.toJSON();

console.log(json.metadata); // [['key1', 'val1'], ['key2', 'val2']]
```

Convierte usando `Array.from(map.entries())`.

### RegExp → Object

```typescript
const validator = new Validator({ pattern: '^[a-z]+$' });
const json = validator.toJSON();

console.log(json.pattern); // { source: '^[a-z]+$', flags: '' }
```

### Symbol → String

```typescript
const config = new Config({ key: 'unique.key' });
const json = config.toJSON();

console.log(json.key); // 'unique.key'
```

Usa `Symbol.keyFor()`.

### ArrayBuffer → Base64

```typescript
const file = new File({ data: buffer });
const json = file.toJSON();

console.log(json.data); // 'SGVsbG8gV29ybGQ=' (base64)
```

### TypedArray → Array

```typescript
const image = new Image({ pixels: new Uint8Array([255, 128, 64]) });
const json = image.toJSON();

console.log(json.pixels); // [255, 128, 64]
```

### URL → String

```typescript
const link = new Link({ homepage: 'https://example.com' });
const json = link.toJSON();

console.log(json.homepage); // 'https://example.com'
```

Usa `URL.prototype.toString()`.

### URLSearchParams → Object

```typescript
const request = new Request({ params: { page: '1', limit: '10' } });
const json = request.toJSON();

console.log(json.params); // { page: '1', limit: '10' }
```

## Modelos Anidados

Los modelos anidados se serializan recursivamente:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
}

@Quick({ profile: Profile, createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare profile: Profile;
	declare createdAt: Date;
}

const user = new User({
	id: 1,
	profile: { name: 'John', birthDate: '1990-01-01' },
	createdAt: '2026-01-10',
});

const json = user.toJSON();
// {
//   id: 1,
//   profile: {
//     name: 'John',
//     birthDate: '1990-01-01'  // Date → string
//   },
//   createdAt: '2026-01-10'    // Date → string
// }
```

## Arrays de Modelos

Los arrays se serializan elemento por elemento:

```typescript
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare id: string;
	declare price: bigint;
}

@Quick({ items: [Product] })
class Cart extends QModel<ICart> {
	declare items: Product[];
}

const cart = new Cart({
	items: [
		{ id: '1', price: '1000' },
		{ id: '2', price: '2000' },
	],
});

const json = cart.toJSON();
// {
//   items: [
//     { id: '1', price: '1000' },  // bigint → string
//     { id: '2', price: '2000' }   // bigint → string
//   ]
// }
```

## Trabajando con APIs

### Enviando Datos

```typescript
async function createUser(user: User): Promise<void> {
	await fetch('/api/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()), // Serializar a JSON
	});
}
```

### Recibiendo Datos

```typescript
async function getUser(id: number): Promise<User> {
	const response = await fetch(`/api/users/${id}`);
	const data = await response.json();
	return new User(data); // Deserializar desde JSON
}
```

### Ejemplo de Ida y Vuelta (Round-Trip)

```typescript
// 1. Obtener de API
const user = await getUser(1);
console.log(user.createdAt instanceof Date); // true

// 2. Modificar
user.name = 'Jane Doe';

// 3. Enviar de vuelta a API
await updateUser(user);

async function updateUser(user: User): Promise<void> {
	await fetch(`/api/users/${user.id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(user.toJSON()),
	});
}
```

## Integración con JSON.stringify

`toJSON()` se llama automáticamente por `JSON.stringify()`:

```typescript
const user = new User({
	id: 1,
	name: 'John',
	createdAt: '2026-01-10',
});

// Estos son equivalentes:
const json1 = JSON.stringify(user.toJSON());
const json2 = JSON.stringify(user); // Llama a toJSON() automáticamente

console.log(json1 === json2); // true
```

## Clonar Modelos

Usa `toJSON()` para crear copias profundas (deep copies):

```typescript
const user = new User({ id: 1, name: 'John', createdAt: '2026-01-10' });

// Crear una copia
const copy = new User(user.toJSON());

copy.name = 'Jane';
console.log(user.name); // 'John' (el original no cambia)
console.log(copy.name); // 'Jane'
```

O usa el método incorporado `copy()`:

```typescript
const copy = user.copy(); // Equivalente a new User(user.toJSON())
```

## Manejo de Null y Undefined

QuickModel preserva los valores `null` y `undefined`:

```typescript
const user = new User({
	id: 1,
	name: 'John',
	createdAt: null, // valor null
});

const json = user.toJSON();
console.log(json.createdAt); // null (preservado)
```

## Serialización Personalizada

Para lógica de serialización personalizada, sobrescribe `toJSON()`:

```typescript
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;

	toJSON() {
		const json = super.toJSON();
		// Añadir campos personalizados
		json.displayName = this.name.toUpperCase();
		return json;
	}
}

const user = new User({ id: 1, name: 'John', createdAt: '2026-01-10' });
const json = user.toJSON();
console.log(json.displayName); // 'JOHN'
```

## Consejos de Rendimiento

### 1. Evita Serialización Innecesaria

Llama a `toJSON()` solo cuando sea necesario (e.j., antes de enviar a API):

```typescript
// ❌ Mal - serialización innecesaria
function processUser(user: User) {
	const json = user.toJSON();
	console.log(json.name); // ¡Usa user.name directamente!
}

// ✅ Bien - trabaja con el modelo directamente
function processUser(user: User) {
	console.log(user.name);
}
```

### 2. Caché de Datos Serializados

Si serializas el mismo modelo múltiples veces:

```typescript
class CachedUser extends User {
	private _cachedJSON?: IUser;

	toJSON(): IUser {
		if (!this._cachedJSON) {
			this._cachedJSON = super.toJSON();
		}
		return this._cachedJSON;
	}
}
```

### 3. Operaciones por Lotes (Batch)

Cuando serialices múltiples modelos, hazlo en una sola pasada:

```typescript
const users = [user1, user2, user3];
const jsonArray = users.map((usr) => usr.toJSON());
```

## Filtrado de Campos

QuickModel ofrece tres formas de controlar qué campos aparecen en la salida serializada.

### En tiempo de ejecución: `omit` y `pick`

Pasa opciones a `serialize()` (o `toJSON()`) para filtrar campos de forma puntual:

```typescript
const user = new User({
	id: 1,
	name: 'Alice',
	password: 's3cr3t',
	role: 'admin',
});

// omit — excluir campos específicos
const publico = user.serialize({ omit: ['password', 'role'] });
// → { id: 1, name: 'Alice' }

// pick — incluir solo campos específicos
const minimal = user.serialize({ pick: ['id', 'name'] });
// → { id: 1, name: 'Alice' }
```

### Permanente: `excludeFields`

Declara qué campos deben **siempre** ser excluidos de cada llamada a serialización, directamente en el decorador `@Quick()`:

```typescript
@Quick(
	{
		id: 'string',
		name: 'string',
		password: 'string',
	},
	{
		excludeFields: ['password'], // nunca en la salida JSON
	}
)
class Account extends QModel<IAccount> {
	declare id: string;
	declare name: string;
	declare password: string;
}

const account = new Account({ id: '1', name: 'Alice', password: 's3cr3t' });
assert(account.password === 's3cr3t'); // sigue en la instancia
assert(account.toJSON().password === undefined); // excluido
```

::: info ¿Cuándo usar cada enfoque?
| Enfoque | Declarado | Se aplica | Ideal para |
|---|---|---|---|
| `excludeFields` | decorador `@Quick()` | siempre, cada llamada | contraseñas, secretos, cachés WeakMap |
| `omit` | `serialize({ omit })` | solo esa llamada | dar forma a la respuesta API |
| `pick` | `serialize({ pick })` | solo esa llamada | proyección dispersa / actualizaciones parciales |
:::

## Campos Calculados (`@QComputed()`)

Por defecto, los getters definidos en el prototipo (propiedades calculadas) **no** se incluyen en la salida de `serialize()` ni de `toJSON()`. Esto evita la exposición accidental de lógica interna. Usa `@QComputed()` para incluir explícitamente un getter.

```typescript
import { QModel, Quick, QComputed } from 'quickmodel';

interface IUser {
	firstName: string;
	lastName: string;
}

@Quick({ firstName: String, lastName: String })
class User extends QModel<IUser> {
	declare firstName: string;
	declare lastName: string;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	// SIN decorar — excluido de la serialización
	get initials(): string {
		return `${this.firstName[0]}.${this.lastName[0]}.`;
	}
}

const user = User.create({ firstName: 'Alice', lastName: 'Smith' });

user.serialize();
// { firstName: 'Alice', lastName: 'Smith', fullName: 'Alice Smith' }
// Nota: 'initials' NO está incluido
```

### Comportamientos clave

- **Solo lectura**: Los getters calculados nunca se asignan durante `create()` ni `deserialize()`. Cualquier dato entrante para una propiedad `@QComputed()` se ignora silenciosamente.
- **Herencia**: `@QComputed()` en un getter de clase padre es automáticamente visible en la serialización de las clases hijas.
- **Múltiples campos**: Puedes decorar tantos getters como necesites.

```typescript
@Quick({ firstName: String, lastName: String, birthYear: Number })
class User extends QModel<IUser> {
	declare firstName: string;
	declare lastName: string;
	declare birthYear: number;

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		return new Date().getFullYear() - this.birthYear;
	}
}

user.serialize();
// { firstName: 'Alice', lastName: 'Smith', birthYear: 1990, fullName: 'Alice Smith', age: 35 }
```

::: tip `toJSON()` y `JSON.stringify()`
Los campos `@QComputed()` también se incluyen en la salida de `toJSON()`, lo que significa que aparecen en `JSON.stringify(user)` — ya que `JSON.stringify` llama a `toJSON()` automáticamente.
:::

- [Transformadores](/es/guide/transformers) - Ve todas las reglas de transformación
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con estructuras complejas
- [Ejemplos](/es/examples/api-models) - Integración con API del mundo real

## Rendimiento

<BenchmarkChart
  :only-scenarios="['serialization', 'coercion', 'typeSerialization', 'schemaMultiFormat']"
  :only-libs="['QuickModel', 'superjson', 'class-transformer', 'Plain JS']"
  default-tab="performance"
/>
