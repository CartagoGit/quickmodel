# Prompts / Skills de MCP

Los **prompts** (también llamados **skills**) son flujos de trabajo de IA guiados, construidos sobre las [Herramientas Públicas](./). En lugar de encadenar herramientas manualmente, un skill orquesta una secuencia de llamadas para resolver una tarea completa con solo unos pocos datos de entrada.

Usa los skills cuando quieras que la IA conduzca el proceso de principio a fin sin tener que encadenar herramientas tú mismo.

## Skills Disponibles

| Nombre del skill                                                  | Título                                     | Descripción                                                      |
| ----------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------- | --- | --------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convertir Interfaz TypeScript a QModel     | Genera una clase QModel a partir de una interfaz TS              |
| [`quickmodel_debug`](#quickmodel_debug)                           | Depurar un QuickModel                      | Diagnostica y corrige errores de validación o transformación     |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generar Datos de Prueba para un QuickModel | Crea datos mock realistas verificados en el pipeline             |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspeccionar Modelo y Exportar Schema      | Inspecciona un modelo y exporta su schema en múltiples formatos  |
| [`quickmodel_form_validation`](#quickmodel_form_validation)       | Añadir Validación de Formulario            | Flujo guiado para añadir `@QField`, `@QRule` y `@QGroup`         |
| [`quickmodel_full_pipeline`](#quickmodel_full_pipeline)           | Recorrer el Pipeline Completo              | `create()` → `checkIntegrity()` → `checkRules()` → `serialize()` |
| [`quickmodel_mixin`](#quickmodel_mixin)                           | Extender Clase Base con Mixin QModel       | `QModel.extends(BaseClass)` para entidades TypeORM / NestJS      |
| [`quickmodel_alias_computed`](#quickmodel_alias_computed)         | Usar @QAlias y @QComputed                  | Remapeo de nombres de campo y serialización de getters           |
| [`quickmodel_migration`](#quickmodel_migration)                   | Migrar Código Legado a QuickModel          | Convierte clases planas / código v1 a patrones idiomáticos v2    |
| [`quickmodel_async_rules`](#quickmodel_async_rules)               | ⚠️ Reglas Async con checkRulesAsync()      | Solo async: BD, APIs externas — NO para predicados síncronos     |
| [`quickmodel_add_qgroup`](#quickmodel_add_qgroup)                 | Añadir @QGroup al Modelo                   | Agrupa campos y activa `checkGroups()` para validación por grupo |
| [`quickmodel_security_review`](#quickmodel_security_review)       | Revisión de Seguridad                      | Mass assignment, DoS, prototype pollution, ReDoS                 |
| [`quickmodel_transformer_guide`](#quickmodel_transformer_guide)   | Guía de Transformers                       | Elige el transformer correcto para un tipo TS y simúlalo         |     | [`quickmodel_implement_feature`](#quickmodel_implement_feature) | Implementar Funcionalidad (TDD) | Ciclo TDD completo con puertas `lint_check` + `typecheck` |

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

---

## `quickmodel_form_validation`

**Añade `@QField`, `@QRule` y `@QGroup` a una clase QuickModel con validación guiada.**

Guía a la IA paso a paso para declarar metadatos de campo con `@QField`, añadir predicados de lógica de negocio con `@QRule`, agrupar secciones con `@QGroup`, verificar con `validate_usage` y probar en vivo con `simulate_validation`.

### Argumentos

| Argumento          | Obligatorio | Descripción                                                                  |
| ------------------ | ----------- | ---------------------------------------------------------------------------- |
| `form_description` | ✅ Sí       | Descripción del formulario y sus requisitos de validación                    |
| `fields`           | ✗ No        | Lista de nombres de campos separados por comas (ej. `"nombre, email, edad"`) |

### Flujo de trabajo

1. Explica el uso de `@QField` (widget, label, required, hint)
2. Muestra la sintaxis del predicado `@QRule`
3. Demuestra la agrupación con `@QGroup`
4. Llama a `validate_usage` para verificar el código del modelo
5. Llama a `simulate_validation` con datos representativos para probar predicados
6. Muestra cómo usar `getFormSchema()`, `getFormSchemaGrouped()` y `checkRules()` en runtime

### Ejemplo

```
form_description: "Formulario de registro con nombre, email y confirmación de contraseña"
fields: "nombre, email, contraseña, confirmarContraseña"

→ IA genera modelo con decoradores @QField y @QRule
→ IA llama a validate_usage para comprobarlo
→ IA llama a simulate_validation con { nombre: "Jo", email: "no-valido", contraseña: "abc", confirmarContraseña: "xyz" }
→ Devuelve informe de validación + código del modelo final
```

---

## `quickmodel_full_pipeline`

**Recorre el ciclo de vida completo de datos QuickModel de principio a fin.**

Guía a la IA por cada etapa: datos brutos → `create()` → `checkIntegrity()` → `checkRules()` → `serialize()` / `toJSON()`. Usa `check_integrity`, `simulate_validation` y `simulate_transformation` para verificar cada paso con datos reales.

### Argumentos

| Argumento     | Obligatorio | Descripción                                                                                   |
| ------------- | ----------- | --------------------------------------------------------------------------------------------- |
| `model_code`  | ✅ Sí       | Definición de la clase QuickModel a recorrer                                                  |
| `sample_data` | ✗ No        | Cadena JSON opcional con datos de ejemplo para cada paso (ej. `'{"createdAt":"2024-01-01"}'`) |

### Flujo de trabajo

1. **Etapa 1 — Hidratación**: `create()` / `new Model(data)` — llama a `simulate_transformation`
2. **Etapa 2 — Integridad**: `checkIntegrity()` — llama a `check_integrity`
3. **Etapa 3 — Reglas**: `checkRules()` — llama a `simulate_validation`
4. **Etapa 4 — Serialización**: `serialize()` / `toJSON()`

### Ejemplo

```
model_code: "
  @Quick({ createdAt: Date, score: Number })
  class OrderModel extends QModel<OrderModel> {
    declare createdAt: Date;
    declare score: number;
  }
"
sample_data: '{"createdAt":"2024-06-15","score":"42"}'

→ IA llama a simulate_transformation con los datos
→ IA llama a check_integrity para verificar que la Date es válida
→ IA llama a simulate_validation para los predicados @QRule
→ Devuelve informe completo del pipeline con salida serializada
```

---

## `quickmodel_mixin`

**Extiende cualquier clase base (no QModel) con las capacidades de QuickModel.**

Explica el patrón de mixin `QModel.extends(BaseClass)` usado en Angular (entidades TypeORM) y NestJS (DTOs). Cubre el tipado con `IQImplements`, la advertencia sobre `instanceof` y usa `validate_usage` para verificar la corrección.

### Argumentos

| Argumento      | Obligatorio | Descripción                                                                                          |
| -------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `base_class`   | ✅ Sí       | Nombre de la clase base a extender (ej. `"BaseEntity"`, `"TypeORMUser"`)                             |
| `model_fields` | ✗ No        | Declaraciones de campos separadas por comas (ej. `"createdAt: Date, status: string, score: number"`) |

### Flujo de trabajo

1. Muestra el cableado `QModel.extends(BaseClass)` con `@Quick`
2. Añade `IQImplements<typeof MyModel>` para tipado estático fuerte
3. Explica la advertencia de `instanceof QModel` y la alternativa `isQModel()`
4. Llama a `validate_usage` para comprobar el código generado

### Ejemplo

```
base_class: "BaseEntity"
model_fields: "createdAt: Date, updatedAt: Date, status: string"

→ IA genera MyModel extends QModel.extends(BaseEntity)
→ IA llama a validate_usage para verificar que el mixin es correcto
→ Devuelve código del modelo final con explicaciones sobre el comportamiento de instanceof
```

---

## `quickmodel_alias_computed`

**Explica y aplica los decoradores `@QAlias` y `@QComputed`.**

Cubre cómo remapear nombres de campo durante la serialización (`snake_case ↔ camelCase`) con `@QAlias`, y cómo incluir valores de getters calculados en la salida de `serialize()` / `toJSON()` con `@QComputed`. Termina con una llamada a `validate_usage`.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                 |
| ------------ | ----------- | ------------------------------------------------------------------------------------------- |
| `model_code` | ✗ No        | Código opcional de clase QuickModel para analizar o enriquecer con `@QAlias` / `@QComputed` |

### Flujo de trabajo

1. Explica `@QAlias` — renombrado de campo en `serialize()` y búsqueda de clave en `create()`
2. Explica `@QComputed` — incluye un getter en la salida serializada
3. Muestra errores comunes (usar `@QComputed` en un campo `declare` en lugar de un getter)
4. Llama a `validate_usage` para confirmar que el modelo es correcto

### Ejemplo

```
model_code: "@Quick({})\nclass User extends QModel<User> { declare firstName: string; }"

→ IA añade @QAlias("first_name") y getter @QComputed() fullName
→ IA llama a validate_usage
→ Devuelve modelo corregido con explicación de la salida de serialize() / toJSON()
```

---

## `quickmodel_migration`

**Migra clases TypeScript legadas o código antiguo de QuickModel v1 a patrones idiomáticos v2.**

Guía a la IA para convertir asignaciones de propiedades a campos `declare`, envolver la clase con `@Quick({})`, añadir tipos de transformer, eliminar constructores manuales y llamar a `validate_usage`.

### Argumentos

| Argumento     | Obligatorio | Descripción                                                |
| ------------- | ----------- | ---------------------------------------------------------- |
| `legacy_code` | ✅ Sí       | Clase TypeScript legada o código v1 a migrar a patrones v2 |

### Flujo de trabajo

1. Identifica todos los campos que necesitan prefijo `declare`
2. Determina qué campos necesitan entradas de transformer en `@Quick({})`
3. Elimina constructores manuales que asignan campos
4. Envuelve la clase con `@Quick({})` extendiendo `QModel<T>`
5. Llama a `validate_usage` para verificar el código migrado

### Ejemplo

```
legacy_code: "class User { name: string = ''; createdAt: Date = new Date(); }"

→ IA genera: @Quick({ createdAt: Date }) class User extends QModel<User> { declare name: string; declare createdAt: Date; }
→ IA llama a validate_usage
→ Devuelve código migrado con explicación de cada cambio
```

---

## `quickmodel_async_rules`

> ⚠️ **Solo async**: Usa este skill únicamente cuando tus predicados `@QRule` requieran genuinamente operaciones asíncronas (consultas a BD, llamadas a APIs externas, validadores async). Para reglas síncronas, usa `checkRules()` — es más simple y rápido.

**Guía el uso de `checkRulesAsync()` para predicados de reglas de negocio asíncronos.**

Cubre la red de seguridad `timeoutMs`, el modo de ejecución `parallel` vs `serial` y los patrones de integración con NestJS / peticiones HTTP.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                                   |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `model_code` | ✅ Sí       | Clase QuickModel con decoradores `@QRule` a convertir en async                                                |
| `context`    | ✗ No        | Descripción opcional del contexto async (ej. "servicio NestJS con TypeORM", "verificación de unicidad en BD") |

### Flujo de trabajo

1. Advierte claramente que es solo para uso async (las reglas síncronas deben usar `checkRules()`)
2. Muestra `checkRulesAsync()` con `timeoutMs` y modo `parallel` / `serial`
3. Demuestra el patrón de inyección en contexto NestJS / async
4. Muestra la sintaxis de predicado `async (value) => Promise<boolean>`
5. Llama a `validate_usage` para verificar el modelo

### Ejemplo

```
model_code: "@Quick({}) class User extends QModel<User> { @QRule(...) declare email: string; }"
context: "Servicio NestJS con repositorio TypeORM"

→ IA advierte: solo async, usa checkRules() para predicados síncronos
→ IA muestra: await instance.checkRulesAsync({ timeoutMs: 5000, mode: "parallel" })
→ IA muestra integración con @Injectable() de NestJS
→ Devuelve modelo async con guía de uso
```

---

## `quickmodel_add_qgroup`

**Añade agrupación de campos con `@QGroup` y activa la validación por grupo con `checkGroups()`.**

Explica cómo anotar campos con `@QGroup`, cómo apilar múltiples grupos en un mismo campo, cómo llamar a `checkGroups()` para validar un subconjunto de campos, y la diferencia entre `checkGroups()` y `checkRules()`. Llama a `validate_usage` para verificar el modelo anotado.

### Argumentos

| Argumento    | Requerido | Descripción                                                  |
| ------------ | --------- | ------------------------------------------------------------ |
| `model_code` | ✅ Sí     | La clase QuickModel a anotar con `@QGroup`                   |
| `group_name` | ✗ No      | Nombre de grupo opcional (ej. `"personal"`, `"facturación"`) |

### Flujo de trabajo

1. Muestra el decorador `@QGroup("nombre")` encima de `@QField` / `@QRule`
2. Demuestra el apilado multi-grupo: `@QGroup("a") @QGroup("b") declare campo`
3. Muestra `instance.checkGroups(["grupo"])` para validación por grupo
4. Llama a `validate_usage` para verificar el modelo resultante

### Ejemplo

```
model_code: "@Quick({}) class User extends QModel<IUser> { declare name: string; declare email: string; }"
group_name: "contacto"

→ IA anota campos con @QGroup("contacto")
→ IA explica checkGroups(["contacto"]) vs checkRules()
→ IA llama a validate_usage
→ Devuelve modelo anotado + ejemplos de uso
```

---

## `quickmodel_security_review`

**Audita una clase QuickModel para detectar vulnerabilidades de seguridad comunes.**

Orquesta `check_security` para verificar que la suite de tests de seguridad pasa, y luego explica las cuatro áreas clave: endurecimiento contra mass assignment (`unknownPropertyPolicy: 'strip'`), prevención de DoS con `populationLimit`, prevención de prototype pollution y protección contra ReDoS.

### Argumentos

| Argumento    | Requerido | Descripción                                                     |
| ------------ | --------- | --------------------------------------------------------------- |
| `model_code` | ✗ No      | Código del modelo opcional para revisión de seguridad por clase |

### Flujo de trabajo

1. Llama a `check_security` para ejecutar la suite completa de tests de seguridad
2. Explica mass assignment: `unknownPropertyPolicy: 'strip'` en `@Quick`
3. Explica límites de DoS: `populationLimit` y límites de arrays/strings
4. Explica prototype pollution: tipado estricto bloquea `__proto__`, `constructor`
5. Explica ReDoS: límites del transformer RegExp y verificaciones de complejidad
6. Si se proporciona `model_code`, muestra recomendaciones específicas de la clase

### Ejemplo

```
→ IA llama a check_security
→ IA explica: establece unknownPropertyPolicy: 'strip' para bloquear mass assignment
→ IA explica: populationLimit por defecto (5000), cómo reducirlo
→ IA explica: claves __proto__ y constructor están bloqueadas
→ Devuelve resumen de seguridad + checklist de endurecimiento
```

---

## `quickmodel_transformer_guide`

**Elige el transformer correcto para un tipo TypeScript y valídalo en tiempo real.**

Proporciona una tabla de referencia rápida tipo→transformer, llama a `simulate_transformation` con datos de muestra y explica los problemas habituales por tipo de transformer.

### Argumentos

| Argumento         | Requerido | Descripción                                                                             |
| ----------------- | --------- | --------------------------------------------------------------------------------------- |
| `typescript_type` | ✅ Sí     | El tipo TypeScript (ej. `Date`, `bigint`, `Map<string, number>`, `RegExp`)              |
| `sample_data`     | ✗ No      | Valor de muestra opcional para probar el transformer (ej. `"2024-01-15T00:00:00.000Z"`) |

### Referencia rápida de transformers

| Tipo TypeScript       | Entrada en `@Quick`                                         |
| --------------------- | ----------------------------------------------------------- |
| `Date`                | `@Quick({ campo: Date })`                                   |
| `bigint`              | `@Quick({ campo: BigInt })`                                 |
| `Set<T>`              | `@Quick({ campo: Set })`                                    |
| `Map<K,V>`            | `@Quick({ campo: Map })`                                    |
| `RegExp`              | `@Quick({ campo: RegExp })`                                 |
| `Symbol`              | `@Quick({ campo: Symbol })`                                 |
| `ArrayBuffer`         | `@Quick({ campo: ArrayBuffer })`                            |
| `WeakMap` / `WeakSet` | `@Quick({ campo: WeakMap })` / `@Quick({ campo: WeakSet })` |

### Flujo de trabajo

1. Muestra la entrada correcta de `@Quick` para el tipo solicitado
2. Llama a `simulate_transformation` con los datos de muestra proporcionados o generados
3. Destaca problemas habituales (ej. `Date` requiere ISO, `BigInt` requiere cadena de dígitos)

### Ejemplo

```
typescript_type: "Date"
sample_data: "2024-06-01T10:00:00.000Z"

→ IA muestra: @Quick({ createdAt: Date }) class Model extends QModel<...>
→ IA llama a simulate_transformation({ data: { createdAt: "2024-06-01T..." }, ... })
→ IA advierte: cadenas no ISO pueden producir Invalid Date
→ Devuelve guía del transformer + resultado de simulación
```

---

## `quickmodel_implement_feature`

**Ciclo TDD completo para cualquier funcionalidad nueva de QuickModel, con puertas obligatorias de lint y typecheck.**

Este skill conduce a la IA por el bucle completo rojo‑verde‑refactor, reforzado por tres puertas automatizadas: `lint_check`, `typecheck` y `check_project_rules`. La IA **no puede** declarar la funcionalidad terminada hasta que las tres puertas devuelvan `passed: true`.

### Argumentos

| Argumento             | Obligatorio | Descripción                                                                 |
| --------------------- | ----------- | --------------------------------------------------------------------------- |
| `feature_description` | ✅ Sí       | Descripción en lenguaje natural de la funcionalidad a implementar           |
| `file_paths`          | ✗ No        | Lista separada por espacios de archivos a lintear (por defecto todo `src/`) |

### Flujo de trabajo

1. 🔴 **Rojo** — Escribe un test que falla describiendo el comportamiento esperado
2. 🟢 **Verde** — Implementa el código mínimo para que el test pase
3. 🚦 **Puerta lint_check** — Ejecuta `lint_check`; bloquea hasta `passed: true`
4. 🚦 **Puerta typecheck** — Ejecuta `typecheck`; bloquea hasta `passed: true`
5. 🚦 **Puerta check_project_rules** — Verifica naming, id-length, max-params, etc.
6. ✅ **Hecho** — Solo se declara terminado cuando las tres puertas pasan

### Ejemplo

```
feature_description: "Añadir un QTypecheckTool que ejecute tsc --noEmit y devuelva errores parseados"
file_paths: "src/mcp/tools/internal/typecheck.tool.ts"

→ IA escribe tests/mcp/unit/internal/typecheck.test.ts (rojo)
→ IA crea src/mcp/tools/internal/typecheck.tool.ts (verde)
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/internal/typecheck.tool.ts"] })
→ IA llama a typecheck({})
→ IA llama a check_project_rules()
→ Todo pasa → funcionalidad declarada terminada
```
