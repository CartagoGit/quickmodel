# Maintainer Installation & Setup

> [!WARNING]
> ⚠️ **Internal Use Only**: This is NOT for end users installing the package via npm.

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

**Or using `.vscode/mcp.json` (Standard):**

```json
{
	"servers": {
		"quickmodel": {
			"command": "bun",
			"args": ["run", "/absolute/path/to/quickmodel/src/mcp/server.ts"]
		}
	}
}
```

> [!WARNING]
> These settings are for **internal use** within the QuickModel repository only.

## Other IDEs (Manual Setup)

Since you are running from source, you need to use `bun` to run the server script directly.

### Cursor IDE

1. Go to **Settings** > **Features** > **MCP**.
2. Add a new MCP Server:
    - **Name**: `quickmodel-dev`
    - **Type**: `command`
    - **Command**: `bun run /absolute/path/to/quickmodel/src/mcp/server.ts`

### Windsurf (Codeium)

1. Open **Cascade** > **MCP** (plug icon).
2. Add a new server:
    - **Command**: `bun run /absolute/path/to/quickmodel/src/mcp/server.ts`

### Google Antigravity

1. Open **Agent** > **Manage MCP Servers**.
2. Add custom server:
    - **Command**: `bun`
    - **Args**: `run /absolute/path/to/quickmodel/src/mcp/server.ts`
