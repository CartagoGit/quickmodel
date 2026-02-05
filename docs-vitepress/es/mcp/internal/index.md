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

Hace cumplir reglas internas del proyecto: usar @Quick sobre @QType en tests, y no console.log.

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

