# Mocks y Testing

Genera datos de prueba realistas para tests unitarios, Storybook, y prototipos con la API `mock()` de QuickModel.

## Por qué usar mock()

QuickModel genera mocks que respetan tus transformaciones: si el modelo tiene `createdAt: Date`, el mock devuelve una instancia `Date` real, no un string.

## API Básica

```typescript
import { QModel, Quick } from 'quickmodel';

interface IUser {
	id: string;
	name: string;
	email: string;
	age: number;
	createdAt: string;
	tags: string[];
	isActive: boolean;
}

@Quick({ createdAt: Date, tags: Set })
class User extends QModel<IUser> {
	declare id: string;
	declare name: string;
	declare email: string;
	declare age: number;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare isActive: boolean;
}

// Instancia única con valores aleatorios realistas
const user = User.mock().random();
console.log(user instanceof User); // true
console.log(user.createdAt instanceof Date); // true ✅ respeta las transformaciones
console.log(user.tags instanceof Set); // true ✅

// Instancia con datos vacíos/por defecto
const emptyUser = User.mock().empty();
console.log(emptyUser.name); // '' (string vacío)
console.log(emptyUser.age); // 0

// Instancia con valores de muestra predecibles
const sampleUser = User.mock().sample();
// Siempre devuelve los mismos datos (útil para snapshots)

// Instancia con todos los campos (incluyendo opcionales)
const fullUser = User.mock().full();

// Instancia solo con los campos requeridos
const minimalUser = User.mock().minimal();
```

## Arrays de Mocks

```typescript
// 5 usuarios aleatorios
const users = User.mock().array(5);
console.log(users.length); // 5
console.log(users[0] instanceof User); // true

// Array con tipo específico
const samples = User.mock().array(3, 'sample'); // valores predecibles
const empties = User.mock().array(2, 'empty'); // valores vacíos

// Array con overrides por índice
const namedUsers = User.mock().array(3, 'random', (idx) => ({
	name: `Usuario ${idx + 1}`,
	email: `user${idx + 1}@test.com`,
}));
console.log(namedUsers[0].name); // 'Usuario 1'
console.log(namedUsers[2].name); // 'Usuario 3'
```

## Overrides: Sobreescribir Campos Específicos

```typescript
// Solo sobreescribir los campos que nos interesan
const adminUser = User.mock().random({ isActive: true, tags: [] });
console.log(adminUser.isActive); // true (sobreescrito)
console.log(adminUser.name); // nombre aleatorio generado

// Mock vacío con valores específicos
const testUser = User.mock().empty({
	name: 'Test User',
	email: 'test@example.com',
});
console.log(testUser.name); // 'Test User'
console.log(testUser.age); // 0 (vacío por defecto)
```

## Objetos Planos (sin instancia de modelo)

A veces necesitas el objeto plano de la interfaz, no la instancia del modelo:

```typescript
// Objeto de la interfaz (no es instancia de User)
const userData = User.mock().interfaceRandom();
// userData.createdAt es string (formato interfaz), no Date

// Array de objetos planos
const usersData = User.mock().interfaceArray(5);

// Útil para preparar fixtures de API:
const apiFixture = User.mock().interfaceRandom({
	email: 'fixture@test.com',
});
// Pásalo directamente a tu función que mockea fetch()
```

## Tests Unitarios con Vitest / Jest

```typescript
import { describe, it, expect } from 'vitest';
import { QModel, Quick, QRule } from 'quickmodel';

interface IOrder {
	id: string;
	total: number;
	status: 'pending' | 'paid' | 'cancelled';
	createdAt: string;
}

@Quick({ createdAt: Date })
class Order extends QModel<IOrder> {
	declare id: string;

	@QRule({
		predicate: (val: number) => val > 0,
		message: 'El total debe ser positivo',
	})
	declare total: number;

	declare status: 'pending' | 'paid' | 'cancelled';
	declare createdAt: Date;
}

describe('Order', () => {
	it('transforma createdAt a Date', () => {
		const order = Order.mock().random();
		expect(order.createdAt).toBeInstanceOf(Date);
	});

	it('falla la validación si total es 0', () => {
		const order = Order.mock().random({ total: 0 });
		const result = order.$qm.checkRules();
		expect(result.valid).toBe(false);
		expect(result.errors[0].field).toBe('total');
	});

	it('pasa la validación con datos correctos', () => {
		const order = Order.mock().random({ total: 99.99, status: 'paid' });
		expect(order.$qm.isValid()).toBe(true);
	});

	it('serializa correctamente', () => {
		const order = Order.mock().sample({ total: 50 });
		const plain = order.$qm.serialize();
		expect(typeof plain.createdAt).toBe('string');
		expect(plain.total).toBe(50);
	});
});
```

## Storybook: Generar Props de Ejemplo

```typescript
// UserCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { UserCard } from './UserCard';
import { User } from '../models/user.model';

const meta: Meta<typeof UserCard> = {
	component: UserCard,
};

export default meta;
type IStory = StoryObj<typeof UserCard>;

export const Default: IStory = {
	args: {
		user: User.mock().random(),
	},
};

export const InactiveUser: IStory = {
	args: {
		user: User.mock().random({ isActive: false }),
	},
};

export const NewUser: IStory = {
	args: {
		// Usuario recién creado (hoy)
		user: User.mock().random({
			createdAt: new Date().toISOString(),
			tags: [],
		}),
	},
};

export const MultipleUsers: IStory = {
	args: {
		users: User.mock().array(3, 'random'),
	},
};
```

## Fixtures para E2E Tests

```typescript
// fixtures/users.ts
export const USERS = {
	admin: User.mock().sample({ isActive: true }),

	// Para testing de paginación
	list: User.mock().array(20, 'random', (idx) => ({
		email: `user${idx}@fixture.com`,
	})),

	// Usuario con datos vacíos para tests de formularios vacíos
	empty: User.mock().empty(),
};
```

## Modelos con Tipos Complejos

El generador de mocks respeta todos los transformadores:

```typescript
interface IReport {
	title: string;
	createdAt: string;
	tags: string[];
	metadata: [string, unknown][];
	expiresAt: string;
	correlationId: string; // Symbol como string
}

@Quick({
	createdAt: Date,
	tags: Set,
	metadata: Map,
	expiresAt: Date,
	correlationId: Symbol,
})
class Report extends QModel<IReport> {
	declare title: string;
	declare createdAt: Date;
	declare tags: Set<string>;
	declare metadata: Map<string, unknown>;
	declare expiresAt: Date;
	declare correlationId: symbol;
}

const report = Report.mock().random();
console.log(report.createdAt instanceof Date); // true ✅
console.log(report.tags instanceof Set); // true ✅
console.log(report.metadata instanceof Map); // true ✅
console.log(typeof report.correlationId); // 'symbol' ✅
```

## Mejores Prácticas

```typescript
// ✅ Usa .sample() para tests de snapshot (datos predecibles)
const snapshot = User.mock().sample();
expect(snapshot).toMatchSnapshot();

// ✅ Usa .random() para datos de prueba en unitarios
const user = User.mock().random({ email: 'test@example.com' });

// ✅ Usa .array() para tests de listas/paginación
const page = User.mock().array(10);

// ✅ Usa .interfaceRandom() para preparar fixtures de HTTP mock
fetchMock.mockResponse(JSON.stringify(User.mock().interfaceRandom()));

// ❌ Evitar hardcodear mocks a mano cuando QModel puede generarlos
const user = {
	// ❌ propenso a errores, desincronizado del modelo
	id: '1',
	name: 'test',
	createdAt: '2026-01-01', // type: string, no Date
};
```

## Próximos Pasos

- [Creación en Lote e Inmutabilidad](/es/examples/batch-readonly) - `createMany()` y `createReadonly()`
- [Validación](/es/examples/validation) - Tests con `checkRules()`
