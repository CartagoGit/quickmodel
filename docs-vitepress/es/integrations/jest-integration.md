# Integración con Jest

Los matchers de QuickModel usan el mismo contrato `{ pass, message() }` que `expect.extend()`
de Jest. **Sin adaptadores adicionales** — `quickmodelMatchers` funciona directamente en
cualquier proyecto Jest.

## Instalación

```bash
npm install quickmodel
```

## Configuración

Extiende el `expect` de Jest en tu
[setup file](https://jestjs.io/docs/configuration#setupfilesafterframework-array):

```typescript
// jest.setup.ts
import { expect } from '@jest/globals';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

```javascript
// jest.config.ts
export default {
	setupFilesAfterFramework: ['./jest.setup.ts'],
};
```

## Augmentación de TypeScript

Añade un fichero de declaración para que TypeScript reconozca los nuevos matchers:

```typescript
// types/jest-extended.d.ts
declare namespace jest {
	interface Matchers<R> {
		toBeValidQModel(): R;
		toHaveQRuleError(field: string, message?: string): R;
		toHaveQField(fieldName: string): R;
		toMatchQModel(expected: object): R;
		toBeIntact(): R;
		toHaveDirtyField(field: string): R;
	}
}
```

## Matchers disponibles

### `toBeValidQModel()`

Comprueba que la instancia pasa todas las validaciones `@QRule`.

```typescript
const dto = new UserDto({
	id: '1',
	username: 'alice',
	email: 'alice@example.com',
});
expect(dto).toBeValidQModel();
expect(invalidDto).not.toBeValidQModel();
```

### `toHaveQRuleError(field, message?)`

Comprueba que `checkRules()` produce un error en el campo especificado.
Opcionalmente verifica el mensaje de error (coincidencia parcial o total).

```typescript
const dto = new UserDto({ username: 'x', email: 'no-es-email' });
expect(dto).toHaveQRuleError('username'); // cualquier error
expect(dto).toHaveQRuleError('email', 'Email inválido'); // con mensaje
expect(dto).not.toHaveQRuleError('id'); // sin errores
```

### `toHaveQField(fieldName)`

Comprueba que una propiedad tiene el decorador `@QField` (recorre la cadena de prototipos).

```typescript
expect(dto).toHaveQField('email');
expect(dto).not.toHaveQField('internalSecret');
```

### `toMatchQModel(expected)`

Igualdad profunda usando `serialize()` — incluye valores `@QComputed`.

```typescript
const updated = original.$qm.copy({ username: 'bob' });
expect(updated).not.toMatchQModel(original);
```

### `toBeIntact()`

Comprueba que `hasIntegrity()` devuelve `true`. Una instancia recién creada siempre es íntegra.

```typescript
expect(new UserDto({ ... })).toBeIntact();
```

### `toHaveDirtyField(field)`

Comprueba que `isDirty(field)` devuelve `true` — el campo fue mutado desde la creación.

```typescript
dto.username = 'bob';
expect(dto).toHaveDirtyField('username');
expect(dto).not.toHaveDirtyField('email');
```

## Ejemplo completo

```typescript
// tests/order.test.ts
import { describe, test, expect, beforeEach } from '@jest/globals';
import { QModel, Quick, QRule, QField, QComputed } from 'quickmodel';

@Quick(
	{
		orderId: 'string',
		amount: 'number',
		currency: 'string',
		createdAt: Date,
		tags: Set,
	},
	{ unknownPropertyPolicy: 'strip' }
)
class OrderDto extends QModel<{
	orderId: string;
	amount: number;
	currency: string;
	createdAt: Date;
	tags: Set<string>;
}> {
	@QField({ label: 'Importe', required: true })
	@QRule((v: number) => v > 0, 'El importe debe ser positivo')
	@QRule((v: number) => v <= 1_000_000, 'Importe excede el límite')
	declare amount: number;

	@QField({ label: 'Moneda', required: true })
	@QRule(
		(v: string) => /^[A-Z]{3}$/.test(v),
		'La moneda debe ser un código ISO de 3 letras'
	)
	declare currency: string;

	@QField({ label: 'ID de pedido', required: true })
	@QRule((v: string) => v.length > 0, 'El ID no puede estar vacío')
	declare orderId: string;

	declare createdAt: Date;
	declare tags: Set<string>;

	@QComputed()
	get resumen() {
		return `${this.orderId}: ${this.amount} ${this.currency}`;
	}
}

describe('OrderDto', () => {
	let pedidoValido: OrderDto;

	beforeEach(() => {
		pedidoValido = new OrderDto({
			orderId: 'PED-001',
			amount: 99.99,
			currency: 'EUR',
			createdAt: '2025-01-15T10:00:00Z',
			tags: ['urgente'],
		});
	});

	test('pedido válido pasa todas las reglas', () => {
		expect(pedidoValido).toBeValidQModel();
	});

	test('pedido inválido falla', () => {
		const mal = new OrderDto({
			orderId: '',
			amount: -5,
			currency: 'eu',
			createdAt: '',
			tags: [],
		});
		expect(mal).not.toBeValidQModel();
		expect(mal).toHaveQRuleError('amount', 'El importe debe ser positivo');
		expect(mal).toHaveQRuleError(
			'currency',
			'La moneda debe ser un código ISO de 3 letras'
		);
	});

	test('nuevo pedido es íntegro', () => {
		expect(pedidoValido).toBeIntact();
	});

	test('la mutación es rastreada', () => {
		pedidoValido.currency = 'USD';
		expect(pedidoValido).toHaveDirtyField('currency');
		expect(pedidoValido).not.toHaveDirtyField('amount');
	});

	test('coerción de Date (string → Date)', () => {
		expect(pedidoValido.createdAt).toBeInstanceOf(Date);
	});

	test('coerción de Set (array → Set)', () => {
		expect(pedidoValido.tags).toBeInstanceOf(Set);
	});
});
```

## Jasmine

Jasmine usa `jasmine.addMatchers()` con un patrón de factories.
Envuelve `quickmodelMatchers` con el siguiente adaptador:

```typescript
// test/setup/quickmodel-jasmine.ts
import { quickmodelMatchers } from 'quickmodel/matchers';

type IMatcherFn = (
	received: object,
	...args: unknown[]
) => { pass: boolean; message: () => string };

function toJasmineMatchers(matchers: Record<string, IMatcherFn>) {
	const result: jasmine.CustomMatcherFactories = {};
	for (const [name, fn] of Object.entries(matchers)) {
		result[name] = () => ({
			compare: (actual: object, ...args: unknown[]) => {
				const res = fn(actual, ...args);
				return { pass: res.pass, message: res.message() };
			},
		});
	}
	return result;
}

// En un beforeAll() o fichero de setup de Jasmine:
jasmine.addMatchers(
	toJasmineMatchers(quickmodelMatchers as Record<string, IMatcherFn>)
);
```

Luego escribe los tests con naturalidad:

```typescript
describe('OrderDto — Jasmine', () => {
  it('debe ser válido', () => {
    expect(new OrderDto({ ... }) as any).toBeValidQModel();
  });

  it('debe detectar errores de reglas', () => {
    const mal = new OrderDto({ orderId: '', amount: -5, currency: 'eu', ... });
    expect(mal as any).toHaveQRuleError('amount', 'El importe debe ser positivo');
  });
});
```

## Véase también

- [Vitest Custom Matchers](./vitest-matchers.md)
- [Otros frameworks de testing](./test-runners-integration.md)
- [Validación con @QRule](../guide/validation.md)
