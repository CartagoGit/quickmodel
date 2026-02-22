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
¿Necesitas que la IA gestione una tarea completa automáticamente? Consulta los **[Prompts / Skills](./skills)** — flujos de trabajo guiados que encadenan múltiples herramientas para convertir interfaces, depurar modelos, generar datos de prueba o exportar schemas.
:::

<!-- TOOLS-START -->

<!-- _Generado automáticamente por QSyncDocsTool. No editar manualmente._ -->

## `check_integrity`

Ejecuta comprobaciones de integridad a nivel de transformer sobre un objeto de datos usando la API real instance.checkIntegrity(). Detecta Date inválidos, BigInt fuera de rango, RegExp malformados y otros fallos a nivel de transformer. Devuelve { valid, errors[], evaluated, summary }.

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

## `diff_models`

Compara dos definiciones de clase QuickModel (como cadenas de código fuente) y reporta las diferencias: campos añadidos/eliminados, transformers cambiados, decoradores añadidos/eliminados. Análisis estático puro, sin ejecución de código. Devuelve { added_fields, removed_fields, changed_fields, changed_transformers, added_decorators, removed_decorators, summary }.

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

## `get_form_schema`

Extrae el schema de formulario de los decoradores @QField / @QGroup usando la API real QModel.getFormSchema() / getFormSchemaGrouped(). Devuelve metadatos de campo (widget, label, placeholder, required, inputType, options) como array estructurado.

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

Genera el schema de un modelo en cualquier formato soportado a partir de una clase QuickModel. Soporta los 7 formatos: json, openapi, zod, mongo, typescript, graphql, ajv. Usa la API real QModel.getSchema().

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

## `roundtrip`

Verifica que serializar y recrear una instancia de QuickModel es sin pérdida. Ejecuta: s1 = new Model(data).serialize() → s2 = new Model(s1).serialize() y comprueba si s1 === s2. Devuelve { lossless, input, serialized, roundtrip_serialized, diff, summary }.

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

## `search_docs`

Busca en la documentación de QuickModel por una cadena de consulta.

```json
{
	"query": {
		"description": "The search term or phrase"
	}
}
```

## `simulate_async_rules`

Ejecuta reglas de lógica de negocio asíncronas a través de la API real instance.checkRulesAsync(). Soporta timeoutMs, timeoutMessage y mode (parallel|serial). Las cadenas de predicado pueden usar async/await y devolver Promises. Devuelve { valid, errors[], evaluated }.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of async rules to apply via @QRule + checkRulesAsync()"
	},
	"options": {
		"description": "Options forwarded to checkRulesAsync()",
		"optional": true
	}
}
```

## `simulate_rules`

Ejecuta reglas de lógica de negocio a través de la API real instance.checkRules(). Aplica las reglas mediante metadatos @QRule para que el formato del resultado coincida exactamente con el IQRulesResult de producción. Las cadenas de predicado tienen acceso a `value` (valor del campo) y `data` (objeto completo). Usa simulate_validation para evaluaciones independientes de predicados; usa esta herramienta cuando necesites verificar que la salida de @QRule + checkRules() es exactamente la que producirá tu código en runtime. Devuelve { valid, errors[], evaluated }.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of rules to apply via the real @QRule + checkRules() API"
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

Simula validación de predicados estilo @QRule sobre un objeto de datos. Cada regla tiene un predicado (expresión JS con variables `value` y `data`) y un mensaje. Retorna { valid, errors[], evaluated }.

```json
{
	"data": {
		"description": "The data object to validate"
	},
	"rules": {
		"description": "Array of validation rules to apply"
	},
	"group": {
		"description": "When provided, only rules matching this group will be evaluated",
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
