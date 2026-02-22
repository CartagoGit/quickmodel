# Prompts / Skills de MCP

Los **prompts** (también llamados **skills**) son flujos de trabajo de IA guiados, construidos sobre las [Herramientas Públicas](./). En lugar de encadenar herramientas manualmente, un skill orquesta una secuencia de llamadas para resolver una tarea completa con solo unos pocos datos de entrada.

Usa los skills cuando quieras que la IA conduzca el proceso de principio a fin sin tener que encadenar herramientas tú mismo.

## Skills Disponibles

| Nombre del skill                                                  | Título                                     | Descripción                                                     |
| ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convertir Interfaz TypeScript a QModel     | Genera una clase QModel a partir de una interfaz TS             |
| [`quickmodel_debug`](#quickmodel_debug)                           | Depurar un QuickModel                      | Diagnostica y corrige errores de validación o transformación    |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generar Datos de Prueba para un QuickModel | Crea datos mock realistas verificados en el pipeline            |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspeccionar Modelo y Exportar Schema      | Inspecciona un modelo y exporta su schema en múltiples formatos |

---

## `quickmodel_from_typescript`

**Convierte una interfaz TypeScript en una clase QuickModel completamente anotada.**

Guía a la IA para parsear la interfaz, identificar tipos transformables (`Date`, `BigInt`, `Set`, `Map`, …) y generar una clase `QModel` lista para usar con el decorador `@Quick` correcto. Tras la generación, se llama automáticamente a `validate_usage` para verificar la corrección.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                       |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| `typescript` | ✅ Sí       | Interfaz o tipo TypeScript a convertir (ej. `interface IUser { id: number; createdAt: string; }`) |
| `model_name` | ✗ No        | Nombre opcional para la clase generada (por defecto, el nombre de la interfaz sin el prefijo `I`) |

### Herramientas utilizadas internamente

1. `interface_to_model` — convierte la interfaz en una clase `QModel` con decoradores `@Quick`
2. `validate_usage` — verifica el código generado según las buenas prácticas

### Ejemplo

```
Prompt del usuario: "Convierte esta interfaz en un QuickModel"
typescript: "interface IUser { id: number; createdAt: string; tags: string[]; }"

→ IA llama a interface_to_model({ code: "..." })
→ IA llama a validate_usage({ code: "..." })
→ Devuelve la clase QModel final + ejemplo de uso
```

---

## `quickmodel_debug`

**Depura un QuickModel que lanza errores de validación o produce resultados inesperados.**

La IA inspecciona la estructura del modelo, traduce cualquier error a lenguaje natural, valida la definición de la clase y, opcionalmente, simula la transformación con los datos de muestra para trazar la ruta exacta del fallo. Finalmente devuelve una versión corregida del modelo.

### Argumentos

| Argumento     | Obligatorio | Descripción                                                                                |
| ------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `model_code`  | ✅ Sí       | El código de la clase QuickModel con el problema                                           |
| `error`       | ✗ No        | El JSON del error lanzado, o una descripción del comportamiento inesperado                 |
| `sample_data` | ✗ No        | Datos JSON de muestra que reproducen el problema (ayuda a trazar la transformación exacta) |

### Herramientas utilizadas internamente

1. `inspect_model` — analiza la estructura, decoradores y opciones del modelo
2. `explain_error` _(si se proporcionó `error`)_ — traduce el error a lenguaje natural
3. `validate_usage` — detecta problemas estructurales en la clase
4. `simulate_transformation` _(si se proporcionó `sample_data`)_ — traza la ruta exacta de transformación

### Ejemplo

```
model_code: "@Quick({ createdAt: Date }) class User extends QModel<IUser> { ... }"
error: '{ "error": "User.createdAt: Invalid Date string: undefined" }'
sample_data: '{ "id": 1 }'   ← falta createdAt

→ IA llama a inspect_model
→ IA llama a explain_error → "createdAt es undefined porque falta en sample_data"
→ IA llama a validate_usage
→ IA llama a simulate_transformation
→ Devuelve modelo corregido + explicación
```

---

## `quickmodel_generate_test_data`

**Genera datos mock realistas para una clase QuickModel.**

La IA inspecciona el modelo para entender todos los tipos de propiedades y sus requisitos de transformación, genera datos mock (respetando las restricciones de formato: strings ISO para `Date`, strings de dígitos para `BigInt`, arrays para `Set`/`Map`), y verifica que los datos superen el pipeline de transformación completo. El resultado son datos que puedes insertar directamente en un test o fixture.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                                               |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Sí       | El código de la clase QuickModel para la que generar datos de prueba                                                      |
| `count`      | ✗ No        | Número de instancias mock a generar (por defecto: `"1"`)                                                                  |
| `context`    | ✗ No        | Contexto de dominio para guiar la generación de datos realistas (ej. `"usuario de e-commerce"`, `"transacción bancaria"`) |

### Herramientas utilizadas internamente

1. `inspect_model` — entiende todas las propiedades, sus tipos y la configuración de transformadores
2. `generate_mock` — produce datos mock adaptados al schema
3. `simulate_transformation` — verifica que los datos mock superan el pipeline completo

### Ejemplo

```
model_code: "@Quick({ birth: Date, balance: BigInt }) class Account extends QModel ..."
count: "3"
context: "cuenta de ahorros fintech"

→ IA llama a inspect_model
→ IA llama a generate_mock({ schema: { birth: "date", balance: "bigint" }, count: 3 })
→ IA llama a simulate_transformation para verificar
→ Devuelve 3 objetos mock verificados listos para tests
```

---

## `quickmodel_inspect_and_schema`

**Inspecciona un QuickModel y exporta su schema en uno o varios formatos.**

La IA analiza la estructura del modelo (propiedades, tipos, decoradores, opciones) y exporta el schema en todos los formatos solicitados. También proporciona ejemplos de integración mostrando cómo usar cada schema exportado con su librería o herramienta correspondiente.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                                                                                   |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Sí       | El código de la clase QuickModel a inspeccionar y exportar                                                                                                    |
| `formats`    | ✗ No        | Lista de formatos separados por comas (por defecto: `"json,openapi"`). Valores disponibles: `json`, `openapi`, `zod`, `mongo`, `typescript`, `graphql`, `ajv` |

### Formatos disponibles

| Valor del formato | Resultado                         |
| ----------------- | --------------------------------- |
| `json`            | JSON Schema Draft-07              |
| `openapi`         | Componente de schema OpenAPI 3.0  |
| `zod`             | String de schema Zod              |
| `mongo`           | SchemaTypes de Mongoose / MongoDB |
| `typescript`      | String de interfaz TypeScript     |
| `graphql`         | Definición de tipo GraphQL SDL    |
| `ajv`             | Schema compatible con AJV         |

### Herramientas utilizadas internamente

1. `inspect_model` — análisis completo de la estructura del modelo
2. `export_json_schema` — llamada una vez por cada formato solicitado

### Ejemplo

```
model_code: "@Quick({ createdAt: Date }) class User extends QModel<IUser> { ... }"
formats: "json,zod,openapi"

→ IA llama a inspect_model
→ IA llama a export_json_schema({ code: "...", format: "json" })
→ IA llama a export_json_schema({ code: "...", format: "zod" })
→ IA llama a export_json_schema({ code: "...", format: "openapi" })
→ Devuelve los 3 schemas + ejemplos de integración para cada uno
```
