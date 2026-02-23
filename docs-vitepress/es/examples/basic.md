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
	createdAt: string; // String de fecha ISO desde API
	updatedAt: string; // String de fecha ISO desde API
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

## Explicación Paso a Paso

### 1. Define la Interfaz

La interfaz representa el formato de datos de tu API (tipos compatibles con JSON):

```typescript
interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string; // Las fechas vienen como strings desde JSON
	updatedAt: string;
}
```

### 2. Aplica el Decorador @Quick

Especifica qué propiedades necesitan transformación:

```typescript
@Quick({
  createdAt: Date,  // Transformar string → Date
  updatedAt: Date   // Transformar string → Date
})
```

### 3. Declara Propiedades

Usa `declare` para definir tipos en runtime sin generar código:

```typescript
class User extends QModel<IUser> {
	declare id: number; // No necesita transformación
	declare name: string; // No necesita transformación
	declare email: string; // No necesita transformación
	declare createdAt: Date; // Será transformado
	declare updatedAt: Date; // Será transformado
}
```

### 4. Crea Instancias

Pasa los datos de la API directamente al constructor:

```typescript
const user = new User(apiResponse);
// Todas las transformaciones ocurren automáticamente
```

### 5. Serializa de Vuelta

Usa `toJSON()` para convertir de vuelta al formato de API:

```typescript
const json = user.toJSON();
// Las fechas se convierten de vuelta a strings ISO
```

## Trabajando con Arrays

Transforma arrays de datos:

```typescript
interface IPost {
	id: string;
	title: string;
	publishedAt: string;
	tags: string[];
}

@Quick({
	publishedAt: Date,
	tags: Set, // Transformar array → Set
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
	{
		id: '2',
		title: 'Segundo Post',
		publishedAt: '2026-01-02',
		tags: ['javascript', 'web'],
	},
];

// Transformar todos los posts
const transformedPosts = posts.map((post) => new Post(post));

console.log(transformedPosts[0].publishedAt instanceof Date); // true
console.log(transformedPosts[0].tags instanceof Set); // true
```

## Arrays de Tipos Transformados

Usa notación de corchetes para arrays de tipos transformados:

```typescript
interface ICalendar {
	name: string;
	events: string[]; // Array de strings de fecha ISO
}

@Quick({
	events: [Date], // Transformar a Date[]
})
class Calendar extends QModel<ICalendar> {
	declare name: string;
	declare events: Date[];
}

const calendar = new Calendar({
	name: 'Mi Calendario',
	events: [
		'2026-01-10T10:00:00.000Z',
		'2026-01-15T14:00:00.000Z',
		'2026-01-20T09:00:00.000Z',
	],
});

console.log(calendar.events[0] instanceof Date); // true
console.log(calendar.events.length); // 3
```

## Usando el Método create()

Método de factoría alternativa para crear instancias:

```typescript
const user = User.create({
	id: 1,
	name: 'Jane Doe',
	email: 'jane@example.com',
	createdAt: '2026-01-10',
	updatedAt: '2026-01-10',
});

console.log(user instanceof User); // true
```

## Generación de Mocks

Genera datos de prueba fácilmente:

```typescript
// Mock único con datos aleatorios
const mockUser = User.mock().random();
console.log(mockUser.createdAt instanceof Date); // true ✅ respeta transformaciones

// Múltiples mocks aleatorios
const mockUsers = User.mock().array(5);
console.log(mockUsers.length); // 5

// Mock con sobrescrituras de campos específicos
const customUser = User.mock().random({
	name: 'Usuario Test',
	email: 'test@example.com',
});
console.log(customUser.name); // 'Usuario Test'

// Mock vacío
const emptyUser = User.mock().empty();
// Mock con valores predecibles (para snapshots)
const sampleUser = User.mock().sample();
```

## Ejemplo Completo

Aquí tienes un ejemplo completo con todas las características:

```typescript
import { QModel, Quick } from '@cartago-git/quickmodel';

interface IUser {
	id: number;
	name: string;
	email: string;
	createdAt: string;
	updatedAt: string;
	tags: string[];
}

@Quick({
	createdAt: Date,
	updatedAt: Date,
	tags: Set,
})
class User extends QModel<IUser> {
	declare id: number;
	declare name: string;
	declare email: string;
	declare createdAt: Date;
	declare updatedAt: Date;
	declare tags: Set<string>;
}

// Simular respuesta de API
const apiData = {
	id: 1,
	name: 'John Doe',
	email: 'john@example.com',
	createdAt: '2026-01-10T10:00:00.000Z',
	updatedAt: '2026-01-10T15:30:00.000Z',
	tags: ['developer', 'typescript', 'node'],
};

// Crear instancia del modelo
const user = new User(apiData);

// Trabajar con tipos transformados
console.log('Usuario creado:', user.createdAt.toLocaleDateString());
console.log('Tags:', Array.from(user.tags).join(', '));

// Modificar datos
user.name = 'Jane Doe';
user.tags.add('quickmodel');

// Serializar de vuelta
const updatedData = user.toJSON();
console.log('Datos actualizados:', updatedData);

// Generar mocks para testing
const testUsers = User.mock().array(3, 'random', () => ({ tags: ['test'] }));
console.log('Usuarios de prueba:', testUsers.length);
```

## Mejores Prácticas

### 1. Usa declare para Propiedades

```typescript
// ✅ Bien - sin código en runtime
declare;
createdAt: Date;

// ❌ Evitar - genera código innecesario
createdAt: Date = new Date();
```

### 2. Sé Explícito con las Transformaciones

```typescript
// ✅ Bien - transformaciones explícitas
@Quick({
  createdAt: Date,
  tags: Set
})

// ❌ Mal - faltan transformaciones
@Quick()  // ¡Las fechas no se transformarán!
```

### 3. Usa Notación de Corchetes para Arrays

```typescript
// ✅ Bien - sintaxis de array clara
@Quick({
  dates: [Date]
})

// ❌ Mal - ambiguo
@Quick({
  dates: Date  // ¿Date único o Date[]?
})
```

## Próximos Pasos

- [Modelos de API](/es/examples/api-models) - Integra con APIs REST
- [Tipos Complejos](/es/examples/complex-types) - Transformaciones avanzadas
- [Modelos Anidados](/es/guide/nested-models) - Trabaja con datos anidados
