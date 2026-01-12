# Model Context Protocol (MCP) Server

QuickModel includes a fully standard-compliant **MCP Server** that enables AI assistants (like Claude, Cursor, or Antigravity) to deeply understand and interact with the library.

By connecting an AI agent to this server, you enable it to:

- **Generate valid QModel classes** automatically.
- **Validate your code** for common errors.
- **Simulate data transformations** ensuring correctness.
- **Inspect model structures** and explain behaviors.

- **[Public Tools](./public/)**: For users building applications with QuickModel.
- **[Internal Tools](./internal/)**: For maintainers developing QuickModel itself.

## Installation & Setup

To use the QuickModel MCP server, you generally install it via `npm` or `npx`. Configuration depends on your editor.

### VSCode & Cursor

1.  Open your **Settings JSON** (`.vscode/settings.json` or Global Settings).
2.  Add the server configuration:

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

Edit `claude_desktop_config.json`:

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

1.  **Agent > Manage MCP Servers > View raw config**.
2.  Add the JSON snippet above.

## Available Tools
