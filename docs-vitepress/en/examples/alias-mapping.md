# Alias Mapping with @QAlias

Map properties between your API's `snake_case` format and `camelCase` in TypeScript using the `@QAlias` decorator.

## Problem

REST APIs commonly return JSON with `snake_case` keys (e.g. `first_name`, `created_at`), but TypeScript convention prefers `camelCase` (`firstName`, `createdAt`). With `@QAlias` you bridge this gap without duplicating code.

## Basic Usage

```typescript
import { QModel, Quick, QAlias } from 'quickmodel';

// Backend interface (snake_case)
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
	declare firstName: string; // ← camelCase in code

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;

	@QAlias('created_at')
	declare createdAt: Date; // ← also transformed to Date

	@QAlias('updated_at')
	declare updatedAt: Date;

	@QAlias('is_active')
	declare isActive: boolean;
}

// Input: snake_case API payload
const apiResponse = {
	id: 1,
	first_name: 'Jane',
	last_name: 'Doe',
	email_address: 'jane@example.com',
	created_at: '2026-01-10T10:00:00.000Z',
	updated_at: '2026-01-10T15:30:00.000Z',
	is_active: true,
};

const user = new User(apiResponse);

// camelCase access in TypeScript ✅
console.log(user.firstName); // 'Jane'
console.log(user.isActive); // true
console.log(user.createdAt instanceof Date); // true

// Serialize back to snake_case ✅
const serialized = user.$qSerialize();
console.log(serialized.first_name); // 'Jane'
console.log(serialized.created_at); // '2026-01-10T10:00:00.000Z'
```

## Full Roundtrip

`@QAlias` guarantees the same payload comes in and goes out with the same keys:

```typescript
const user = User.create(apiResponse);
const plain = user.$qSerialize(); // serialize() returns the original shape (snake_case with aliases)
const userCopy = User.create(plain);

console.log(userCopy.firstName === user.firstName); // true
```

## Nested Model with Alias

Aliases also work when the model is used as a nested field:

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
		street_name: '123 Main St',
		zip_code: '10001',
		city_name: 'New York',
		country_code: 'US',
	},
	placed_at: '2026-02-15T09:30:00.000Z',
});

// camelCase access ✅
console.log(order.orderId); // 'ORD-001'
console.log(order.shippingAddress.cityName); // 'New York'
console.log(order.placedAt instanceof Date); // true

// Serialized back to snake_case ✅
const plain = order.$qSerialize();
console.log(plain.order_id); // 'ORD-001'
console.log(plain.shipping_address.city_name); // 'New York'
```

## Alias with @QField for Forms

Combine `@QAlias` with `@QField` to maintain both the mapping and the form schema:

```typescript
interface IProfileAPI {
	first_name: string;
	last_name: string;
	birth_date: string;
}

@Quick({ birth_date: Date })
class ProfileForm extends QModel<IProfileAPI> {
	@QAlias('first_name')
	@QField({ widget: 'input', label: 'First name', required: true })
	declare firstName: string;

	@QAlias('last_name')
	@QField({ widget: 'input', label: 'Last name', required: true })
	declare lastName: string;

	@QAlias('birth_date')
	@QField({ widget: 'datepicker', label: 'Birth date' })
	declare birthDate: Date;
}

const form = ProfileForm.create({
	first_name: 'Alice',
	last_name: 'Smith',
	birth_date: '1990-05-20',
});

const schema = ProfileForm.getFormSchema();
console.log(schema[0].field); // 'firstName' (property name, not alias)
console.log(form.firstName); // 'Alice'
console.log(form.$qSerialize()); // { first_name: 'Alice', last_name: 'Smith', ... }
```

## Best Practices

```typescript
// ✅ Declare the full interface in snake_case (as it arrives from the API)
interface IUserAPI {
	user_id: string;
	display_name: string;
}

// ✅ Use @QAlias to map to camelCase
class User extends QModel<IUserAPI> {
	@QAlias('user_id')
	declare userId: string;

	@QAlias('display_name')
	declare displayName: string;
}

// ✅ Use User.create() for strict typing against IUserAPI
const user = User.create({ user_id: '1', display_name: 'Alice' });

// ❌ Avoid: don't mix snake_case and camelCase in the API interface
interface IMixed {
	userId: string; // ← camelCase in API interface is confusing
	last_name: string;
}
```

## Next Steps

- [Computed Fields](/en/examples/computed) - Derived properties with `@QComputed`
- [Validation](/en/examples/validation) - Combine with `@QRule`
