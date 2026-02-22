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

Analiza una definición de clase QuickModel y explica su estructura. Retorna `name`, `transformers`, `structure` y `decorators` — la lista de decoradores QuickModel detectados en el código (`@Quick`, `@QRule`, `@QField`, `@QAlias`, `@QGroup`, `@QComputed`, `@QConfig`, `@QType`).

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

## `validate_usage`

Analiza un fragmento de código para verificar errores comunes de uso de QuickModel (ej. falta de declare, herencia incorrecta). Reconoce la API completa de decoradores — `@Quick`, `@QRule`, `@QField`, `@QAlias`, `@QGroup`, `@QComputed`, `@QConfig` — como decoradores válidos. Retorna `valid`, `issues` y `detectedDecorators[]`. Emite una advertencia cuando se usa `@QField` sin `@QRule`.

```json
{
	"code": {
		"description": "The TypeScript code to analyze"
	}
}
```
