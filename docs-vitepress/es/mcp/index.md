# Servidor MCP (Model Context Protocol)

QuickModel incluye un servidor **MCP** totalmente compatible que permite a asistentes de IA (como Claude, Cursor o Antigravity) entender e interactuar profundamente con la librería.

Al conectar un agente de IA a este servidor, le permites:

- **Generar clases QModel válidas** automáticamente.
- **Validar tu código** buscando errores comunes.
- **Simular transformaciones de datos** asegurando corrección.
- **Inspeccionar estructuras de modelos** y explicar comportamientos.

## Herramientas Disponibles

- **[Herramientas Públicas](./public/)**: Para usuarios construyendo aplicaciones con QuickModel.
- **[Skills Públicos](./public/skills)**: Flujos de trabajo de IA guiados para desarrolladores — convertir, depurar, validar, migrar y más.
- **[Herramientas Internas](./internal/)**: Para contribuidores trabajando en el código base de QuickModel.
- **[Skills Internos](./internal/skills)**: Flujos guiados de TDD, lint, refactor, SOLID y sincronización para contribuidores.

## Instalación y Configuración

Para usar el servidor MCP de QuickModel en tu proyecto (instalado vía npm), sigue las instrucciones de tu IDE.

### Automático

La forma más sencilla de que tu IDE detecte el servidor MCP es ejecutando el siguiente comando en tu terminal:

```bash
npx -y quickmodel mcp
```

### Manual

Si prefieres configurarlo manualmente, sigue las instrucciones específicas para tu IDE.

#### 1. Visual Studio Code

::: info
Requiere la extensión **GitHub Copilot Chat**.
:::

1. Crea un archivo llamado `.vscode/mcp.json` en la raíz de tu proyecto.
2. Añade la siguiente configuración:

```json
{
	"servers": {
		"quickmodel": {
			"command": "npx",
			"args": ["-y", "quickmodel", "mcp"]
		}
	}
}
```

#### 2. Cursor IDE

1. Ve a **Settings (Ajustes)** > **Features** > **MCP**.
2. Haz clic en **+ Add New MCP Server**.
3. Configúralo así:
    - **Name**: `quickmodel`
    - **Type**: `command`
    - **Command**: `npx -y quickmodel mcp`

#### 3. Windsurf (Codeium)

1. Abre **Cascade** (Panel de Chat).
2. Haz clic en el icono de **MCP** (enchufe) o ve a los ajustes.
3. Añade un nuevo servidor con el mismo comando:
    - **Comando**: `npx -y quickmodel mcp`

#### 4. Google Antigravity

1. Abre el panel **"Agent"**.
2. Selecciona **"Manage MCP Servers"**.
3. Añade un servidor personalizado:
    - **Comando**: `npx -y quickmodel mcp`
