# Matchers Personalizados para Vitest

QuickModel incluye un conjunto de matchers personalizados para Vitest (y el runner de Bun)
que hacen las aserciones sobre instancias `QModel` expresivas y legibles.

## Instalación

```bash
npm install quickmodel
```

Los matchers están disponibles como sub-punto de entrada:

```typescript
import { quickmodelMatchers } from 'quickmodel/matchers';
```

## Configuración

Extiende el `expect` de Vitest en tu archivo de setup:

```typescript
// vitest.setup.ts
import { expect } from 'vitest';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		setupFiles: ['./vitest.setup.ts'],
	},
});
```

### Bun Test

```typescript
// tests/setup.ts
import { expect } from 'bun:test';
import { quickmodelMatchers } from 'quickmodel/matchers';

expect.extend(quickmodelMatchers);
```

## Aumentación de TypeScript

El punto de entrada `matchers` aumenta automáticamente la interfaz `Assertion` de Vitest.
No se necesitan importaciones adicionales en los archivos de test.

```typescript
// Completamente tipado — sin importaciones manuales en tests
expect(dto).toBeValidQModel();
expect(dto).toHaveQRuleError('email');
```

## Matchers Disponibles

### `toBeValidQModel()`

Verifica que el valor es una instancia de `QModel`.

```typescript
const dto = new UsuarioDto({ id: '1', nombre: 'Alice' });
expect(dto).toBeValidQModel();
```

### `toHaveQRuleError(campo, mensaje?)`

Verifica que `qCheckRules()` produce un error en el campo especificado. Opcionalmente
comprueba el mensaje de error.

```typescript
const dto = new RegistroDto({
	username: 'x',
	email: 'no-es-email',
	age: 15,
	role: 'user',
});

expect(dto).toHaveQRuleError('username'); // cualquier error en 'username'
expect(dto).toHaveQRuleError('username', 'too short'); // coincidencia parcial del mensaje
expect(dto).toHaveQRuleError('email', 'Email no válido'); // exacto o parcial
expect(dto).toHaveQRuleError('age', 'Debes tener 18 años'); // mensaje completo
```

### `toHaveQField(nombreCampo)`

Verifica que la clase tiene el decorador `@QField` en la propiedad especificada.

```typescript
expect(dto).toHaveQField('email');
expect(dto).toHaveQField('username');
expect(dto).not.toHaveQField('secretoInterno'); // no decorado
```

### `toMatchQModel(esperado)`

Verifica en profundidad que la instancia `QModel` coincide con todas las propiedades de
`esperado`. Usa `$qSerialize()` para la comparación, por lo que los valores `@QComputed` están incluidos.

```typescript
const dto = new UsuarioDto({ id: '1', nombre: 'Alice', rol: 'admin' });
expect(dto).toMatchQModel({ id: '1', nombre: 'Alice' }); // coincidencia parcial
```

### `toBeIntact()`

Verifica que el modelo no tiene campos sucios — `$qIsDirty()` devuelve `false`. Útil para
comprobar que las instancias recién creadas no han sido mutadas accidentalmente.

```typescript
const dto = new UsuarioDto({ id: '1', nombre: 'Alice' });
expect(dto).toBeIntact();

dto.nombre = 'Bob';
expect(dto).not.toBeIntact();
```

### `toHaveDirtyField(nombreCampo)`

Verifica que un campo específico está sucio (ha sido mutado desde el último snapshot).

```typescript
const dto = new UsuarioDto({ id: '1', nombre: 'Alice' });
dto.nombre = 'Bob'; // mutación directa registra el campo

expect(dto).toHaveDirtyField('nombre');
expect(dto).not.toHaveDirtyField('id');
```

> **Nota**: `toHaveDirtyField` usa `$qIsDirty(campo)` que solo rastrea campos mutados
> directamente (`dto.campo = valor`). Usa `toBeIntact()` / `not.toBeIntact()` para comprobar
> si el modelo tiene algún cambio pendiente (incluyendo cambios vía `$qCopy()`).

## Ejemplo Completo

```typescript
import { describe, test, expect, beforeEach } from 'vitest';
import { QModel, Quick, QRule, QField } from 'quickmodel';

@Quick(
	{ id: 'string', username: 'string', email: 'string', age: 'number' },
	{ unknownPropertyPolicy: 'strip' }
)
class UsuarioDto extends QModel<IUsuario> {
	@QField({ label: 'Usuario', required: true })
	@QRule((v: string) => v.length >= 3, 'Usuario demasiado corto')
	declare username: string;

	@QField({ label: 'Email', widget: 'email', required: true })
	@QRule(
		(v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
		'Email no válido'
	)
	declare email: string;

	@QField({ label: 'Edad' })
	@QRule((v: number) => v >= 18, 'Debes tener 18 años o más')
	declare age: number;

	declare id: string;
}

describe('Matchers de UsuarioDto', () => {
	test('es un QModel válido', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toBeValidQModel();
	});

	test('la instancia recién creada está intacta', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toBeIntact();
	});

	test('detecta campo sucio tras mutación', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		dto.username = 'bob';
		expect(dto).toHaveDirtyField('username');
		expect(dto).not.toHaveDirtyField('email');
	});

	test('valida errores de reglas', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'x',
			email: 'malo',
			age: 15,
		});
		expect(dto).toHaveQRuleError('username', 'demasiado corto');
		expect(dto).toHaveQRuleError('email', 'Email no válido');
		expect(dto).toHaveQRuleError('age', 'Debes tener 18');
	});

	test('anotaciones de campo', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toHaveQField('username');
		expect(dto).toHaveQField('email');
		expect(dto).not.toHaveQField('id'); // no decorado con @QField
	});

	test('coincidencia parcial del modelo', () => {
		const dto = new UsuarioDto({
			id: '1',
			username: 'alice',
			email: 'alice@example.com',
			age: 25,
		});
		expect(dto).toMatchQModel({
			username: 'alice',
			email: 'alice@example.com',
		});
	});
});
```

## Ver También

- [Referencia de la API QModel](./qmodel.md)
- [QField](./qfield.md)
- [Formularios](./forms.md)
