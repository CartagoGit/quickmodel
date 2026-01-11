# Transformadores

Los transformadores son los componentes lógicos responsables de convertir datos entre formatos serializables (strings JSON, números) y tipos en tiempo de ejecución (Date, BigInt, objetos).

## Transformadores Integrados

QuickModel viene con un conjunto completo de transformadores para tipos comunes de JavaScript.

### Primitivos

| Tipo        | Entrada (JSON)      | Tipo Runtime | Alias       |
| ----------- | ------------------- | ------------ | ----------- |
| **BigInt**  | `string` / `number` | `bigint`     | `'bigint'`  |
| **Symbol**  | `string`            | `symbol`     | `'symbol'`  |
| **String**  | `any`               | `string`     | `'string'`  |
| **Number**  | `string`            | `number`     | `'number'`  |
| **Boolean** | `string`            | `boolean`    | `'boolean'` |

**Ejemplo:**

```typescript
@Quick({
  balance: 'bigint',   // "100" -> 100n
  id: 'string',        // 123 -> "123"
  active: 'boolean'    // "true" -> true
})
```

### Objetos Nativos

| Tipo       | Entrada (JSON)         | Tipo Runtime | Alias      |
| ---------- | ---------------------- | ------------ | ---------- |
| **Date**   | ISO String / Timestamp | `Date`       | `'date'`   |
| **RegExp** | String / Objeto        | `RegExp`     | `'regexp'` |
| **URL**    | String                 | `URL`        | `'url'`    |
| **Error**  | Objeto                 | `Error`      | `'error'`  |

**Ejemplo:**

```typescript
@Quick({
  createdAt: Date,
  pattern: RegExp,
  site: URL
})
```

### Colecciones

| Tipo    | Entrada (JSON)            | Tipo Runtime | Alias   |
| ------- | ------------------------- | ------------ | ------- |
| **Map** | Array de Tuplas `[[k,v]]` | `Map<K, V>`  | `'map'` |
| **Set** | Array `[v1, v2]`          | `Set<V>`     | `'set'` |

**Ejemplo:**

```typescript
@Quick({
  tags: Set,     // ["a", "b"] -> Set{"a", "b"}
  meta: Map      // [["k", "v"]] -> Map{"k" => "v"}
})
```

### Datos Binarios

QuickModel soporta el manejo de datos binarios a través de cadenas Base64.

| Tipo                  | Alias                 |
| --------------------- | --------------------- |
| **ArrayBuffer**       | `'arraybuffer'`       |
| **DataView**          | `'dataview'`          |
| **Int8Array**         | `'int8array'`         |
| **Uint8Array**        | `'uint8array'`        |
| **Uint8ClampedArray** | `'uint8clampedarray'` |
| **Float32Array**      | `'float32array'`      |
| **Float64Array**      | `'float64array'`      |

**Ejemplo:**

```typescript
@Quick({
  buffer: ArrayBuffer,
  pixels: Uint8Array
})
```

## Transformadores Personalizados

Puedes crear tus propios transformadores implementando la interfaz de transformador.

Sin embargo, para la mayoría de los casos, los **Transformadores en Línea** son suficientes:

```typescript
@Quick({
  // Personalizado: String a mayúsculas
  code: (val: string) => val.toUpperCase(),

@Quick({
  // Personalizado: String a mayúsculas
  // NOTA: Las funciones en línea actúan SOLO como Deserializadores (JSON -> Modelo)
  code: (val: string) => val.toUpperCase(),

  // Parseo personalizado
  config: JSON.parse
})
```

> [!WARNING] Importante
> Las funciones en línea `(val) => ...` se utilizan **únicamente para la Deserialización** (de JSON a tu instancia de Modelo).
>
> Si necesitas transformación bidireccional (también para serializar de vuelta a JSON con un formato específico), debes crear una clase que implemente `IQTransformer`.

## Avanzado: Transformadores y Serializadores vía Opciones

Para un código más limpio, o cuando necesitas lógica personalizada bidireccional sin crear una clase completa, puedes usar el objeto de **Opciones Avanzadas** (segundo argumento de `@Quick`).

Esto te permite separar la definición de tipos de la lógica de transformación y definir **serializadores** explícitos.

```typescript
@Quick(
	{
		// 1. Definir tipos normalmente
		status: String,
		date: Date,
	},
	{
		// 2. Definir transformadores personalizados (Deserialización: JSON -> Modelo)
		transformers: {
			status: (val) => String(val).toUpperCase(), // "active" -> "ACTIVE"
			date: (val) => new Date(Number(val) * 1000), // Unix timestamp -> Date
		},

		// 3. Definir serializadores personalizados (Serialización: Modelo -> JSON)
		serializers: {
			// ACTIVE -> "ACTIVE" (generalmente no hace falta, pero se puede sobrescribir)
			date: (val: Date) => Math.floor(val.getTime() / 1000), // Date -> Unix timestamp
		},
	}
)
class MyModel extends QModel<IMyInterface> {
	declare status: string;
	declare date: Date;
}
```

Este enfoque se recomienda cuando:

- Quieres mantener la definición de tipos limpia (`status: String`).
- Necesitas lógica de serialización específica (ej. convertir Date de vuelta a timestamp Unix en lugar de ISO string).
- Quieres separar responsabilidades.
