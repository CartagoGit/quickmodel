# Servidor MCP (Model Context Protocol)

QuickModel incluye un servidor **MCP** totalmente compatible que permite a asistentes de IA (como Claude, Cursor o Antigravity) entender e interactuar profundamente con la librería.

Al conectar un agente de IA a este servidor, le permites:

- **Generar clases QModel válidas** automáticamente.
- **Validar tu código** buscando errores comunes.
- **Simular transformaciones de datos** asegurando corrección.
- **Inspeccionar estructuras de modelos** y explicar comportamientos.

## Instalación y Configuración

Puedes ejecutar el servidor MCP directamente via `npx` (para usuarios) o desde el código fuente (para colaboradores).

### Para Usuarios (Público)

Para usar las herramientas de QuickModel en tu editor de IA:

```bash
npx -y @cartago-git/quickmodel mcp
```

### Para Colaboradores (Interno)

Si estás desarrollando QuickModel:

```bash
bun run mcp
```

## Integración con Editores

Proporcionamos un script de ayuda para generar la configuración de editores comunes:

```bash
# En la raíz del proyecto
bun run scripts/generate-mcp-config.ts
```

### Antigravity IDE

1. Abre el panel de **Agente**.
2. Haz clic en el menú `...` > **Manage MCP Servers**.
3. Selecciona **View raw config** (`mcp_config.json`).
4. Añade la configuración generada por el script anterior.

### Cursor / VSCode / Claude Desktop

Sigue las instrucciones proporcionadas por el script `generate-mcp-config.ts` para actualizar tus archivos de configuración respectivos.

## Herramientas Disponibles

El servidor expone herramientas divididas en dos categorías:

- **[Herramientas Públicas](./public/index.md)**: Para usuarios construyendo aplicaciones con QuickModel.
- **[Herramientas Internas](./internal/index.md)**: Para mantenedores desarrollando QuickModel.
