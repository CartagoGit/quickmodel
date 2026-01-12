# Model Context Protocol (MCP) Server

QuickModel includes a fully standard-compliant **MCP Server** that enables AI assistants (like Claude, Cursor, or Antigravity) to deeply understand and interact with the library.

By connecting an AI agent to this server, you enable it to:

- **Generate valid QModel classes** automatically.
- **Validate your code** for common errors.
- **Simulate data transformations** ensuring correctness.
- **Inspect model structures** and explain behaviors.

## Available Tools

- **[Public Tools](./public/)**: For users building applications with QuickModel.

## Installation & Setup

To use the QuickModel MCP server in your project (installed via npm), follow the instructions for your IDE.

### 1. Visual Studio Code

::: info
Requires the **GitHub Copilot Chat** extension.
:::

1. Create a file named `.vscode/mcp.json` in your project root.
2. Add the following configuration:

```json
{
	"servers": {
		"quickmodel": {
			"command": "npx",
			"args": ["-y", "@cartago-git/quickmodel", "mcp"]
		}
	}
}
```

### 2. Cursor IDE

1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Configure it as follows:
    - **Name**: `quickmodel`
    - **Type**: `command`
    - **Command**: `npx -y @cartago-git/quickmodel mcp`

### 3. Windsurf (Codeium)

1. Open **Cascade** (Chat panel).
2. Click the **MCP** icon (plug) or go to settings.
3. Add a new server with the same command:
    - **Command**: `npx -y @cartago-git/quickmodel mcp`

### 4. Google Antigravity

1. Open the **"Agent"** panel.
2. Select **"Manage MCP Servers"**.
3. Add a custom server:
    - **Command**: `npx -y @cartago-git/quickmodel mcp`
