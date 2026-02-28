# Transformadores Integrados

QuickModel incluye un conjunto de transformadores integrados para manejar tipos de datos comunes.

<!-- _Generado automáticamente por QSyncDocsTool. No editar manualmente._ -->

| Transformador       | Descripción                                                         |
| :------------------ | :------------------------------------------------------------------ |
| `arraybuffer`       | Handles `arraybuffer` data types.                                   |
| `bigint`            | Handles `bigint` data types.                                        |
| `bigint64array`     | Handles `bigint64array` data types.                                 |
| `biguint64array`    | Handles `biguint64array` data types.                                |
| `boolean`           | Handles `boolean` data types.                                       |
| `buffer`            | Handles `buffer` data types.                                        |
| `dataview`          | Handles `dataview` data types.                                      |
| `date`              | Handles `date` data types.                                          |
| `error`             | Handles `error` data types.                                         |
| `float32array`      | Handles `float32array` data types.                                  |
| `float64array`      | Handles `float64array` data types.                                  |
| `int16array`        | Handles `int16array` data types.                                    |
| `int32array`        | Handles `int32array` data types.                                    |
| `int8array`         | Handles `int8array` data types.                                     |
| `map`               | Handles `map` data types.                                           |
| `number`            | Handles `number` data types.                                        |
| `regexp`            | Handles `regexp` data types.                                        |
| `set`               | Handles `set` data types.                                           |
| `sharedarraybuffer` | Handles `sharedarraybuffer` data types.                             |
| `special-float`     | Handles `NaN`, `Infinity`, `-Infinity` values losslessly over JSON. |
| `string`            | Handles `string` data types.                                        |
| `symbol`            | Handles `symbol` data types.                                        |
| `textdecoder`       | Handles `textdecoder` data types.                                   |
| `textencoder`       | Handles `textencoder` data types.                                   |
| `uint16array`       | Handles `uint16array` data types.                                   |
| `uint32array`       | Handles `uint32array` data types.                                   |
| `uint8array`        | Handles `uint8array` data types.                                    |
| `uint8clampedarray` | Handles `uint8clampedarray` data types.                             |
| `url`               | Handles `url` data types.                                           |
| `urlsearchparams`   | Handles `urlsearchparams` data types.                               |
| `weakmap`           | Handles `weakmap` data types.                                       |
| `weakset`           | Handles `weakset` data types.                                       |

Consulta [Transformadores Personalizados](./custom-transformers.md) para añadir los tuyos.

## Rendimiento

<BenchmarkChart
  :only-scenarios="['coercion', 'typeSerialization']"
  :only-libs="['QuickModel', 'superjson', 'class-transformer', 'Plain JS']"
  :only-feature-categories="['serialization']"
  default-tab="performance"
/>
