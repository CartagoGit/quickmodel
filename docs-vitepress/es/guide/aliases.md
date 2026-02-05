# Referencia de IQAlias

QuickModel soporta una amplia gama de **alias de cadena** (IQAlias) para especificar tipos de forma concisa. Estos alias se utilizan dentro de los decoradores `@Quick` y `@QType`.

El uso de alias proporciona un excelente soporte de **IntelliSense** y mantiene tu código limpio evitando importaciones innecesarias de constructores globales.

## Primitivos

Estos alias aseguran que los valores se coaccionen a sus respectivos tipos primitivos.

| Alias         | Resultado   | Descripción                                                     |
| :------------ | :---------- | :-------------------------------------------------------------- |
| `'string'`    | `String`    | Convierte el valor a cadena.                                    |
| `'number'`    | `Number`    | Convierte el valor a número.                                    |
| `'boolean'`   | `Boolean`   | Convierte el valor a booleano (`true`/`false`).                 |
| `'bigint'`    | `BigInt`    | **Crucial:** Convierte enteros string/número a `BigInt` nativo. |
| `'symbol'`    | `Symbol`    | Crea un símbolo único o usa `Symbol.for`.                       |
| `'null'`      | `null`      | Asegura que el valor sea `null`.                                |
| `'undefined'` | `undefined` | Asegura que el valor sea `undefined`.                           |

## Objetos Nativos

Objetos estándar de JavaScript que requieren transformación desde formatos serializados (JSON).

| Alias               | Resultado         | Descripción                                                                   |
| :------------------ | :---------------- | :---------------------------------------------------------------------------- |
| `'date'`            | `Date`            | Transforma cadenas ISO (`"2024..."`) o timestamps a objetos `Date`.           |
| `'regexp'`          | `RegExp`          | Transforma patrones de cadena (`"/abc/i"`) a objetos `RegExp`.                |
| `'error'`           | `Error`           | Reconstruye objetos `Error` desde objetos planos (preservando mensaje/stack). |
| `'url'`             | `URL`             | Transforma cadenas URL a objetos `URL`.                                       |
| `'urlsearchparams'` | `URLSearchParams` | Transforma query strings u objetos a `URLSearchParams`.                       |
| `'promise'`         | `Promise`         | Envuelve el valor en una `Promise.resolve()`.                                 |

## Colecciones

Tipos de Colección ES6 eficientes.

| Alias       | Resultado | Descripción                                                  |
| :---------- | :-------- | :----------------------------------------------------------- |
| `'map'`     | `Map`     | Transforma array de tuplas `[[k,v]]` a `Map`.                |
| `'set'`     | `Set`     | Transforma array `[v1, v2]` a `Set` (eliminando duplicados). |
| `'weakmap'` | `WeakMap` | Transforma array de tuplas a `WeakMap`.                      |
| `'weakset'` | `WeakSet` | Transforma array a `WeakSet`.                                |
| `'array'`   | `Array`   | Asegura que el valor es un array (`Array.from`).             |
| `'object'`  | `Object`  | Asegura que el valor es un objeto.                           |

## Datos Binarios y Buffers

Manejo directo de tipos de datos binarios.

| Alias                 | Resultado           | Descripción                                 |
| :-------------------- | :------------------ | :------------------------------------------ |
| `'arraybuffer'`       | `ArrayBuffer`       | Maneja buffer de datos binarios crudos.     |
| `'sharedarraybuffer'` | `SharedArrayBuffer` | Maneja buffer de datos binarios compartido. |
| `'dataview'`          | `DataView`          | Maneja vista DataView sobre un buffer.      |

## Typed Arrays

Vistas de array binario específicas.

| Alias                 | Resultado           |
| :-------------------- | :------------------ |
| `'int8array'`         | `Int8Array`         |
| `'uint8array'`        | `Uint8Array`        |
| `'uint8clampedarray'` | `Uint8ClampedArray` |
| `'int16array'`        | `Int16Array`        |
| `'uint16array'`       | `Uint16Array`       |
| `'int32array'`        | `Int32Array`        |
| `'uint32array'`       | `Uint32Array`       |
| `'float32array'`      | `Float32Array`      |
| `'float64array'`      | `Float64Array`      |
| `'bigint64array'`     | `BigInt64Array`     |
| `'biguint64array'`    | `BigUint64Array`    |

## Web APIs

Soporte para estándares modernos de Web API.

| Alias           | Resultado     | Descripción                                  |
| :-------------- | :------------ | :------------------------------------------- |
| `'blob'`        | `Blob`        | Objeto Binario Grande (Binary Large Object). |
| `'file'`        | `File`        | Objeto de API File.                          |
| `'formdata'`    | `FormData`    | Estructura de datos de formulario.           |
| `'headers'`     | `Headers`     | Objeto de Cabeceras HTTP.                    |
| `'textencoder'` | `TextEncoder` | Utilidad de codificación de texto.           |
| `'textdecoder'` | `TextDecoder` | Utilidad de decodificación de texto.         |

---

## Ejemplo de Uso

```typescript
import { Quick, QModel } from '@cartago-git/quickmodel';

@Quick({
	// Primitivos
	id: 'string',
	count: 'number',
	isActive: 'boolean',

	// Complejos
	created: 'date',
	meta: 'map',
	tags: 'set',

	// Binarios
	image: 'uint8array',
	raw: 'arraybuffer',
})
class Resource extends QModel<IResource> {
	// ...
}
```
