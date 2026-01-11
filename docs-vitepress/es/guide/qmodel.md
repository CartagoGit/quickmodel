# QModel

La clase `QModel` es el corazón de la librería. Es una clase base abstracta que proporciona todas las capacidades de serialización, deserialización y mocking a tus modelos.

## Uso

Extiende `QModel` pasando tu interfaz de datos como tipo genérico:

```typescript
import { QModel } from '@cartago-git/quickmodel';

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
const clone = user.clone();
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

Crea una copia profunda de una instancia existente.

```typescript
const clone = user.clone();
```

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
const plain = user.serialize();
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

### `validate()`

Ejecuta todas las validaciones definidas en las propiedades.

```typescript
const errors = user.validate();
if (errors.length) {
	console.error(errors);
}
```

## Mocking

Cada QModel tiene un generador de mocks estático incorporado.

```typescript
// Generar una instancia
const fakeUser = User.mock().random();

// Generar array de 10 instancias
const fakeUsers = User.mock().array(10);

// Generar con sobrescrituras específicas
// Generar con sobrescrituras específicas
const admin = User.mock().random({ role: 'admin' });
```

> [!TIP]
> Para más detalles sobre las potentes funciones de generación de mocks, consulta la [Guía de Mocks](/es/guide/mocks).
