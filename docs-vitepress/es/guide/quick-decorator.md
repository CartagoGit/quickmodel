# Decorador @Quick

El decorador `@Quick()` es el núcleo de la librería QuickModel. Define el mapeo entre tus propiedades en tiempo de ejecución y sus formas serializadas.

## Uso

Puedes usar `@Quick` para decorar propiedades de clase o la propia clase.

### Decoración de Clase (Type Map)

La forma más común y recomendada. Pasa un objeto que mapee nombres de propiedades a tipos/transformadores.

```typescript
@Quick({
	name: String,
	age: 'number', // Alias literal de cadena
	birthDate: Date,
	tags: [Set],
	meta: Map,
})
class User extends QModel<IUser> {
	// ...
}
```

## Tipos Soportados

Puedes especificar transformaciones usando:

1. **Constructores** (e.g., `Date`)
2. **Literales de Cadena** (e.g., `'date'`)
3. **Otros Modelos** (Modelos anidados)
4. **Arrays** (e.g., `[Date]`)
5. **Funciones en Línea** (Lógica personalizada)

### Literales de Cadena (Alias)

QuickModel soporta alias descriptivos como cadenas para todos los tipos integrados. Esto es útil para evitar importaciones o tener una sintaxis más limpia.

| Alias       | Descripción                | Entrada Ejemplo         | Salida Ejemplo      |
| ----------- | -------------------------- | ----------------------- | ------------------- |
| `'string'`  | Castea a string            | `123`                   | `"123"`             |
| `'number'`  | Castea a number            | `"123"`                 | `123`               |
| `'boolean'` | Castea a boolean           | `"true"`                | `true`              |
| `'bigint'`  | Transforma a BigInt        | `"9007199254740991"`    | `9007199254740991n` |
| `'date'`    | Transforma ISO string      | `"2024-01-01"`          | `Objeto Date`       |
| `'regexp'`  | Transforma patrón          | `"/^test$/i"`           | `/^test$/i`         |
| `'map'`     | Transforma array de tuplas | `[["k","v"]]`           | `Map {"k" => "v"}`  |
| `'set'`     | Transforma array           | `["a", "b"]`            | `Set {"a", "b"}`    |
| `'url'`     | Transforma string          | `"https://example.com"` | `Objeto URL`        |
| `'error'`   | Transforma objeto          | `{"message":"..."}`     | `Objeto Error`      |

**Tipos Binarios:**
`'arraybuffer'`, `'dataview'`, `'int8array'`, `'uint8array'`, `'float32array'`, etc.

### Sintaxis de Arrays

Siempre usa notación de corchetes `[Type]` para arrays.

```typescript
@Quick({
  dates: [Date],         // Array de Dates
  tags: ['string'],      // Array de strings
  matrix: [[BigInt]]     // Array de arrays de BigInts
})
```

### Transformadores en Línea

Puedes pasar una función para transformaciones rápidas y personalizadas directamente en el decorador.

```typescript
@Quick({
  // Nombres en mayúsculas
  name: (val: string) => val.toUpperCase(),

  // Parseo personalizado
  score: (val: string) => parseInt(val, 10) * 2
})
```

## Modelos Anidados

Para usar otro QuickModel como tipo de propiedad, simplemente pasa el constructor de la clase.

```typescript
@Quick({ address: Address })
class User extends QModel<IUser> {
	declare address: Address;
}
```

## Decorador de Propiedad (Legacy)

También puedes decorar propiedades individualmente, aunque se prefiere la decoración de clase por un código más limpio.

```typescript
class User extends QModel<IUser> {
	@Quick(Date)
	declare createdAt: Date;
}
```

Esto es funcionalmente equivalente pero puede ser más verboso si tienes muchas propiedades.
