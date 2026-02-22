# Herramientas MCP Públicas

Estas herramientas están diseñadas para ayudar a los desarrolladores a **usar** QuickModel efectivamente en sus aplicaciones.

## Herramientas Disponibles

Las siguientes herramientas están disponibles para uso público.

- **Creación de Modelos**: Genera clases `QModel` completas desde descripciones.
- **Validación**: Analiza código para el uso correcto de `@Quick` y decoradores.
- **Simulación**: Prueba cómo se transforman los datos sin ejecutar todo el código de la aplicación.
- **Mocking**: Genera datos simulados realistas para pruebas.
- **Inspección**: Analiza estructuras de modelos y transformadores disponibles.

::: tip Flujos de trabajo guiados (Prompts / Skills)
¿Necesitas que la IA gestione una tarea completa automáticamente? Consulta los **[Prompts / Skills](./skills)** — flujos de trabajo guiados en dos grupos: **Skills públicos** para convertir, depurar y validar modelos; **Skills de mantenimiento** para ciclos TDD, correcciones de lint/typecheck, refactoring y sincronización de documentación.
:::

<!-- TOOLS-START -->

<!-- _Generado automáticamente por QSyncDocsTool. No editar manualmente._ -->

## `create_model`

Genera el código TypeScript para una clase que extiende QModel basado en una lista de propiedades. Úsalo para crear nuevos modelos rápidamente.

```json
{
	"className": {
		"description": "The name of the class (e.g., \"User\")"
	},
	"properties": {
		"description": "Key-value pairs where key is property name and value is the type (e.g., \"string\", \"Date\")"
	}
}
```

## `explain_error`

Explica un error de validación de QuickModel en lenguaje humano.

```json
{
	"error": {
		"description": "The JSON string of the validation error"
	}
}
```

## `export_json_schema`

Genera una definición de JSON Schema a partir de una clase QuickModel.

```json
{
	"code": {
		"description": "The QuickModel class code"
	}
}
```

## `generate_mock`

Genera datos simulados (mock) para una definición de esquema dada usando QuickModel.

```json
{
	"schema": {
		"description": "Key-value pairs where key is field name and value is transformer type (e.g. { \"birth\": \"date\", \"name\": \"string\" })"
	},
	"count": {
		"description": "Number of mock objects to generate",
		"optional": true
	}
}
```

## `inspect_model`

Analiza una definición de clase QuickModel y explica su estructura.

```json
{
	"code": {
		"description": "The TypeScript code of the model class"
	}
}
```

## `interface_to_model`

Convierte una definición de interfaz TypeScript en una clase QuickModel.

```json
{
	"code": {
		"description": "The TypeScript interface code"
	}
}
```

## `json_to_model`

Convierte una cadena JSON en una definición de clase QuickModel con tipos inferidos.

```json
{
	"json": {
		"description": "The JSON string to convert"
	},
	"className": {
		"description": "The name of the generated class",
		"optional": true
	}
}
```

## `list_transformers`

Lista todos los transformadores de datos disponibles en QuickModel (ej. string, date, email).

```json
{}
```

## `search_docs`

Busca en la documentación de QuickModel por una cadena de consulta.

```json
{
	"query": {
		"description": "The search term or phrase"
	}
}
```

## `simulate_transformation`

Simula una transformación de datos QuickModel dado un objeto de entrada y un mapa de configuración.

```json
{
	"data": {
		"description": "The raw input data object"
	},
	"options": {
		"description": "The configuration object typically passed to @Quick() (e.g. { field: \"Date\", list: [\"Date\"] })"
	}
}
```

## `check_integrity`

Ejecuta comprobaciones de integridad a nivel de transformer sobre un objeto de datos. Detecta valores `Date` inválidos, `BigInt` demasiado grandes, `RegExp` malformadas, etc. Complementa `simulate_validation` (que cubre los predicados de negocio `@QRule`). Devuelve `{ valid, errors[], evaluated }`.

```json
{
	"data": {
		"description": "El objeto de datos a verificar"
	},
	"options": {
		"description": "Configuración de tipos — mismo formato que @Quick() (ej. { birth: \"Date\", balance: \"BigInt\" })"
	}
}
```

## `diff_models`

Compara dos definiciones de clases QuickModel e informa las diferencias estructurales. Detecta campos añadidos/eliminados, cambios en la configuración de transformers en `@Quick({})`, y decoradores de campo añadidos/eliminados (`@QField`, `@QRule`, `@QGroup`, `@QAlias`, `@QComputed`). Análisis estático — no requiere ejecución. Devuelve `{ added_fields, removed_fields, changed_fields, changed_transformers, added_decorators, removed_decorators, summary }`.

```json
{
	"model_a": {
		"description": "Código fuente de la clase QuickModel de referencia (el \"antes\")"
	},
	"model_b": {
		"description": "Código fuente de la nueva clase QuickModel (el \"después\")"
	}
}
```

## `get_form_schema`

Extrae el esquema de formulario de una clase QuickModel analizando sus decoradores `@QField` y `@QGroup`. Usa la API real `QModel.getFormSchema()`. Establece `grouped=true` para obtener el esquema agrupado por secciones `@QGroup`. Devuelve `{ schema, count }`.

```json
{
	"code": {
		"description": "El código de la clase QuickModel con decoradores @QField y opcionalmente @QGroup"
	},
	"grouped": {
		"description": "Cuando es true, devuelve el esquema agrupado por secciones @QGroup (defecto: false)",
		"optional": true
	}
}
```

## `get_model_schema`

Genera el esquema del modelo en cualquier formato soportado desde una definición de clase QuickModel. Formatos soportados: `json`, `openapi`, `zod`, `mongo`, `typescript`, `graphql`, `ajv`. Usa la API real `QModel.getSchema()` para una salida precisa.

```json
{
	"code": {
		"description": "El código de la clase QuickModel (debe incluir el decorador @Quick({...}))"
	},
	"format": {
		"description": "Formato del esquema a generar: json | openapi | zod | mongo | typescript | graphql | ajv"
	}
}
```

## `roundtrip`

Verifica que serializar y volver a crear una instancia de QuickModel es sin pérdida. Ejecuta: `s1 = new Model(data).serialize()` → `s2 = new Model(s1).serialize()` e informa si `s1 === s2`. Devuelve `{ lossless, input, serialized, roundtrip_serialized, diff, summary }`.

```json
{
	"data": {
		"description": "Datos de entrada brutos para popular el modelo"
	},
	"options": {
		"description": "Opciones de configuración de @Quick() (ej. { field: \"Date\" }). Los nombres de tipo deben coincidir con los aceptados por simulate_transformation."
	}
}
```

## `simulate_async_rules`

⚠️ **SOLO ASYNC**: Ejecuta reglas de negocio async a través de la API real `instance.checkRulesAsync()`. Usa esto SOLO cuando los predicados realmente requieran operaciones async (ej. simulando consultas a BD, llamadas a APIs). Para reglas síncronas, usa `simulate_rules` — es más simple y rápido. Soporta `timeoutMs`, `timeoutMessage` y `mode: "parallel" | "serial"`.

```json
{
	"data": {
		"description": "El objeto de datos a validar"
	},
	"rules": {
		"description": "Array de objetos { field, predicate, message }. Las cadenas de predicado tienen acceso a `value` y `data`."
	},
	"options": {
		"description": "Opciones async: { timeoutMs?, timeoutMessage?, mode?: \"parallel\" | \"serial\" }",
		"optional": true
	}
}
```

## `simulate_rules`

Ejecuta reglas de negocio a través de la API real `instance.checkRules()`. Aplica las reglas vía metadatos `@QRule` para que el formato del resultado coincida exactamente con `IQRulesResult` de producción. Usa `simulate_validation` para evaluación standalone de predicados; usa esta herramienta cuando necesites verificar la salida exacta de `@QRule` + `checkRules()` que producirá tu código en runtime. Devuelve `{ valid, errors[], evaluated }`.

```json
{
	"data": {
		"description": "El objeto de datos a validar"
	},
	"rules": {
		"description": "Array de objetos { field, predicate, message }. Las cadenas de predicado tienen acceso a `value` y `data`."
	}
}
```

## `simulate_validation`

Simula la validación de predicados estilo `@QRule` sobre un objeto de datos. Cada regla tiene un `predicate` (expresión JS con variables `value` y `data`) y un `message`. Opcionalmente filtra por `group`. Devuelve `{ valid, errors, evaluated }`.

```json
{
	"data": {
		"description": "El objeto de datos a validar"
	},
	"rules": {
		"description": "Array de objetos { field, predicate, message, group? }"
	},
	"group": {
		"description": "Nombre de grupo opcional — solo se ejecutarán las reglas de este grupo",
		"optional": true
	}
}
```

## `validate_usage`

Analiza un fragmento de código para verificar errores comunes de uso de QuickModel (ej. falta de declare, herencia incorrecta).

```json
{
	"code": {
		"description": "The TypeScript code to analyze"
	}
}
```
