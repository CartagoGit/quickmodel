# Transformar campos (`@QTransform`)

El decorador `@QTransform()` aplica una **transformación post-deserialización** al valor de un campo durante la construcción del modelo. La transformación se ejecuta después de la coerción de tipos, por lo que el valor recibido ya está correctamente tipado.

## Uso básico

```typescript
import { Quick, QModel, QTransform } from 'quickmodel';

interface IUser {
	email: string;
	username: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	@QTransform((val: string) => val.trim().toLowerCase())
	declare email: string;

	@QTransform((val: string) => val.trim())
	declare username: string;
}

new UserModel({ email: '  Alice@Example.COM  ', username: '  alice  ' });
// → email: 'alice@example.com', username: 'alice'
```

## Encadenar múltiples transformaciones

Puedes apilar múltiples decoradores `@QTransform` sobre un mismo campo. Se ejecutan desde el **decorador más cercano a la declaración** hacia arriba, formando un pipeline:

```typescript
@Quick()
class ProductModel extends QModel<IProduct> {
	@QTransform((val: string) => val.replace(/\s+/g, '-')) // 3º: espacios → guiones
	@QTransform((val: string) => val.toLowerCase()) // 2º: minúsculas
	@QTransform((val: string) => val.trim()) // 1º: trim
	declare slug: string;
}

new ProductModel({ slug: '  Hello World  ' }).slug;
// → 'hello-world'
```

El orden es: el decorador **más cercano al campo** se ejecuta primero.

## Se ejecuta después de la coerción de tipos

Las transformaciones se ejecutan **después** de la coerción de tipos de `@Quick`. Esto significa que puedes asumir que el valor entrante ya tiene el tipo correcto:

```typescript
interface IPost {
	title: string;
	publishedAt: Date;
	wordCount: number;
}

@Quick({ publishedAt: Date })
class PostModel extends QModel<IPost> {
	// En este punto, val ya es un Date — la coerción ocurrió antes
	@QTransform((val: Date) => {
		const utc = new Date(val);
		utc.setUTCHours(0, 0, 0, 0);
		return utc;
	})
	declare publishedAt: Date;

	@QTransform((val: number) => Math.max(0, val))
	declare wordCount: number;
}
```

## Ejemplos prácticos

### Normalizar strings

```typescript
@QTransform((v: string) => v.trim().toLowerCase())
declare email: string;

@QTransform((v: string) => v.replace(/\D/g, ''))
declare phone: string; // elimina todos los no-dígitos
```

### Acotar números

```typescript
@QTransform((v: number) => Math.min(Math.max(v, 0), 100))
declare percentage: number; // acotado a [0, 100]
```

### Calcular un valor derivado

```typescript
@QTransform((v: string) => v.trim().toLowerCase().replace(/\s+/g, '-'))
declare slug: string;
```

### Normalización de fechas

```typescript
@Quick({ expiresAt: Date })
class Session extends QModel<ISession> {
	@QTransform((v: Date) => (v > new Date() ? v : new Date()))
	declare expiresAt: Date; // garantiza que la fecha nunca está en el pasado
}
```

## Combinación con `@QDefault`

Cuando se combinan `@QDefault` y `@QTransform`, el orden es:

1. Se comprueba el valor entrante — si es `undefined`/`null`, se aplica el default
2. El pipeline de transformación se ejecuta sobre el valor resultante

```typescript
@QTransform((v: string) => v.trim().toLowerCase())
@QDefault('anonymous')
declare username: string;

new UserModel({}).username;                       // → 'anonymous'
new UserModel({ username: '  ALICE  ' }).username; // → 'alice'
```

## Seguridad de tipos

La función de transformación debe coincidir con el tipo del campo. TypeScript infiere el tipo del contexto:

```typescript
// ✅ Tipado — val inferido como string
@QTransform((val: string) => val.trim())
declare name: string;
```

## Referencia de API

| Símbolo            | Descripción                                           |
| ------------------ | ----------------------------------------------------- |
| `@QTransform(fn)`  | Aplica `fn(valor) => valor` tras la coerción de tipos |
| `IQTransformFn<T>` | Alias de tipo: `(value: T) => T`                      |

Múltiples decoradores `@QTransform` en el mismo campo se ejecutan de abajo hacia arriba (el más interno primero).

## Ver también

- [`@QDefault`](./qdefault) — establecer valores por defecto en la construcción
- [`@QReadonly`](./qreadonly) — inmutabilidad del campo tras la construcción
- [Transformadores personalizados](./custom-transformers) — registrar transformadores de tipo reutilizables
- [Transformadores](./transformers) — coerciones de tipo integradas mediante `@Quick`
