# MCP — Installation & Setup

The QuickModel MCP server exposes all its tools to any IDE that supports the [Model Context Protocol](https://modelcontextprotocol.io/). Pick your scenario below.

Each block shows a two-axis selector: **IDE** on top, **package manager** below. The JSON configuration updates automatically for every combination.

---

## Scenario A — quickmodel installed locally, internet available

`npx`, `bunx`, `pnpm exec` and `yarn` all resolve `node_modules/.bin/` first — your installed version is used automatically, **nothing is downloaded**.

<IDECommandTabs scenario="a" />

---

## Scenario B — quickmodel installed locally, no internet

Two options — use whichever fits your workflow.

### Option 1 — direct path to the local binary

`node_modules/.bin/quickmodel` is always present after installation, regardless of internet access.

<IDECommandTabs scenario="b1" />

### Option 2 — `package.json` script

Add an `mcp` script to your `package.json`:

```json
{
	"scripts": {
		"mcp": "quickmodel mcp"
	}
}
```

Then point the IDE at that script:

<IDECommandTabs scenario="b2" />

::: tip
Option 2 is also handy for **CI environments** and **team projects** — everyone shares the same `package.json`, no per-machine binary path needed.
:::

---

## Scenario C — quickmodel not installed in your project

The package is fetched on demand. **No `npm install` required** — nothing is written to your `node_modules`.

<IDECommandTabs scenario="c" />

---

## IDE reference

| IDE               | Config file                                                                                                                        | Key               | Restart required |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------- |
| 💙 VS Code        | `.vscode/mcp.json`                                                                                                                 | `servers`         | Reload window    |
| 🎯 Cursor         | `.cursor/mcp.json` (project) · `~/.cursor/mcp.json` (global)                                                                       | `mcpServers`      | Yes              |
| 🌊 Windsurf       | `~/.codeium/windsurf/mcp_config.json`                                                                                              | `mcpServers`      | Yes              |
| ✨ Claude Desktop | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`<br>Windows: `%APPDATA%\Claude\claude_desktop_config.json` | `mcpServers`      | Yes              |
| ⚡ Zed            | Project: `.zed/settings.json` · Global: `~/.config/zed/settings.json`                                                              | `context_servers` | No               |
