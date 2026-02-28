# Campos Computados con @QComputed

Añade propiedades derivadas a tus modelos que se incluyen automáticamente en la serialización con el decorador `@QComputed`.

## Problema

Tienes un modelo `User` con `firstName` y `lastName`, y quieres que `fullName` esté disponible en el objeto serializado sin tener que calcularlo manualmente en cada sitio.

## Uso Básico

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

	// ✅ Se incluye en toJSON() y serialize()
	@QComputed()
	get fullName(): string {
		return `${this.firstName} ${this.lastName}`;
	}

	// ✅ También se incluye
	@QComputed()
	get formattedSalary(): string {
		return new Intl.NumberFormat('es-ES', {
			style: 'currency',
			currency: this.currency,
		}).format(this.salary);
	}

	// ❌ NO se incluye en la serialización (sin @QComputed)
	get initials(): string {
		return `${this.firstName[0]}.${this.lastName[0]}.`;
	}
}

const user = User.create({
	firstName: 'María',
	lastName: 'García',
	salary: 45000,
	currency: 'EUR',
});

console.log(user.fullName); // 'María García'
console.log(user.initials); // 'M.G.' (disponible en instancia, pero no en serialización)
console.log(user.formattedSalary); // '45.000,00 €'

const json = user.toJSON();
console.log(json.fullName); // 'María García' ✅ incluido
console.log(json.formattedSalary); // '45.000,00 €'  ✅ incluido
console.log(json.initials); // undefined ❌ no incluido (sin @QComputed)
```

## Modelo de Producto con Cálculos

```typescript
interface IProduct {
	name: string;
	priceNet: number;
	vatRate: number; // Porcentaje, ej: 21
	discountRate: number; // Porcentaje, ej: 10
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
			? `${this.finalPrice}€ (antes ${this.priceGross}€)`
			: `${this.priceGross}€`;
	}
}

const product = Product.create({
	name: 'Laptop Pro',
	priceNet: 1000,
	vatRate: 21,
	discountRate: 10,
});

const json = product.toJSON();
console.log(json.priceNet); // 1000
console.log(json.vatAmount); // 210
console.log(json.priceGross); // 1210
console.log(json.discount); // 121
console.log(json.finalPrice); // 1089
console.log(json.priceLabel); // '1089€ (antes 1210€)'
```

## Modelo de Persona con Edad y Estado

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
		const labels = {
			admin: 'Administrador',
			user: 'Usuario',
			guest: 'Invitado',
		};
		return labels[this.role];
	}

	@QComputed()
	get summary(): string {
		return `${this.fullName}, ${this.age} años (${this.displayRole})`;
	}
}

const person = Person.create({
	firstName: 'Carlos',
	lastName: 'Ruiz',
	birthDate: '1990-06-15',
	role: 'admin',
});

console.log(person.summary); // 'Carlos Ruiz, 35 años (Administrador)'

const serialized = person.toJSON();
// {
//   firstName: 'Carlos', lastName: 'Ruiz',
//   birthDate: '1990-06-15T00:00:00.000Z',
//   role: 'admin',
//   fullName: 'Carlos Ruiz',
//   age: 35,
//   isAdult: true,
//   displayRole: 'Administrador',
//   summary: 'Carlos Ruiz, 35 años (Administrador)'
// }
```

## Combinar @QComputed con @QAlias y @QRule

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
		message: 'El precio unitario debe ser positivo',
	})
	declare unitPrice: number;

	@QAlias('quantity')
	@QRule({
		predicate: (val: number) => val >= 1,
		message: 'La cantidad debe ser al menos 1',
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

const order = Order.create({
	unit_price: 29.99,
	quantity: 3,
	discount_pct: 5,
});

console.log(order.subtotal); // 89.97
console.log(order.discountAmount); // 4.5
console.log(order.total); // 85.47

const json = order.toJSON();
// Claves de salida = aliases (snake_case)
// {
//   unit_price: 29.99, quantity: 3, discount_pct: 5,
//   subtotal: 89.97, discountAmount: 4.5, total: 85.47
// }
// ↑ Los campos @QComputed NO tienen alias → usan su nombre de propiedad
```

## Campos Computados con Modelos Anidados

```typescript
interface ITeam {
	name: string;
	members: string[];
}

interface IProject {
	title: string;
	status: 'planning' | 'active' | 'done';
	budget: number;
	spent: number;
}

@Quick()
class Project extends QModel<IProject> {
	declare title: string;
	declare status: 'planning' | 'active' | 'done';
	declare budget: number;
	declare spent: number;

	@QComputed()
	get remaining(): number {
		return this.budget - this.spent;
	}

	@QComputed()
	get spentPercent(): number {
		return Math.round((this.spent / this.budget) * 100);
	}

	@QComputed()
	get isOverBudget(): boolean {
		return this.spent > this.budget;
	}

	@QComputed()
	get statusLabel(): string {
		const labels = {
			planning: 'En planificación',
			active: 'En curso',
			done: 'Completado',
		};
		return labels[this.status];
	}
}

const project = Project.create({
	title: 'Rediseño Web',
	status: 'active',
	budget: 10000,
	spent: 7500,
});

console.log(project.remaining); // 2500
console.log(project.spentPercent); // 75
console.log(project.isOverBudget); // false
console.log(project.statusLabel); // 'En curso'
```

## Mejores Prácticas

```typescript
// ✅ Bien: cálculos puros basados en propiedades del modelo
@QComputed()
get total(): number {
	return this.price * this.quantity;
}

// ❌ Evitar: efectos secundarios en getters
@QComputed()
get total(): number {
	console.log('calculando...'); // ❌ side effect
	this.lastCalculated = Date.now(); // ❌ mutación
	return this.price * this.quantity;
}

// ❌ Evitar: llamadas async en getters @QComputed
// Los getters deben ser síncronos
```

## Próximos Pasos

- [Mocks y Testing](/es/examples/mocks) - Genera datos de prueba con `mock()`
- [Validación](/es/examples/validation) - Combina con `@QRule`
