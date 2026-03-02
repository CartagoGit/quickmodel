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

### Configuración Avanzada (Segundo Argumento)

Puedes pasar un segundo objeto de opciones a `@Quick` para un control avanzado:

```typescript
@Quick({
  items: [Content, Metadata] // 1. Mapeo de Tipos
}, {
  // 2. Opciones Avanzadas
  unknownPropertyPolicy: 'error',
  transformers: { ... },
  serializers: { ... },
  mockers: { ... },
  discriminators: { ... } // Manejo de polimorfismo
})
class MyModel extends QModel<IMyInterface> { ... }
```

### Referencia de Opciones:

- **[`unknownPropertyPolicy`](#5-politica-de-propiedades-desconocidas)**: Controla el manejo de propiedades no definidas ('keep', 'strip', 'error').
- **[`transformers`](#1-transformadores-personalizados-deserializacion)**: Lógica de deserialización personalizada.
- **[`serializers`](#2-serializadores-personalizados)**: Lógica de serialización personalizada.
- **[`mockers`](#3-mocks-personalizados)**: Generación de mocks personalizada.
- **[`discriminators`](#4-discriminadores-polimorfismo)**: Manejo de tipos polimórficos.
- **[`excludeFields`](#6-excludefields-exclusion-permanente-de-campos)**: Excluye permanentemente campos de cada llamada a `serialize()`/`toJSON()`.

### Modificadores de Propiedad (`!` vs `declare`)

Debido a que `@Quick()` envuelve el constructor de tu clase, maneja automáticamente la inicialización de propiedades.

- ✅ **`!` (Asignación Definitiva)**: Seguro de usar. El decorador soluciona automáticamente el problema de "sobrescritura con undefined".
- ✅ **`?` (Opcional)**: Seguro de usar.
- ✅ **`declare`**: Seguro de usar (y estrictamente requerido si usas `@QType` _sin_ `@Quick` en modo legacy).

```typescript
@Quick({ name: String })
class User extends QModel<IUser> {
	// Todos válidos con @Quick
	name!: string; // inicializado por el decorador
	age?: number; // opcional
	declare email: string; // solo metadatos
}
```

::: tip ROBUSTEZ
**Recomendación**: Siempre usa `@Quick()` en la clase (aunque sea vacío) si vas a definir valores por defecto (`prop = 123`) o usas modificadores estrictos. Esto garantiza un comportamiento robusto y evita errores de inicialización.
:::

### Compatibilidad con modo TC39

`@Quick` es un **decorador de clase** y funciona idénticamente en modo legacy (`experimentalDecorators: true`) y en modo TC39 (estándar, TypeScript 5+). No se requiere ningún cambio de configuración.

La única diferencia al cambiar a TC39 afecta a las **declaraciones de campo** cuando también se usa `@QType`:

| Modo   | Sintaxis de campo con `@QType` |
| ------ | ------------------------------ |
| Legacy | `declare nombreCampo: Tipo`    |
| TC39   | `nombreCampo!: Tipo`           |

`@Quick` en sí no se ve afectado — los tres modificadores (`!`, `?`, `declare`) siguen funcionando con `@Quick` en ambos modos.

```typescript
// Modo TC39 — @Quick funciona igual
@Quick({ createdAt: Date })
class User extends QModel<IUser> {
	declare id: number; // ✅ funciona en ambos modos
	declare createdAt: Date; // ✅ funciona en ambos modos
}

// Modo TC39 — los campos con @QType requieren ! en lugar de declare
@Quick()
class Post extends QModel<IPost> {
	@QType(Date)
	createdAt!: Date; // ✅ TC39: usa ! para campos decorados con @QType

	@QType(String)
	title!: string; // ✅
}
```

Consulta [Instalación — Modo TC39](./installation) para la configuración completa de `tsconfig.json`.

---

## Opciones Avanzadas

```typescript
@Quick({
  items: [Content, Metadata] // 1. Mapeo de Tipos
}, {
  // 2. Opciones Avanzadas
  unknownPropertyPolicy: 'error',
  transformers: { ... },
  serializers: { ... },
  mockers: { ... },
  discriminators: { ... }
})
class MyModel extends QModel<IMyInterface> { ... }
```

### 1. Transformadores Personalizados (Deserialización)

Sobrescribe la lógica de deserialización por defecto (JSON -> Modelo) para propiedades específicas.

```typescript
@Quick({
  status: String
}, {
  transformers: {
    // Forzar mayúsculas al recibir
    status: (val) => String(val).toUpperCase()
  }
})
```

### 2. Serializadores Personalizados

Sobrescribe la lógica de serialización por defecto (Modelo -> JSON/Objeto) para propiedades específicas.

```typescript
@Quick({
  date: Date
}, {
  transformers: {
    // Deserializar: segundos -> Date
    date: (val) => new Date(Number(val) * 1000)
  },
  serializers: {
    // Serializar: Date -> segundos
    date: (val) => Math.floor((val as Date).getTime() / 1000)
  }
})
```

### 3. Mockers Personalizados

Define cómo generar datos mock para propiedades específicas, especialmente útil cuando usas transformadores personalizados donde la inferencia automática podría fallar.

```typescript
@Quick({
  sku: (val) => `ITEM-${val}`
}, {
  mockers: {
    // Generar base válida para el SKU
    sku: () => faker.string.alphanumeric(8)
  }
})
```

### 4. Discriminadores (Polimorfismo)

Maneja arrays que contienen diferentes tipos de modelos (Tipos Unión).

```typescript
@Quick({
  // Declara TODOS los tipos posibles
  items: [Content, Metadata]
}, {
  discriminators: {
    // Opción A: Nombre del Campo (Simple)
    // Usa data.type para decidir ('content' -> Content, 'metadata' -> Metadata)
    items: 'type',

    // Opción B: Función Personalizada (Flexible)
    items: (data) => 'text' in (data as any) ? Content : Metadata
  }
})
```

### 5. Política de Propiedades Desconocidas

QuickModel proporciona tres políticas para manejar propiedades desconocidas: 'strip' (predeterminado - las elimina), 'keep' (las preserva), o 'error' (lanza un error).

```typescript
@Quick({ name: String }, { unknownPropertyPolicy: 'error' })
class User extends QModel<IUser> {}

// Lanza Error: "Property 'unknownProp' is not allowed in strict mode"
new User({ name: 'John', unknownProp: 123 });
```

---

### 6. excludeFields — Exclusión Permanente de Campos

Declara campos que **nunca deben aparecer en la salida de `serialize()` / `toJSON()`**, independientemente de las opciones en tiempo de ejecución.

```typescript
@Quick(
	{
		id: 'string',
		name: 'string',
		password: 'string',
		internalCache: WeakMap,
	},
	{
		excludeFields: ['password', 'internalCache'],
	}
)
class Account extends QModel<IAccount> {
	declare id: string;
	declare name: string;
	declare password: string; // accesible en la instancia, nunca serializado
	declare internalCache: WeakMap<object, any>;
}

const account = new Account({ id: '1', name: 'Alice', password: 's3cr3t' });

console.log(account.password); // 's3cr3t' — sigue accesible
console.log(account.$qSerialize()); // { id: '1', name: 'Alice' } — password excluido
```

::: tip La deserialización no se ve afectada
`excludeFields` solo elimina campos de la **salida** (serialización). El campo sigue siendo poblado desde los datos de entrada al construir el modelo. Esto lo hace seguro para contraseñas, tokens y cachés privados.
:::

::: info Exclusión permanente vs. filtrado en tiempo de ejecución
| Enfoque | Dónde se declara | Se aplica | Caso de uso |
|---|---|---|---|
| `excludeFields` | 2º argumento del decorador | siempre | contraseñas, estado interno |
| `omit` | `serialize({ omit: [...] })` | en esa llamada | dar forma a la respuesta |
| `pick` | `serialize({ pick: [...] })` | en esa llamada | proyección dispersa |
:::

---

## Referencia de Tipos Soportados

QuickModel soporta una amplia gama de tipos y alias de cadena.

> [!TIP]
> Para una **lista completa** de todos los alias soportados (incluyendo Web APIs, Datos Binarios, etc.), consulta la [Referencia de Alias](./aliases.md).

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

::: warning FLUJO INCOMPLETO
Los transformadores personalizados solo manejan la **Entrada** (Deserialización).

Si los usas, **QuickModel no puede saber automáticamente** cómo:

1.  **Serializar** los datos de vuelta a su formato original (simplemente devolverá el valor transformado).
2.  **Generar Mocks** correctamente (generará un valor por defecto que podría no satisfacer tu transformador).

**DEBES definir explícitamente [`serializers`](#2-serializadores-personalizados) y [`mockers`](#3-mocks-personalizados) si necesitas esas funcionalidades.**
:::

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
