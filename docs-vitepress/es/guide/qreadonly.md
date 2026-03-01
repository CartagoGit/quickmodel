# Campos de solo lectura (`@QReadonly`)

El decorador `@QReadonly()` marca campos del modelo como **inmutables tras la construcción**. Cualquier intento de modificarlos mediante `copy()` o `patch()` lanza un `ImmutableFieldError`.

## Uso básico

```typescript
import { Quick, QModel, QReadonly } from 'quickmodel';

interface IOrder {
	id: number;
	status: string;
	createdAt: Date;
}

@Quick({ createdAt: Date })
class OrderModel extends QModel<IOrder> {
	@QReadonly()
	declare id: number; // no se puede cambiar tras la creación

	@QReadonly()
	declare createdAt: Date;

	declare status: string; // libremente mutable
}

const order = new OrderModel({
	id: 1,
	status: 'pending',
	createdAt: new Date(),
});

order.copy({ status: 'shipped' }); // ✅ OK — status no es readonly
order.copy({ id: 999 }); // ❌ lanza ImmutableFieldError
order.patch({ id: 999 }); // ❌ lanza ImmutableFieldError
```

## Qué protege `@QReadonly`

`@QReadonly` protege contra la mutación únicamente a través de `copy()` y `patch()`. Otros accesos son libres:

| Operación                     | ¿Protegida?                                                             |
| ----------------------------- | ----------------------------------------------------------------------- |
| `new Model({ campo: valor })` | ❌ No — la construcción siempre está permitida                          |
| `copy({ campo: valor })`      | ✅ Sí — lanza `ImmutableFieldError`                                     |
| `patch({ campo: valor })`     | ✅ Sí — lanza `ImmutableFieldError`                                     |
| Lectura directa `model.campo` | ❌ No — siempre legible                                                 |
| `serialize()`                 | ❌ No — incluido en la salida (combinar con `@QSensitive` para excluir) |

## Gestionar el error

```typescript
import { ImmutableFieldError } from 'quickmodel';

try {
	order.copy({ id: 999 });
} catch (err) {
	if (err instanceof ImmutableFieldError) {
		console.error(err.field); // 'id'
		console.error(err.modelName); // 'OrderModel'
		console.error(err.message); // mensaje descriptivo completo
	}
}
```

## Casos de uso

### IDs inmutables

Evitar cambios accidentales de ID tras la creación:

```typescript
@Quick()
class Entity extends QModel<IEntity> {
	@QReadonly()
	declare id: string;

	@QReadonly()
	declare createdAt: Date;
}
```

### Event sourcing — registros de solo escritura

```typescript
@Quick()
class DomainEvent extends QModel<IDomainEvent> {
	@QReadonly()
	declare eventId: string;

	@QReadonly()
	declare aggregateId: string;

	@QReadonly()
	declare occurredAt: Date;

	declare payload: Record<string, unknown>; // el payload sí puede modificarse vía copy()
}
```

## Combinación con otros decoradores

`@QReadonly` se compone limpiamente con `@QDefault`, `@QSensitive` y `@QTransform`:

```typescript
@Quick()
class ApiKey extends QModel<IApiKey> {
	@QReadonly()
	@QDefault(() => crypto.randomUUID())
	declare id: string; // auto-generado e inmutable

	@QReadonly()
	@QSensitive()
	declare secret: string; // inmutable + excluido de serialize()

	@QReadonly()
	@QTransform((v: string) => v.trim().toLowerCase())
	declare name: string; // normalizado en construcción, luego inmutable
}
```

## Herencia

Las declaraciones de `@QReadonly` se heredan — las clases hijas protegen automáticamente todos los campos readonly del padre:

```typescript
@Quick()
class BaseEntity extends QModel<IBaseEntity> {
	@QReadonly()
	declare id: string;
}

@Quick()
class UserModel extends BaseEntity {
	declare email: string;
}

const user = new UserModel({ id: 'u1', email: 'a@b.com' });
user.copy({ id: 'u2' }); // ❌ lanza ImmutableFieldError (heredado de BaseEntity)
```

## Referencia de API

| Símbolo                         | Descripción                                        |
| ------------------------------- | -------------------------------------------------- |
| `@QReadonly()`                  | Marca un campo como inmutable tras la construcción |
| `ImmutableFieldError`           | Error lanzado cuando se muta un campo readonly     |
| `ImmutableFieldError.field`     | Nombre del campo readonly                          |
| `ImmutableFieldError.modelName` | Nombre de la clase del modelo                      |

## Ver también

- [`@QDefault`](./qdefault) — establecer valores por defecto en la construcción
- [`@QSensitive`](./sensitive-fields) — excluir campos de la serialización
- [`@QTransform`](./qtransform) — transformaciones de valores de campo en construcción
- [QModel](./qmodel) — métodos `copy()` y `patch()`
