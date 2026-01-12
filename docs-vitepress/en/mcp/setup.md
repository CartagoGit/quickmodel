# Setting up MCP

QuickModel includes a built-in **Model Context Protocol (MCP)** server that allows AI assistants (like GitHub Copilot, Cursor, or Claude) to interact directly with your models, documentation, and codebase.

## Automatic Setup

We provide a script to automatically configure your environment for supported IDEs (primarily VS Code).

```bash
bun run mcp:setup
```

This script will:
1. Detect if you are using VS Code.
2. Create/Update `.vscode/mcp.json` with the correct server configuration.
3. Provide instructions for other IDEs like Cursor or Antigravity.

---

## Manual Configuration

If you prefer to configure it manually, here are the details for each platform.

### Visual Studio Code

VS Code uses a `.vscode/mcp.json` file in your workspace root.

**Config File:** `.vscode/mcp.json`

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

> **Note:** Requires the **GitHub Copilot Chat** extension or similar MCP-compatible extension.

### Cursor IDE

Cursor has native support for MCP.

1. Open **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Search for **"MCP: Manage MCP Servers"**.
3. Add a new server:
    - **Name**: `quickmodel`
    - **Type**: `command`
    - **Command**: `bun run /absolute/path/to/project/src/mcp/server.ts`

### Google Antigravity

Antigravity allows managing MCP servers via its Agent UI.

1. Open the **"Agent"** panel in the IDE.
2. Select **"Manage MCP Servers"**.
3. Add a custom server pointing to your local entry point:
   - Command: `bun run src/mcp/server.ts`

### Generic Configuration (Claude Desktop, etc.)

For any other client complying with the MCP standard, use the standard IO configuration:

- **Transport**: stdio
- **Command**: `bun`
- **Args**: `run src/mcp/server.ts`

## Verify Installation

Once configured, you can test if the server is working by asking your AI assistant:

> "List all available QuickModel transformers"

or

> "Simulate a QuickModel transformation for { date: '2024-01-01' } with Date transformer"
