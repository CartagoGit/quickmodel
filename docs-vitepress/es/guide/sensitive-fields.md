# Campos sensibles (`@QSensitive`)

El decorador `@QSensitive()` marca propiedades del modelo que contienen datos confidenciales — contraseñas, claves API, tokens, datos PII — y los excluye automáticamente de la salida de `serialize()` y `toJSON()`.

## Por qué es importante

Sin `@QSensitive`, serializar un modelo puede exponer datos sensibles en respuestas API, registros de log o localStorage. El decorador actúa como un **opt-in de coste cero** para eliminar esos campos antes de que salgan de la capa del modelo.

## Uso básico

```typescript
import { Quick, QModel, QSensitive } from 'quickmodel';

interface IUser {
	id: number;
	email: string;
	password: string;
	apiToken: string;
}

@Quick()
class UserModel extends QModel<IUser> {
	declare id: number;
	declare email: string;

	@QSensitive()
	declare password: string;

	@QSensitive()
	declare apiToken: string;
}

const user = new UserModel({
	id: 1,
	email: 'alice@example.com',
	password: 'supersecret',
	apiToken: 'tok_abc123',
});

user.$qSerialize();
// → { id: 1, email: 'alice@example.com' }
//   password y apiToken quedan excluidos

user.password; // → 'supersecret'  ← sigue siendo una propiedad normal
user.apiToken; // → 'tok_abc123'   ← totalmente accesible
```

## Incluir campos sensibles de forma explícita

Cuando necesitas el payload completo — por ejemplo, al persistir en base de datos — pasa `{ includeSensitive: true }`:

```typescript
user.$qSerialize({ includeSensitive: true });
// → { id: 1, email: 'alice@example.com', password: 'supersecret', apiToken: 'tok_abc123' }

user.toJSON({ includeSensitive: true });
// → igual que serialize pero devuelve string JSON
```

## Qué se ve afectado

| Método                       | ¿Campos sensibles excluidos por defecto?               |
| ---------------------------- | ------------------------------------------------------ |
| `serialize()`                | ✅ Sí                                                  |
| `toJSON()`                   | ✅ Sí                                                  |
| `toInterface()`              | ❌ No — devuelve siempre los datos completos           |
| `checkRules()`               | ❌ No — los predicados se ejecutan en todos los campos |
| Acceso directo a propiedades | ❌ No — siempre accesibles                             |

## Combinación con otros decoradores

`@QSensitive` se compone libremente con `@QReadonly`, `@QDefault`, `@QTransform` y la configuración de tipos de `@Quick`:

```typescript
@Quick({ createdAt: Date })
class TokenModel extends QModel<IToken> {
	@QReadonly()
	@QSensitive()
	declare secret: string; // inmutable y excluido de serialize()

	@QDefault(() => new Date())
	declare createdAt: Date;
}
```

## Herencia

Las declaraciones de campos sensibles se heredan — una clase hija hereda automáticamente los campos `@QSensitive` del padre:

```typescript
@Quick()
class BaseUser extends QModel<IBaseUser> {
	@QSensitive()
	declare password: string;
}

@Quick()
class AdminUser extends BaseUser {
	declare role: string;
}

new AdminUser({ password: 'x', role: 'admin' }).$qSerialize();
// → { role: 'admin' }  ← password excluido (heredado de BaseUser)
```

## Referencia de API

| Símbolo                                 | Descripción                           |
| --------------------------------------- | ------------------------------------- |
| `@QSensitive()`                         | Marca una propiedad como sensible     |
| `serialize({ includeSensitive: true })` | Incluye campos sensibles en la salida |
| `toJSON({ includeSensitive: true })`    | Igual, devuelve string JSON           |

## Ver también

- [Serialización](./serialization) — opciones completas de serialización
- [`@QReadonly`](./qreadonly) — inmutabilidad tras la construcción
- [`@QDefault`](./qdefault) — valores por defecto en la construcción
