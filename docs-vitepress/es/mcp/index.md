# Servidor MCP (Model Context Protocol)

QuickModel incluye un servidor **MCP** totalmente compatible que permite a asistentes de IA (como Claude, Cursor o Antigravity) entender e interactuar profundamente con la librería.

Al conectar un agente de IA a este servidor, le permites:

- **Generar clases QModel válidas** automáticamente.
- **Validar tu código** buscando errores comunes.
- **Simular transformaciones de datos** asegurando corrección.
- **Inspeccionar estructuras de modelos** y explicar comportamientos.

- **[Herramientas Públicas](./public/)**: Para usuarios construyendo aplicaciones con QuickModel.
- **[Herramientas Internas](./internal/)**: Para mantenedores desarrollando QuickModel.

## Instalación y Configuración

Para usar el servidor MCP de QuickModel, generalmente lo instalas vía `npm` o `npx`. La configuración depende de tu editor.

### VSCode y Cursor

1.  Abre tu **JSON de Configuración** (`.vscode/settings.json` o Ajustes Globales).
2.  Añade la configuración del servidor:

    ```json
    {
    	"mcpServers": {
    		"quickmodel": {
    			"command": "npx",
    			"args": ["-y", "@cartago-git/quickmodel", "mcp"]
    		}
    	}
    }
    ```

### Claude Desktop

Edita `claude_desktop_config.json`:

```json
{
	"mcpServers": {
		"quickmodel": {
			"command": "npx",
			"args": ["-y", "@cartago-git/quickmodel", "mcp"]
		}
	}
}
```

### Antigravity

1.  **Agente > Gestionar Servidores MCP > Ver configuración raw**.
2.  Añade el snippet JSON anterior.

## Herramientas Disponibles
