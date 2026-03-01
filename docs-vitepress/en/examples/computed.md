# Computed Fields with @QComputed

Add derived properties to your models that are automatically included in serialization using the `@QComputed` decorator.

## Problem

You have a `User` model with `firstName` and `lastName`, and you want `fullName` available in the serialized object without calculating it manually everywhere.

## Basic Usage

```typescript
import { QModel, Quick, QComputed } from 'quickmodel';

interface IUser {
	firstName: string;
	lastName: string;
	salary: number;
	currency: string;
}

@Quick()
class User extends QModel<IUser> {
	declare firstName: string;
	declare lastName: string;
	declare salary: number;
	declare currency: string;

	// ✅ Included in toJSON() and serialize()
	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	// ✅ Also included
	@QComputed()
	get formattedSalary(): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: this.currency,
		}).format(this.salary);
	}

	// ❌ NOT included in serialization (no @QComputed)
	get initials(): string {
		return `${this.firstName[0]}.${this.lastName[0]}.`;
	}
}

const user = User.create({
	firstName: 'Alice',
	lastName: 'Smith',
	salary: 75000,
	currency: 'USD',
});

console.log(user.fullName); // 'Alice Smith'
console.log(user.initials); // 'A.S.' (available on instance but not serialized)
console.log(user.formattedSalary); // '$75,000.00'

const plain = user.$qm.serialize();
console.log(plain.fullName); // 'Alice Smith' ✅ included
console.log(plain.formattedSalary); // '$75,000.00'  ✅ included
console.log(plain.initials); // undefined ❌ not included (no @QComputed)
```

## Product Model with Calculations

```typescript
interface IProduct {
	name: string;
	priceNet: number;
	vatRate: number; // Percentage, e.g. 20
	discountRate: number; // Percentage, e.g. 10
}

@Quick()
class Product extends QModel<IProduct> {
	declare name: string;
	declare priceNet: number;
	declare vatRate: number;
	declare discountRate: number;

	@QComputed()
	get vatAmount(): number {
		return Number((this.priceNet * (this.vatRate / 100)).toFixed(2));
	}

	@QComputed()
	get priceGross(): number {
		return Number((this.priceNet + this.vatAmount).toFixed(2));
	}

	@QComputed()
	get discount(): number {
		return Number((this.priceGross * (this.discountRate / 100)).toFixed(2));
	}

	@QComputed()
	get finalPrice(): number {
		return Number((this.priceGross - this.discount).toFixed(2));
	}

	@QComputed()
	get priceLabel(): string {
		return this.discountRate > 0
			? `$${this.finalPrice} (was $${this.priceGross})`
			: `$${this.priceGross}`;
	}
}

const product = Product.create({
	name: 'Pro Laptop',
	priceNet: 1000,
	vatRate: 20,
	discountRate: 10,
});

const plain = product.$qm.serialize();
console.log(plain.priceNet); // 1000
console.log(plain.vatAmount); // 200
console.log(plain.priceGross); // 1200
console.log(plain.discount); // 120
console.log(plain.finalPrice); // 1080
console.log(plain.priceLabel); // '$1080 (was $1200)'
```

## Person Model with Age and Status

```typescript
interface IPerson {
	firstName: string;
	lastName: string;
	birthDate: string;
	role: 'admin' | 'user' | 'guest';
}

@Quick({ birthDate: Date })
class Person extends QModel<IPerson> {
	declare firstName: string;
	declare lastName: string;
	declare birthDate: Date;
	declare role: 'admin' | 'user' | 'guest';

	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	@QComputed()
	get age(): number {
		const today = new Date();
		let age = today.getFullYear() - this.birthDate.getFullYear();
		const monthDiff = today.getMonth() - this.birthDate.getMonth();
		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < this.birthDate.getDate())
		) {
			age--;
		}
		return age;
	}

	@QComputed()
	get isAdult(): boolean {
		return this.age >= 18;
	}

	@QComputed()
	get displayRole(): string {
		const labels = { admin: 'Administrator', user: 'User', guest: 'Guest' };
		return labels[this.role];
	}

	@QComputed()
	get summary(): string {
		return `${this.fullName}, ${this.age} years old (${this.displayRole})`;
	}
}

const person = Person.create({
	firstName: 'Alice',
	lastName: 'Smith',
	birthDate: '1990-06-15',
	role: 'admin',
});

console.log(person.summary); // 'Alice Smith, 35 years old (Administrator)'

const serialized = person.$qm.serialize();
// {
//   firstName: 'Alice', lastName: 'Smith',
//   birthDate: '1990-06-15T00:00:00.000Z', role: 'admin',
//   fullName: 'Alice Smith', age: 35, isAdult: true,
//   displayRole: 'Administrator',
//   summary: 'Alice Smith, 35 years old (Administrator)'
// }
```

## Combining @QComputed with @QAlias and @QRule

```typescript
interface IOrderAPI {
	unit_price: number;
	quantity: number;
	discount_pct: number;
}

@Quick()
class Order extends QModel<IOrderAPI> {
	@QAlias('unit_price')
	@QRule({
		predicate: (val: number) => val > 0,
		message: 'Unit price must be positive',
	})
	declare unitPrice: number;

	@QAlias('quantity')
	@QRule({
		predicate: (val: number) => val >= 1,
		message: 'Quantity must be at least 1',
	})
	declare quantity: number;

	@QAlias('discount_pct')
	declare discountPct: number;

	@QComputed()
	get subtotal(): number {
		return Number((this.unitPrice * this.quantity).toFixed(2));
	}

	@QComputed()
	get discountAmount(): number {
		return Number(((this.subtotal * this.discountPct) / 100).toFixed(2));
	}

	@QComputed()
	get total(): number {
		return Number((this.subtotal - this.discountAmount).toFixed(2));
	}
}

const order = Order.create({ unit_price: 29.99, quantity: 3, discount_pct: 5 });

console.log(order.subtotal); // 89.97
console.log(order.discountAmount); // 4.5
console.log(order.total); // 85.47
```

## Best Practices

```typescript
// ✅ Good: pure calculations based on model properties
@QComputed()
get total(): number {
	return this.price * this.quantity;
}

// ❌ Avoid: side effects in getters
@QComputed()
get total(): number {
	console.log('computing...'); // ❌ side effect
	this.lastCalculated = Date.now(); // ❌ mutation
	return this.price * this.quantity;
}

// ❌ Avoid: async operations in @QComputed getters
// Getters must be synchronous
```

## Next Steps

- [Mocks & Testing](/en/examples/mocks) - Generate test data with `mock()`
- [Validation](/en/examples/validation) - Combine with `@QRule`
