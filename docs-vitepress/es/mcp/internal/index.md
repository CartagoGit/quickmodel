# Herramientas MCP Internas

> [!WARNING]
> ⚠️ **Solo Uso Interno**: Esto NO es para usuarios finales que instalan el paquete vía npm.

Estas herramientas están diseñadas para **mantenedores** de la librería QuickModel. Automatizan tareas comunes de desarrollo y comprobaciones de salud del proyecto.

## Herramientas Disponibles

Las siguientes herramientas se usan para desarrollo interno.

- **Scaffolding**: Genera tests (`generate_test`) y esqueletos de funcionalidad.
- **Documentación**: Sincroniza docs (`update_docs`, `update_docs_content`), comprueba JSDocs faltantes (`check_jsdocs`).
- **QA**: Comprueba salud del proyecto (`check_project_health`), cobertura (`get_coverage_report`), compatibilidad de API, tamaño del bundle y CHANGELOG.
- **CI / Flujo de desarrollo**: Ejecuta tests (`run_tests`), lint (`lint_check`), typecheck (`typecheck`), simula pre-commit (`pre_commit_check`), archivos en staging (`get_staged_files`) y snapshot consolidado de salud (`project_status`).
- **Coordinación de agentes**: Previene conflictos de archivos entre sesiones de agentes paralelas (`agent_coordinate`).
- **Rendimiento**: Benchmarks de rendimiento (`benchmark_performance`).

<!-- TOOLS-START -->

<!-- _Mantenido manualmente. El equivalente en inglés se genera automáticamente por QSyncDocsTool._ -->

## `agent_coordinate`

Coordina el trabajo de agentes paralelos y previene conflictos de archivos. `check`: lista todos los agentes activos (llamar siempre primero). `claim`: registra tarea + archivos; usa detección glob-aware de solapamiento; devuelve `conflict:true` si bloqueado. `release`: libera el claim al terminar. `update`: refresca el heartbeat TTL (llamar cada ~15 min). `purge`: fuerza limpiar claims bloqueados. Registro en `tmp/agent-registry.json`; las entradas expiran en **2 min** sin heartbeat. Seguro entre procesos mediante lock atómico (`tmp/agent-registry.json.lock`).

```json
{
	"action": {
		"description": "Operación: claim | check | release | update | purge"
	},
	"agentId": {
		"description": "Identificador único del agente, p.ej. \"copilot-session-1\". Requerido para claim, release, update.",
		"optional": true
	},
	"task": {
		"description": "Título corto de la tarea, p.ej. \"migrar docs $qm\". Requerido para claim.",
		"optional": true
	},
	"files": {
		"description": "Rutas o patrones glob a bloquear, p.ej. [\"docs-vitepress/en/**\", \"src/core/**\"]. Detección de solape glob-aware.",
		"optional": true
	},
	"ttlMs": {
		"description": "TTL personalizado en ms para este claim. Por defecto 120000 (2 minutos). Cualquier llamada check() con agentId actúa como heartbeat implícito.",
		"optional": true
	},
	"force": {
		"description": "Si true, anula un claim conflictivo cuyo updatedAt tiene más de ~1 min (probablemente crasheado). NO anula un claim activo fresco — usa purge para eso.",
		"optional": true
	}
}
```

## `benchmark_performance`

Ejecuta benchmarks de rendimiento para las transformaciones de QuickModel.

```json
{
	"iterations": {
		"description": "Number of iterations for each test case",
		"optional": true
	}
}
```

## `check_api_compatibility`

Comprueba si hay cambios incompatibles (breaking changes) en la API pública.

```json
{
	"baselineFile": {
		"description": "Path to the API baseline JSON file. Defaults to api-baseline.json.",
		"optional": true
	}
}
```

## `check_bundle_size`

Compila el proyecto y reporta el tamaño de los archivos generados en `dist/`. Devuelve `{ status, files: [{file, bytes}][], total_bytes, summary }`.

```json
{}
```

## `check_changelog`

Verifica que `CHANGELOG.md` contiene una entrada para la versión actual de `package.json`. Devuelve `{ found, version, excerpt, status, message? }`.

```json
{
	"projectDir": {
		"description": "Project root directory containing package.json and CHANGELOG.md. Defaults to process.cwd().",
		"optional": true
	}
}
```

## `check_jsdocs`

Escanea el código fuente en busca de miembros exportados que carecen de documentación JSDoc.

```json
{}
```

## `check_project_health`

Ejecuta una comprobación completa de salud del proyecto: Lint, Typecheck y Tests.

```json
{}
```

## `check_project_rules`

Hace cumplir las reglas internas del proyecto: usar `@Quick` en lugar de `@QType` en tests, sin `console.log`, etc.

```json
{
	"targetDir": {
		"description": "Directory to scan (defaults to project root)",
		"optional": true
	}
}
```

## `check_security`

Ejecuta la suite de tests de seguridad para verificar protección contra vulnerabilidades (XSS, Inyección, Path Traversal, etc.).

```json
{}
```

## `generate_test`

Herramienta interna para generar un archivo de test inicial para un componente fuente.

```json
{
	"sourceFile": {
		"description": "Absolute path to the source file (e.g., src/core/user.ts)"
	}
}
```

## `get_coverage_report`

Ejecuta los tests con cobertura y reporta el resumen.

```json
{}
```

## `get_staged_files`

Lista los archivos actualmente en staging (`git diff --cached --name-only`). Úsalo para saber qué archivos necesitan validación lint/typecheck antes de hacer commit. Devuelve `{ passed, files[], total, summary }`.

```json
{}
```

## `lint_check`

Ejecuta ESLint sobre un directorio o archivos específicos. Devuelve `{ passed, errors, warnings, total_errors, total_warnings, summary }`.

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

Escanea archivos fuente en busca de comentarios TODO, FIXME, HACK y XXX. Devuelve una lista estructurada `{ file, line, type, text }[]`. Por defecto escanea `src/`; admite `targetDir` personalizado.

```json
{
	"targetDir": {
		"description": "Directory to scan. Defaults to src/ in the project root.",
		"optional": true
	},
	"extensions": {
		"description": "File extensions to include (default: [\".\"ts\", \".js\"]). E.g. [\".ts\", \".tsx\", \".js\"]",
		"optional": true
	}
}
```

## `pre_commit_check`

Simula el hook de pre-commit de Husky: ejecuta ESLint (`--fix`) y Prettier (`--write`) sobre los archivos indicados o `src/`. Devuelve `{ passed, eslint_errors, eslint_warnings, prettier_changed, issues, summary }`. Ejecútalo antes de hacer commit para garantizar que el hook no lo rechazará.

```json
{
	"files": {
		"description": "List of file paths to check. Defaults to all TypeScript/JavaScript files in src/.",
		"optional": true
	}
}
```

## `project_status`

Ejecuta todas las comprobaciones de salud del proyecto simultáneamente: tests, lint y typecheck. Devuelve un snapshot consolidado con estado pass/fail de cada capa y un resumen legible. Devuelve `{ passed, tests, lint, typecheck, summary }`.

```json
{}
```

## `run_tests`

Ejecuta la suite de tests de Bun (opcionalmente filtrada por ruta/patrón). Parsea los conteos de pass/fail y devuelve detalles estructurados de fallos. Devuelve `{ passed, total_pass, total_fail, errors[], summary }`.

```json
{
	"pattern": {
		"description": "Optional file path or pattern to narrow test execution (e.g. \"tests/mcp/unit/internal\"). Runs the full suite when omitted.",
		"optional": true
	}
}
```

## `scaffold_feature`

Genera la estructura básica (boilerplate) para una nueva funcionalidad (transformers, tools).

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

Ejecuta la verificación de tipos de TypeScript (`tsc --noEmit`) sobre `src/`. Devuelve `{ passed, errors, total, summary }`.

```json
{}
```

## `update_docs`

Herramienta interna para ejecutar los scripts de construcción de documentación.

```json
{
	"action": {
		"description": "The action to perform"
	}
}
```

## `update_docs_content`

Genera automáticamente los archivos de documentación para Tools y Transformadores basándose en el código actual.

```json
{}
```
