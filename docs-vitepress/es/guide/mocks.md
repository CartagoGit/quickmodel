# Generación de Mocks

QuickModel incluye un potente generador de mocks integrado impulsado por `@faker-js/faker`, que viene **incluido automáticamente** con la librería. No necesitas instalar nada extra.

## Uso Básico

Cada QModel tiene un método estático `.mock()` que devuelve un **Mock Builder**. Debes llamar a `.random()` o `.array()` para obtener los datos reales.

```typescript
@Quick({ name: String, email: String, isActive: Boolean })
class User extends QModel<IUser> {
	declare name: string;
	declare email: string;
	declare isActive: boolean;
}

// 1. Generar una sola instancia aleatoria
const user = User.mock().random();
console.log(user instanceof User); // true

// 2. Generar un array de 10 instancias
const users = User.mock().array(10);
console.log(users.length); // 10

// 3. Generar con sobrescrituras parciales (datos fijos)
const admin = User.mock().random({ role: 'admin' });
console.log(admin.role); // 'admin'
```

## Cómo Funciona

QuickModel infiere automáticamente datos falsos apropiados basados en tus definiciones de tipos:

| Tipo                    | Mock Generado                                                        |
| :---------------------- | :------------------------------------------------------------------- |
| `String` / `'string'`   | String aleatorio / Contexto inferido ('email', 'name', 'uuid', etc.) |
| `Number` / `'number'`   | Número aleatorio                                                     |
| `Boolean` / `'boolean'` | Booleano aleatorio                                                   |
| `Date` / `'date'`       | Fecha reciente aleatoria                                             |
| `BigInt` / `'bigint'`   | Entero grande aleatorio                                              |
| `RegExp` / `'regexp'`   | Patrón regex aleatorio                                               |
| `Symbol` / `'symbol'`   | Símbolo aleatorio                                                    |
| `URL` / `'url'`         | URL aleatoria                                                        |
| `Error` / `'error'`     | Objeto Error aleatorio                                               |
| `Map` / `'map'`         | Map con entradas aleatorias                                          |
| `Set` / `'set'`         | Set con valores aleatorios                                           |
| Tipos `Buffer`          | `ArrayBuffer`, `DataView`, `Uint8Array`, `Float32Array`, etc.        |

### ¿Por qué tengo que especificar los tipos?

Te preguntarás: _"Si ya declaré `name: string`, ¿por qué necesito `@Quick({ name: String })`?"_

**Respuesta:** Los tipos de TypeScript (`: string`) se **eliminan** al compilar a JavaScript. En tiempo de ejecución, la librería no puede ver tus definiciones de tipos de TypeScript. El decorador `@Quick` (o `@QType`) proporciona los **metadatos en tiempo de ejecución** necesarios para que la librería sepa cómo generar mocks y deserializar datos.

### Inferencia Inteligente

El generador de mocks es lo suficientemente inteligente como para adivinar el contexto a partir de los nombres de las propiedades.

```typescript
@Quick({
  email: String,       // Genera "alice@example.com"
  firstName: String,   // Genera "Alice"
  avatar: URL,         // Genera "https://placeimg.com..."
  createdAt: Date      // Genera "2023-11-20T..."
})
```

## Uso Avanzado

### Modelos Anidados

Los mocks se generan recursivamente. Los modelos anidados también serán completamente mockeados.

```typescript
@Quick({ address: Address })
class User extends QModel<IUser> {
	declare address: Address;
}

const user = User.mock().random();
console.log(user.address.city); // "Nueva York" (Aleatorio)
```

### Arrays Parciales

Puedes crear arrays donde todos los elementos compartan algunas propiedades comunes:

```typescript
// 10 usuarios, todos con isActive = true
const activeUsers = User.mock().array(10, { isActive: true });
```

Esto genera 10 usuarios únicos, pero **fuerza** que todos tengan `isActive: true`.

## Patrones de Testing

### Tests Unitarios

```typescript
describe('UserService', () => {
	it('should create a valid user', () => {
		const mockUser = User.mock().random({
			name: 'Usuario Test',
		});

		const savedUser = service.save(mockUser);
		expect(savedUser.name).toBe('Usuario Test');
	});
});
```

### Poblado de Base de Datos

Perfecto para poblar bases de datos locales:

```typescript
async function seedKeywords() {
	const users = User.mock().array(50);
	await db.insertMany('users', users);
	console.log('Seeded 50 users!');
}
```

## Mejores Prácticas

1. **Sobrescrituras Explícitas**: Si un test depende de un valor específico (e.g., `role: 'admin'`), SIEMPRE sobrescríbelo. No confíes en el azar.
2. **Fixtures**: Crea un archivo `fixtures.ts` dedicado para exportar configuraciones comunes de mocks.

```typescript
// fixtures.ts
export const mockAdmin = User.mock().random({ role: 'admin' });
export const mockGuest = User.mock().random({ role: 'guest' });
```
