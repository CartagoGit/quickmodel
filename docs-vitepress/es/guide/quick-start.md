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

## Paso 1: Define tus Interfaces

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

// Interfaz de transformación en runtime (opcional pero recomendada)
interface IUserTransform {
	createdAt: Date;
	balance: bigint;
	tags: Set<string>;
	metadata: Map<string, any>;
}
```

## Paso 2: Crea tu Modelo

```typescript
import { QModel, Quick, QInterface } from '@cartago-git/quickmodel';

@Quick({
	createdAt: Date,
	balance: BigInt,
	tags: Set,
	metadata: Map,
})
class User extends QModel<IUser> implements QInterface<IUser, IUserTransform> {
	declare id: number;
	declare name: string;
	declare createdAt: Date;
	declare balance: bigint;
	declare tags: Set<string>;
	declare metadata: Map<string, any>;
}
```

## Paso 3: Usa tu Modelo

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

```typescript
const json = user.toJSON();
// {
//   id: 1,
//   name: 'John Doe',
//   createdAt: '2026-01-10T00:00:00.000Z',
//   balance: '999999999999999',
//   tags: ['typescript', 'node'],
//   metadata: [['key1', 'val1'], ['key2', 'val2']]
// }
```

## Sintaxis de Arrays

Para arrays de tipos transformados, usa notación de corchetes:

```typescript
interface IPost {
	dates: string[]; // Array de strings ISO
	tags: string[][]; // Array de arrays
}

@Quick({
	dates: [Date], // Transforma a Date[]
	tags: [Set], // Transforma a Set<string>[]
})
class Post extends QModel<IPost> {
	declare dates: Date[];
	declare tags: Set<string>[];
}
```

## Próximos Pasos

- [QModel](/es/guide/qmodel) - Aprende sobre la clase base del modelo
- [Decorador @Quick](/es/guide/quick-decorator) - Profundiza en el decorador
- [Transformadores](/es/guide/transformers) - Ve todas las transformaciones disponibles
- [Ejemplos](/es/examples/) - Casos de uso del mundo real
