# Public MCP Tools

These tools are designed to help developers **use** QuickModel effectively in their applications.

## Installation & Setup

If you are using `@cartago-git/quickmodel` as a dependency in your project, you can use the MCP server to help you write code.

How you install it depends on your editor.

### VSCode & Cursor

You need to add the server configuration to your project's settings or global settings.

1.  **Locate your config file**:
    - **VSCode**: `.vscode/settings.json` (Project) or User Settings JSON.
    - **Cursor**: `.cursor/settings.json` or "Generic MCP" settings.

2.  **Add the MCP Server**:

    Since `quickmodel` is installed in `node_modules`, you run it via `npx` or directly pointing to the script.

    **Option A: Using `npx` (Easiest)**

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

    **Option B: Local path (Faster)**
    If you are inside a project with `quickmodel` installed:

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

Edit your `claude_desktop_config.json` (usually in `~/Library/Application Support/Claude/` on macOS or `%APPDATA%\Claude\` on Windows).

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

1.  Open the **Agent** panel.
2.  Click the `...` menu > **Manage MCP Servers**.
3.  Edit **View raw config** (`mcp_config.json`).
4.  Add the server:

    ```json
    "quickmodel": {
      "command": "npx",
      "args": ["-y", "@cartago-git/quickmodel", "mcp"]
    }
    ```

## Model Creation & Validation

### `create_model`

Generates a complete TypeScript class definition for a `QModel` from a simple description.

- **Usage**: "Create a User model with name, email, and age."
- **Output**: A fully decorated class using `@Quick` and `@QType`.

### `validate_usage`

Analyzes a snippet of code checking for common QuickModel usage errors.

- **Usage**: "Check if this model definition is correct: [code]"
- **Checks**: Missing `declare` keyword, incorrect decorator usage, type mismatches.

## Data Simulation

### `simulate_transformation`

Simulates how `QuickModel` will transform a raw JSON object into a model instance without running code.

- **Usage**: "What happens if I pass `{ "date": "invalid" }` to this model?"
- **Output**: JSON showing the transformed values (e.g., `Date` object or `null`).

### `generate_mock`

Generates valid mock data examples for a given schema.

- **Usage**: "Generate 5 mock users with name and email."
- **Output**: JSON array of mock objects.

## Inspection & Utilities

### `inspect_model`

Analyzes a QuickModel class structure and lists its transformers and configuration.

- **Usage**: "Explain structure of this class."
- **Output**: Summary of fields and applied transformers.

### `list_transformers`

Lists all available data transformers registered in the system.

- **Usage**: "What types can I use in QuickModel?"
- **Output**: List of strings like `string`, `date`, `email`, `currency`.
