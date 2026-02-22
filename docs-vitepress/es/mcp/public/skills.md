# Prompts / Skills de MCP

Los **prompts** (también llamados **skills**) son flujos de trabajo de IA guiados, construidos sobre las [Herramientas Públicas](./). En lugar de encadenar herramientas manualmente, un skill orquesta una secuencia de llamadas para resolver una tarea completa con solo unos pocos datos de entrada.

Usa los skills cuando quieras que la IA conduzca el proceso de principio a fin sin tener que encadenar herramientas tú mismo.

## Skills Disponibles

| Nombre del skill                                                  | Título                                     | Descripción                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------- |
| [`quickmodel_from_typescript`](#quickmodel_from_typescript)       | Convertir Interfaz TypeScript a QModel     | Genera una clase QModel a partir de una interfaz TS                          |
| [`quickmodel_debug`](#quickmodel_debug)                           | Depurar un QuickModel                      | Diagnostica y corrige errores de validación o transformación                 |
| [`quickmodel_generate_test_data`](#quickmodel_generate_test_data) | Generar Datos de Prueba para un QuickModel | Crea datos mock realistas verificados en el pipeline                         |
| [`quickmodel_inspect_and_schema`](#quickmodel_inspect_and_schema) | Inspeccionar Modelo y Exportar Schema      | Inspecciona un modelo y exporta su schema en múltiples formatos              |
| [`quickmodel_form_validation`](#quickmodel_form_validation)       | Añadir Validación de Formulario            | Flujo guiado para añadir `@QField`, `@QRule` y `@QGroup`                     |
| [`quickmodel_full_pipeline`](#quickmodel_full_pipeline)           | Recorrer el Pipeline Completo              | `create()` → `checkIntegrity()` → `checkRules()` → `serialize()`             |
| [`quickmodel_mixin`](#quickmodel_mixin)                           | Extender Clase Base con Mixin QModel       | `QModel.extends(BaseClass)` para entidades TypeORM / NestJS                  |
| [`quickmodel_alias_computed`](#quickmodel_alias_computed)         | Usar @QAlias y @QComputed                  | Remapeo de nombres de campo y serialización de getters                       |
| [`quickmodel_migration`](#quickmodel_migration)                   | Migrar Código Legado a QuickModel          | Convierte clases planas / código v1 a patrones idiomáticos v2                |
| [`quickmodel_async_rules`](#quickmodel_async_rules)               | ⚠️ Reglas Async con checkRulesAsync()      | Solo async: BD, APIs externas — NO para predicados síncronos                 |
| [`quickmodel_add_qgroup`](#quickmodel_add_qgroup)                 | Añadir @QGroup al Modelo                   | Agrupa campos y activa `checkGroups()` para validación por grupo             |
| [`quickmodel_security_review`](#quickmodel_security_review)       | Revisión de Seguridad                      | Mass assignment, DoS, prototype pollution, ReDoS                             |
| [`quickmodel_transformer_guide`](#quickmodel_transformer_guide)   | Guía de Transformers                       | Elige el transformer correcto para un tipo TS y simúlalo                     |
| [`quickmodel_implement_feature`](#quickmodel_implement_feature)   | Implementar Funcionalidad (TDD)            | Ciclo TDD completo con puertas `lint_check` + `typecheck`                    |
| [`quickmodel_fix_lint`](#quickmodel_fix_lint)                     | Corregir Errores ESLint                    | Corrección guiada con puertas `lint_check` + `pre_commit_check`              |
| [`quickmodel_fix_typecheck`](#quickmodel_fix_typecheck)           | Corregir Errores de Tipos TypeScript       | Corrección TS guiada con puertas `typecheck` + `pre_commit_check`            |
| [`quickmodel_refactor`](#quickmodel_refactor)                     | Refactor Seguro (con puertas TDD)          | Ciclo de refactor con puertas `run_tests`, `lint_check`, `typecheck`         |
| [`quickmodel_apply_solid`](#quickmodel_apply_solid)               | Aplicar Principios SOLID (guiado)          | Revisión por principio con puertas `run_tests`, `lint_check`, `typecheck`    |
| [`quickmodel_sync_project`](#quickmodel_sync_project)             | Sincronizar Proyecto (salud + docs)        | Snapshot `project_status` → corregir fallos → regenerar docs con `sync_docs` |

---

## `quickmodel_from_typescript`

**Convierte una interfaz TypeScript en una clase QuickModel completamente anotada.**

Guía a la IA para parsear la interfaz, identificar tipos transformables (`Date`, `BigInt`, `Set`, `Map`, …) y generar una clase `QModel` lista para usar con el decorador `@Quick` correcto. Tras la generación, se llama automáticamente a `validate_usage` para verificar la corrección.

### Argumentos

| Argumento    | Obligatorio | Descripción                                                                                       |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------- |
| `typescript` | ✅ Sí       | Interfaz o tipo TypeScript a convertir (ej. `interface IUser { id: number; createdAt: string; }`) |
| `model_name` | ✗ No        | Nombre opcional para la clase generada (por defecto, el nombre de la interfaz sin el prefijo `I`) |

### Herramientas llamadas internamente

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

### Herramientas llamadas internamente

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

### Herramientas llamadas internamente

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

### Herramientas llamadas internamente

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

### Herramientas llamadas internamente

1. `validate_usage` — comprueba el código del modelo en busca de errores estructurales y violaciones de buenas prácticas
2. `simulate_validation` — prueba los predicados en vivo con datos representativos

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

### Herramientas llamadas internamente

1. `simulate_transformation` — verifica la hidratación y los transformers a nivel de campo
2. `check_integrity` — valida cada campo frente a sus restricciones de tipo esperadas
3. `simulate_validation` — ejecuta los predicados `@QRule` con los datos de muestra proporcionados

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

### Herramientas llamadas internamente

1. `validate_usage` — comprueba el cableado del mixin en busca de errores comunes y el uso de `IQImplements`

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

### Herramientas llamadas internamente

1. `validate_usage` — confirma que `@QAlias` y `@QComputed` se aplican correctamente

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

### Herramientas llamadas internamente

1. `validate_usage` — confirma que la clase migrada usa `declare`, `@Quick({})` y extiende `QModel<T>` correctamente

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

### Herramientas llamadas internamente

1. `validate_usage` — verifica los predicados `@QRule` async y el uso de `checkRulesAsync()`

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

### Herramientas llamadas internamente

1. `validate_usage` — confirma que las anotaciones `@QGroup` y el uso de `checkGroups()` son correctos

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

### Herramientas llamadas internamente

1. `check_security` — ejecuta la suite completa de tests de seguridad (mass assignment, DoS, pollution, ReDoS)

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

### Herramientas llamadas internamente

1. `simulate_transformation` — valida el transformer con datos reales y muestra el resultado

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

### Herramientas llamadas internamente

1. `run_tests` — valida el test rojo (fallido) y la implementación verde (pasando)
2. `lint_check` — bloquea en violaciones ESLint tras la implementación
3. `typecheck` — bloquea en errores de tipos TypeScript
4. `check_project_rules` — aplica naming, id-length, max-params y reglas de imports

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

---

## `quickmodel_fix_lint`

**Corrección guiada paso a paso de errores ESLint tras un fallo del pre-commit hook o cuando `lint_check` devuelve `passed: false`.**

Explica cada violación en lenguaje llano, aplica la corrección mínima correcta respetando las reglas del proyecto (id-length, max-params, no-implied-eval, require-await, etc.), llama a `lint_check` tras cada cambio, y solo declara terminado cuando `pre_commit_check` devuelve `{ passed: true }`.

### Argumentos

| Argumento     | Obligatorio | Descripción                                                                                  |
| ------------- | ----------- | -------------------------------------------------------------------------------------------- |
| `lint_errors` | ✅ Sí       | Texto completo de los errores ESLint: de `lint_check`, `pre_commit_check` o el hook de Husky |
| `file_paths`  | ✗ No        | Lista de archivos a re-verificar separados por comas (por defecto `src/`)                    |

### Flujo de trabajo

1. Parsea cada error del `lint_errors`
2. Explica la regla violada
3. Aplica la corrección mínima correcta
4. Ejecuta `lint_check` tras cada edición — bloquea hasta `passed: true`
5. Ejecuta `pre_commit_check` como puerta final
6. Solo se declara terminado cuando `pre_commit_check` devuelve `{ passed: true }`

### Herramientas llamadas internamente

1. `lint_check` — re-ejecuta ESLint tras cada corrección para confirmar que no se introducen nuevas violaciones
2. `pre_commit_check` — puerta final: lint + typecheck de archivos staged en un solo paso

### Ejemplo

```
lint_errors: """
/src/mcp/tools/public/diff-models.tool.ts
  169:10  error  Identifier name 'tA' is too short (< 3)  id-length
  170:10  error  Identifier name 'tB' is too short (< 3)  id-length
"""
file_paths: "src/mcp/tools/public/diff-models.tool.ts"

→ IA explica: id-length requiere nombres ≥ 3 chars
→ IA renombra: tA → valA, tB → valB
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ lint_check devuelve { passed: true }
→ IA llama a pre_commit_check({ files: ["src/mcp/tools/public/diff-models.tool.ts"] })
→ pre_commit_check devuelve { passed: true } → hecho
```

---

## `quickmodel_fix_typecheck`

**Resolución guiada paso a paso de errores de tipos TypeScript cuando `typecheck` devuelve `passed: false`.**

Explica cada código de error TS en lenguaje claro, aplica la corrección mínima de tipos (nunca `as any`), llama a `typecheck` tras cada lote de cambios, y solo declara hecho cuando `typecheck` Y `pre_commit_check` devuelvan `{ passed: true }`.

### Argumentos

| Argumento     | Requerido | Descripción                                                                                |
| ------------- | --------- | ------------------------------------------------------------------------------------------ |
| `type_errors` | ✅ Sí     | Texto completo del output de errores de TypeScript de `typecheck` o del CLI `tsc`          |
| `file_paths`  | ✗ No      | Lista de archivos separada por comas en los que enfocarse (por defecto el `src/` completo) |

### Referencia rápida de errores TS comunes

| Código | Significado                          | Estrategia de corrección                                               |
| ------ | ------------------------------------ | ---------------------------------------------------------------------- |
| TS2322 | Tipo incompatible (asignabilidad)    | Alinea los tipos; nunca uses `as any`                                  |
| TS2339 | La propiedad no existe en el tipo    | Añade la propiedad a la interfaz; usa optional chaining si es correcto |
| TS7006 | Parámetro con `any` implícito        | Añade anotación de tipo explícita al parámetro                         |
| TS2345 | Tipo de argumento incompatible       | Corrige el argumento o la firma de la función                          |
| TS2531 | El objeto puede ser null             | Añade verificación de null; usa optional chaining si aplica            |
| TS2304 | No se puede encontrar el nombre      | Importa el símbolo; verifica el alias de ruta (`@/core/...`)           |
| TS2554 | Se esperaban N args, se recibieron M | Corrige el punto de llamada o actualiza la firma                       |

### Flujo de trabajo

1. Parsear cada error de `type_errors`
2. Identificar el código TS → explicar la causa raíz
3. Aplicar la corrección mínima correcta (sin `any`, sin supresiones)
4. Llamar a `typecheck({})` tras cada lote — bloquear hasta `passed: true`
5. Llamar a `pre_commit_check` como puerta final
6. Solo se declara hecho cuando ambos devuelven `{ passed: true }`

### Herramientas llamadas internamente

1. `typecheck` — re-ejecuta `tsc --noEmit` tras cada lote de correcciones
2. `pre_commit_check` — puerta final: lint + typecheck de archivos staged en un solo paso

### Ejemplo

```
type_errors: """
src/mcp/tools/internal/my-tool.ts(15,5): error TS2322: Type 'string' is not assignable to type 'number'.
"""

→ IA explica: variable declarada como number pero se le asigna un string literal
→ IA corrige: cambia la anotación de tipo
→ IA llama a typecheck({})
→ typecheck devuelve { passed: true }
→ IA llama a pre_commit_check({ files: ["src/mcp/tools/internal/my-tool.ts"] })
→ pre_commit_check devuelve { passed: true } → hecho
```

---

## `quickmodel_refactor`

**Ciclo de refactoring seguro con puertas TDD — garantiza que no hay regresiones y que se cumplen todas las reglas del proyecto.**

Establece una línea base verde de tests, aplica el refactor y luego verifica con `run_tests` + `lint_check` + `typecheck` + `check_project_rules` antes de declarar hecho.

### Argumentos

| Argumento     | Requerido | Descripción                                                                                    |
| ------------- | --------- | ---------------------------------------------------------------------------------------------- |
| `description` | ✅ Sí     | Qué debe refactorizarse y el objetivo (p. ej. "Extraer parseOutput a un helper privado")       |
| `file_paths`  | ✗ No      | Lista de archivos objetivo separada por comas (la IA los infiere de `description` si se omite) |

### Puertas (en orden)

| Puerta                | Qué verifica                                   |
| --------------------- | ---------------------------------------------- |
| `run_tests` (antes)   | Línea base verde — todos los tests pasan antes |
| `run_tests` (después) | No se introducen regresiones                   |
| `lint_check`          | Sin violaciones de ESLint                      |
| `typecheck`           | Sin errores de tipos TypeScript                |
| `check_project_rules` | id-length, max-params, naming, imports         |

### Flujo de trabajo

1. Llamar a `run_tests` → confirmar línea base verde
2. Aplicar el refactor
3. Llamar a `run_tests` de nuevo → sin regresiones
4. Llamar a `lint_check` → `passed: true`
5. Llamar a `typecheck({})` → `passed: true`
6. Llamar a `check_project_rules` → cero violaciones
7. Solo se declara hecho cuando todas las puertas pasan

### Herramientas llamadas internamente

1. `run_tests` — establece línea base verde y verifica que no hay regresiones tras el refactor
2. `lint_check` — verifica que no se introducen violaciones ESLint
3. `typecheck` — verifica que no se introducen errores de tipos TypeScript
4. `check_project_rules` — aplica id-length, max-params, naming y reglas de imports

### Ejemplo

```
description: "Extraer los métodos parseCount y parseFailures de QRunTestsTool a una clase helper privada"
file_paths: "src/mcp/tools/internal/run-tests.tool.ts"

→ IA llama a run_tests() → 489 pass, 0 fail (línea base)
→ IA extrae los métodos a la clase RunTestsParser
→ IA llama a run_tests() → sigue 489 pass, 0 fail
→ IA llama a lint_check({ targetFiles: ["src/mcp/tools/internal/run-tests.tool.ts"] })
→ lint_check devuelve { passed: true }
→ IA llama a typecheck({}) → { passed: true }
→ IA llama a check_project_rules() → cero violaciones → hecho
```

---

## `quickmodel_apply_solid`

**Revisión guiada de principios SOLID con refactors dirigidos y verificación obligatoria.**

Analiza los archivos contra los 5 principios SOLID (SRP, OCP, LSP, ISP, DIP), propone mejoras concretas y verifica cada cambio con `run_tests`, `lint_check` y `typecheck`.

### Argumentos

| Argumento    | Requerido | Descripción                                                                                |
| ------------ | --------- | ------------------------------------------------------------------------------------------ |
| `file_paths` | ✅ Sí     | Lista de archivos fuente separada por comas (p. ej. `"src/mcp/tools/internal/my-tool.ts"`) |
| `concern`    | ✗ No      | Problema SOLID ya identificado (p. ej. `"Violación SRP: la clase maneja parseo e IO"`)     |

### Referencia de Principios SOLID

| Principio              | Código  | Qué verificar                                                          | Solución habitual                            |
| ---------------------- | ------- | ---------------------------------------------------------------------- | -------------------------------------------- |
| Responsabilidad Única  | **SRP** | ¿Cada clase tiene exactamente UN motivo de cambio?                     | Separar en clases/helpers distintos          |
| Abierto/Cerrado        | **OCP** | ¿Se puede extender sin modificar código existente?                     | Bases abstractas, patrón strategy            |
| Sustitución Liskov     | **LSP** | ¿Los subtipos pueden reemplazar a la base sin romper llamadores?       | No redefinir para lanzar; preservar contrato |
| Segregación Interfaces | **ISP** | ¿Las interfaces son compactas? ¿Dependen de métodos no usados?         | Dividir interfaces grandes                   |
| Inversión Dependencias | **DIP** | ¿Los módulos de alto nivel dependen de abstracciones, no concreciones? | Inyectar vía interfaz; inyección constructor |

### Puertas (en orden, tras cada cambio)

| Puerta       | Qué verifica                    |
| ------------ | ------------------------------- |
| `run_tests`  | Sin regresiones                 |
| `lint_check` | Sin violaciones ESLint          |
| `typecheck`  | Sin errores de tipos TypeScript |

### Flujo de trabajo

1. Llamar a `run_tests` → confirmar línea base verde
2. Revisar SRP → extraer si hace falta → ejecutar puertas
3. Revisar OCP → introducir abstracciones → ejecutar puertas
4. Revisar LSP → corregir overrides → ejecutar puertas
5. Revisar ISP → dividir interfaces → ejecutar puertas
6. Revisar DIP → reemplazar `new Concreto()` con abstracciones inyectadas → ejecutar puertas
7. Solo se declara hecho cuando todas las puertas pasan

### Herramientas llamadas internamente

1. `run_tests` — establece línea base verde y verifica que no hay regresiones tras cada cambio
2. `lint_check` — verifica que no hay violaciones ESLint tras cada cambio
3. `typecheck` — verifica que no hay errores de tipos TypeScript tras cada cambio

### Ejemplo

```
file_paths: "src/mcp/tools/internal/my-tool.ts"
concern: "La clase gestiona tanto la petición HTTP como el parseo JSON — violación SRP"

→ IA llama a run_tests() → línea base verde
→ IA extrae el parser en una clase helper privada
→ IA llama a run_tests() → sigue verde
→ IA llama a lint_check() → { passed: true }
→ IA llama a typecheck({}) → { passed: true } → hecho
```

---

## `quickmodel_sync_project`

**Sincronización completa del proyecto — mantiene tests, lint, typecheck y documentación al día.**

Llama a `project_status` para obtener un snapshot consolidado del estado, corrige los fallos detectados y regenera la documentación con `sync_docs`. Úsalo tras completar una funcionalidad, refactor o un lote de cambios.

### Argumentos

_Ninguno requerido._

### Puertas (en orden)

| Puerta           | Qué verifica                                         |
| ---------------- | ---------------------------------------------------- |
| `project_status` | Snapshot consolidado: tests + lint + typecheck       |
| `run_tests`      | Corregir hasta `passed: true` si los tests fallan    |
| `lint_check`     | Corregir hasta `passed: true` si hay errores lint    |
| `typecheck`      | Corregir hasta `passed: true` si hay errores TS      |
| `sync_docs`      | Regenerar referencia API y archivos de documentación |

### Flujo de trabajo

1. Llamar a `project_status` → obtener snapshot del estado actual
2. Si los tests fallan → diagnosticar y corregir → re-ejecutar `run_tests` hasta `passed: true`
3. Si hay errores lint → corregir violaciones → re-ejecutar `lint_check` hasta `passed: true`
4. Si hay errores typecheck → corregir errores TS → re-ejecutar `typecheck` hasta `passed: true`
5. Llamar a `sync_docs` → regenerar documentación
6. Llamar a `project_status` de nuevo → confirmar `passed: true` en todos los checks
7. Solo se declara hecho cuando todas las capas están en verde y la documentación regenerada

### Herramientas llamadas internamente

1. `project_status` — snapshot consolidado del estado (tests + lint + typecheck)
2. `run_tests` — corregir fallos hasta `passed: true`
3. `lint_check` — corregir violaciones hasta `passed: true`
4. `typecheck` — corregir errores TS hasta `passed: true`
5. `sync_docs` — regenerar referencia API y archivos de documentación

### Ejemplo

```
→ IA llama a project_status() → { passed: false, tests: { passed: true }, lint: { passed: false }, typecheck: { passed: true } }
→ IA corrige las violaciones lint
→ IA llama a lint_check() → { passed: true }
→ IA llama a sync_docs() → "Actualizados 6 archivos de documentación correctamente"
→ IA llama a project_status() → { passed: true } → hecho
```
