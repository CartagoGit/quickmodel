# Alias de Claves con `@QAlias`

`@QAlias` mapea una propiedad del modelo a un nombre de clave externo que se usa tanto en la **entrada** (`create()`, `new`, `fromJSON()`) como en la **salida** (`serialize()`, `toJSON()`). Esto facilita trabajar con APIs en snake_case manteniendo camelCase en el código del modelo.

## Ejemplo Básico

```typescript
import { Quick, QModel, QAlias } from 'quickmodel';

interface IUsuario {
	firstName: string;
	lastName: string;
	emailAddress: string;
}

@Quick()
class UsuarioModel extends QModel<IUsuario> {
	@QAlias('first_name')
	declare firstName: string;

	@QAlias('last_name')
	declare lastName: string;

	@QAlias('email_address')
	declare emailAddress: string;
}
```

## Entrada: `create()` con payload en snake_case

```typescript
// Funciona con claves alias (p. ej. desde una API REST):
const usuario = UsuarioModel.create({
	first_name: 'Alice',
	last_name: 'Smith',
	email_address: 'alice@ejemplo.com',
} as any);

console.log(usuario.firstName); // 'Alice'             ✅ camelCase dentro del modelo
console.log(usuario.emailAddress); // 'alice@ejemplo.com'
```

> [!TIP]
> Pasar las claves camelCase originales (`firstName`, etc.) también funciona como fallback. Cuando están **ambas** — la clave alias y la clave de propiedad — en el payload, la alias tiene prioridad.

## Salida: `serialize()` emite claves alias

```typescript
const salida = usuario.serialize();
// {
//   first_name: 'Alice',
//   last_name: 'Smith',
//   email_address: 'alice@ejemplo.com'
// }

const json = usuario.toJSON();
// '{"first_name":"Alice","last_name":"Smith","email_address":"alice@ejemplo.com"}'
```

Los campos **sin** `@QAlias` conservan su nombre de propiedad original en la salida.

## Roundtrip Completo

Dado que tanto la entrada como la salida usan las claves alias, el resultado serializado puede pasarse directamente de vuelta a `create()`:

```typescript
const serializado = usuario.serialize();
const restaurado = UsuarioModel.create(serializado as any);

restaurado.firstName === 'Alice'; // ✅
restaurado.emailAddress === 'alice@ejemplo.com'; // ✅
```

`fromJSON()` también soporta el roundtrip:

```typescript
const json = usuario.toJSON();
const restaurado = UsuarioModel.fromJSON(json);
restaurado.firstName === 'Alice'; // ✅
```

## Campos Mixtos

Solo las propiedades decoradas con `@QAlias` son remapeadas. Los demás campos conservan sus claves originales.

```typescript
@Quick({ fechaNacimiento: Date })
class PerfilModel extends QModel<IPerfil> {
	@QAlias('nombre_completo')
	declare nombreCompleto: string;

	declare fechaNacimiento: Date; // sin alias
}

const p = PerfilModel.create({
	nombre_completo: 'Jane Doe',
	fechaNacimiento: '1990-01-01',
} as any);
p.nombreCompleto; // 'Jane Doe'  ✅
p.fechaNacimiento; // objeto Date ✅

p.serialize();
// { nombre_completo: 'Jane Doe', fechaNacimiento: '1990-01-01T00:00:00.000Z' }
```

## Herencia

Las subclases heredan los `@QAlias` del padre. Los alias adicionales se pueden declarar en la subclase.

```typescript
@Quick()
class AdminModel extends UsuarioModel {
	@QAlias('numero_telefono')
	declare numeroTelefono: string;
}

const admin = AdminModel.create({
	first_name: 'Dan',
	last_name: 'Lee',
	email_address: 'dan@ejemplo.com',
	numero_telefono: '555-1234',
} as any);

admin.firstName; // 'Dan'
admin.numeroTelefono; // '555-1234'
admin.serialize(); // { first_name: 'Dan', ..., numero_telefono: '555-1234' }
```

## Referencia de API

### `@QAlias(alias: string)`

| Parámetro | Tipo     | Descripción                                                     |
| --------- | -------- | --------------------------------------------------------------- |
| `alias`   | `string` | Nombre de la clave externa (p. ej. `'first_name'`, `'user_id'`) |

**Comportamiento:**

- **Remapping de entrada**: si la clave `alias` está presente en el payload al crear, se renombra al nombre de propiedad antes de la deserialización. La clave camelCase sigue aceptándose como fallback.
- **Remapping de salida**: `serialize()` y `toJSON()` emiten `alias` en lugar del nombre de propiedad.
- Herencia: las subclases heredan los alias mediante recorrido de la cadena prototipo.

## Casos de Uso Comunes

| Escenario                         | Ejemplo                                    |
| --------------------------------- | ------------------------------------------ |
| API REST con campos en snake_case | `@QAlias('created_at')` en `createdAt`     |
| Mapeo de modelos externos         | `@QAlias('user_id')` en `userId`           |
| Nombres de columnas de DB         | `@QAlias('phone_number')` en `phoneNumber` |
| Nombres de campo legacy           | `@QAlias('e_mail')` en `email`             |
