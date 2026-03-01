# Valores por defecto (`@QDefault`)

El decorador `@QDefault()` declara un valor de fallback para un campo del modelo. El valor por defecto se aplica durante la construcción **solo cuando** el valor entrante es `undefined` o `null` — nunca reemplaza `false`, `0` ni `''`.

## Uso básico

```typescript
import { Quick, QModel, QDefault } from 'quickmodel';

interface IOrder {
	id: string;
	status: string;
	retries: number;
}

@Quick()
class OrderModel extends QModel<IOrder> {
	declare id: string;

	@QDefault('pending')
	declare status: string;

	@QDefault(0)
	declare retries: number;
}

new OrderModel({ id: 'o1' }).status; // → 'pending'
new OrderModel({ id: 'o1', status: 'shipped' }).status; // → 'shipped'
new OrderModel({ id: 'o1', retries: 0 }).retries; // → 0  (no se reemplaza)
```

## Valores estáticos vs factorías

Para **valores primitivos** (string, number, boolean) — pasa el valor directamente:

```typescript
@QDefault('active')
declare state: string;

@QDefault(100)
declare limit: number;
```

Para **tipos por referencia** (arrays, objetos, `Date`) — usa siempre una **función factoría** para garantizar que cada instancia obtiene su propia copia:

```typescript
@Quick()
class EventModel extends QModel<IEvent> {
	@QDefault(() => [])
	declare tags: string[]; // array propio por instancia

	@QDefault(() => new Date())
	declare createdAt: Date; // Date propio por instancia

	@QDefault(() => ({ x: 0, y: 0 }))
	declare position: IPoint; // objeto propio por instancia
}
```

::: warning
Nunca pases un tipo por referencia como valor estático — todas las instancias compartirían el mismo objeto:

```typescript
// ❌ Incorrecto — todas las instancias comparten el mismo array
@QDefault([])
declare tags: string[];

// ✅ Correcto — cada instancia obtiene su propio array
@QDefault(() => [])
declare tags: string[];
```

:::

## Manejo de null y undefined

`@QDefault` se activa cuando el valor entrante es **`undefined` o `null`**:

```typescript
const a = new OrderModel({ id: 'o1' });
a.status; // → 'pending'  (undefined → se aplica el default)

const b = new OrderModel({ id: 'o1', status: null });
b.status; // → 'pending'  (null → se aplica el default)

const c = new OrderModel({ id: 'o1', status: '' });
c.status; // → ''         (cadena vacía → NO se reemplaza)
```

## Combinación con otros decoradores

`@QDefault` se compone con `@QReadonly`, `@QSensitive` y `@QTransform`:

```typescript
@Quick()
class ApiKey extends QModel<IApiKey> {
	@QReadonly()
	@QDefault(() => crypto.randomUUID())
	declare id: string; // ID inmutable, generado automáticamente si no se proporciona

	@QSensitive()
	@QDefault('—')
	declare secret: string; // sensible + tiene un placeholder seguro por defecto
}
```

## Herencia

Las declaraciones de `@QDefault` se heredan — las clases hijas reciben automáticamente todos los defaults del padre:

```typescript
@Quick()
class BaseEntity extends QModel<IBaseEntity> {
	@QDefault(() => new Date())
	declare createdAt: Date;
}

@Quick()
class UserModel extends BaseEntity {
	declare name: string;
}

new UserModel({ name: 'Alice' }).createdAt; // → Date actual
```

## copy() y patch()

Los defaults **no** se vuelven a aplicar en `copy()` ni en `patch()`. Solo se ejecutan en la construcción inicial con `new Model(data)`:

```typescript
const order = new OrderModel({ id: 'o1' });
order.status; // → 'pending'

const updated = order.copy({ retries: 3 });
updated.status; // → 'pending'  (nueva instancia copiando desde 'pending')
```

## Referencia de API

| Símbolo                  | Descripción                                              |
| ------------------------ | -------------------------------------------------------- |
| `@QDefault(valor)`       | Establece un default estático (primitivos)               |
| `@QDefault(() => valor)` | Establece un default con factoría (tipos por referencia) |

## Ver también

- [`@QReadonly`](./qreadonly) — inmutabilidad del campo tras la construcción
- [`@QTransform`](./qtransform) — transformaciones post-deserialización
- [`@QSensitive`](./sensitive-fields) — excluir campos sensibles de la serialización
