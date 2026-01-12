# Instalación y Configuración para Mantenedores

> [!WARNING]
> ⚠️ **Solo Uso Interno**: Esto NO es para usuarios finales que instalan el paquete vía npm.

Si estás desarrollando QuickModel (clonaste el repo), usa la versión de código fuente del servidor MCP.

## Configuración Automática

Proporcionamos un script para generar la configuración por ti:

```bash
bun run mcp:setup
```

Esto ejecuta `scripts/setup-mcp.ts`, que detecta tu entorno y genera la configuración adecuada.

El script intentará configurar VS Code automáticamente y proporcionará instrucciones para otros IDEs. Revisa la salida para más detalles.

## Configuración Manual

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

> [!WARNING]
> Estas configuraciones son para **uso interno** dentro del repositorio de QuickModel solamente.
