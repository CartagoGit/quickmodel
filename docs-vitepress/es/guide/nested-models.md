# Modelos Anidados

QuickModel soporta anidamiento infinito de modelos, permitiéndote construir estructuras de datos complejas con transformación automática en todos los niveles.

## Anidamiento Básico

Transforma objetos anidados en instancias de modelos:

```typescript
interface IAddress {
	street: string;
	city: string;
	country: string;
}

interface IProfile {
	name: string;
	birthDate: string;
	address: IAddress;
}

interface IUser {
	id: number;
	email: string;
	profile: IProfile;
}

// Definir modelos anidados
@Quick()
class Address extends QModel<IAddress> {
	declare street: string;
	declare city: string;
	declare country: string;
}

@Quick({
	birthDate: Date,
	address: Address, // Modelo anidado
})
class Profile extends QModel<IProfile> {
	declare name: string;
	declare birthDate: Date;
	declare address: Address;
}

@Quick({
	profile: Profile, // Modelo anidado
})
class User extends QModel<IUser> {
	declare id: number;
	declare email: string;
	declare profile: Profile;
}

// Uso
const user = new User({
	id: 1,
	email: 'john@example.com',
	profile: {
		name: 'John Doe',
		birthDate: '1990-01-01',
		address: {
			street: 'Calle Principal 123',
			city: 'Nueva York',
			country: 'USA',
		},
	},
});

// Todos los niveles son transformados
console.log(user.profile instanceof Profile); // true
console.log(user.profile.birthDate instanceof Date); // true
console.log(user.profile.address instanceof Address); // true
```

## Arrays de Modelos Anidados

Usa notación de corchetes para arrays:

```typescript
interface IOrderItem {
	productId: string;
	quantity: number;
	price: string; // BigInt como string
}

interface IOrder {
	id: string;
	items: IOrderItem[];
	createdAt: string;
}

@Quick({ price: BigInt })
class OrderItem extends QModel<IOrderItem> {
	declare productId: string;
	declare quantity: number;
	declare price: bigint;
}

@Quick({
	items: [OrderItem], // Array de modelos anidados
	createdAt: Date,
})
class Order extends QModel<IOrder> {
	declare id: string;
	declare items: OrderItem[];
	declare createdAt: Date;
}

const order = new Order({
	id: 'ORD-001',
	items: [
		{ productId: 'P1', quantity: 2, price: '1999' },
		{ productId: 'P2', quantity: 1, price: '2999' },
	],
	createdAt: '2026-01-10T00:00:00.000Z',
});

console.log(order.items[0] instanceof OrderItem); // true
console.log(typeof order.items[0].price); // 'bigint'
```

## Anidamiento Profundo

QuickModel maneja cualquier profundidad de anidamiento:

```typescript
interface IComment {
	id: string;
	text: string;
	createdAt: string;
	replies: IComment[]; // Anidamiento recursivo
}

@Quick({
	createdAt: Date,
	replies: [Comment], // Autorreferencial
})
class Comment extends QModel<IComment> {
	declare id: string;
	declare text: string;
	declare createdAt: Date;
	declare replies: Comment[];
}

const comment = new Comment({
	id: '1',
	text: 'Comentario raíz',
	createdAt: '2026-01-10',
	replies: [
		{
			id: '2',
			text: 'Respuesta 1',
			createdAt: '2026-01-11',
			replies: [
				{
					id: '3',
					text: 'Respuesta anidada',
					createdAt: '2026-01-12',
					replies: [],
				},
			],
		},
	],
});

// Todos los niveles transformados
console.log(comment.replies[0] instanceof Comment); // true
console.log(comment.replies[0].replies[0] instanceof Comment); // true
console.log(comment.replies[0].createdAt instanceof Date); // true
```

## Notación de Punto para Propiedades Anidadas

Transforma propiedades anidadas sin decorar la clase anidada:

```typescript
// Clase de terceros que no puedes modificar
class Product {
	constructor(
		public id: string,
		public name: string,
		public price: string,
		public createdAt: string
	) {}
}

interface ICartItem {
	quantity: number;
	product: Product;
}

// Usa notación de punto para transformar propiedades anidadas
@Quick({
	product: Product,
	'product.price': BigInt, // Transformar propiedad anidada
	'product.createdAt': Date, // Transformar propiedad anidada
})
class CartItem extends QModel<ICartItem> {
	declare quantity: number;
	declare product: Product;
}

const item = new CartItem({
	quantity: 2,
	product: {
		id: 'P1',
		name: 'Laptop',
		price: '1999',
		createdAt: '2026-01-10',
	},
});

console.log(typeof item.product.price); // 'bigint'
console.log(item.product.createdAt instanceof Date); // true
```

### Cuándo usar Notación de Punto

**Usa notación de punto cuando:**

- Trabajes con clases de terceros que no puedes modificar
- Necesites transformaciones específicas del contexto
- Quieras todas las transformaciones en un solo lugar

**Usa decoradores de modelos anidados cuando:**

- Controles la clase anidada
- El modelo anidado se reutilice en tu código
- Quieras encapsulación

## Arrays Multidimensionales

Anidamiento explícito con notación de corchetes:

```typescript
interface IMatrix {
	data: IPoint[][];
}

interface IPoint {
	x: number;
	y: number;
	timestamp: string;
}

@Quick({ timestamp: Date })
class Point extends QModel<IPoint> {
	declare x: number;
	declare y: number;
	declare timestamp: Date;
}

@Quick({
	data: [[Point]], // Array 2D de puntos
})
class Matrix extends QModel<IMatrix> {
	declare data: Point[][];
}

const matrix = new Matrix({
	data: [
		[
			{ x: 0, y: 0, timestamp: '2026-01-10' },
			{ x: 1, y: 0, timestamp: '2026-01-11' },
		],
		[
			{ x: 0, y: 1, timestamp: '2026-01-12' },
			{ x: 1, y: 1, timestamp: '2026-01-13' },
		],
	],
});

console.log(matrix.data[0][0] instanceof Point); // true
console.log(matrix.data[0][0].timestamp instanceof Date); // true
```

## Anidamiento Polimórfico

Usa discriminadores para tipos union:

```typescript
interface IAnimal {
	type: 'dog' | 'cat';
	name: string;
}

interface IDog extends IAnimal {
	type: 'dog';
	breed: string;
}

interface ICat extends IAnimal {
	type: 'cat';
	color: string;
}

@Quick()
class Dog extends QModel<IDog> {
	declare type: 'dog';
	declare name: string;
	declare breed: string;

	bark() {
		return 'Guau!';
	}
}

@Quick()
class Cat extends QModel<ICat> {
	declare type: 'cat';
	declare name: string;
	declare color: string;

	meow() {
		return 'Miau!';
	}
}

interface IOwner {
	name: string;
	pets: IAnimal[];
}

@Quick({
	pets: [
		{
			discriminator: (data: IAnimal) => (data.type === 'dog' ? Dog : Cat),
		},
	],
})
class Owner extends QModel<IOwner> {
	declare name: string;
	declare pets: (Dog | Cat)[];
}

const owner = new Owner({
	name: 'John',
	pets: [
		{ type: 'dog', name: 'Rex', breed: 'Labrador' },
		{ type: 'cat', name: 'Whiskers', color: 'Naranja' },
	],
});

console.log(owner.pets[0] instanceof Dog); // true
console.log(owner.pets[1] instanceof Cat); // true

if (owner.pets[0] instanceof Dog) {
	console.log(owner.pets[0].bark()); // 'Guau!'
}
```

## Serialización de Modelos Anidados

`toJSON()` serializa recursivamente todos los modelos anidados:

```typescript
const user = new User({
	id: 1,
	email: 'john@example.com',
	profile: {
		name: 'John',
		birthDate: '1990-01-01',
		address: {
			street: 'Calle Principal 123',
			city: 'Nueva York',
			country: 'USA',
		},
	},
});

const json = user.toJSON();
// {
//   id: 1,
//   email: 'john@example.com',
//   profile: {
//     name: 'John',
//     birthDate: '1990-01-01',  // Date → string
//     address: {
//       street: 'Calle Principal 123',
//       city: 'Nueva York',
//       country: 'USA'
//     }
//   }
// }
```

## Referencias Circulares

QuickModel maneja referencias circulares de manera elegante:

```typescript
interface INode {
	id: string;
	value: number;
	parent?: INode;
	children: INode[];
}

@Quick({
	parent: Node,
	children: [Node],
})
class Node extends QModel<INode> {
	declare id: string;
	declare value: number;
	declare parent?: Node;
	declare children: Node[];
}

// Crear una estructura de árbol
const root = new Node({
	id: 'root',
	value: 1,
	children: [],
});

const child = new Node({
	id: 'child',
	value: 2,
	parent: root,
	children: [],
});

root.children.push(child);

// La serialización maneja referencias circulares
const json = root.toJSON(); // Funciona sin recursión infinita
```

## Mejores Prácticas

### 1. Mantén el Anidamiento Poco Profundo

Prefiere estructuras planas cuando sea posible:

```typescript
// ❌ Demasiado profundo
user.profile.settings.preferences.theme.colors.primary;

// ✅ Mejor
user.themeColor;
```

### 2. Usa Notación de Punto con Moderación

Usa notación de punto solo cuando no puedas decorar la clase anidada:

```typescript
// ✅ Preferido - decora la clase anidada
@Quick({ price: BigInt })
class Product extends QModel<IProduct> {
	declare price: bigint;
}

@Quick({ product: Product })
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}

// ⚠️ Usa solo cuando sea necesario
@Quick({
	product: Product,
	'product.price': BigInt, // Solo si no puedes modificar Product
})
class CartItem extends QModel<ICartItem> {
	declare product: Product;
}
```

### 3. Define Interfaces Claramente

Separa las interfaces de serialización y de runtime:

```typescript
// Interfaz de serialización
interface IUser {
	profile: IProfile;
}

interface IProfile {
	birthDate: string;
}

// Interfaz de runtime
interface IUserTransform {
	profile: IProfileTransform;
}

interface IProfileTransform {
	birthDate: Date;
}
```

### 4. Valida Datos Anidados

Añade validación en cada nivel:

```typescript
@Quick({ birthDate: Date })
class Profile extends QModel<IProfile> {
	declare birthDate: Date;

	constructor(data: Partial<IProfile>) {
		super(data);
		if (this.birthDate > new Date()) {
			throw new Error('La fecha de nacimiento no puede ser en el futuro');
		}
	}
}
```

## Próximos Pasos

- [Decorador @Quick](/es/guide/quick-decorator) - Aprende más sobre transformaciones
- [Transformadores Personalizados](/es/guide/custom-transformers) - Crea tipos anidados personalizados
- [Ejemplos](/es/examples/complex-types) - Ve ejemplos de anidamiento complejo

## Rendimiento

<BenchmarkChart
  :only-scenarios="['nestedConstruct']"
  :only-libs="['QuickModel', 'class-transformer', 'Plain JS']"
  :only-feature-categories="['model', 'exclusive']"
  default-tab="performance"
/>
