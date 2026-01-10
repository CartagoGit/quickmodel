# Uso Básico

Este ejemplo demuestra los conceptos fundamentales de QuickModel con código simple y práctico.

## Problema

Estás obteniendo datos de usuario de una API que devuelve fechas como strings ISO y quieres trabajar con objetos `Date` reales en tu código.

## Solución

Usa QuickModel para transformar automáticamente los datos:

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

// 1. Define tu interfaz (formato de API)
interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	updatedAt: string;
}

// 2. Crea tu modelo con transformaciones
@Quick({
	createdAt: Date,
	updatedAt: Date,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare updatedAt: Date;
}

// 3. Úsalo con datos de API
const apiResponse = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	createdAt: '2026-01-10T10:00:00.000Z',
	updatedAt: '2026-01-10T15:30:00.000Z',
};

const user = new User(apiResponse);

// 4. Trabaja con tipos transformados
console.log(user.createdAt instanceof Date); // true
console.log(user.createdAt.getFullYear()); // 2026

// 5. Serializa de vuelta a JSON
const json = user.toJSON();
console.log(json.createdAt); // '2026-01-10T10:00:00.000Z'
```

## Trabajando con Arrays

```typescript
@Quick({
	publishedAt: Date,
	tags: Set,
})
class Post extends QModel<IPost> {
	declare id: string;
	declare title: string;
	declare publishedAt: Date;
	declare tags: Set<string>;
}

const posts = [
	{
		id: '1',
		title: 'Primer Post',
		publishedAt: '2026-01-01',
		tags: ['typescript', 'node'],
	},
];

const transformedPosts = posts.map((p) => new Post(p));
```

## Arrays de Tipos Transformados

```typescript
@Quick({
	events: [Date],
})
class Calendar extends QModel<ICalendar> {
	declare name: string;
	declare events: Date[];
}
```

## Generación de Mocks

```typescript
const mockUser = User.mock();
const mockUsers = User.mock(5);
const customUser = User.mock({
	name: 'Usuario de Prueba',
});
```

## Próximos Pasos

- [Modelos de API](/es/examples/api-models) - Integra con APIs REST
- [Tipos Complejos](/es/examples/complex-types) - Transformaciones avanzadas
