# Configuración de MCP

QuickModel incluye un servidor **Model Context Protocol (MCP)** integrado que permite a asistentes de IA (como GitHub Copilot, Cursor o Claude) interactuar directamente con tus modelos, documentación y código.

## Configuración Automática

Proporcionamos un script para configurar automáticamente tu entorno en IDEs soportados (principalmente VS Code).

```bash
bun run mcp:setup
```

Uste script:
1. Detectará si estás usando VS Code.
2. Creará/Actualizará `.vscode/mcp.json` con la configuración correcta del servidor.
3. Proporcionará instrucciones para otros IDEs como Cursor o Antigravity.

---

## Configuración Manual

Si prefieres configurarlo manualmente, aquí tienes los detalles para cada plataforma.

### Visual Studio Code

VS Code utiliza un archivo `.vscode/mcp.json` en la raíz de tu espacio de trabajo.

**Archivo:** `.vscode/mcp.json`

```json
{
    "servers": {
        "quickmodel": {
            "command": "bun",
            "args": [
                "run",
                "${workspaceFolder}/src/mcp/server.ts"
            ]
        }
    }
}
```

> **Nota:** Requiere la extensión **GitHub Copilot Chat** o similar compatible con MCP.

### Cursor IDE

Cursor tiene soporte nativo para MCP.

1. Abre la **Paleta de Comandos** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Busca **"MCP: Manage MCP Servers"**.
3. Añade un nuevo servidor:
    - **Nombre**: `quickmodel`
    - **Tipo**: `command`
    - **Comando**: `bun run /ruta/absoluta/al/proyecto/src/mcp/server.ts`

### Google Antigravity

Antigravity permite gestionar servidores MCP a través de su interfaz de Agente.

1. Abre el panel **"Agent"** en el IDE.
2. Selecciona **"Manage MCP Servers"**.
3. Añade un servidor personalizado apuntando a tu punto de entrada local:
   - Comando: `bun run src/mcp/server.ts`

### Configuración Genérica (Claude Desktop, etc.)

Para cualquier otro cliente que cumpla con el estándar MCP, usa la configuración estándar IO:

- **Transporte**: stdio
- **Comando**: `bun`
- **Argumentos**: `run src/mcp/server.ts`

## Verificar Instalación

Una vez configurado, puedes probar si el servidor funciona preguntando a tu asistente de IA:

> "Lista todos los transformadores disponibles en QuickModel"

o

> "Simula una transformación de QuickModel para { date: '2024-01-01' } con el transformador Date"
