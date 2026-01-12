# Model Context Protocol (MCP) Server

QuickModel includes a fully standard-compliant **MCP Server** that enables AI assistants (like Claude, Cursor, or Antigravity) to deeply understand and interact with the library.

By connecting an AI agent to this server, you enable it to:

- **Generate valid QModel classes** automatically.
- **Validate your code** for common errors.
- **Simulate data transformations** ensuring correctness.
- **Inspect model structures** and explain behaviors.

- **[Public Tools](./public/)**: For users building applications with QuickModel.

## Installation & Setup

To use the QuickModel MCP server, you usually install it via `npm` or `npx`. Configuration varies by editor and whether you use extensions.

### 1. Visual Studio Code

VS Code does not have native MCP support enabled by default. You have two options:

- **Option A: Use an Extension (Recommended)**: Install an extension like **"GG MCP for VSCode"** or similar. These extensions can often detect or allow you to easily add MCP servers without touching JSON files.
- **Option B: Manual Configuration**: Edit your Global or Workspace `settings.json` to add the server manually.

### 2. Cursor

Cursor has **native MCP support**. You do not need extensions.

1.  Open **Command Palette** (`Ctrl+Shift+P`).
2.  Search for **"MCP: Manage MCP Servers"** or similar.
3.  Add the server configuration directly via the UI.

### 3. Antigravity

Antigravity has a dedicated panel for MCP integration.

1.  Go to **Agent > Manage MCP Servers**.
2.  Check the **View raw config** option.
3.  Add your server details there.

### Configuration Snippet (for Manual Setup)

Regardless of the editor, if you configure it manually, the JSON structure is usually:

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

## IDE Configuration References

If you need more details on how to install MCP in your specific editor, check the official guides:

| Editor          | Resource                                                                                                                                 | Description                            |
| :-------------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------- |
| **VS Code**     | [Official Extension Guide](https://code.visualstudio.com/api/extension-guides/ai/mcp)                                                    | How to install and manage MCP servers. |
| **Cursor**      | [Official Documentation](https://cursor.com/docs/context/mcp)                                                                            | Enable and use native MCP.             |
| **Antigravity** | [Google Cloud Blog](https://cloud.google.com/blog/products/data-analytics/connect-google-antigravity-ide-to-googles-data-cloud-services) | Connecting MCP servers to the IDE.     |
| **Protocol**    | [Wikipedia / Spec](https://en.wikipedia.org/wiki/Model_Context_Protocol)                                                                 | General protocol specification.        |

## Available Tools
