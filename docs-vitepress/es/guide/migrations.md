# Migraciones de esquema (`@QVersion`)

El decorador `@QVersion()` habilita la **migración transparente de esquemas** para datos versionados. Se adjunta a cualquier subclase de `QModel` para declarar la versión actual del esquema y registrar las funciones de migración necesarias para actualizar automáticamente los payloads de datos más antiguos.

## El problema que resuelve

Los datos almacenados en localStorage, bases de datos o APIs pueden estar en un formato anterior. Sin migraciones, el código defensivo se dispersa por toda la aplicación:

```typescript
// ❌ Sin @QVersion — ruido de migración manual en todas partes
const raw = JSON.parse(localStorage.getItem('user') ?? '{}');
const data = raw.firstName
	? { ...raw, fullName: `${raw.firstName} ${raw.lastName}` }
	: raw;
const user = new UserModel(data);
```

Con `@QVersion`, esto ocurre automáticamente dentro del modelo:

```typescript
// ✅ Con @QVersion — simplemente crea el modelo
const user = new UserModel(JSON.parse(localStorage.getItem('user') ?? '{}'));
```

## Uso básico

```typescript
import { Quick, QModel, QVersion } from 'quickmodel';

interface IUser {
	fullName: string;
	_v?: number;
}

@Quick()
@QVersion(2, {
	migrations: {
		// v1 → v2: unir firstName + lastName en fullName
		1: (data) => ({
			...data,
			fullName:
				`${String(data['firstName'] ?? '')} ${String(data['lastName'] ?? '')}`.trim(),
		}),
	},
})
class UserModel extends QModel<IUser> {
	declare fullName: string;
}

// Leyendo datos almacenados cuando el esquema era v1
const user = new UserModel({ firstName: 'Alice', lastName: 'Smith', _v: 1 });
user.fullName; // → 'Alice Smith'  (auto-migrado, sin código manual)
```

## Cómo funciona

1. `@QVersion(N, { migrations })` se adjunta a la clase
2. Cuando se llama a `new Model(data)`, el constructor comprueba `data._v`
3. Si `data._v < N`, las migraciones se aplican secuencialmente desde `data._v` hasta `N`
4. El resultado tiene `_v` establecido en `N`
5. El modelo se rellena con los datos migrados

Si `data._v` está ausente o `data._v >= N`, los datos pasan sin cambios.

## Migraciones en múltiples pasos

Cada clave de migración transforma los datos DESDE esa versión HASTA la siguiente:

```typescript
@Quick()
@QVersion(3, {
	migrations: {
		1: (data) => ({ ...data, body: data['content'] }), // v1 → v2
		2: (data) => ({ ...data, tags: [data['label']] }), // v2 → v3
	},
})
class PostModel extends QModel<IPost> {
	declare body: string;
	declare tags: string[];
}

// Los datos en v1 pasan por ambas migraciones
const post = new PostModel({ content: 'Hello', label: 'news', _v: 1 });
post.body; // → 'Hello'
post.tags; // → ['news']
```

Los pasos de migración se **encadenan automáticamente** — si los datos están en v1 y la versión actual es v3, tanto el paso 1→2 como el 2→3 se ejecutan en secuencia.

## Omitir versiones

Si falta un paso de migración, se omite silenciosamente. Puedes omitir pasos intermedios si no se necesita ninguna transformación:

```typescript
@QVersion(4, {
  migrations: {
    1: (data) => ({ ...data, name: data['username'] }),  // v1 → v2
    // v2 → v3: no se necesita transformación (campo renombrado solo en DB)
    3: (data) => ({ ...data, role: data['type'] }),       // v3 → v4
  },
})
```

## Datos sin `_v`

Si los datos de entrada no tienen campo `_v`, se tratan como **versión actual** y no se ejecuta ninguna migración. Esto gestiona datos legados anteriores al versionado:

```typescript
// Datos sin _v → sin migración, tratados como versión actual
const user = new UserModel({ fullName: 'Alice Smith' });
user.fullName; // → 'Alice Smith'
```

## Serialización

Tras la migración, `_v` se actualiza a la versión actual pero **no se incluye** en la salida de `serialize()` por defecto:

```typescript
const user = new UserModel({ firstName: 'Alice', lastName: 'Smith', _v: 1 });
user.$qSerialize();
// → { fullName: 'Alice Smith' }  — sin _v en la salida
```

Si necesitas `_v` en la salida, decláralo como campo en el modelo:

```typescript
interface IUser {
  fullName: string;
  _v: number;
}

@Quick()
@QVersion(2, { migrations: { ... } })
class UserModel extends QModel<IUser> {
  declare fullName: string;
  declare _v: number;
}
```

## Casos de uso prácticos

### Migraciones de localStorage

```typescript
@QVersion(3, {
  migrations: {
    1: (data) => ({ ...data, theme: 'system' }),              // añadir campo theme
    2: (data) => ({ ...data, locale: data['lang'] ?? 'en' }), // renombrar lang → locale
  },
})
class AppSettings extends QModel<IAppSettings> { ... }

const settings = new AppSettings(
  JSON.parse(localStorage.getItem('settings') ?? '{}')
);
// Siempre actualizado, independientemente de cuándo se almacenaron los datos
```

### Compatibilidad de versiones de API

```typescript
@QVersion(2, {
  migrations: {
    1: (data) => ({
      ...data,
      address: {
        street: data['street'],
        city:   data['city'],
      },
    }),
  },
})
class CustomerModel extends QModel<ICustomer> { ... }
```

## Referencia de API

| Símbolo                      | Descripción                                                           |
| ---------------------------- | --------------------------------------------------------------------- |
| `@QVersion(version, config)` | Declara la versión del esquema y las funciones de migración           |
| `config.migrations`          | `Record<number, (data) => data>` — mapa de versión origen a migración |
| `data._v`                    | Campo de versión entrante (ausente = actual, sin migración)           |
| `IQVersionConfig`            | Tipo del objeto de configuración                                      |

## Ver también

- [QModel](./qmodel) — clase base
- [`@QDefault`](./qdefault) — valores por defecto de campos en la construcción
- [Trazado](./tracing) — observabilidad para la construcción del modelo
