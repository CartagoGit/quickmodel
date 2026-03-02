# Herramientas MCP

Estas herramientas están diseñadas para ayudar a los desarrolladores a **usar** QuickModel efectivamente en sus aplicaciones.

## Herramientas Disponibles

Las siguientes herramientas están disponibles para uso público.

- **Creación de Modelos**: Genera clases `QModel` completas desde descripciones.
- **Validación**: Analiza código para el uso correcto de `@Quick` y decoradores.
- **Simulación**: Prueba cómo se transforman los datos sin ejecutar todo el código de la aplicación.
- **Mocking**: Genera datos simulados realistas para pruebas.
- **Inspección**: Analiza estructuras de modelos y transformadores disponibles.

::: tip Flujos de trabajo guiados (Skills)
¿Necesitas que la IA gestione una tarea completa automáticamente? Consulta los **[Skills / Flujos de Trabajo](./skills)** — flujos de trabajo guiados para convertir, depurar y validar modelos.
:::

<!-- TOOLS-START -->

<!-- _Mantenido manualmente. El equivalente en inglés se genera automáticamente por QSyncDocsTool._ -->

## `create_model`

Genera el código TypeScript de una clase que extiende `QModel` a partir de una lista de propiedades. Úsalo para crear nuevos modelos rápidamente.

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

Genera una definición JSON Schema a partir de una clase QuickModel.

```json
{
	"code": {
		"description": "The QuickModel class code"
	}
}
```

## `generate_mock`

Genera datos simulados (mock) para una definición de esquema usando QuickModel.

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

Analiza la definición de una clase QuickModel y explica su estructura.

```json
{
	"code": {
		"description": "The TypeScript code of the model class"
	}
}
```

## `interface_to_model`

Convierte una interfaz TypeScript en una clase QuickModel.

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

Lista todos los transformadores de datos disponibles en QuickModel (p. ej. string, date, email).

```json
{}
```

## `list_validators`

Lista todos los decoradores de validación integrados en QuickModel con sus firmas de uso y descripciones.

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

## `check_integrity`

Ejecuta comprobaciones de integridad a nivel de transformer sobre un objeto de datos. Detecta fechas inválidas, BigInts fuera de rango, RegExps malformados, etc. Complementa a `simulate_validation` (que cubre predicados de lógica de negocio con `@QRule`). Devuelve `{ valid, errors[], evaluated }`.

```json
{
	"data": {
		"description": "The data object to check"
	},
	"options": {
		"description": "Type configuration — same format as @Quick() (e.g. { birth: \"Date\", balance: \"BigInt\" })"
	}
}
```

## `diff_models`

Compara dos definiciones de clase QuickModel y reporta diferencias estructurales. Detecta campos añadidos/eliminados, cambios en la configuración del transformer en `@Quick({})`, y decoradores de campo añadidos/eliminados (`@QField`, `@QRule`, `@QGroup`, `@QAlias`, `@QComputed`). Análisis estático puro, sin ejecución de código. Devuelve `{ added_fields, removed_fields, changed_fields, changed_transformers, added_decorators, removed_decorators, summary }`.

```json
{
	"model_a": {
		"description": "Source code of the baseline QuickModel class (the \"before\")"
	},
	"model_b": {
		"description": "Source code of the new QuickModel class (the \"after\")"
	}
}
```

## `get_form_schema`

Extrae el schema de formulario de una clase QuickModel analizando sus decoradores `@QField` y `@QGroup`. Usa la API real `QModel.getFormSchema()` (estático) — equivalente a llamar `instancia.$qGetFormSchema()`. Con `grouped=true` devuelve el schema agrupado por secciones `@QGroup`. Devuelve `{ schema, count }`.

```json
{
	"code": {
		"description": "The QuickModel class code containing @QField and optional @QGroup decorators"
	},
	"grouped": {
		"description": "When true, returns the schema grouped by @QGroup sections (default: false)",
		"optional": true
	}
}
```

## `get_model_schema`

Genera el schema de un modelo en cualquier formato soportado a partir de una clase QuickModel. Formatos disponibles: `json`, `openapi`, `zod`, `mongo`, `typescript`, `graphql`, `ajv`. Usa la API real `QModel.getSchema()`.

```json
{
	"code": {
		"description": "The QuickModel class code (must include @Quick({...}) decorator)"
	},
	"format": {
		"description": "Schema format to generate: json | openapi | zod | mongo | typescript | graphql | ajv"
	}
}
```

## `roundtrip`

Verifica que serializar y recrear una instancia de QuickModel es sin pérdida. Ejecuta: `s1 = new Model(data).$qSerialize()` → `s2 = new Model(s1).$qSerialize()` y comprueba si `s1 === s2`. Devuelve `{ lossless, input, serialized, roundtrip_serialized, diff, summary }`.

```json
{
	"data": {
		"description": "Raw input data to populate the model"
	},
	"options": {
		"description": "@Quick() configuration options (e.g. { field: \"Date\" }). Type names must match the same strings accepted by simulate_transformation."
	}
}
```

## `simulate_async_rules`

⚠️ **SOLO ASYNC**: Ejecuta reglas de lógica de negocio asíncronas a través de la API real `instance.$qCheckRulesAsync()`. Úsalo SOLO cuando los predicados requieran operaciones genuinamente asíncronas (p. ej. simular consultas a BD, llamadas a API). Para reglas síncronas usa `simulate_rules` — más simple y rápido. Soporta `timeoutMs`, `timeoutMessage` y `mode: "parallel" | "serial"`.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of { field, predicate, message } objects. Predicate strings have access to `value` and `data`."
	},
	"options": {
		"description": "Async options: { timeoutMs?, timeoutMessage?, mode?: \"parallel\" | \"serial\" }",
		"optional": true
	}
}
```

## `simulate_rules`

Ejecuta reglas de lógica de negocio a través de la API real `instance.$qCheckRules()`. Aplica las reglas mediante metadatos `@QRule` para que el formato del resultado coincida exactamente con el `IQRulesResult` de producción. Usa `simulate_validation` para evaluaciones independientes de predicados; usa esta herramienta cuando necesites verificar la salida exacta de `@QRule` + `checkRules()` en runtime. Devuelve `{ valid, errors[], evaluated }`.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of { field, predicate, message } objects. Predicate strings have access to `value` and `data`."
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

## `simulate_validation`

Simula validación de predicados estilo `@QRule` sobre un objeto de datos. Cada regla tiene un `predicate` (expresión JS con variables `value` y `data`) y un `message`. Permite filtrar por `group`. Devuelve `{ valid, errors, evaluated }`.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of { field, predicate, message, group? } objects"
	},
	"group": {
		"description": "Optional group name — only rules with this group will run",
		"optional": true
	}
}
```

## `validate_usage`

Analiza un fragmento de código para detectar errores comunes de uso de QuickModel (p. ej. falta de `declare`, herencia incorrecta).

```json
{
	"code": {
		"description": "The TypeScript code to analyze"
	}
}
```
