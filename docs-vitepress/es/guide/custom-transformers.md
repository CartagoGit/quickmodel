# Transformadores Personalizados

QuickModel te permite crear transformadores personalizados para tus propios tipos o para sobrescribir el comportamiento integrado.

## Crear un Transformador Personalizado

Un transformador es una clase que implementa la lógica de transformación para un tipo específico.

### Estructura Básica

```typescript
import { IQTransformer } from '@cartago-git/quickmodel/types';

class MyCustomTransformer implements IQTransformer<SerializedType, MyType> {
	// Transformar de JSON a tipo runtime
	deserialize(value: SerializedType): MyType {
		// Tu lógica de transformación
		return new MyType(value);
	}

	// Transformar de tipo runtime de vuelta a JSON
	serialize(value: MyType): SerializedType {
		// Tu lógica de serialización
		return value.toJSON();
	}
}
```

### Objetos Transformadores en Línea (Nuevo)

A veces no necesitas crear una clase completa para una transformación simple o de un solo uso. QuickModel permite pasar objetos literales directamente al decorador `@Quick` siempre que implementen la interfaz `IQTransformer` (métodos `serialize` y `deserialize`).

Esto es ideal para reducers, formateadores rápidos o lógica específica de un modelo sin contaminar el registro global.

```typescript
// Define el transformador como un objeto constante
const ReverseString = {
  // De JSON a Modelo
  deserialize(value: string): string {
    return value && value.split('').reverse().join('');
  },
  // De Modelo a JSON
  serialize(value: string): string {
    return value.split('').reverse().join('');
  }
};

@Quick({
  // Úsalo directamente
  secretCode: ReverseString
})
class SpyMessage extends QModel<IMessage> {
  declare secretCode: string;
}
```

### Ejemplo: Tipo Money

Vamos a crear un tipo `Money` personalizado con soporte de moneda:

```typescript
// 1. Define tu tipo personalizado
class Money {
	constructor(
		public amount: number,
		public currency: string
	) {}

	toString() {
		return `${this.amount} ${this.currency}`;
	}
}

// 2. Define el formato de serialización
interface IMoneyJSON {
	amount: number;
	currency: string;
}

// 3. Crea el transformador
import { IQTransformer } from '@cartago-git/quickmodel/types';

class MoneyTransformer implements IQTransformer<IMoneyJSON, Money> {
	deserialize(value: IMoneyJSON): Money {
		if (!value || typeof value !== 'object') {
			throw new Error('Formato de dinero inválido');
		}
		return new Money(value.amount, value.currency);
	}

	serialize(value: Money): IMoneyJSON {
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}

// 4. Registra el transformador
import { QTransformerRegistry } from '@cartago-git/quickmodel/advanced';

QTransformerRegistry.register(Money, new MoneyTransformer());

// 5. Úsalo en tus modelos
interface IProduct {
	id: string;
	name: string;
	price: IMoneyJSON;
}

@Quick({ price: Money })
class Product extends QModel<IProduct> {
	declare id: string;
	declare name: string;
	declare price: Money;
}

// 6. Pruébalo
const product = new Product({
	id: '1',
	name: 'Laptop',
	price: { amount: 999.99, currency: 'USD' },
});

console.log(product.price instanceof Money); // true
console.log(product.price.toString()); // '999.99 USD'

const json = product.toJSON();
console.log(json.price); // { amount: 999.99, currency: 'USD' }
```

## Ejemplo: Tipo Color

Crea un tipo de color personalizado con conversión hex/RGB:

```typescript
class Color {
	constructor(
		public r: number,
		public g: number,
		public b: number
	) {}

	toHex(): string {
		const toHex = (n: number) => n.toString(16).padStart(2, '0');
		return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
	}

	static fromHex(hex: string): Color {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return new Color(r, g, b);
	}
}

class ColorTransformer implements IQTransformer<string, Color> {
	deserialize(value: string): Color {
		if (typeof value !== 'string' || !value.startsWith('#')) {
			throw new Error(
				'Formato de color inválido. Se esperaba string hex como #FF0000'
			);
		}
		return Color.fromHex(value);
	}

	serialize(value: Color): string {
		return value.toHex();
	}
}

QTransformerRegistry.register(Color, new ColorTransformer());

// Uso
@Quick({ backgroundColor: Color })
class Theme extends QModel<ITheme> {
	declare backgroundColor: Color;
}

const theme = new Theme({ backgroundColor: '#FF5733' });
console.log(theme.backgroundColor.r); // 255
console.log(theme.backgroundColor.toHex()); // '#FF5733'
```

## Ejemplo: Tipo Coordenada

Coordenadas geográficas con validación:

```typescript
class Coordinate {
	constructor(
		public latitude: number,
		public longitude: number
	) {
		if (latitude < -90 || latitude > 90) {
			throw new Error('La latitud debe estar entre -90 y 90');
		}
		if (longitude < -180 || longitude > 180) {
			throw new Error('La longitud debe estar entre -180 y 180');
		}
	}

	distanceTo(other: Coordinate): number {
		// Implementación de fórmula Haversine
		// ...
	}
}

interface ICoordinateJSON {
	lat: number;
	lng: number;
}

class CoordinateTransformer implements IQTransformer<
	ICoordinateJSON,
	Coordinate
> {
	deserialize(value: ICoordinateJSON): Coordinate {
		if (!value || typeof value !== 'object') {
			throw new Error('Formato de coordenada inválido');
		}
		return new Coordinate(value.lat, value.lng);
	}

	serialize(value: Coordinate): ICoordinateJSON {
		return {
			lat: value.latitude,
			lng: value.longitude,
		};
	}
}

QTransformerRegistry.register(Coordinate, new CoordinateTransformer());

// Uso
@Quick({ location: Coordinate })
class Store extends QModel<IStore> {
	declare name: string;
	declare location: Coordinate;
}

const store = new Store({
	name: 'Tienda Principal',
	location: { lat: 40.7128, lng: -74.006 },
});

console.log(store.location instanceof Coordinate); // true
```

## Sobrescribir Transformadores Integrados

Puedes sobrescribir transformadores integrados si necesitas comportamiento personalizado:

```typescript
// Transformador de Fecha personalizado que maneja múltiples formatos
class CustomDateTransformer implements IQTransformer<string, Date> {
	deserialize(value: string): Date {
		// Soportar múltiples formatos de fecha
		if (value.includes('/')) {
			// Manejar MM/DD/YYYY
			const [month, day, year] = value.split('/');
			return new Date(+year, +month - 1, +day);
		}
		// Formato ISO por defecto
		return new Date(value);
	}

	serialize(value: Date): string {
		return value.toISOString();
	}
}

// Sobrescribir el transformador Date integrado
QTransformerRegistry.register(Date, new CustomDateTransformer());
```

## Manejo de Null y Undefined

Los transformadores deben manejar `null` y `undefined` de manera elegante:

```typescript
class MoneyTransformer implements IQTransformer<IMoneyJSON | null, Money> {
	deserialize(value: IMoneyJSON | null): Money | null {
		if (value === null || value === undefined) {
			return null;
		}
		return new Money(value.amount, value.currency);
	}

	serialize(value: Money | null): IMoneyJSON | null {
		if (value === null || value === undefined) {
			return null;
		}
		return {
			amount: value.amount,
			currency: value.currency,
		};
	}
}
```

## Soporte de Arrays

Para soportar arrays de tu tipo personalizado, el transformador funciona automáticamente:

```typescript
@Quick({
	price: Money, // Money único
	prices: [Money], // Array de Money
})
class Product extends QModel<IProduct> {
	declare price: Money;
	declare prices: Money[];
}

const product = new Product({
	price: { amount: 99.99, currency: 'USD' },
	prices: [
		{ amount: 99.99, currency: 'USD' },
		{ amount: 79.99, currency: 'EUR' },
	],
});

console.log(product.prices[0] instanceof Money); // true
```

## Validación en Transformadores

Añade lógica de validación en tus transformadores:

```typescript
class EmailTransformer implements IQTransformer<string, string> {
	private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	deserialize(value: string): string {
		if (!this.emailRegex.test(value)) {
			throw new Error(`Formato de email inválido: ${value}`);
		}
		return value.toLowerCase(); // Normalizar a minúsculas
	}

	serialize(value: string): string {
		return value;
	}
}

// Crear un tipo Email personalizado
class Email extends String {}

QTransformerRegistry.register(Email, new EmailTransformer());

@Quick({ email: Email })
class User extends QModel<IUser> {
	declare email: string;
}

// Esto lanzará un error
const user = new User({ email: 'email-invalido' }); // ¡Error!
```

## Mejores Prácticas

### 1. Validar Entrada

Siempre valida la entrada en `deserialize()`:

```typescript
deserialize(value: any): MyType {
  if (!value || typeof value !== 'object') {
    throw new Error('Formato de entrada inválido');
  }
  // ... resto de la transformación
}
```

### 2. Manejar Casos Extremos

Considera `null`, `undefined`, strings vacíos, etc.:

```typescript
deserialize(value: any): MyType | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value === '') {
    return null;  // o lanzar error
  }
  // ... lógica de transformación
}
```

### 3. Proporcionar Mensajes de Error Claros

Ayuda a los usuarios a depurar problemas de transformación:

```typescript
deserialize(value: any): MyType {
  if (!value.requiredField) {
    throw new Error(
      `Falta el campo requerido 'requiredField' en ${JSON.stringify(value)}`
    );
  }
  // ...
}
```

### 4. Mantener Transformadores Puros

Los transformadores deben ser sin estado y deterministas:

```typescript
// ✅ Bien - función pura
deserialize(value: IMoneyJSON): Money {
  return new Money(value.amount, value.currency);
}

// ❌ Mal - con estado
private counter = 0;
deserialize(value: IMoneyJSON): Money {
  this.counter++;  // ¡Efecto secundario!
  return new Money(value.amount, value.currency);
}
```

### 5. Hacer Transformaciones Reversibles

Asegura que `serialize(deserialize(x))` devuelva datos equivalentes:

```typescript
const original = { amount: 99.99, currency: 'USD' };
const money = transformer.deserialize(original);
const serialized = transformer.serialize(money);

console.log(JSON.stringify(original) === JSON.stringify(serialized)); // true
```

## Próximos Pasos

- [Transformadores](/es/guide/transformers) - Ve todos los transformadores integrados
- [Modelos Anidados](/es/guide/nested-models) - Combina tipos personalizados con anidamiento
- [Ejemplos](/es/examples/complex-types) - Ejemplos de tipos personalizados del mundo real
