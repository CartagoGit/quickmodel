# Inicio Rápido

Esta guía te llevará a través de la creación de tu primer QuickModel en 5 minutos.

## El Problema

Cuando trabajas con APIs, los datos vienen como JSON con solo tipos primitivos. Tipos complejos como `Date`, `BigInt`, `Set` y `Map` se serializan como strings o arrays:

```typescript
// Respuesta de API
const apiResponse = {
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z', // ❌ String, no Date
	balance: '999999999999999', // ❌ String, no BigInt
	tags: ['typescript', 'node'], // ❌ Array, no Set
	metadata: [['key1', 'val1']], // ❌ Array, no Map
};
```

## La Solución: QuickModel

QuickModel automatiza estas transformaciones usando decoradores.

## Paso 1: Define tu Interfaz

Crea una interfaz que refleje la estructura JSON cruda:

```typescript
// Interfaz del backend (tipos compatibles con JSON)
interface IUser {
	id: number;
	name: string;
	createdAt: string; // String de fecha ISO
	balance: string; // BigInt como string
	tags: string[]; // Array
	metadata: [string, any][]; // Map como array de tuplas
}
```

## Paso 2: Crea tu Modelo

Usa el decorador `@Quick()` para especificar las transformaciones:

```typescript
import { QModel, Quick } from 'quickmodel';

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}
```

## Paso 3: Usa tu Modelo

Ahora puedes crear instancias con transformación automática de tipos:

```typescript
const user = new User({
	id: 1,
	name: 'John Doe',
	createdAt: '2026-01-10T00:00:00.000Z',
	balance: '999999999999999',
	tags: ['typescript', 'node'],
	metadata: [
		['key1', 'val1'],
		['key2', 'val2'],
	],
});

// ¡Todos los tipos se transforman automáticamente! ✅
console.log(user.createdAt instanceof Date); // true
console.log(typeof user.balance); // 'bigint'
console.log(user.tags instanceof Set); // true
console.log(user.metadata instanceof Map); // true
```

## Paso 4: Serializa de Vuelta a JSON

Cuando necesites enviar datos de vuelta a la API, usa `serialize()` para obtener un objeto plano, o `toJSON()` para un string JSON:

```typescript
// serialize() → objeto JavaScript plano (lo más habitual)
const plain = user.$qSerialize();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',
//   balance: '999999999999999',
//   tags: ['typescript', 'node'],
//   metadata: [['key1', 'val1'], ['key2', 'val2']]
// }

// toJSON() → string JSON (para cuerpo de fetch, WebSockets, etc.)
const jsonStr = user.toJSON();
// '{"id":1,"name":"John Doe",...}'
```

## Paso 5: Testing con Mocks

¿Necesitas datos falsos para pruebas? QuickModel los genera automáticamente basándose en tus tipos:

```typescript
// Obtén 5 usuarios con datos realistas y aleatorios
const fakeUsers = User.mock().array(5);

console.log(fakeUsers.length); // 5
console.log(fakeUsers[0].name); // "Alice Smith" (Aleatorio)
```

## Próximos Pasos

Ahora que entiendes lo básico:

- [QModel](/es/guide/qmodel) - Aprende sobre la clase base del modelo
- [Decorador @Quick](/es/guide/quick-decorator) - Profundiza en el decorador
- [Transformadores](/es/guide/transformers) - Ve todas las transformaciones disponibles
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con estructuras anidadas complejas
- [Ejemplos](/es/examples/basic) - Casos de uso del mundo real
