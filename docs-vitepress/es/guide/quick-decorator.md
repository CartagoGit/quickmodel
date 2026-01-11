# Decorador @Quick

El decorador `@Quick()` es el **corazón** de QuickModel. Conecta el puente entre los tipos estáticos de TypeScript y el comportamiento en tiempo de ejecución, definiendo exactamente cómo tus datos deben ser serializados, deserializados y "mockeados".

## Visión General

Los tipos de TypeScript (`: string`, `: Date`) son **eliminados** (desaparecen) en tiempo de ejecución. Sin `@Quick`, la librería ve tus propiedades como valores planos.

`@Quick` restaura esta información de tipo perdida, permitiendo a QuickModel:

1.  **Transformar** JSON entrante (ej: string "2024-01-01" -> objeto `Date`).
2.  **Validar** estructuras de datos.
3.  **Generar** mocks precisos.

## Uso

### Decoración de Clase (Recomendado)

La forma más limpia de definir el esquema de tu modelo. Pasa un **Mapa de Tipos** donde las claves coincidan con los nombres de tus propiedades.

```typescript
@Quick({
	name: String, // Primitivo
	age: 'number', // Literal de cadena (Alias)
	birthDate: Date, // Constructor
	tags: [Set], // Colección (Array wrap)
	metadata: Map, // Colección
	avatar: URL, // Web API
})
class User extends QModel<IUser> {
	// ...
}
```

### Decoración de Propiedad

Útil para casos específicos o si prefieres decorar los campos directamente.

```typescript
class User extends QModel<IUser> {
	@QType(Date)
	declare createdAt: Date;
}
```

---

## Referencia de Tipos Soportados

QuickModel soporta una amplia gama de tipos y alias de cadena.

> [!TIP]
> Para una **lista completa** de todos los alias soportados (incluyendo Web APIs, Datos Binarios, etc.), consulta la [Referencia de Alias](./aliases.md).

### Primitivos

### Primitivos

Mapear primitivos explícitamente asegura la coerción de tipos (ej: string `"123"` se convierte en number `123`).

| Tipo        | Sintaxis                | Descripción                                                          |
| :---------- | :---------------------- | :------------------------------------------------------------------- |
| **String**  | `String` / `'string'`   | Convierte valor a string.                                            |
| **Number**  | `Number` / `'number'`   | Convierte valor a number.                                            |
| **Boolean** | `Boolean` / `'boolean'` | Convierte valor a boolean.                                           |
| **BigInt**  | `BigInt` / `'bigint'`   | **Crucial:** Transforma enteros string ("900...") a `BigInt` nativo. |
| **Symbol**  | `Symbol` / `'symbol'`   | Crea un símbolo único.                                               |

### Fechas y Tiempo

El manejo nativo de `Date` es una de las características más útiles.

| Tipo     | Sintaxis          | Entrada (JSON)           | Salida (Modelo) |
| :------- | :---------------- | :----------------------- | :-------------- |
| **Date** | `Date` / `'date'` | `"2024-01-01T12:00:00Z"` | `new Date(...)` |

### Colecciones

Transforma automáticamente arrays de datos en Colecciones ES6 eficientes.

| Tipo        | Sintaxis        | Entrada (JSON)     | Salida (Modelo)                  |
| :---------- | :-------------- | :----------------- | :------------------------------- |
| **Set**     | `Set` / `'set'` | `["a", "b", "a"]`  | `Set {"a", "b"}` (Des-duplicado) |
| **Map**     | `Map` / `'map'` | `[["key", "val"]]` | `Map { "key" => "val" }`         |
| **WeakMap** | `WeakMap`       | `[[obj, val]]`     | `WeakMap`                        |
| **WeakSet** | `WeakSet`       | `[obj1, obj2]`     | `WeakSet`                        |

### Datos Binarios & Buffers

Maneja datos binarios directamente, perfecto para subida de archivos o criptografía.

| Tipo             | Sintaxis                                         |
| :--------------- | :----------------------------------------------- |
| **ArrayBuffer**  | `ArrayBuffer` / `'arraybuffer'`                  |
| **Uint8Array**   | `Uint8Array` / `'uint8array'`                    |
| **Float32Array** | `Float32Array` / `'float32array'`                |
| **DataView**     | `DataView` / `'dataview'`                        |
| **TypedArrays**  | `Int8Array`, `Int16Array`, `BigInt64Array`, etc. |

### Tipos Estructurales

| Tipo       | Sintaxis              | Descripción                                               |
| :--------- | :-------------------- | :-------------------------------------------------------- |
| **RegExp** | `RegExp` / `'regexp'` | Convierte string regex (`"/^test$/i"`) a objeto `RegExp`. |
| **URL**    | `URL` / `'url'`       | Convierte string URL a objeto `URL`.                      |
| **Error**  | `Error` / `'error'`   | Reconstruye objetos `Error`.                              |

---

## Recetario: Escenarios Comunes (Cookbook)

### ¿Cómo manejo Arrays?

Usa siempre la **notación de corchetes** `[Type]`.

```typescript
@Quick({
  // Array de Dates
  dates: [Date],

  // Array de Modelos Personalizados
  posts: [Post],

  // Array de Arrays (Matriz)
  matrix: [[Number]]
})
```

### ¿Cómo uso Transformadores Personalizados?

Puedes pasar una **función** a cualquier propiedad. Esta función actúa como un **Deserializador**.

**Flujo de Datos:**
`Entrada JSON` -> **`Función Transformadora`** -> `Propiedad de Clase`

```typescript
@Quick({
  // 1. Limpieza de Datos
  // Entrada: "  john@example.com " -> Salida: "john@example.com"
  email: (val: string) => val.trim().toLowerCase(),

  // 2. Cálculos
  // Entrada: "100" -> Salida: 121 (Añade 21% IVA)
  priceWithTax: (val: string) => Number(val) * 1.21,

  // 3. Parseo de Datos Complejos
  // Entrada: "{\"a\":1}" (String) -> Salida: { a: 1 } (Objeto)
  config: JSON.parse
})
```

### ¿Cómo hago operaciones matemáticas?

¡Puedes usar funciones nativas de `Math` directamente como transformadores!

```typescript
@Quick({
  // Entrada: 10.567 -> Salida: 11
  score: Math.round,

  // Entrada: -50 -> Salida: 50
  distance: Math.abs,

  // Entrada: 5.9 -> Salida: 5
  level: Math.floor
})
```

### ¿Cómo anido otros modelos?

Simplemente pasa el constructor de la clase.

```typescript
@Quick({
	// Un solo modelo anidado
	profile: UserProfile,

	// Array de modelos
	friends: [User],
})
class User extends QModel<IUser> {
	declare profile: UserProfile;
	declare friends: User[];
}
```

---

## Tipos Soportados y Alias

QuickModel proporciona alias de cadena (como `'int8array'`, `'blob'`, `'urlsearchparams'`) para casi todos los tipos soportados.

👉 **[Ver la Referencia Completa de Alias](./aliases.md)** para la lista exhaustiva de los más de 30 alias soportados.
