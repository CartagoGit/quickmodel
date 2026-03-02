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
const admins = users.$qWhere((u) => u.role === 'admin');
const alice = users.$qFind((u) => u.name === 'Alice'); // UserModel | undefined
```

### Ordenación

```typescript
const porNombre = users.$qSortBy('name');
const porEdadDesc = users.$qSortBy('age', { order: 'desc' });
```

### Paginación

```typescript
const pagina1 = users.$qPaginate(1, 10); // elementos 0–9
const pagina2 = users.$qPaginate(2, 10); // elementos 10–19
```

### Agrupación

```typescript
const porRol = users.$qGroupBy('role');
// → { admin: UserModel[], viewer: UserModel[], ... }
```

## Utilidades funcionales

```typescript
users.$qSize; // total
users.$qCount((u) => u.active); // conteo condicional
users.$qIsEmpty; // true si está vacía
users.$qFirst(); // UserModel | undefined
users.$qLast(); // UserModel | undefined
users.$qEvery((u) => u.age >= 18); // boolean
users.$qSome((u) => u.role === 'admin'); // boolean

users.$qMap((u) => u.name); // string[]
users.$qFlatMap((u) => [u.name, u.email]); // string[]
users.$qReduce((acc, u) => acc + u.price, 0); // number
```

### Helpers de agregación

```typescript
users.$qSum('score'); // suma del campo numérico
users.$qAvg('score'); // promedio
users.$qMin('score'); // mínimo
users.$qMax('score'); // máximo
```

## Serialización

```typescript
users.$qSerialize(); // array de objetos planos
users.$qSerialize({ pick: ['id', 'name'] }); // subconjunto de campos
users.$qToJSON(); // string JSON

users.$qToCSV();
// id,name,email
// 1,Alice,alice@example.com
// 2,Bob,bob@example.com

users.$qToCSV({ delimiter: ';', fields: ['name', 'email'] });
```

## Validación de reglas

```typescript
const result = users.$qCheckAllRules();
// → { valid: boolean, errors: [{ index, field, message }] }

if (!result.valid) {
	result.errors.forEach((e) =>
		console.error(`Fila ${e.index}: [${e.field}] ${e.message}`)
	);
}
```

## Acceso a las instancias crudas

```typescript
users.$qToArray(); // UserModel[]  (copia superficial)
```

## Encadenamiento de operaciones

Todos los métodos fluidos devuelven una nueva `QModelCollection`, por lo que encadenan de forma natural:

```typescript
const informe = UserModel.collection(filasDB)
	.$qWhere((u) => u.active)
	.$qSortBy('lastName')
	.$qPaginate(1, 20)
	.$qSerialize({ pick: ['id', 'firstName', 'lastName', 'email'] });
```

## Opciones de exportación CSV

| Opción           | Tipo       | Por defecto | Descripción                                |
| ---------------- | ---------- | ----------- | ------------------------------------------ |
| `delimiter`      | `string`   | `','`       | Separador de columnas                      |
| `includeHeaders` | `boolean`  | `true`      | Si se emite fila de encabezados            |
| `fields`         | `string[]` | todos       | Subconjunto de campos a exportar, en orden |
| `nullValue`      | `string`   | `''`        | Reemplazo para celdas `null`/`undefined`   |

## Referencia de API

| Miembro                             | Descripción                                        |
| ----------------------------------- | -------------------------------------------------- |
| `QModelCollection.from(Ctor, data)` | Fábrica — crea colección desde array crudo         |
| `Model.collection(data)`            | Alias estático en cualquier subclase de `QModel`   |
| `.$qWhere(fn)`                      | Filtrado — devuelve nueva colección                |
| `.$qFind(fn)`                       | Encuentra la primera instancia coincidente         |
| `.$qSortBy(field, opts?)`           | Ordenar por campo                                  |
| `.$qPaginate(page, size)`           | Paginación                                         |
| `.$qGroupBy(field)`                 | Agrupar en un Record                               |
| `.$qSize`                           | Número total de elementos                          |
| `.$qCount(fn?)`                     | Conteo condicional (todos si no hay predicado)     |
| `.$qIsEmpty`                        | `true` cuando la colección está vacía              |
| `.$qFirst()`                        | Primera instancia o `undefined`                    |
| `.$qLast()`                         | Última instancia o `undefined`                     |
| `.$qEvery(fn)`                      | `true` si todos los elementos cumplen el predicado |
| `.$qSome(fn)`                       | `true` si al menos un elemento coincide            |
| `.$qMap(fn)`                        | Mapear instancias a cualquier valor                |
| `.$qFlatMap(fn)`                    | FlatMap de instancias                              |
| `.$qReduce(fn, init)`               | Reducir a un único valor                           |
| `.$qSum(field)`                     | Suma de un campo numérico                          |
| `.$qAvg(field)`                     | Media de un campo numérico                         |
| `.$qMin(field)`                     | Valor mínimo de un campo numérico                  |
| `.$qMax(field)`                     | Valor máximo de un campo numérico                  |
| `.$qUnique(field)`                  | Valores únicos de un campo                         |
| `.$qToMap(keyField)`                | Convertir a `Map` indexado por campo               |
| `.$qSerialize(opts?)`               | Array de objetos planos                            |
| `.$qToJSON()`                       | String JSON                                        |
| `.$qToCSV(opts?)`                   | String CSV                                         |
| `.$qCheckAllRules()`                | Validar todas las instancias                       |
| `.$qToArray()`                      | Array plano de instancias del modelo               |

## Ver también

- [QModel](./qmodel) — clase base
- [Serialización](./serialization) — opciones de serialización
- [Validación](./validation) — API de validación de reglas
