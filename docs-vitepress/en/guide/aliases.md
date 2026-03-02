# IQAlias Reference

QuickModel supports a wide range of **string aliases** (IQAlias) to specify types in a concise way. These aliases are used within `@Quick` and `@QType` decorators.

Using aliases provides excellent **IntelliSense** support and keeps your code clean by avoiding unnecessary imports of global constructors.

## Primitives

These aliases ensure that values are coerced into their respective primitive types.

| Alias         | Result      | Description                                                      |
| :------------ | :---------- | :--------------------------------------------------------------- |
| `'string'`    | `String`    | Casts value to a string.                                         |
| `'number'`    | `Number`    | Casts value to a number.                                         |
| `'boolean'`   | `Boolean`   | Casts value to a boolean (`true`/`false`).                       |
| `'bigint'`    | `BigInt`    | **Crucial:** Converts string/number integers to native `BigInt`. |
| `'symbol'`    | `Symbol`    | Creates a unique symbol or uses `Symbol.for`.                    |
| `'null'`      | `null`      | Ensures value is `null`.                                         |
| `'undefined'` | `undefined` | Ensures value is `undefined`.                                    |

## Native Objects

Standard JavaScript objects that require transformation from serialized (JSON) formats.

| Alias               | Result            | Description                                                                 |
| :------------------ | :---------------- | :-------------------------------------------------------------------------- |
| `'date'`            | `Date`            | Transforms ISO strings (`"2024..."`) or timestamps to `Date` objects.       |
| `'regexp'`          | `RegExp`          | Transforms string patterns (`"/abc/i"`) to `RegExp` objects.                |
| `'error'`           | `Error`           | Reconstructs `Error` objects from plain objects (preserving message/stack). |
| `'url'`             | `URL`             | Transforms URL strings to `URL` objects.                                    |
| `'urlsearchparams'` | `URLSearchParams` | Transforms query strings or objects to `URLSearchParams`.                   |
| `'promise'`         | `Promise`         | Wraps value in a `Promise.resolve()`.                                       |

## Collections

Efficient ES6 Collection types.

| Alias       | Result    | Description                                                 |
| :---------- | :-------- | :---------------------------------------------------------- |
| `'map'`     | `Map`     | Transforms array of tuples `[[k,v]]` to `Map`.              |
| `'set'`     | `Set`     | Transforms array `[v1, v2]` to `Set` (removing duplicates). |
| `'weakmap'` | `WeakMap` | Transforms array of tuples to `WeakMap`.                    |
| `'weakset'` | `WeakSet` | Transforms array to `WeakSet`.                              |
| `'array'`   | `Array`   | Ensures value is an array (`Array.from`).                   |
| `'object'`  | `Object`  | Ensures value is an object.                                 |

## Binary Data & Buffers

Directly handle binary data types.

| Alias                 | Result              | Description                        |
| :-------------------- | :------------------ | :--------------------------------- |
| `'arraybuffer'`       | `ArrayBuffer`       | Handles raw binary data buffer.    |
| `'sharedarraybuffer'` | `SharedArrayBuffer` | Handles shared binary data buffer. |
| `'dataview'`          | `DataView`          | Handles DataView view on a buffer. |

## Typed Arrays

Specific binary array views.

| Alias                 | Result              |
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

Support for modern Web API standards.

| Alias           | Result        | Description            |
| :-------------- | :------------ | :--------------------- |
| `'blob'`        | `Blob`        | Binary Large Object.   |
| `'file'`        | `File`        | File API object.       |
| `'formdata'`    | `FormData`    | Form data structure.   |
| `'headers'`     | `Headers`     | HTTP Headers object.   |
| `'textencoder'` | `TextEncoder` | Text encoding utility. |
| `'textdecoder'` | `TextDecoder` | Text decoding utility. |

---

## Example Usage

```typescript
import { Quick, QModel } from 'quickmodel';

@Quick({
	// Primitives
	id: 'string',
	count: 'number',
	isActive: 'boolean',

	// Complex
	created: 'date',
	meta: 'map',
	tags: 'set',

	// Binary
	image: 'uint8array',
	raw: 'arraybuffer',
})
class Resource extends QModel<IResource> {
	// ...
}
```
