# Maintainer Installation & Setup

If you are developing QuickModel itself (cloned the repo), you use the source code version of the MCP server.

## Automatic Configuration

We provide a script to generate the configuration for you:

```bash
bun run mcp:setup
```

This runs `scripts/setup-mcp.ts`, which detects your environment and generates the appropriate config.

The script will attempt to configure VS Code automatically and provide instructions for other IDEs. Look at the output for details.

## Manual Configuration

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

> [!WARNING]
> These settings are for **internal use** within the QuickModel repository only.
