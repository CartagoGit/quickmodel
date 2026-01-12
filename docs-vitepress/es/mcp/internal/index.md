# Herramientas MCP Internas

Estas herramientas están diseñadas para **mantenedores** de la librería QuickModel. Automatizan tareas comunes de desarrollo y comprobaciones de salud del proyecto.

## Configuración para Mantenedores

Si estás desarrollando QuickModel (clonaste el repo), usa la versión de código fuente del servidor MCP.

### Configuración Automática

Proporcionamos un script para generar la configuración por ti:

```bash
bun run scripts/generate-mcp-config.ts
```

Copia la salida relevante para tu editor.

### Configuración Manual

**VSCode / Cursor (`.vscode/settings.json`):**

```json
{
	"mcpServers": {
		"quickmodel-dev": {
			"command": "bun",
			"args": ["run", "src/mcp/server.ts"],
			"env": {
				"cwd": "${workspaceFolder}"
			}
		}
	}
}
```

::: warning
Estas herramientas están pensadas para usarse solo dentro del repositorio de QuickModel. Pueden no funcionar correctamente si se ejecutan fuera de la raíz del proyecto.
:::

## Ayudas de Desarrollo

### `generate_test`

Genera un esqueleto de archivo de test unitario para un archivo fuente dado.

- **Entrada**: Ruta del archivo fuente (ej: `src/core/my-feature.ts`).
- **Acción**: Crea `tests/unit/core/my-feature.test.ts` con imports pre-llenados.

### `update_docs`

Dispara el proceso de construcción de documentación.

- **Acciones**: `build` (reconstrucción completa), `clean` (eliminar dist).
- **Uso**: "Reconstruye la documentación para verificar mis cambios."

## Aseguramiento de Calidad

### `check_project_health`

Ejecuta una comprobación completa del estado del proyecto.

- **Ejecuta**: `bun run check` (Lint, Typecheck, Tests).
- **Uso**: "¿Está saludable el proyecto?"

### `check_jsdocs`

Escanea el código fuente en busca de miembros exportados que carecen de documentación JSDoc.

- **Uso**: "¿Hay documentación faltante?"
- **Salida**: Lista de archivos y líneas con documentación faltante.

### `get_coverage_report`

Ejecuta la suite de tests con cobertura habilitada y reporta el resumen.

- **Uso**: "¿Cuál es la cobertura actual de tests?"
- **Salida**: Tabla resumen de porcentajes de cobertura.
