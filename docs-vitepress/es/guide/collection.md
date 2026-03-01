# Colecciones (`QModelCollection`)

`QModelCollection<T>` es un contenedor tipado e **inmutable** alrededor de un array de instancias de `QModel`. Proporciona una API fluida para filtrado, ordenación, paginación, agrupación, agregación, serialización y validación de reglas — sin mutar los datos originales.

## Crear una colección

### A partir de datos crudos

```typescript
import { QModelCollection } from 'quickmodel';

const users = QModelCollection.from(UserModel, rawRows);
// Cada fila se instancia con `new UserModel(row)`
```

### Usando el alias estático del modelo

Cada subclase de `QModel` expone un método estático `collection()` como atajo:

```typescript
const users = UserModel.collection(rawRows);
// Equivalente a QModelCollection.from(UserModel, rawRows)
```

Ambas formas producen un `QModelCollection<UserModel>`.

## API fluida

Todas las operaciones devuelven **nuevas colecciones** — la original nunca se muta.

### Filtrado

```typescript
const admins = users.where((u) => u.role === 'admin');
const alice = users.find((u) => u.name === 'Alice'); // UserModel | undefined
```

### Ordenación

```typescript
const porNombre = users.sortBy('name');
const porEdadDesc = users.sortBy('age', { desc: true });
```

### Paginación

```typescript
const pagina1 = users.paginate(1, 10); // elementos 0–9
const pagina2 = users.paginate(2, 10); // elementos 10–19
```

### Agrupación

```typescript
const porRol = users.groupBy('role');
// → { admin: UserModel[], viewer: UserModel[], ... }
```

## Utilidades funcionales

```typescript
users.size; // total
users.count((u) => u.active); // conteo condicional
users.isEmpty; // true si está vacía
users.first(); // UserModel | undefined
users.last(); // UserModel | undefined
users.every((u) => u.age >= 18); // boolean
users.some((u) => u.role === 'admin'); // boolean

users.map((u) => u.name); // string[]
users.flatMap((u) => [u.name, u.email]); // string[]
users.reduce((acc, u) => acc + u.price, 0); // number
```

### Helpers de agregación

```typescript
users.sum('score'); // suma del campo numérico
users.avg('score'); // promedio
users.min('score'); // mínimo
users.max('score'); // máximo
```

## Serialización

```typescript
users.serialize(); // array de objetos planos
users.serialize({ pick: ['id', 'name'] }); // subconjunto de campos
users.toJSON(); // string JSON

users.toCSV();
// id,name,email
// 1,Alice,alice@example.com
// 2,Bob,bob@example.com

users.toCSV({ delimiter: ';', fields: ['name', 'email'] });
```

## Validación de reglas

```typescript
const result = users.checkAllRules();
// → { valid: boolean, errors: [{ index, field, message }] }

if (!result.valid) {
	result.errors.forEach((e) =>
		console.error(`Fila ${e.index}: [${e.field}] ${e.message}`)
	);
}
```

## Acceso a las instancias crudas

```typescript
users.toArray(); // UserModel[]  (copia superficial)
```

## Encadenamiento de operaciones

Todos los métodos fluidos devuelven una nueva `QModelCollection`, por lo que encadenan de forma natural:

```typescript
const informe = UserModel.collection(filasDB)
	.where((u) => u.active)
	.sortBy('lastName')
	.paginate(1, 20)
	.serialize({ pick: ['id', 'firstName', 'lastName', 'email'] });
```

## Opciones de exportación CSV

| Opción           | Tipo       | Por defecto | Descripción                                |
| ---------------- | ---------- | ----------- | ------------------------------------------ |
| `delimiter`      | `string`   | `','`       | Separador de columnas                      |
| `includeHeaders` | `boolean`  | `true`      | Si se emite fila de encabezados            |
| `fields`         | `string[]` | todos       | Subconjunto de campos a exportar, en orden |
| `nullValue`      | `string`   | `''`        | Reemplazo para celdas `null`/`undefined`   |

## Referencia de API

| Miembro                             | Descripción                                      |
| ----------------------------------- | ------------------------------------------------ |
| `QModelCollection.from(Ctor, data)` | Fábrica — crea colección desde array crudo       |
| `Model.collection(data)`            | Alias estático en cualquier subclase de `QModel` |
| `.where(fn)`                        | Filtrado — devuelve nueva colección              |
| `.find(fn)`                         | Encuentra la primera instancia coincidente       |
| `.sortBy(field, opts?)`             | Ordenar por campo                                |
| `.paginate(page, size)`             | Paginación                                       |
| `.groupBy(field)`                   | Agrupar en un Record                             |
| `.serialize(opts?)`                 | Array de objetos planos                          |
| `.toJSON()`                         | String JSON                                      |
| `.toCSV(opts?)`                     | String CSV                                       |
| `.checkAllRules()`                  | Validar todas las instancias                     |
| `.toArray()`                        | Array plano de instancias del modelo             |

## Ver también

- [QModel](./qmodel) — clase base
- [Serialización](./serialization) — opciones de serialización
- [Validación](./validation) — API de validación de reglas
