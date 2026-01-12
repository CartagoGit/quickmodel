# Servidor MCP (Model Context Protocol)

QuickModel incluye un servidor **MCP** totalmente compatible que permite a asistentes de IA (como Claude, Cursor o Antigravity) entender e interactuar profundamente con la librería.

Al conectar un agente de IA a este servidor, le permites:

- **Generar clases QModel válidas** automáticamente.
- **Validar tu código** buscando errores comunes.
- **Simular transformaciones de datos** asegurando corrección.
- **Inspeccionar estructuras de modelos** y explicar comportamientos.

- **[Herramientas Públicas](./public/)**: Para usuarios construyendo aplicaciones con QuickModel.

## Instalación y Configuración

Para usar el servidor MCP de QuickModel, generalmente lo instalas vía `npm` o `npx`. La configuración varía según el editor y si usas extensiones.

### 1. Visual Studio Code

VS Code no tiene soporte nativo de MCP habilitado por defecto. Tienes dos opciones:

- **Opción A: Usar una Extensión (Recomendado)**: Instala una extensión como **"GG MCP for VSCode"** o similar. Estas extensiones pueden detectar o permitirte añadir servidores MCP fácilmente sin tocar archivos JSON.
- **Opción B: Configuración Manual**: Edita tu `settings.json` Global o de Workspace para añadir el servidor manualmente.

### 2. Cursor

Cursor tiene **soporte nativo para MCP**. No necesitas extensiones.

1.  Abre la **Paleta de Comandos** (`Ctrl+Shift+P`).
2.  Busca **"MCP: Manage MCP Servers"** o similar.
3.  Añade la configuración del servidor directamente via la interfaz (UI).

### 3. Antigravity

Antigravity tiene un panel dedicado para la integración de MCP.

1.  Ve a **Agente > Gestionar Servidores MCP**.
2.  Marca la opción **Ver configuración raw** (View raw config).
3.  Añade los detalles de tu servidor allí.

### Snippet de Configuración (para Instalación Manual)

Independientemente del editor, si lo configuras manualmente, la estructura JSON suele ser:

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

## Referencias de Configuración de IDE

Si necesitas más detalles sobre cómo instalar MCP en tu editor específico, consulta las guías oficiales:

| Editor          | Recurso                                                                                                                                  | Descripción                               |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------- |
| **VS Code**     | [Guía Oficial de Extensión](https://code.visualstudio.com/api/extension-guides/ai/mcp)                                                   | Cómo instalar y gestionar servidores MCP. |
| **Cursor**      | [Documentación Oficial](https://cursor.com/docs/context/mcp)                                                                             | Habilitar y usar MCP nativo.              |
| **Antigravity** | [Blog Google Cloud](https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services) | Conectar servidores MCP al IDE.           |
| **Protocolo**   | [Wikipedia / Spec](https://en.wikipedia.org/wiki/Model_Context_Protocol)                                                                 | Especificación general del protocolo.     |

## Herramientas Disponibles
