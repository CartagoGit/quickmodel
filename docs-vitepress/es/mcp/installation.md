# MCP — Instalación y Configuración

El servidor MCP de QuickModel expone todas sus herramientas a cualquier IDE que soporte el [Model Context Protocol](https://modelcontextprotocol.io/). Selecciona tu escenario.

Cada bloque muestra un selector de dos ejes: **IDE** arriba, **gestor de paquetes** abajo. La configuración JSON se actualiza automáticamente para cada combinación.

---

## Escenario A — quickmodel instalado localmente, con internet

`npx`, `bunx`, `pnpm exec` y `yarn` resuelven primero `node_modules/.bin/` — se usa tu versión instalada automáticamente, **no se descarga nada**.

<IDECommandTabs scenario="a" />

---

## Escenario B — quickmodel instalado localmente, sin internet

Dos opciones — usa la que mejor encaje con tu flujo de trabajo.

### Opción 1 — ruta directa al binario local

`node_modules/.bin/quickmodel` siempre está disponible después de la instalación, independientemente del acceso a internet.

<IDECommandTabs scenario="b1" />

### Opción 2 — script en `package.json`

Añade un script `mcp` a tu `package.json`:

```json
{
	"scripts": {
		"mcp": "quickmodel mcp"
	}
}
```

Luego apunta el IDE a ese script:

<IDECommandTabs scenario="b2" />

::: tip
La opción 2 también es muy útil para **entornos CI** y **proyectos de equipo** — todo el equipo comparte el mismo `package.json`, sin necesidad de configurar rutas de binarios en cada máquina.
:::

---

## Escenario C — quickmodel no instalado en tu proyecto

El paquete se descarga bajo demanda. **No se requiere `npm install`** — nada se escribe en tu `node_modules`.

<IDECommandTabs scenario="c" />

---

## Referencia de IDEs

| IDE               | Archivo de configuración                                                                                                           | Clave             | Requiere reinicio |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------- |
| 💙 VS Code        | `.vscode/mcp.json`                                                                                                                 | `servers`         | Recargar ventana  |
| 🎯 Cursor         | `.cursor/mcp.json` (proyecto) · `~/.cursor/mcp.json` (global)                                                                      | `mcpServers`      | Sí                |
| 🌊 Windsurf       | `~/.codeium/windsurf/mcp_config.json`                                                                                              | `mcpServers`      | Sí                |
| ✨ Claude Desktop | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`<br>Windows: `%APPDATA%\Claude\claude_desktop_config.json` | `mcpServers`      | Sí                |
| ⚡ Zed            | Proyecto: `.zed/settings.json` · Global: `~/.config/zed/settings.json`                                                             | `context_servers` | No                |
