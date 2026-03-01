# Validación con @QRule

Aprende a definir reglas de negocio en tus modelos con el decorador `@QRule` y a validar datos de forma sincrónica y asincrónica.

## Caso de Uso

Tienes un formulario de registro de usuario y necesitas validar que el email tenga formato correcto, que la contraseña cumpla requisitos mínimos y que la edad sea mayor de 18.

## Validación Sincrónica Básica

```typescript
import { QModel, Quick, QRule } from 'quickmodel';

interface IUserRegister {
	name: string;
	email: string;
	password: string;
	age: number;
}

@Quick()
class UserRegister extends QModel<IUserRegister> {
	declare name: string;

	@QRule({
		predicate: (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
		message: 'El email no tiene un formato válido',
	})
	declare email: string;

	@QRule({
		predicate: (value: string) => value.length >= 8,
		message: 'La contraseña debe tener al menos 8 caracteres',
	})
	@QRule({
		predicate: (value: string) => /[A-Z]/.test(value),
		message: 'La contraseña debe contener al menos una mayúscula',
	})
	@QRule({
		predicate: (value: string) => /[0-9]/.test(value),
		message: 'La contraseña debe contener al menos un número',
	})
	declare password: string;

	@QRule({
		predicate: (value: number) => value >= 18,
		message: 'Debes tener al menos 18 años para registrarte',
	})
	declare age: number;
}

// ✅ Datos válidos
const validUser = new UserRegister({
	name: 'María García',
	email: 'maria@example.com',
	password: 'MiPass123',
	age: 25,
});

const result = validUser.checkRules();
console.log(result.valid); // true
console.log(result.errors); // []

// ❌ Datos inválidos
const invalidUser = new UserRegister({
	name: 'Pedro',
	email: 'no-es-email',
	password: 'corta',
	age: 16,
});

const errors = invalidUser.checkRules();
console.log(errors.valid); // false
console.log(errors.errors);
// [
//   { field: 'email', message: 'El email no tiene un formato válido', value: 'no-es-email' },
//   { field: 'password', message: 'La contraseña debe tener al menos 8 caracteres', value: 'corta' },
//   { field: 'password', message: 'La contraseña debe contener al menos una mayúscula', value: 'corta' },
//   { field: 'password', message: 'La contraseña debe contener al menos un número', value: 'corta' },
//   { field: 'age', message: 'Debes tener al menos 18 años para registrarte', value: 16 },
// ]
```

## isValid() — Comprobación Rápida

Usa `isValid()` para un check booleano rápido que combina integridad + reglas:

```typescript
if (!invalidUser.isValid()) {
	console.log('El formulario tiene errores');
}

// En un flujo de guardado:
async function saveUser(data: IUserRegister): Promise<void> {
	const user = new UserRegister(data);

	if (!user.isValid()) {
		const report = user.validationReport();
		throw new Error(
			`Datos inválidos: ${report.rules.errors.map((e) => e.message).join(', ')}`
		);
	}

	// Continuar con el guardado...
	await fetch('/api/users', {
		method: 'POST',
		body: user.toJSON(), // toJSON() ya devuelve un string JSON
	});
}
```

## validationReport() — Informe Completo

`validationReport()` combina chequeos de integridad + reglas `@QRule` en un único objeto:

```typescript
interface IProduct {
	id: string;
	name: string;
	price: string; // Viene como string del backend
	stock: number;
}

@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare id: string;

	@QRule({
		predicate: (value: string) => value.trim().length > 0,
		message: 'El nombre no puede estar vacío',
	})
	declare name: string;

	declare price: bigint; // Transformado a BigInt

	@QRule({
		predicate: (value: number) => value >= 0,
		message: 'El stock no puede ser negativo',
	})
	declare stock: number;
}

const product = new Product({
	id: 'P001',
	name: '',
	price: '9999',
	stock: -5,
});

const report = product.validationReport();
console.log(report.valid); // false
console.log(report.integrity); // [] (no hay problemas de integridad)
console.log(report.rules.errors);
// [
//   { field: 'name', message: 'El nombre no puede estar vacío', value: '' },
//   { field: 'stock', message: 'El stock no puede ser negativo', value: -5 },
// ]
```

## Validación con Context (acceso al modelo completo)

Las reglas pueden acceder al objeto completo como segundo argumento:

```typescript
interface IDateRange {
	startDate: string;
	endDate: string;
}

@Quick({ startDate: Date, endDate: Date })
class DateRange extends QModel<IDateRange> {
	declare startDate: Date;

	@QRule({
		predicate(value: Date, data: DateRange) {
			return value > data.startDate;
		},
		message: 'La fecha de fin debe ser posterior a la fecha de inicio',
	})
	declare endDate: Date;
}

const range = new DateRange({
	startDate: '2026-03-01',
	endDate: '2026-02-01', // ❌ anterior a startDate
});

console.log(range.checkRules().errors[0].message);
// 'La fecha de fin debe ser posterior a la fecha de inicio'
```

## Validación Asincrónica con checkRulesAsync()

Para reglas que requieren llamadas a base de datos o APIs:

```typescript
interface INewUser {
	username: string;
	email: string;
}

@Quick()
class NewUser extends QModel<INewUser> {
	@QRule({
		predicate: async (value: string) => {
			// Simula consulta a BD para comprobar disponibilidad
			const response = await fetch(`/api/check-username?name=${value}`);
			const { available } = await response.json();
			return available;
		},
		message: 'El nombre de usuario ya está en uso',
	})
	declare username: string;

	declare email: string;
}

const newUser = new NewUser({
	username: 'john_doe',
	email: 'john@example.com',
});

// Ejecutar con timeout de 3 segundos por predicado
const asyncResult = await newUser.checkRulesAsync({
	timeoutMs: 3000,
	timeoutMessage: 'No se pudo verificar la disponibilidad del usuario',
	mode: 'parallel', // Ejecuta todos los predicados a la vez
});

console.log(asyncResult.valid); // true o false según la BD
```

## createMany() — Creación en Lote con Validación

Crea múltiples instancias de una vez, separando las válidas de las erróneas:

```typescript
const rawUsers: IUserRegister[] = [
	{ name: 'Ana', email: 'ana@example.com', password: 'ValidPass1', age: 22 },
	{ name: 'Bob', email: 'email-invalido', password: 'corta', age: 16 }, // ❌
	{
		name: 'Carlos',
		email: 'carlos@test.com',
		password: 'OtraPass2',
		age: 30,
	},
	{ name: 'Diana', email: 'diana@co.uk', password: 'nonum', age: 25 }, // ❌
];

const { instances, errors } = UserRegister.createMany(rawUsers);

console.log(`Usuarios válidos: ${instances.length}`); // 2
console.log(`Usuarios con errores: ${errors.length}`); // 2

errors.forEach(({ index, errors: errs }) => {
	console.log(`Fila ${index}:`, errs.map((e) => e.message).join(', '));
});
// Fila 1: El email no tiene un formato válido, La contraseña debe tener al menos 8 caracteres, ...
// Fila 3: La contraseña debe contener al menos un número

// Incluir instancias erróneas también en el resultado:
const { instances: all } = UserRegister.createMany(rawUsers, {
	includeErrorInstances: true,
});
console.log(`Total procesados: ${all.length}`); // 4
```

## Mensajes Dinámicos (i18n)

Los mensajes pueden ser funciones para soportar i18n en runtime:

```typescript
// En una app con sistema de traducción
let currentLang = 'es';

const MESSAGES = {
	es: { minAge: 'Debes tener al menos 18 años' },
	en: { minAge: 'You must be at least 18 years old' },
};

@Quick()
class InternationalForm extends QModel<{ age: number }> {
	@QRule({
		predicate: (value: number) => value >= 18,
		message: () => MESSAGES[currentLang as keyof typeof MESSAGES].minAge,
	})
	declare age: number;
}

const form = new InternationalForm({ age: 15 });
console.log(form.checkRules().errors[0].message); // 'Debes tener al menos 18 años'

currentLang = 'en';
console.log(form.checkRules().errors[0].message); // 'You must be at least 18 years old'
```

## Mejores Prácticas

### Combina @QRule con integridad de transformadores

```typescript
// checkIntegrity() detecta fechas inválidas, BigInt malformados, etc.
// checkRules() evalúa la lógica de negocio
// isValid() = ambos pasan

const product = new Product({
	id: 'P001',
	name: 'TV',
	price: 'no-es-numero',
	stock: 5,
});
const integrityIssues = product.checkIntegrity();
// [{ field: 'price', error: 'Cannot convert ... to BigInt' }]
```

### Usa mode: 'serial' cuando el orden importa

```typescript
const result = await model.checkRulesAsync({
	mode: 'serial', // Ejecuta en orden declarativo, para del todo en el primero que falla
});
```

## Próximos Pasos

- [Formularios](/es/examples/forms) - Genera schemas de formulario con `@QField`
- [Creación en Lote](/es/examples/batch-readonly) - `createMany()` a fondo
- [Referencia API](/tsdoc/) - Documentación completa de `checkRules()`
