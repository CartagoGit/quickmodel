# QModel

La clase `QModel` es el corazón de la librería. Es una clase base abstracta que proporciona todas las capacidades de serialización, deserialización y mocking a tus modelos.

## Uso

Extiende `QModel` pasando tu interfaz de datos como tipo genérico:

```typescript
import { QModel } from 'quickmodel';

interface IUser {
	id: number;
	name: string;
}

class User extends QModel<IUser> {
	// Tus propiedades de clase
}
```

## Métodos de Instanciación

QuickModel ofrece varias formas de crear instancias, dependiendo de tus necesidades.

### 1. Constructor (Recomendado)

La forma más común y estándar.

```typescript
const user = new User({
	id: 1,
	name: 'Juan',
});
```

> [!TIP] Seguridad de Tipos (Recomendado)
> Para una verificación de tipos estricta entre tu interfaz y tu clase, es altamente rrecomendable usar `IQImplements`. Este ayudante asegura que las propiedades de tu clase coincidan con la definición de tu interfaz. [Aprende más](/es/guide/iq-implements).
>
> ```typescript
> class User extends QModel<IUser> implements IQImplements<IUser, IUserTransform> { ... }
> ```

### 2. Método Factoría (`create`)

Útil para patrones de programación funcional o mapeo de arrays.

```typescript
const user = User.create({
	id: 1,
	name: 'Juan',
});

// Ejemplo de mapeo
const users = dataArray.map(User.create);
```

### 3. Desde Cadena JSON

Parsea automáticamente JSON y luego transforma los tipos.

```typescript
const json = '{"id":1,"name":"Juan","createdAt":"2024-01-01"}';
const user = User.fromJSON(json);
```

### 4. Clonación

Crea una copia profunda de una instancia existente.

```typescript
const clone = user.$qm.copy();
```

### 5. Instancia de Solo Lectura (Readonly)

Crea una instancia profundamente congelada (inmutable). Cualquier intento de modificarla lanzará un error en modo estricto.

```typescript
const readonlyUser = User.createReadonly({
	id: 1,
	name: 'Juan',
});

// readonlyUser.name = 'Ana'; // ¡Error!
```

### 6. Creación masiva (`createMany`)

Crea múltiples instancias a partir de un array. Todos los items se procesan aunque algunos fallen — los que no superan `isValid()` van a `errors[]` y quedan **excluidos** de `instances[]` por defecto.

```typescript
const rawList = [
	{ name: 'Alice', age: 30 },
	{ name: 'Menor', age: 10 }, // falla @QRule
	{ name: 'Bob', age: 25 },
];

const { instances, errors } = UsuarioModel.createMany(rawList);

console.log(instances.length); // 2  (Alice + Bob)
console.log(errors.length); // 1

console.log(errors[0].index); // 1
console.log(errors[0].instance.name); // 'Menor'
console.log(errors[0].errors); // [{ field: 'age', message: 'Debe ser mayor de edad', value: 10 }]
```

Para incluir las instancias inválidas también en el resultado:

```typescript
const { instances, errors } = UsuarioModel.createMany(rawList, {
	includeErrorInstances: true,
});
// instances.length === 3 — las tres, incluyendo Menor
// errors.length   === 1 — la lista de errores sigue informada
```

| Opción                  | Tipo      | Por defecto | Descripción                                           |
| ----------------------- | --------- | ----------- | ----------------------------------------------------- |
| `includeErrorInstances` | `boolean` | `false`     | Incluir instancias inválidas también en `instances[]` |

## Ciclo de Vida

Cuando se instancia un modelo, sucede lo siguiente:

1. **Constructor Llamado**: Se reciben los datos.
2. **Inicialización**: Se llama internamente a `this.initialize()`.
3. **Deserialización**: Se procesan los datos, se aplican transformadores (`string` -> `Date`).
4. **Hidratación**: Se asignan las propiedades a la instancia.
5. **Validación**: Se ejecutan los pasos opcionales de validación.

## Métodos Principales

### `serialize()`

Convierte el modelo de vuelta a un objeto JavaScript plano, revirtiendo las transformaciones (e.g., `Date` -> `ISO string`).

```typescript
const plain = user.$qm.serialize();
```

### `toJSON()`

Devuelve una representación en cadena JSON del modelo.

```typescript
const jsonString = user.toJSON();
```

### `toInterface()`

Devuelve los datos en su formato original (definido por la interfaz), preservando los tipos originales.

```typescript
// Si User se creó con { createdAt: '2024-01-01' }
const rawData = user.toInterface();
// rawData.createdAt es '2024-01-01' (string)
```

### `static getMetadata()`

Devuelve un mapa de todas las propiedades decoradas y su configuración. Útil para formularios dinámicos o herramientas de inspección.

```typescript
const meta = User.getMetadata();
console.log(meta.get('createdAt').type); // 'Date'
```

### `static deserialize(data)`

Método de bajo nivel para hidratar un objeto plano en una instancia. Equivalente a `new Model(data)`.

```typescript
const user = User.deserialize(plainObject);
```

### `validationReport()`

Devuelve un informe detallado de todos los fallos de validación, incluidos los errores de integridad de transformers y las violaciones de reglas de negocio `@QRule`.

```typescript
const report = user.$qm.validationReport();
if (!report.valid) {
	console.error(report.errors);
}
```

### `isValid()`

Devuelve `true` si el modelo supera todas las comprobaciones de integridad y las reglas de negocio. Combina `checkIntegrity()` y `checkRules()` en una sola llamada.

```typescript
if (!user.$qm.isValid()) {
	console.error('El modelo no es válido');
}
```

## Gestión de Estado y Control de Cambios

QModel incluye herramientas integradas potentes para rastrear cambios, comparar estados y gestionar actualizaciones.

### `hasChanges()` / `isDirty(field?)`

Sin argumentos, devuelve `true` si **algún** campo ha cambiado desde que se instanció.

Con un nombre de campo, devuelve `true` si **ese campo concreto** está modificado.

```typescript
const user = new User({ name: 'John', age: 30 });
console.log(user.$qm.isDirty()); // false
console.log(user.$qm.isDirty('name')); // false

user.name = 'Jane';
console.log(user.$qm.isDirty()); // true  — algo cambió
console.log(user.$qm.isDirty('name')); // true  — 'name' cambió
console.log(user.$qm.isDirty('age')); // false — 'age' NO cambió
```

> [!TIP]
> `hasChanges()` e `isDirty()` (sin argumento) son equivalentes. `isDirty(field)` es la nueva variante por campo.

### `getChanges()`

Devuelve un objeto parcial que contiene **solo los campos que han cambiado**. Perfecto para generar payloads PATCH.

```typescript
const user = new User({ id: 1, name: 'John', age: 30 });

user.age = 31;

const changes = user.$qm.getChanges();
// Resultado: { age: 31 }
```

### `getChangedFields()`

Devuelve un array con los nombres de las propiedades modificadas.

```typescript
const fields = user.getChangedFields();
// Resultado: ['age']
```

### `reset()`

Revierte la instancia del modelo a su **estado inicial** (los datos proporcionados al constructor).

```typescript
user.name = 'Modificado';
user.reset();
console.log(user.name); // 'John' (Valor original)
```

### `patch(data)`

Aplica actualizaciones parciales al modelo. Útil para procesar respuestas de API o actualizaciones parciales de formularios.

```typescript
user.$qm.patch({ age: 32 });
// Solo se actualiza 'age', el resto permanece igual
```

### `getInitInterface()`

Devuelve los **datos originales** usados para crear la instancia, en su formato original (preservando strings en lugar de Dates, etc.).

```typescript
// Entrada inicial: { createdAt: '2024-01-01' }
const original = user.getInitInterface();
console.log(original.createdAt); // '2024-01-01' (String)
```

### `copy(partial?)`

Crea una **nueva instancia** (inmutable) fusionando el estado actual con los datos parciales opcionales. La instancia original nunca se modifica. Sin argumentos realiza una copia profunda (deep copy) del estado actual.

```typescript
const user = new User({ id: 1, name: 'John', age: 30 });

const updated = user.$qm.copy({ age: 31 });

console.log(user.age); // 30  — original intacto
console.log(updated.age); // 31  — nueva instancia
console.log(updated.name); // 'John' — preservado

// La nueva instancia tiene su propio tracking de cambios
updated.name = 'Jane';
console.log(updated.$qm.isDirty()); // true
console.log(updated.$qm.isDirty('age')); // false — 31 es su baseline
console.log(updated.$qm.isDirty('name')); // true  — cambió tras el merge

// Sin argumentos: copia profunda completa
const clone = user.$qm.copy();
console.log(clone.age); // 30  — misma copia, independiente
```

> [!NOTE]
> `copy()` devuelve una instancia completamente independiente con su propio tracking de cambios. El estado copiado se convierte en el nuevo baseline — `isDirty()` es `false` inmediatamente tras `copy()`, y `reset()` revierte al estado copiado (no al original).

## Mocking

Cada QModel tiene un generador de mocks estático incorporado.

```typescript
// Generar una instancia
const fakeUser = User.mock().random();

// Generar array de 10 instancias
const fakeUsers = User.mock().array(10);

// Generar con sobrescrituras específicas
const admin = User.mock().random({ role: 'admin' });
```

> [!TIP]
> Para más detalles sobre las potentes funciones de generación de mocks, consulta la [Guía de Mocks](/es/guide/mocks).

## Rendimiento

<BenchmarkChart
  :only-scenarios="['batch', 'isDirty', 'bulkConstruct']"
  :only-libs="['QuickModel', 'Plain JS', 'Immer']"
  :only-feature-categories="['model']"
  default-tab="performance"
/>
