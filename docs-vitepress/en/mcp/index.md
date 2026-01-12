# QuickModel MCP Server

QuickModel natively supports the **Model Context Protocol (MCP)**, allowing AI agents to interact with the library directly. This integration serves two purposes:

1.  **Public Usage**: Agents can use QuickModel tools to generate, validate, and simulate models in your projects.
2.  **Internal Development**: We use specific internal tools to maintain and improve the library itself.

## Getting Started

To use the QuickModel MCP server, you need to run it via the `mcp` script.

```bash
bun run mcp
```

Or usage via `npx` (once published):

```bash
npx -y @cartago-git/quickmodel mcp
```

## Available Tools

### Public Tools

These tools are designed for general use by any agent working with QuickModel.

- **`create_model`**: Generates a TypeScript class extending `QModel` based on a list of properties.
- **`validate_usage`**: Analyzes a code snippet to check for common usage errors.
- **`simulate_transformation`**: Simulates the transformation logic of `@Quick` decorators to preview results without running the full app.

### Internal Tools

These tools are restricted for use within the QuickModel repository for maintenance.

- **`update_docs`**: Triggers a rebuild of the documentation site.
- **`generate_test`**: Scaffolds a new unit test file for a given source component.

## Configuration

The server automatically detects the project version from `package.json`. No additional configuration is required.
