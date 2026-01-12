# Herramientas MCP Públicas

Estas herramientas están diseñadas para ayudar a los desarrolladores a **usar** QuickModel efectivamente en sus aplicaciones.

## Instalación y Configuración

Si estás usando `@cartago-git/quickmodel` como dependencia en tu proyecto, puedes usar el servidor MCP para ayudarte a escribir código.

Cómo instalarlo depende de tu editor.

### VSCode y Cursor

Necesitas añadir la configuración del servidor a los ajustes de tu proyecto o ajustes globales.

1.  **Localiza tu archivo de configuración**:
    - **VSCode**: `.vscode/settings.json` (Proyecto) o Ajustes de Usuario JSON.
    - **Cursor**: `.cursor/settings.json` o ajustes "Generic MCP".

2.  **Añade el Servidor MCP**:

    Dado que `quickmodel` está instalado en `node_modules`, ejecútalo via `npx` o apuntando directamente al script.

    **Opción A: Usando `npx` (Más fácil)**

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

    **Opción B: Ruta local (Más rápido)**
    Si estás dentro de un proyecto con `quickmodel` instalado:

    ```json
    {
    	"mcpServers": {
    		"quickmodel": {
    			"command": "node",
    			"args": [
    				"./node_modules/@cartago-git/quickmodel/dist/mcp/server.js"
    			]
    		}
    	}
    }
    ```

### Claude Desktop

Edita tu `claude_desktop_config.json` (usualmente en `~/Library/Application Support/Claude/` en macOS o `%APPDATA%\Claude\` en Windows).

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

### Antigravity (IDE)

1.  Abre el panel de **Agente**.
2.  Haz clic en el menú `...` > **Manage MCP Servers**.
3.  Edita **View raw config** (`mcp_config.json`).
4.  Añade el servidor:

    ```json
    "quickmodel": {
      "command": "npx",
      "args": ["-y", "@cartago-git/quickmodel", "mcp"]
    }
    ```

## Creación y Validación de Modelos

### `create_model`

Genera una definición completa de clase TypeScript para un `QModel` a partir de una descripción simple.

- **Uso**: "Crea un modelo Usuario con nombre, email y edad."
- **Salida**: Una clase totalmente decorada usando `@Quick` y `@QType`.

### `validate_usage`

Analiza un fragmento de código buscando errores comunes de uso de QuickModel.

- **Uso**: "Revisa si esta definición de modelo es correcta: [código]"
- **Comprobaciones**: Falta de `declare`, uso incorrecto de decoradores, tipos incorrectos.

## Simulación de Datos

### `simulate_transformation`

Simula cómo `QuickModel` transformará un objeto JSON crudo en una instancia del modelo sin ejecutar código.

- **Uso**: "¿Qué pasa si paso `{ "date": "invalid" }` a este modelo?"
- **Salida**: JSON mostrando los valores transformados (ej: objeto `Date` o `null`).

### `generate_mock`

Genera datos de prueba válidos para un esquema dado.

- **Uso**: "Genera 5 usuarios mock con nombre y email."
- **Salida**: Array JSON de objetos mock.

## Inspección y Utilidades

### `inspect_model`

Analiza la estructura de una clase QuickModel y lista sus transformadores y configuración.

- **Uso**: "Explica la estructura de esta clase."
- **Salida**: Resumen de campos y transformadores aplicados.

### `list_transformers`

Lista todos los transformadores de datos disponibles registrados en el sistema.

- **Uso**: "¿Qué tipos puedo usar en QuickModel?"
- **Salida**: Lista de cadenas como `string`, `date`, `email`, `currency`.
