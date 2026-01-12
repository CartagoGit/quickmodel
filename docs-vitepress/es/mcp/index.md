# Servidor MCP (Model Context Protocol)

QuickModel incluye un servidor **MCP** totalmente compatible que permite a asistentes de IA (como Claude, Cursor o Antigravity) entender e interactuar profundamente con la librería.

Al conectar un agente de IA a este servidor, le permites:

- **Generar clases QModel válidas** automáticamente.
- **Validar tu código** buscando errores comunes.
- **Simular transformaciones de datos** asegurando corrección.
- **Inspeccionar estructuras de modelos** y explicar comportamientos.

- **[Herramientas Públicas](./public/)**: Para usuarios construyendo aplicaciones con QuickModel.

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

## Referencias de Configuración de IDE

Si necesitas más detalles sobre cómo instalar MCP en tu editor específico, consulta las guías oficiales:

| Editor          | Recurso                                                                                                                                  | Descripción                               |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| **VS Code**     | [Guía Oficial de Extensión](https://code.visualstudio.com/api/extension-guides/ai/mcp)                                                   | Cómo instalar y gestionar servidores MCP. |
| **Cursor**      | [Documentación Oficial](https://cursor.com/docs/context/mcp)                                                                             | Habilitar y usar MCP nativo.              |
| **Antigravity** | [Blog Google Cloud](https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services) | Conectar servidores MCP al IDE.           |
| **Protocolo**   | [Wikipedia / Spec](https://en.wikipedia.org/wiki/Model_Context_Protocol)                                                                 | Especificación general del protocolo.     |

## Herramientas Disponibles
