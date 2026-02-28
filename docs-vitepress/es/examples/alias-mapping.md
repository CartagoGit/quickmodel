# Alias y Mapeo con @QAlias

Mapea propiedades entre el formato snake_case de tu API y camelCase en tu código TypeScript con el decorador `@QAlias`.

## Problema

Las APIs REST suelen devolver JSON con claves en `snake_case` (ej: `first_name`, `created_at`), pero en TypeScript preferimos `camelCase` (`firstName`, `createdAt`). Con `@QAlias` haces este mapeo sin duplicar código.

## Uso Básico

```typescript
import { QModel, Quick, QAlias } from 'quickmodel';

// Interfaz del backend (snake_case)
interface IUserAPI {
	id: number;
	first_name: string;
	last_name: string;
	email_address: string;
	created_at: string;
	updated_at: string;
	is_active: boolean;
}

@Quick({ created_at: Date, updated_at: Date })
class User extends QModel<IUserAPI> {
	declare id: number;

	@QAlias('first_name')
	declare firstName: string; // ← camelCase en código

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;

	@QAlias('created_at')
	declare createdAt: Date; // ← también transformado a Date

	@QAlias('updated_at')
	declare updatedAt: Date;

	@QAlias('is_active')
	declare isActive: boolean;
}

// Entrada: payload snake_case de la API
const apiResponse = {
	id: 1,
	first_name: 'María',
	last_name: 'García',
	email_address: 'maria@example.com',
	created_at: '2026-01-10T10:00:00.000Z',
	updated_at: '2026-01-10T15:30:00.000Z',
	is_active: true,
};

const user = new User(apiResponse);

// Acceso camelCase en TypeScript ✅
console.log(user.firstName); // 'María'
console.log(user.lastName); // 'García'
console.log(user.isActive); // true
console.log(user.createdAt instanceof Date); // true

// Serializar de vuelta a snake_case ✅
const serialized = user.toJSON();
console.log(serialized.first_name); // 'María'
console.log(serialized.created_at); // '2026-01-10T10:00:00.000Z'
// ↑ Los alias se usan como claves de salida
```

## Roundtrip Completo

`@QAlias` garantiza que el mismo payload entra y sale con las mismas claves:

```typescript
// Crear desde payload de API
const user = User.create(apiResponse);

// Serializar
const json = user.toJSON();

// Recrear desde el JSON serializado (roundtrip)
const userCopy = User.create(json);

console.log(userCopy.firstName === user.firstName); // true
console.log(userCopy.createdAt.getTime() === user.createdAt.getTime()); // true
```

## Modelo Anidado con Alias

Los alias también funcionan cuando el modelo es utilizado como campo anidado:

```typescript
interface IAddressAPI {
	street_name: string;
	zip_code: string;
	city_name: string;
	country_code: string;
}

interface IOrderAPI {
	order_id: string;
	total_amount: number;
	shipping_address: IAddressAPI;
	placed_at: string;
}

@Quick()
class Address extends QModel<IAddressAPI> {
	@QAlias('street_name')
	declare streetName: string;

	@QAlias('zip_code')
	declare zipCode: string;

	@QAlias('city_name')
	declare cityName: string;

	@QAlias('country_code')
	declare countryCode: string;
}

@Quick({ placed_at: Date, shipping_address: Address })
class Order extends QModel<IOrderAPI> {
	@QAlias('order_id')
	declare orderId: string;

	@QAlias('total_amount')
	declare totalAmount: number;

	@QAlias('shipping_address')
	declare shippingAddress: Address;

	@QAlias('placed_at')
	declare placedAt: Date;
}

const order = Order.create({
	order_id: 'ORD-001',
	total_amount: 129.99,
	shipping_address: {
		street_name: 'Calle Mayor 5',
		zip_code: '28001',
		city_name: 'Madrid',
		country_code: 'ES',
	},
	placed_at: '2026-02-15T09:30:00.000Z',
});

// Acceso camelCase ✅
console.log(order.orderId); // 'ORD-001'
console.log(order.shippingAddress.cityName); // 'Madrid'
console.log(order.shippingAddress.zipCode); // '28001'
console.log(order.placedAt instanceof Date); // true

// Serializado de vuelta a snake_case ✅
const json = order.toJSON();
console.log(json.order_id); // 'ORD-001'
console.log(json.shipping_address.city_name); // 'Madrid'
```

## Alias con @QField para Formularios

Puedes combinar `@QAlias` con `@QField` para mantener el mapeo y el schema de formulario:

```typescript
interface IProfileAPI {
	first_name: string;
	last_name: string;
	birth_date: string;
}

@Quick({ birth_date: Date })
class ProfileForm extends QModel<IProfileAPI> {
	@QAlias('first_name')
	@QField({ widget: 'input', label: 'Nombre', required: true })
	declare firstName: string;

	@QAlias('last_name')
	@QField({ widget: 'input', label: 'Apellido', required: true })
	declare lastName: string;

	@QAlias('birth_date')
	@QField({ widget: 'datepicker', label: 'Fecha de nacimiento' })
	declare birthDate: Date;
}

const form = ProfileForm.create({
	first_name: 'Carlos',
	last_name: 'López',
	birth_date: '1990-05-20',
});

const schema = ProfileForm.getFormSchema();
console.log(schema[0].field); // 'firstName' (↑ nombre de la propiedad, no el alias)
console.log(form.firstName); // 'Carlos'
console.log(form.toJSON()); // { first_name: 'Carlos', last_name: 'López', ... }
```

## Combinar con @QRule

```typescript
@Quick({ birth_date: Date })
class UserForm extends QModel<IProfileAPI> {
	@QAlias('first_name')
	@QRule({
		predicate: (val: string) => val.trim().length >= 2,
		message: 'El nombre debe tener al menos 2 caracteres',
	})
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('birth_date')
	@QRule({
		predicate: (val: Date) => val < new Date(),
		message: 'La fecha de nacimiento no puede ser futura',
	})
	declare birthDate: Date;
}

const userForm = UserForm.create({
	first_name: 'A',
	last_name: 'García',
	birth_date: '2030-01-01', // ❌ fecha futura
});

const result = userForm.checkRules();
console.log(result.errors.map((e) => `${e.field}: ${e.message}`));
// ['firstName: El nombre debe tener al menos 2 caracteres',
//  'birthDate: La fecha de nacimiento no puede ser futura']
```

## Mejores Prácticas

```typescript
// ✅ Declara la interfaz completa en snake_case (tal como llega de la API)
interface IUserAPI {
	user_id: string;
	display_name: string;
}

// ✅ Usa @QAlias para mapear a camelCase
class User extends QModel<IUserAPI> {
	@QAlias('user_id')
	declare userId: string;

	@QAlias('display_name')
	declare displayName: string;
}

// ✅ Usa User.create() que aplica strict typing contra IUserAPI
const user = User.create({ user_id: '1', display_name: 'Ana' });

// ❌ Evitar: No mezcles snake_case y camelCase en la interfaz
interface IMixed {
	userId: string; // ← camelCase en interfaz de API es confuso
	last_name: string;
}
```

## Próximos Pasos

- [Campos Computados](/es/examples/computed) - Propiedades derivadas con `@QComputed`
- [Validación](/es/examples/validation) - Combina con `@QRule`
