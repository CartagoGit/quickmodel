# Configuración para Contribuidores

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

**O usando `.vscode/mcp.json` (Estándar):**

```json
{
	"servers": {
		"quickmodel": {
			"command": "bun",
			"args": ["run", "/ruta/absoluta/a/quickmodel/src/mcp/server.ts"]
		}
	}
}
```

> [!WARNING]
> Estas configuraciones son para **uso interno** dentro del repositorio de QuickModel solamente.

## Otros IDEs (Configuración Manual)

Como estás ejecutando desde el código fuente, necesitas usar `bun` para correr el script del servidor directamente.

### Cursor IDE

1. Ve a **Settings** > **Features** > **MCP**.
2. Añade un nuevo Servidor MCP:
    - **Nombre**: `quickmodel-dev`
    - **Tipo**: `command`
    - **Comando**: `bun run /ruta/absoluta/a/quickmodel/src/mcp/server.ts`

### Windsurf (Codeium)

1. Abre **Cascade** > **MCP** (icono de enchufe).
2. Añade un nuevo servidor:
    - **Comando**: `bun run /ruta/absoluta/a/quickmodel/src/mcp/server.ts`

### Google Antigravity

1. Abre **Agent** > **Manage MCP Servers**.
2. Añade servidor personalizado:
    - **Comando**: `bun`
    - **Argumentos**: `run /ruta/absoluta/a/quickmodel/src/mcp/server.ts`
