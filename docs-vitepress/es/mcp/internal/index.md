# Herramientas MCP Internas

> [!WARNING]
> ⚠️ **Solo Uso Interno**: Esto NO es para usuarios finales que instalan el paquete vía npm.

Estas herramientas están diseñadas para **mantenedores** de la librería QuickModel. Automatizan tareas comunes de desarrollo y comprobaciones de salud del proyecto.

## Herramientas Disponibles

Las siguientes herramientas se usan para desarrollo interno.

- **Scaffolding**: Genera tests (`generate_test`) y esqueletos de funcionalidad.
- **Documentación**: Sincroniza docs (`update_docs`), comprueba JSDocs faltantes (`check_jsdocs`).
- **QA**: Comprueba salud del proyecto (`check_project_health`), cobertura (`get_coverage_report`), y compatibilidad de API.
- **Rendimiento**: Benchmarks de rendimiento (`benchmark_performance`).

<!-- TOOLS-START -->

<!-- _Generado automáticamente por QSyncDocsTool. No editar manualmente._ -->

## `benchmark_performance`

Ejecuta pruebas de rendimiento para las transformaciones de QuickModel.

```json
{
	"iterations": {
		"description": "Number of iterations for each test case",
		"optional": true
	}
}
```

## `check_api_compatibility`

Verifica la compatibilidad de la API pública.

```json
{
	"baselineFile": {
		"description": "Path to the API baseline JSON file. Defaults to api-baseline.json.",
		"optional": true
	}
}
```

## `check_bundle_size`

Compila el proyecto y reporta el tamaño de los archivos generados en dist/. Devuelve { status, files: [{file, bytes}][], total_bytes, summary }.

```json
{}
```

## `check_changelog`

Verifica que CHANGELOG.md contiene una entrada para la versión actual de package.json. Devuelve { found, version, excerpt, status, message? }.

```json
{
	"projectDir": {
		"description": "Project root directory containing package.json and CHANGELOG.md. Defaults to process.cwd().",
		"optional": true
	}
}
```

## `check_jsdocs`

Escanea el código fuente buscando miembros exportados que carecen de documentación JSDoc.

```json
{}
```

## `check_project_health`

Ejecuta una verificación completa de salud: Lint, Typecheck y Tests.

```json
{}
```

## `check_project_rules`

Hace cumplir reglas internas: @Quick sobre @QType en tests, sin console.log, id-length (mín 3 chars), max-params (máx 3), naming-convention (prefijo I para interfaces/tipos), no-restricted-imports.

```json
{
	"targetDir": {
		"description": "Directory to scan (defaults to project root)",
		"optional": true
	}
}
```

## `check_security`

Run the security test suite to verify protection against vulnerabilities (XSS, Injection, Path Traversal, etc.).

```json
{}
```

## `generate_test`

Herramienta interna para generar un archivo de prueba inicial para un componente fuente.

```json
{
	"sourceFile": {
		"description": "Absolute path to the source file (e.g., src/core/user.ts)"
	}
}
```

## `get_coverage_report`

Ejecuta pruebas con cobertura y reporta el resumen.

```json
{}
```

## `lint_check`

Ejecuta ESLint sobre un directorio o archivos específicos. Devuelve { passed, errors, warnings, total_errors, total_warnings, summary }.

```json
{
	"targetDir": {
		"description": "Directory to lint (e.g. \"src/mcp/tools\"). Defaults to \"src\" if neither targetDir nor targetFiles is provided.",
		"optional": true
	},
	"targetFiles": {
		"description": "Array of specific file paths to lint (e.g. [\"src/mcp/tools/public/my-tool.ts\"]).",
		"optional": true
	}
}
```

## `list_todos`

Escanea archivos fuente en busca de comentarios TODO, FIXME, HACK y XXX. Admite targetDir personalizado y extensiones de archivo. Devuelve { items: [{file, line, type, text}][], total }.

```json
{
	"targetDir": {
		"description": "Directory to scan. Defaults to src/ in the project root.",
		"optional": true
	},
	"extensions": {
		"description": "File extensions to include (default: [\".ts\", \".js\"]). E.g. [\".ts\", \".tsx\", \".js\"]",
		"optional": true
	}
}
```

## `pre_commit_check`

Simula el hook de pre-commit de Husky: ejecuta ESLint (--fix) y Prettier (--write) sobre los archivos indicados o src/. Devuelve { passed, eslint_errors, eslint_warnings, prettier_changed, issues, summary }. Ejécutalo antes de hacer commit para garantizar que el hook no lo rechazará.

```json
{
	"files": {
		"description": "List of file paths to check. Defaults to all TypeScript/JavaScript files in src/.",
		"optional": true
	}
}
```

## `scaffold_feature`

Genera la estructura básica para una nueva funcionalidad.

```json
{
	"type": {
		"description": "Type of feature to scaffold"
	},
	"name": {
		"description": "Name of the feature (e.g., \"email\", \"validate-user\")"
	},
	"location": {
		"description": "Target directory (relative to project root). Defaults to standard locations.",
		"optional": true
	}
}
```

## `typecheck`

Ejecuta la verificación de tipos de TypeScript (tsc --noEmit) sobre src/. Devuelve { passed, errors, total, summary }.

```json
{}
```

## `update_docs`

Herramienta interna para ejecutar scripts de construcción de documentación.

```json
{
	"action": {
		"description": "The action to perform"
	}
}
```

## `update_docs_content`

Genera automáticamente archivos de documentación para Herramientas y Transformadores basado en el código actual.

```json
{}
```
