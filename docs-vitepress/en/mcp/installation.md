# Installation & Setup

To use the QuickModel MCP server in your project (installed via npm), follow the instructions for your IDE.

## Automatic

The easiest way to let your IDE detect the MCP server is by running the following command in your terminal:

```bash
npx -y quickmodel mcp
```

This command automatically creates or updates the configuration file for your IDE.

## Manual Setup

If you prefer to configure it manually, follow the specific instructions for your IDE.

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
			"args": ["-y", "quickmodel", "mcp"]
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
    - **Command**: `npx -y quickmodel mcp`

### 3. Windsurf (Codeium)

1. Open **Cascade** (Chat panel).
2. Click the **MCP** icon (plug) or go to settings.
3. Add a new server with the same command:
    - **Command**: `npx -y quickmodel mcp`

### 4. Google Antigravity

1. Open the **"Agent"** panel.
2. Select **"Manage MCP Servers"**.
3. Add a custom server:
    - **Command**: `npx -y quickmodel mcp`
